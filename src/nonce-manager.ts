import { AccessKeyInfo } from './types';
import * as nearAPI from 'near-api-js';

export class NonceManager {
  private accessKeys: AccessKeyInfo[] = [];
  private currentKeyIndex: number = 0;
  private provider: any;
  private accountId: string;

  constructor(provider: any, accountId: string) {
    this.provider = provider;
    this.accountId = accountId;
  }

  /**
   * Initialize access keys. In production, you'd create multiple access keys.
   * For this implementation, we'll simulate with the same key but track nonces separately.
   */
  async initialize(privateKey: string, keyCount: number): Promise<void> {
    console.log(`[NONCE_MANAGER] Initializing ${keyCount} access keys for ${this.accountId}`);

    const keyPair = nearAPI.utils.KeyPair.fromString(privateKey as any);
    const publicKey = keyPair.getPublicKey().toString();

    // Fetch the current nonce from the network
    const accessKey: any = await this.provider.query({
      request_type: 'view_access_key',
      finality: 'final',
      account_id: this.accountId,
      public_key: publicKey,
    });

    console.log(`[NONCE_MANAGER] Current nonce from network: ${accessKey.nonce}`);

    // Create virtual access keys (all share the same underlying key but manage nonces separately)
    // In production, you'd create separate access keys on-chain
    for (let i = 0; i < keyCount; i++) {
      this.accessKeys.push({
        public_key: publicKey,
        private_key: privateKey,
        nonce: accessKey.nonce + i, // Offset nonces to avoid conflicts
        in_use: false,
      });
      console.log(`[NONCE_MANAGER] Initialized access key ${i + 1}/${keyCount} with nonce ${accessKey.nonce + i}`);
    }

    console.log(`[NONCE_MANAGER] Initialized ${this.accessKeys.length} access keys`);
  }

  /**
   * Get the next available access key (round-robin)
   */
  getNextAccessKey(): AccessKeyInfo {
    // Round-robin through access keys
    const startIndex = this.currentKeyIndex;

    do {
      const key = this.accessKeys[this.currentKeyIndex];
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.accessKeys.length;

      if (!key.in_use) {
        key.in_use = true;
        console.log(`[NONCE_MANAGER] Allocated access key ${this.currentKeyIndex} with nonce ${key.nonce}`);
        return key;
      }
    } while (this.currentKeyIndex !== startIndex);

    // If all keys are in use, just return the next one anyway
    const key = this.accessKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.accessKeys.length;
    console.log(`[NONCE_MANAGER] All keys in use, forcing allocation of key with nonce ${key.nonce}`);
    return key;
  }

  /**
   * Increment nonce and release the key
   */
  releaseAccessKey(keyInfo: AccessKeyInfo): void {
    const key = this.accessKeys.find(k => k.public_key === keyInfo.public_key && k.nonce === keyInfo.nonce);
    if (key) {
      key.nonce += this.accessKeys.length; // Increment by number of keys to avoid conflicts
      key.in_use = false;
      console.log(`[NONCE_MANAGER] Released access key, new nonce: ${key.nonce}`);
    }
  }

  /**
   * Get access key statistics
   */
  getStats() {
    const inUseCount = this.accessKeys.filter(k => k.in_use).length;
    const availableCount = this.accessKeys.length - inUseCount;

    return {
      total: this.accessKeys.length,
      in_use: inUseCount,
      available: availableCount,
      nonces: this.accessKeys.map(k => k.nonce),
    };
  }
}
