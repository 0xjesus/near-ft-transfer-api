import * as nearAPI from 'near-api-js';
import PQueue from 'p-queue';
import { Config, TransferRequest, TransferResponse, BatchTransfer } from './types';
import { NonceManager } from './nonce-manager';
import { PersistenceManager } from './persistence';
import { randomBytes } from 'crypto';
import { logComponent } from './logger';

export class TransferService {
  private config: Config;
  private near!: nearAPI.Near;
  private account!: nearAPI.Account;
  private nonceManager!: NonceManager;
  private persistence!: PersistenceManager;
  private transferQueue: BatchTransfer[] = [];
  private processingQueue: PQueue;
  private transfers: Map<string, TransferResponse> = new Map();
  private batchTimer?: NodeJS.Timeout;
  private completedTimestamps: number[] = [];
  private readonly benchmarkTargetTransfers: number;
  private readonly benchmarkDurationSeconds: number;
  private readonly benchmarkConcurrency: number;
  private readonly throughputWindowMs: number;

  constructor(config: Config) {
    this.config = config;
    this.processingQueue = new PQueue({
      concurrency: config.maxConcurrentBatches
    });

    logComponent('TRANSFER_SERVICE', `Initialized with concurrency: ${config.maxConcurrentBatches}`, {
      concurrency: config.maxConcurrentBatches,
    });

    this.benchmarkTargetTransfers = parseInt(
      process.env.BENCHMARK_TARGET_TRANSFERS || '60000',
      10
    );
    this.benchmarkDurationSeconds = parseInt(
      process.env.BENCHMARK_DURATION_SECONDS || `${10 * 60}`,
      10
    );
    this.benchmarkConcurrency = parseInt(
      process.env.BENCHMARK_CONCURRENCY || '10',
      10
    );
    this.throughputWindowMs = parseInt(
      process.env.BENCHMARK_THROUGHPUT_WINDOW_MS || '60000',
      10
    );
  }

  async initialize(): Promise<void> {
    logComponent('TRANSFER_SERVICE', 'Initializing NEAR connection...');

    const keyPair = nearAPI.utils.KeyPair.fromString(this.config.senderPrivateKey as any);
    const keyStore = new nearAPI.keyStores.InMemoryKeyStore();
    await keyStore.setKey(this.config.network, this.config.senderAccountId, keyPair);

    this.near = await nearAPI.connect({
      networkId: this.config.network,
      keyStore,
      nodeUrl: this.config.rpcUrl,
      headers: {},
    });

    logComponent('TRANSFER_SERVICE', `Connected to NEAR network: ${this.config.network}`, {
      network: this.config.network,
    });

    this.account = await this.near.account(this.config.senderAccountId);
    logComponent('TRANSFER_SERVICE', `Loaded account: ${this.config.senderAccountId}`, {
      account: this.config.senderAccountId,
    });

    // Initialize nonce manager
    const provider = this.near.connection.provider as any;
    this.nonceManager = new NonceManager(provider, this.config.senderAccountId);
    await this.nonceManager.initialize(this.config.senderPrivateKey, this.config.accessKeyCount);

    // Initialize persistence manager
    this.persistence = new PersistenceManager(this.config.redisUrl);

    // Recover pending transfers from Redis
    const recoveredTransfers = await this.persistence.recoverQueue();
    for (const transfer of recoveredTransfers) {
      this.transferQueue.push(transfer);
    }
    logComponent(
      'TRANSFER_SERVICE',
      `Recovered ${recoveredTransfers.length} pending transfers from persistence`,
      { recoveredTransfers: recoveredTransfers.length }
    );

    // Recover transfer statuses
    const recoveredStatuses = await this.persistence.getAllTransferStatuses();
    this.transfers = recoveredStatuses;
    logComponent(
      'TRANSFER_SERVICE',
      `Recovered ${recoveredStatuses.size} transfer statuses from persistence`,
      { recoveredStatuses: recoveredStatuses.size }
    );

    for (const transfer of this.transfers.values()) {
      if (transfer.status === 'confirmed' && transfer.completed_at) {
        this.recordCompletion(transfer.completed_at);
      }
    }

    // Start batch processing timer
    this.startBatchProcessing();

    logComponent('TRANSFER_SERVICE', 'Initialization complete');
  }

