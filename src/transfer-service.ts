import * as nearAPI from 'near-api-js';
import PQueue from 'p-queue';
import { Config, TransferRequest, TransferResponse, BatchTransfer } from './types';
import { NonceManager } from './nonce-manager';
import { randomBytes } from 'crypto';

export class TransferService {
  private config: Config;
  private near!: nearAPI.Near;
  private account!: nearAPI.Account;
  private nonceManager!: NonceManager;
  private transferQueue: BatchTransfer[] = [];
  private processingQueue: PQueue;
  private transfers: Map<string, TransferResponse> = new Map();
  private batchTimer?: NodeJS.Timeout;

  constructor(config: Config) {
    this.config = config;
    this.processingQueue = new PQueue({
      concurrency: config.maxConcurrentBatches
    });

    console.log(`[TRANSFER_SERVICE] Initialized with concurrency: ${config.maxConcurrentBatches}`);
  }

  async initialize(): Promise<void> {
    console.log('[TRANSFER_SERVICE] Initializing NEAR connection...');

    const keyPair = nearAPI.utils.KeyPair.fromString(this.config.senderPrivateKey as any);
    const keyStore = new nearAPI.keyStores.InMemoryKeyStore();
    await keyStore.setKey(this.config.network, this.config.senderAccountId, keyPair);

    this.near = await nearAPI.connect({
      networkId: this.config.network,
      keyStore,
      nodeUrl: this.config.rpcUrl,
      headers: {},
    });

    console.log(`[TRANSFER_SERVICE] Connected to NEAR network: ${this.config.network}`);

    this.account = await this.near.account(this.config.senderAccountId);
    console.log(`[TRANSFER_SERVICE] Loaded account: ${this.config.senderAccountId}`);

    // Initialize nonce manager
    const provider = this.near.connection.provider as any;
    this.nonceManager = new NonceManager(provider, this.config.senderAccountId);
    await this.nonceManager.initialize(this.config.senderPrivateKey, this.config.accessKeyCount);

    // Start batch processing timer
    this.startBatchProcessing();

    console.log('[TRANSFER_SERVICE] Initialization complete');
  }

  /**
   * Queue a transfer request
   */
  async queueTransfer(request: TransferRequest): Promise<TransferResponse> {
    const transferId = this.generateTransferId();

    const batchTransfer: BatchTransfer = {
      id: transferId,
      receiver_id: request.receiver_id,
      amount: request.amount,
      memo: request.memo,
      timestamp: Date.now(),
      retries: 0,
    };

    this.transferQueue.push(batchTransfer);

    const response: TransferResponse = {
      transfer_id: transferId,
      status: 'queued',
    };

    this.transfers.set(transferId, response);

    console.log(`[TRANSFER_SERVICE] Queued transfer ${transferId} to ${request.receiver_id} for ${request.amount} tokens (queue size: ${this.transferQueue.length})`);

    // If queue is full, process immediately
    if (this.transferQueue.length >= this.config.maxBatchSize) {
      console.log(`[TRANSFER_SERVICE] Queue full (${this.transferQueue.length}), processing batch immediately`);
      this.processBatch();
    }

    return response;
  }

