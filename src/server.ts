import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { readFileSync } from 'fs';
import { getConfig, validateConfig } from './config';
import { TransferService } from './transfer-service';
import { TransferRequest } from './types';
import { logApiEvent } from './logger';
import { eventLog } from './event-log';

const app = express();
app.use(cors());
app.use(express.json());

let transferService: TransferService;
const serverStartTime = Date.now();
const SERVER_VERSION = getServerVersion();

function getServerVersion(): string {
  try {
    const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
    const packageJsonRaw = readFileSync(packageJsonPath, 'utf8');
    const pkg = JSON.parse(packageJsonRaw);
    return pkg.version || '0.0.0';
  } catch (error) {
    console.error('[SERVER] Failed to read package version:', error);
    return '0.0.0';
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  console.log('[API] Health check requested');
  const payload = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    version: SERVER_VERSION,
  };
  res.json(payload);
  logApiEvent({
    method: 'GET',
    path: '/health',
    status: 200,
    message: 'Health check',
    metadata: payload,
  });
});

/**
 * Get service statistics
 */
app.get('/stats', (req: Request, res: Response) => {
  console.log('[API] Stats requested');
  if (!transferService) {
    logApiEvent({
      method: 'GET',
      path: '/stats',
      status: 503,
      message: 'Transfer service not initialized',
    });
    return res.status(503).json({
      error: 'Transfer service not initialized',
    });
  }
  const stats = transferService.getStats();
  res.json(stats);
  logApiEvent({
    method: 'GET',
    path: '/stats',
    status: 200,
    message: 'Service statistics fetched',
    metadata: {
      totalTransfers: stats.stats.totalTransfers,
      throughput: stats.stats.throughput,
      queueSize: stats.stats.queueSize,
    },
  });
});

/**
 * Transfer FT tokens
 */
app.post('/transfer', async (req: Request, res: Response) => {
  try {
    const request: TransferRequest = req.body;

    console.log('[API] Transfer request received:', {
      receiver_id: request.receiver_id,
      amount: request.amount,
      memo: request.memo,
    });

    // Validate request
    if (!request.receiver_id) {
      console.error('[API] Missing receiver_id');
      logApiEvent({
        method: 'POST',
        path: '/transfer',
        status: 400,
        message: 'Missing receiver_id',
      });
      return res.status(400).json({
        error: 'receiver_id is required',
      });
    }

    if (!request.amount) {
      console.error('[API] Missing amount');
      logApiEvent({
        method: 'POST',
        path: '/transfer',
        status: 400,
        message: 'Missing amount',
      });
      return res.status(400).json({
        error: 'amount is required',
      });
    }

    // Validate amount is a valid number string
    try {
      BigInt(request.amount);
    } catch (error) {
      console.error('[API] Invalid amount:', request.amount);
      logApiEvent({
        method: 'POST',
        path: '/transfer',
        status: 400,
        message: 'Invalid amount',
      });
      return res.status(400).json({
        error: 'amount must be a valid number string',
      });
    }

    // Queue the transfer
    const response = await transferService.queueTransfer(request);

    console.log('[API] Transfer queued successfully:', response);

    res.json(response);
    logApiEvent({
      method: 'POST',
      path: '/transfer',
      status: 200,
      message: 'Transfer queued',
      metadata: {
        transferId: response.transfer_id,
        receiver: request.receiver_id,
        amount: request.amount,
      },
    });
  } catch (error: any) {
    console.error('[API] Transfer request failed:', error.message);
    logApiEvent({
      method: 'POST',
      path: '/transfer',
      status: 500,
      message: 'Transfer request failed',
      metadata: {
        error: error.message,
      },
    });
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * Get transfer status
 */
app.get('/transfer/:id', (req: Request, res: Response) => {
  const transferId = req.params.id;

  console.log('[API] Transfer status requested:', transferId);

  const status = transferService.getTransferStatus(transferId);

  if (!status) {
    console.log('[API] Transfer not found:', transferId);
    logApiEvent({
      method: 'GET',
      path: '/transfer/:id',
      status: 404,
      message: 'Transfer not found',
      metadata: { transferId },
    });
    return res.status(404).json({
      error: 'Transfer not found',
    });
  }

  console.log('[API] Transfer status:', status);

  res.json(status);
  logApiEvent({
    method: 'GET',
    path: '/transfer/:id',
    status: 200,
    message: 'Transfer status fetched',
    metadata: {
      transferId,
      status: status.status,
    },
  });
});

/**
 * Batch transfer endpoint (for high-performance testing)
 */
app.post('/transfer/batch', async (req: Request, res: Response) => {
  try {
    const requests: TransferRequest[] = req.body.transfers;

    console.log('[API] Batch transfer request received:', {
      count: requests?.length || 0,
    });

    if (!Array.isArray(requests)) {
      console.error('[API] Invalid batch request: transfers must be an array');
      logApiEvent({
        method: 'POST',
        path: '/transfer/batch',
        status: 400,
        message: 'Invalid batch request payload',
      });
      return res.status(400).json({
        error: 'transfers must be an array',
      });
    }

    // Queue all transfers
    const responses = await Promise.all(
      requests.map(request => transferService.queueTransfer(request))
    );

    console.log('[API] Batch transfer queued successfully:', {
      count: responses.length,
    });

    res.json({
      count: responses.length,
      transfers: responses,
    });
    logApiEvent({
      method: 'POST',
      path: '/transfer/batch',
      status: 200,
      message: 'Batch transfer queued',
      metadata: {
        count: responses.length,
      },
    });
  } catch (error: any) {
    console.error('[API] Batch transfer request failed:', error.message);
    logApiEvent({
      method: 'POST',
      path: '/transfer/batch',
      status: 500,
      message: 'Batch transfer failed',
      metadata: {
        error: error.message,
      },
    });
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * Start the server
 */
async function start() {
  console.log('========================================');
  console.log('NEAR FT Transfer API Server');
  console.log('========================================');

  try {
    // Load and validate configuration
    const config = getConfig();
    validateConfig(config);

    // Initialize transfer service
    console.log('[SERVER] Initializing transfer service...');
    transferService = new TransferService(config);
    await transferService.initialize();

    // Start HTTP server
    const server = app.listen(config.port, config.apiHost, () => {
      console.log('========================================');
      console.log(`[SERVER] API server listening on http://${config.apiHost}:${config.port}`);
      console.log('========================================');
      console.log('Endpoints:');
      console.log(`  GET  /health              - Health check`);
      console.log(`  GET  /stats               - Service statistics`);
      console.log(`  POST /transfer            - Queue a single transfer`);
      console.log(`  POST /transfer/batch      - Queue multiple transfers`);
      console.log(`  GET  /transfer/:id        - Get transfer status`);
      console.log('========================================');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('[SERVER] SIGTERM received, shutting down gracefully...');
      server.close();
      await transferService.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('[SERVER] SIGINT received, shutting down gracefully...');
      server.close();
      await transferService.shutdown();
      process.exit(0);
    });

  } catch (error: any) {
    console.error('[SERVER] Failed to start:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Start the server
start();
/**
 * Fetch recent API activity
 */
app.get('/events', (req: Request, res: Response) => {
  const events = eventLog.all();
  res.json({ events });
  logApiEvent({
    method: 'GET',
    path: '/events',
    status: 200,
    message: 'Event log fetched',
    metadata: { count: events.length },
  });
});
