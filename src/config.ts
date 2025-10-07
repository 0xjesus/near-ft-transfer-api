import dotenv from 'dotenv';
import { Config } from './types';

dotenv.config();

export function getConfig(): Config {
  const config: Config = {
    network: process.env.NETWORK || 'testnet',
    rpcUrl: process.env.RPC_URL || 'https://rpc.testnet.near.org',
    senderAccountId: process.env.SENDER_ACCOUNT_ID || '',
    senderPrivateKey: process.env.SENDER_PRIVATE_KEY || '',
    ftContractId: process.env.FT_CONTRACT_ID || '',
    port: parseInt(process.env.PORT || '3000', 10),
    apiHost: process.env.API_HOST || '0.0.0.0',
    maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '100', 10),
    maxConcurrentBatches: parseInt(process.env.MAX_CONCURRENT_BATCHES || '10', 10),
    accessKeyCount: parseInt(process.env.ACCESS_KEY_COUNT || '10', 10),
    batchIntervalMs: parseInt(process.env.BATCH_INTERVAL_MS || '100', 10),
  };

  console.log('[CONFIG] Loaded configuration:', {
    network: config.network,
    rpcUrl: config.rpcUrl,
    senderAccountId: config.senderAccountId,
    ftContractId: config.ftContractId,
    port: config.port,
    maxBatchSize: config.maxBatchSize,
    maxConcurrentBatches: config.maxConcurrentBatches,
    accessKeyCount: config.accessKeyCount,
    batchIntervalMs: config.batchIntervalMs,
  });

  return config;
}

export function validateConfig(config: Config): void {
  const errors: string[] = [];

  if (!config.senderAccountId) {
    errors.push('SENDER_ACCOUNT_ID is required');
  }
  if (!config.senderPrivateKey) {
    errors.push('SENDER_PRIVATE_KEY is required');
  }
  if (!config.ftContractId) {
    errors.push('FT_CONTRACT_ID is required');
  }
  if (!config.rpcUrl) {
    errors.push('RPC_URL is required');
  }

  if (errors.length > 0) {
    console.error('[CONFIG] Validation errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    throw new Error('Configuration validation failed');
  }

  console.log('[CONFIG] Configuration validated successfully');
}