  /**
   * Queue a transfer request
   */
  async queueTransfer(request: TransferRequest): Promise<TransferResponse> {
    const transferId = this.generateTransferId();
    const now = Date.now();

    const batchTransfer: BatchTransfer = {
      id: transferId,
      receiver_id: request.receiver_id,
      amount: request.amount,
      memo: request.memo,
      timestamp: now,
      retries: 0,
    };

    this.transferQueue.push(batchTransfer);

    const response: TransferResponse = {
      transfer_id: transferId,
      status: 'queued',
      receiver_id: request.receiver_id,
      amount: request.amount,
      memo: request.memo,
      queued_at: now,
    };

    this.transfers.set(transferId, response);

    // Persist to Redis for durability
    await this.persistence.saveToQueue(batchTransfer);
    await this.persistence.saveTransferStatus(transferId, response);

    logComponent(
      'TRANSFER_SERVICE',
      `Queued transfer ${transferId} to ${request.receiver_id} for ${request.amount} tokens (queue size: ${this.transferQueue.length})`,
      {
        transferId,
        receiver: request.receiver_id,
        amount: request.amount,
        queueSize: this.transferQueue.length,
      }
    );

    // If queue is full, process immediately
    if (this.transferQueue.length >= this.config.maxBatchSize) {
      logComponent(
        'TRANSFER_SERVICE',
        `Queue full (${this.transferQueue.length}), processing batch immediately`,
        { queueSize: this.transferQueue.length }
      );
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
        logComponent(
          'TRANSFER_SERVICE',
          `Batch interval triggered (queue size: ${this.transferQueue.length})`,
          { queueSize: this.transferQueue.length }
        );
        this.processBatch();
      }
    }, this.config.batchIntervalMs);

    logComponent(
      'TRANSFER_SERVICE',
      `Batch processing started (interval: ${this.config.batchIntervalMs}ms)`,
      { batchIntervalMs: this.config.batchIntervalMs }
    );
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

    logComponent(
      'TRANSFER_SERVICE',
      `Processing batch of ${batch.length} transfers (${this.transferQueue.length} remaining in queue)`,
      {
        batchSize: batch.length,
        remainingQueue: this.transferQueue.length,
      }
    );

    // Add to processing queue
    this.processingQueue.add(() => this.executeBatch(batch));
  }

/**
 * Execute a batch of transfers as a single transaction
 */
