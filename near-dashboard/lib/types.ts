export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  version?: string;
}

export interface TransferStats {
  totalTransfers: number;
  successfulTransfers: number;
  failedTransfers: number;
  successRate: number;
  throughput: number;
  queueSize: number;
  pendingTransfers: number;
  processingTransfers?: number;
  averageProcessingTime?: number;
}

export interface NonceManagerStatus {
  activeNonces: number;
  availableNonces: number;
  lockedNonces: number;
  nonceRange?: {
    min: number;
    max: number;
  };
}

export interface StatsResponse {
  stats: TransferStats;
  nonceManager?: NonceManagerStatus;
  benchmark?: BenchmarkConfig;
  timestamp: string;
}

export interface BenchmarkConfig {
  targetTransfers: number;
  concurrentRequests: number;
  durationSeconds: number;
}

export interface TransferRequest {
  receiverId: string;
  amount: string;
  memo?: string;
}

export interface BatchTransferRequest {
  transfers: TransferRequest[];
}

export interface TransferStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  receiverId: string;
  amount: string;
  memo?: string;
  transactionHash?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  processingTime?: number;
}

export type TransferResponse = TransferStatusResponse;

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  label: string;
}

export interface PerformanceMetrics {
  throughput: ChartDataPoint[];
  successRate: ChartDataPoint[];
  queueSize: ChartDataPoint[];
}

export interface EventLogEntry {
  id: string;
  timestamp: number;
  category?: string;
  component?: string;
  level?: 'info' | 'warn' | 'error';
  method?: string;
  path?: string;
  status?: number;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface EventLogResponse {
  events: EventLogEntry[];
}