  /**
   * Start the batch processing timer
   */
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.transferQueue.length > 0) {
        console.log(`[TRANSFER_SERVICE] Batch interval triggered (queue size: ${this.transferQueue.length})`);
        this.processBatch();
      }
    }, this.config.batchIntervalMs);

    console.log(`[TRANSFER_SERVICE] Batch processing started (interval: ${this.config.batchIntervalMs}ms)`);
  }

  /**
   * Process a batch of transfers
   */
  private processBatch(): void {
    if (this.transferQueue.length === 0) {
      return;
    }

    // Take up to maxBatchSize transfers from the queue
    const batchSize = Math.min(this.config.maxBatchSize, this.transferQueue.length);
    const batch = this.transferQueue.splice(0, batchSize);

    console.log(`[TRANSFER_SERVICE] Processing batch of ${batch.length} transfers (${this.transferQueue.length} remaining in queue)`);

    // Add to processing queue
    this.processingQueue.add(() => this.executeBatch(batch));
  }

  /**
   * Execute a batch of transfers as a single transaction
   */
  private async executeBatch(batch: BatchTransfer[]): Promise<void> {
    const batchId = this.generateBatchId();
    console.log(`[TRANSFER_SERVICE] Executing batch ${batchId} with ${batch.length} transfers`);

    // Update all transfers to processing status
    batch.forEach(transfer => {
      const response = this.transfers.get(transfer.id);
      if (response) {
        response.status = 'processing';
        console.log(`[TRANSFER_SERVICE] Transfer ${transfer.id} status: queued -> processing`);
      }
    });

    try {
      // Get access key for this batch
      const accessKey = this.nonceManager.getNextAccessKey();
      const keyPair = nearAPI.utils.KeyPair.fromString(accessKey.private_key as any);

      console.log(`[TRANSFER_SERVICE] Using access key with nonce ${accessKey.nonce} for batch ${batchId}`);

      // Create actions for all transfers in the batch
      const actions: nearAPI.transactions.Action[] = batch.map(transfer => {
        console.log(`[TRANSFER_SERVICE] Adding ft_transfer action: ${transfer.receiver_id} <- ${transfer.amount}`);
        return nearAPI.transactions.functionCall(
          'ft_transfer',
          {
            receiver_id: transfer.receiver_id,
            amount: transfer.amount,
            memo: transfer.memo || null,
          },
          BigInt('30000000000000'), // 30 TGas per transfer
          BigInt('1') // 1 yoctoNEAR deposit
        );
      });

      // Get block hash
      const block = await this.near.connection.provider.block({ finality: 'final' });
      const blockHash = block.header.hash;

      console.log(`[TRANSFER_SERVICE] Creating transaction for batch ${batchId} with ${actions.length} actions`);

      // Create and sign transaction
      const transaction = nearAPI.transactions.createTransaction(
        this.config.senderAccountId,
        nearAPI.utils.PublicKey.fromString(accessKey.public_key),
        this.config.ftContractId,
        accessKey.nonce + 1,
        actions,
        nearAPI.utils.serialize.base_decode(blockHash)
      );

      const serializedTx = nearAPI.utils.serialize.serialize(
        nearAPI.transactions.SCHEMA as any,
        transaction
      );
      const signature = keyPair.sign(serializedTx);
      const signedTransaction = new nearAPI.transactions.SignedTransaction({
        transaction,
        signature: new nearAPI.transactions.Signature({
          keyType: transaction.publicKey.keyType,
          data: signature.signature,
        }),
      });

      console.log(`[TRANSFER_SERVICE] Sending batch ${batchId} transaction to network...`);

      // Send transaction
      const result = await this.near.connection.provider.sendTransaction(signedTransaction);

      console.log(`[TRANSFER_SERVICE] Batch ${batchId} transaction sent successfully`);
      console.log(`[TRANSFER_SERVICE] Transaction hash: ${result.transaction.hash}`);
      console.log(`[TRANSFER_SERVICE] Transaction status: ${JSON.stringify(result.status)}`);

      // Update all transfers to sent status
      batch.forEach(transfer => {
        const response = this.transfers.get(transfer.id);
        if (response) {
          response.status = 'confirmed';
          response.transaction_hash = result.transaction.hash;
          console.log(`[TRANSFER_SERVICE] Transfer ${transfer.id} status: processing -> confirmed (tx: ${result.transaction.hash})`);
        }
      });

      // Release the access key
      this.nonceManager.releaseAccessKey(accessKey);

      console.log(`[TRANSFER_SERVICE] Batch ${batchId} completed successfully`);

    } catch (error: any) {
      console.error(`[TRANSFER_SERVICE] Batch ${batchId} failed:`, error.message);
      console.error(`[TRANSFER_SERVICE] Error details:`, error);

      // Update all transfers to failed status
      batch.forEach(transfer => {
        const response = this.transfers.get(transfer.id);
        if (response) {
          response.status = 'failed';
          response.error = error.message;
          console.log(`[TRANSFER_SERVICE] Transfer ${transfer.id} status: processing -> failed (${error.message})`);
        }
      });

      // Re-queue failed transfers if retries available
      batch.forEach(transfer => {
        if (transfer.retries < 3) {
          transfer.retries++;
          this.transferQueue.push(transfer);
          console.log(`[TRANSFER_SERVICE] Re-queued transfer ${transfer.id} (retry ${transfer.retries}/3)`);
        } else {
          console.error(`[TRANSFER_SERVICE] Transfer ${transfer.id} exhausted retries`);
        }
      });
    }
  }

  /**
   * Get transfer status
   */
  getTransferStatus(transferId: string): TransferResponse | undefined {
    return this.transfers.get(transferId);
  }

  /**
   * Get service statistics
   */
  getStats() {
    const statuses = Array.from(this.transfers.values()).reduce((acc, transfer) => {
      acc[transfer.status] = (acc[transfer.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const nonceStats = this.nonceManager.getStats();

    return {
      queue_size: this.transferQueue.length,
      processing_queue_size: this.processingQueue.size,
      total_transfers: this.transfers.size,
      statuses,
      nonce_manager: nonceStats,
    };
  }

  /**
   * Generate a unique transfer ID
   */
  private generateTransferId(): string {
    return `tx_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate a unique batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    console.log('[TRANSFER_SERVICE] Shutting down...');
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    await this.processingQueue.onIdle();
    console.log('[TRANSFER_SERVICE] Shutdown complete');
  }
}
