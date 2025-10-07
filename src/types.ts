export interface TransferRequest {
  receiver_id: string;
  amount: string;
  memo?: string;
}

export interface TransferResponse {
  transfer_id: string;
  status: 'queued' | 'processing' | 'sent' | 'confirmed' | 'failed';
  transaction_hash?: string;
  error?: string;
}

export interface BatchTransfer {
  id: string;
  receiver_id: string;
  amount: string;
  memo?: string;
  timestamp: number;
  retries: number;
}

export interface AccessKeyInfo {
  public_key: string;
  private_key: string;
  nonce: number;
  in_use: boolean;
}

export interface BenchmarkResult {
  total_transfers: number;
  successful_transfers: number;
  failed_transfers: number;
  duration_seconds: number;
  transfers_per_second: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p99_latency_ms: number;
}

export interface Config {
  network: string;
  rpcUrl: string;
  senderAccountId: string;
  senderPrivateKey: string;
  ftContractId: string;
  port: number;
  apiHost: string;
  maxBatchSize: number;
  maxConcurrentBatches: number;
  accessKeyCount: number;
  batchIntervalMs: number;
}