private async executeBatch(batch: BatchTransfer[]): Promise<void> {
  const batchId = this.generateBatchId();
  logComponent(
    'TRANSFER_SERVICE',
    `Executing batch ${batchId} with ${batch.length} transfers`,
    { batchId, batchSize: batch.length }
  );

  // Update all transfers to processing status
  for (const transfer of batch) {
    const response = this.transfers.get(transfer.id);
    if (response) {
      response.status = 'processing';
      response.processing_at = Date.now();
      await this.persistence.saveTransferStatus(transfer.id, response);
      logComponent(
        'TRANSFER_SERVICE',
        `Transfer ${transfer.id} status: queued -> processing`,
        { transferId: transfer.id }
      );
    }
  }

  try {
    // Get access key for this batch
    const accessKey = this.nonceManager.getNextAccessKey();

    logComponent(
      'TRANSFER_SERVICE',
      `Using access key with nonce ${accessKey.nonce} for batch ${batchId}`,
      {
        batchId,
        accessKeyNonce: accessKey.nonce,
        accessKeyIndex: accessKey.public_key,
      }
    );

    // Create actions for all transfers in the batch
    const actions: nearAPI.transactions.Action[] = batch.map(transfer => {
      logComponent(
        'TRANSFER_SERVICE',
        `Adding ft_transfer action: ${transfer.receiver_id} <- ${transfer.amount}`,
        {
          receiver: transfer.receiver_id,
          amount: transfer.amount,
          memo: transfer.memo,
          batchId,
        }
      );
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

    logComponent(
      'TRANSFER_SERVICE',
      `Sending transaction with ${actions.length} actions for batch ${batchId}`,
      {
        batchId,
        actionCount: actions.length,
      }
    );

    // Use Account.signAndSendTransaction which handles serialization correctly
    const result = await this.account.signAndSendTransaction({
      receiverId: this.config.ftContractId,
      actions: actions,
    });

    logComponent(
      'TRANSFER_SERVICE',
      `Batch ${batchId} transaction sent successfully`,
      { batchId, transactionHash: result.transaction.hash }
    );
    logComponent(
      'TRANSFER_SERVICE',
      `Transaction hash: ${result.transaction.hash}`,
      { batchId, transactionHash: result.transaction.hash }
    );

    // Update all transfers to confirmed status
  for (const transfer of batch) {
    const response = this.transfers.get(transfer.id);
    if (response) {
      response.status = 'confirmed';
      response.transaction_hash = result.transaction.hash;
      const completedAt = Date.now();
      response.completed_at = completedAt;
      if (transfer.timestamp) {
        response.latency_ms = completedAt - transfer.timestamp;
      }
      this.recordCompletion(completedAt);
      await this.persistence.saveTransferStatus(transfer.id, response);
        logComponent(
          'TRANSFER_SERVICE',
          `Transfer ${transfer.id} status: processing -> confirmed (tx: ${result.transaction.hash})`,
          { transferId: transfer.id, transactionHash: result.transaction.hash }
        );
    }
  }

    // Remove processed batch from Redis queue
    await this.persistence.removeBatchFromQueue(batch.length);

    // Release the access key
    this.nonceManager.releaseAccessKey(accessKey);

    logComponent(
      'TRANSFER_SERVICE',
      `Batch ${batchId} completed successfully`,
      { batchId }
    );

  } catch (error: any) {
    logComponent(
      'TRANSFER_SERVICE',
      `Batch ${batchId} failed`,
      {
        batchId,
        error: error.message,
        stack: error.stack,
      },
      'error'
    );

    // Update all transfers to failed status
    for (const transfer of batch) {
      const response = this.transfers.get(transfer.id);
      if (response) {
        response.status = 'failed';
        response.error = error.message;
        const failedAt = Date.now();
        response.completed_at = failedAt;
        if (transfer.timestamp) {
          response.latency_ms = failedAt - transfer.timestamp;
        }
        await this.persistence.saveTransferStatus(transfer.id, response);
        logComponent(
          'TRANSFER_SERVICE',
          `Transfer ${transfer.id} status: processing -> failed (${error.message})`,
          { transferId: transfer.id, error: error.message },
          'warn'
        );
      }
    }

    // Remove failed batch from queue first
    await this.persistence.removeBatchFromQueue(batch.length);

    // Re-queue failed transfers if retries available
    for (const transfer of batch) {
      if (transfer.retries < 3) {
        transfer.retries++;
        transfer.timestamp = Date.now();
        this.transferQueue.push(transfer);
        await this.persistence.saveToQueue(transfer);
        logComponent(
          'TRANSFER_SERVICE',
          `Re-queued transfer ${transfer.id} (retry ${transfer.retries}/3)`,
          { transferId: transfer.id, retries: transfer.retries }
        );
      } else {
        logComponent(
          'TRANSFER_SERVICE',
          `Transfer ${transfer.id} exhausted retries`,
          { transferId: transfer.id },
          'error'
        );
      }
    }
  }
}

  /**
   * Track successful transfers for throughput calculations
   */
  private recordCompletion(timestamp: number): void {
    this.completedTimestamps.push(timestamp);
    const retentionWindow = Math.max(this.throughputWindowMs * 10, this.throughputWindowMs);
    const cutoff = timestamp - retentionWindow;
    while (this.completedTimestamps.length > 0 && this.completedTimestamps[0] < cutoff) {
      this.completedTimestamps.shift();
    }
  }

  /**
   * Calculate throughput (transfers per second) within the configured window
   */
  private calculateThroughput(now: number): number {
    const windowMs = Math.max(this.throughputWindowMs, 1000);
    const cutoff = now - windowMs;

    while (this.completedTimestamps.length > 0 && this.completedTimestamps[0] < cutoff) {
      this.completedTimestamps.shift();
    }

    const windowSeconds = windowMs / 1000;
    if (windowSeconds <= 0) {
      return 0;
    }

    return this.completedTimestamps.length / windowSeconds;
  }

  private getBenchmarkData() {
    return {
      targetTransfers: this.benchmarkTargetTransfers,
      concurrentRequests: this.benchmarkConcurrency,
      durationSeconds: this.benchmarkDurationSeconds,
    };
  }

  private getNonceRange(nonces: number[]) {
    if (!nonces || nonces.length === 0) {
      return undefined;
    }

    return {
      min: Math.min(...nonces),
      max: Math.max(...nonces),
    };
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
    const now = Date.now();
    let successful = 0;
    let failed = 0;
    let pending = 0;
    let processing = 0;
    let latencySum = 0;
    let latencyCount = 0;

    for (const transfer of this.transfers.values()) {
      switch (transfer.status) {
        case 'confirmed':
          successful++;
          if (typeof transfer.latency_ms === 'number') {
            latencySum += transfer.latency_ms;
            latencyCount++;
          }
          break;
        case 'failed':
          failed++;
          break;
        case 'processing':
        case 'sent':
          processing++;
          break;
        default:
          pending++;
          break;
      }
    }

    const totalTransfers = this.transfers.size;
    const queueSize = this.transferQueue.length;
    const successRate = totalTransfers > 0 ? (successful / totalTransfers) * 100 : 0;
    const avgProcessingTime = latencyCount > 0 ? latencySum / latencyCount : 0;
    const throughput = this.calculateThroughput(now);

    const nonceStatsRaw = this.nonceManager.getStats();
    const nonceStats = {
      activeNonces: nonceStatsRaw.in_use,
      availableNonces: nonceStatsRaw.available,
      lockedNonces: Math.max(
        nonceStatsRaw.total - (nonceStatsRaw.in_use + nonceStatsRaw.available),
        0
      ),
      nonceRange: this.getNonceRange(nonceStatsRaw.nonces),
    };

    return {
      stats: {
        totalTransfers,
        successfulTransfers: successful,
        failedTransfers: failed,
        successRate,
        throughput,
        queueSize,
        pendingTransfers: pending,
        processingTransfers: processing,
        averageProcessingTime: avgProcessingTime,
      },
      nonceManager: nonceStats,
      benchmark: this.getBenchmarkData(),
      timestamp: new Date(now).toISOString(),
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
    logComponent('TRANSFER_SERVICE', 'Shutting down...');
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    await this.processingQueue.onIdle();
    await this.persistence.close();
    logComponent('TRANSFER_SERVICE', 'Shutdown complete');
  }
}
