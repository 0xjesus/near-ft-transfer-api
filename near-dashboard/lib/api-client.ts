import {
  HealthResponse,
  StatsResponse,
  TransferRequest,
  BatchTransferRequest,
  TransferResponse,
  TransferStatusResponse,
  EventLogEntry,
  EventLogResponse,
} from './types';

type ServerTransferResponse = {
  transfer_id: string;
  status: 'queued' | 'processing' | 'sent' | 'confirmed' | 'failed';
  transaction_hash?: string;
  error?: string;
  receiver_id?: string;
  amount?: string;
  memo?: string;
  queued_at?: number;
  processing_at?: number;
  completed_at?: number;
  latency_ms?: number;
};

type ServerBatchTransferResponse =
  | ServerTransferResponse[]
  | {
      count: number;
      transfers: ServerTransferResponse[];
    };

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred');
    }
  }

  private normalizeStatus(
    status: ServerTransferResponse['status']
  ): TransferStatusResponse['status'] {
    switch (status) {
      case 'confirmed':
        return 'completed';
      case 'queued':
        return 'pending';
      case 'processing':
      case 'sent':
        return 'processing';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private normalizeTransfer(
    transfer: ServerTransferResponse
  ): TransferStatusResponse {
    const createdAtMs =
      transfer.queued_at ??
      (() => {
        const parts = transfer.transfer_id.split('_');
        if (parts.length >= 2) {
          const maybeTimestamp = Number(parts[1]);
          if (!Number.isNaN(maybeTimestamp)) {
            return maybeTimestamp;
          }
        }
        return Date.now();
      })();

    const createdAt = new Date(createdAtMs).toISOString();
    const completedAt = transfer.completed_at
      ? new Date(transfer.completed_at).toISOString()
      : undefined;

    return {
      id: transfer.transfer_id,
      status: this.normalizeStatus(transfer.status),
      receiverId: transfer.receiver_id || 'unknown',
      amount: transfer.amount || '0',
      memo: transfer.memo,
      transactionHash: transfer.transaction_hash,
      error: transfer.error,
      createdAt,
      completedAt,
      processingTime:
        typeof transfer.latency_ms === 'number' ? transfer.latency_ms : undefined,
    };
  }

  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  async getStats(): Promise<StatsResponse> {
    return this.request<StatsResponse>('/stats');
  }

  async createTransfer(transfer: TransferRequest): Promise<TransferResponse> {
    const payload = {
      receiver_id: transfer.receiverId,
      amount: transfer.amount,
      memo: transfer.memo,
    };

    const response = await this.request<ServerTransferResponse>('/transfer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return this.normalizeTransfer(response);
  }

  async createBatchTransfer(
    batch: BatchTransferRequest
  ): Promise<TransferResponse[]> {
    const payload = {
      transfers: batch.transfers.map((transfer) => ({
        receiver_id: transfer.receiverId,
        amount: transfer.amount,
        memo: transfer.memo,
      })),
    };

    const response = await this.request<ServerBatchTransferResponse>('/transfer/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const transfers = Array.isArray(response)
      ? response
      : response.transfers ?? [];

    return transfers.map((transfer) => this.normalizeTransfer(transfer));
  }

  async getTransferStatus(id: string): Promise<TransferStatusResponse> {
    const response = await this.request<ServerTransferResponse>(`/transfer/${id}`);
    return this.normalizeTransfer(response);
  }

  async getEvents(): Promise<EventLogEntry[]> {
    const response = await this.request<EventLogResponse>('/events');
    return response.events;
  }
}

export const apiClient = new ApiClient();
