import express, { Request, Response } from 'express';
import { getConfig, validateConfig } from './config';
import { TransferService } from './transfer-service';
import { TransferRequest } from './types';

const app = express();
app.use(express.json());

let transferService: TransferService;

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  console.log('[API] Health check requested');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get service statistics
 */
app.get('/stats', (req: Request, res: Response) => {
  console.log('[API] Stats requested');
  const stats = transferService.getStats();
  res.json(stats);
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
      return res.status(400).json({
        error: 'receiver_id is required',
      });
    }

    if (!request.amount) {
      console.error('[API] Missing amount');
      return res.status(400).json({
        error: 'amount is required',
      });
    }

    // Validate amount is a valid number string
    try {
      BigInt(request.amount);
    } catch (error) {
      console.error('[API] Invalid amount:', request.amount);
      return res.status(400).json({
        error: 'amount must be a valid number string',
      });
    }

    // Queue the transfer
    const response = await transferService.queueTransfer(request);

    console.log('[API] Transfer queued successfully:', response);

    res.json(response);
  } catch (error: any) {
    console.error('[API] Transfer request failed:', error.message);
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
    return res.status(404).json({
      error: 'Transfer not found',
    });
  }

  console.log('[API] Transfer status:', status);

  res.json(status);
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
  } catch (error: any) {
    console.error('[API] Batch transfer request failed:', error.message);
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
