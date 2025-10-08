import Redis from 'ioredis';
import { BatchTransfer, TransferResponse } from './types';
import { logComponent } from './logger';

/**
 * Persistence layer using Redis for durability
 * Ensures pending transfers survive service restarts
 */
export class PersistenceManager {
  private redis: Redis;
  private readonly QUEUE_KEY = 'ft_transfer:queue';
  private readonly TRANSFERS_KEY = 'ft_transfer:transfers';

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || 'redis://localhost:6379', {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      logComponent('PERSISTENCE', 'Connected to Redis');
    });

    this.redis.on('error', (err) => {
      logComponent(
        'PERSISTENCE',
        'Redis error',
        { error: err.message },
        'error'
      );
    });
  }

  /**
   * Save a transfer to the pending queue
   */
  async saveToQueue(transfer: BatchTransfer): Promise<void> {
    await this.redis.rpush(this.QUEUE_KEY, JSON.stringify(transfer));
    logComponent('PERSISTENCE', `Saved transfer ${transfer.id} to queue`, {
      transferId: transfer.id,
    });
  }

  /**
   * Save transfer status
   */
  async saveTransferStatus(transferId: string, response: TransferResponse): Promise<void> {
    await this.redis.hset(this.TRANSFERS_KEY, transferId, JSON.stringify(response));
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(transferId: string): Promise<TransferResponse | null> {
    const data = await this.redis.hget(this.TRANSFERS_KEY, transferId);
    if (!data) return null;
    return JSON.parse(data);
  }

  /**
   * Recover pending transfers from queue (on startup)
   */
  async recoverQueue(): Promise<BatchTransfer[]> {
    const items = await this.redis.lrange(this.QUEUE_KEY, 0, -1);
    const transfers = items.map(item => JSON.parse(item));

    logComponent(
      'PERSISTENCE',
      `Recovered ${transfers.length} pending transfers from queue`,
      { recovered: transfers.length }
    );
    return transfers;
  }

  /**
   * Remove a batch of transfers from the queue (after processing)
   */
  async removeBatchFromQueue(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.redis.lpop(this.QUEUE_KEY);
    }
    logComponent(
      'PERSISTENCE',
      `Removed ${count} transfers from queue`,
      { removed: count }
    );
  }

  /**
   * Get current queue size
   */
  async getQueueSize(): Promise<number> {
    return await this.redis.llen(this.QUEUE_KEY);
  }

  /**
   * Clear completed/failed transfers older than X days
   */
  async cleanupOldTransfers(daysOld: number = 7): Promise<number> {
    const allTransfers = await this.redis.hgetall(this.TRANSFERS_KEY);
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [transferId, data] of Object.entries(allTransfers)) {
      const transfer: TransferResponse = JSON.parse(data);
      // Only clean completed or failed transfers
      if ((transfer.status === 'confirmed' || transfer.status === 'failed')) {
        // Extract timestamp from transfer_id format: tx_<timestamp>_<random>
        const timestamp = parseInt(transferId.split('_')[1]);
        if (timestamp < cutoffTime) {
          await this.redis.hdel(this.TRANSFERS_KEY, transferId);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      logComponent('PERSISTENCE', `Cleaned ${cleaned} old transfers`, {
        cleaned,
        daysOld,
      });
    }
    return cleaned;
  }

  /**
   * Get all transfer statuses
   */
  async getAllTransferStatuses(): Promise<Map<string, TransferResponse>> {
    const allTransfers = await this.redis.hgetall(this.TRANSFERS_KEY);
    const map = new Map<string, TransferResponse>();

    for (const [transferId, data] of Object.entries(allTransfers)) {
      map.set(transferId, JSON.parse(data));
    }

    return map;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    logComponent('PERSISTENCE', 'Redis connection closed');
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (err) {
      return false;
    }
  }
}
