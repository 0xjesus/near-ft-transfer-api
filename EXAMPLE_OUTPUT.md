# Example Console Output

This document shows what you'll see when running the NEAR FT Transfer API.

## Server Startup

```
========================================
NEAR FT Transfer API Server
========================================
[CONFIG] Loaded configuration: {
  network: 'testnet',
  rpcUrl: 'https://rpc.testnet.near.org',
  senderAccountId: 'your-account.testnet',
  ftContractId: 'your-token.testnet',
  port: 3000,
  maxBatchSize: 100,
  maxConcurrentBatches: 10,
  accessKeyCount: 10,
  batchIntervalMs: 100
}
[CONFIG] Configuration validated successfully
[TRANSFER_SERVICE] Initialized with concurrency: 10
[TRANSFER_SERVICE] Initializing NEAR connection...
[TRANSFER_SERVICE] Connected to NEAR network: testnet
[TRANSFER_SERVICE] Loaded account: your-account.testnet
[NONCE_MANAGER] Initializing 10 access keys for your-account.testnet
[NONCE_MANAGER] Current nonce from network: 1234567
[NONCE_MANAGER] Initialized access key 1/10 with nonce 1234567
[NONCE_MANAGER] Initialized access key 2/10 with nonce 1234568
[NONCE_MANAGER] Initialized access key 3/10 with nonce 1234569
[NONCE_MANAGER] Initialized access key 4/10 with nonce 1234570
[NONCE_MANAGER] Initialized access key 5/10 with nonce 1234571
[NONCE_MANAGER] Initialized access key 6/10 with nonce 1234572
[NONCE_MANAGER] Initialized access key 7/10 with nonce 1234573
[NONCE_MANAGER] Initialized access key 8/10 with nonce 1234574
[NONCE_MANAGER] Initialized access key 9/10 with nonce 1234575
[NONCE_MANAGER] Initialized access key 10/10 with nonce 1234576
[NONCE_MANAGER] Initialized 10 access keys
[TRANSFER_SERVICE] Batch processing started (interval: 100ms)
[TRANSFER_SERVICE] Initialization complete
========================================
[SERVER] API server listening on http://0.0.0.0:3000
========================================
Endpoints:
  GET  /health              - Health check
  GET  /stats               - Service statistics
  POST /transfer            - Queue a single transfer
  POST /transfer/batch      - Queue multiple transfers
  GET  /transfer/:id        - Get transfer status
========================================
```

## Single Transfer Request

```
[API] Transfer request received: {
  receiver_id: 'alice.testnet',
  amount: '1000000000000000000',
  memo: 'Test payment'
}
[TRANSFER_SERVICE] Queued transfer tx_1705324800000_a1b2c3d4e5f6g7h8 to alice.testnet for 1000000000000000000 tokens (queue size: 1)
[API] Transfer queued successfully: {
  transfer_id: 'tx_1705324800000_a1b2c3d4e5f6g7h8',
  status: 'queued'
}
```

## Batch Processing

```
[TRANSFER_SERVICE] Batch interval triggered (queue size: 100)
[TRANSFER_SERVICE] Processing batch of 100 transfers (0 remaining in queue)
[TRANSFER_SERVICE] Executing batch batch_1705324801000_ab12cd34 with 100 transfers
[TRANSFER_SERVICE] Transfer tx_1705324800000_a1b2c3d4e5f6g7h8 status: queued -> processing
[TRANSFER_SERVICE] Transfer tx_1705324800001_b2c3d4e5f6g7h8i9 status: queued -> processing
... (98 more status updates)
[NONCE_MANAGER] Allocated access key 1 with nonce 1234567
[TRANSFER_SERVICE] Using access key with nonce 1234567 for batch batch_1705324801000_ab12cd34
[TRANSFER_SERVICE] Adding ft_transfer action: alice.testnet <- 1000000000000000000
[TRANSFER_SERVICE] Adding ft_transfer action: bob.testnet <- 2000000000000000000
... (98 more actions)
[TRANSFER_SERVICE] Creating transaction for batch batch_1705324801000_ab12cd34 with 100 actions
[TRANSFER_SERVICE] Sending batch batch_1705324801000_ab12cd34 transaction to network...
[TRANSFER_SERVICE] Batch batch_1705324801000_ab12cd34 transaction sent successfully
[TRANSFER_SERVICE] Transaction hash: HjKLmNoPqRsTuVwXyZ1234567890aBcDeFgHiJkLmNoPqRsTuVwXyZ
[TRANSFER_SERVICE] Transaction status: {"SuccessValue":""}
[TRANSFER_SERVICE] Transfer tx_1705324800000_a1b2c3d4e5f6g7h8 status: processing -> confirmed (tx: HjKLmNoPqRsTuVwXyZ1234567890aBcDeFgHiJkLmNoPqRsTuVwXyZ)
[TRANSFER_SERVICE] Transfer tx_1705324800001_b2c3d4e5f6g7h8i9 status: processing -> confirmed (tx: HjKLmNoPqRsTuVwXyZ1234567890aBcDeFgHiJkLmNoPqRsTuVwXyZ)
... (98 more confirmations)
[NONCE_MANAGER] Released access key, new nonce: 1234577
[TRANSFER_SERVICE] Batch batch_1705324801000_ab12cd34 completed successfully
```

## High Load Example

```
[TRANSFER_SERVICE] Queue full (100), processing batch immediately
[TRANSFER_SERVICE] Processing batch of 100 transfers (150 remaining in queue)
[TRANSFER_SERVICE] Executing batch batch_1705324802000_cd34ef56 with 100 transfers
[NONCE_MANAGER] Allocated access key 2 with nonce 1234568
[TRANSFER_SERVICE] Using access key with nonce 1234568 for batch batch_1705324802000_cd34ef56
[TRANSFER_SERVICE] Sending batch batch_1705324802000_cd34ef56 transaction to network...

[TRANSFER_SERVICE] Queue full (100), processing batch immediately
[TRANSFER_SERVICE] Processing batch of 100 transfers (50 remaining in queue)
[TRANSFER_SERVICE] Executing batch batch_1705324802100_ef56gh78 with 100 transfers
[NONCE_MANAGER] Allocated access key 3 with nonce 1234569
[TRANSFER_SERVICE] Using access key with nonce 1234569 for batch batch_1705324802100_ef56gh78
[TRANSFER_SERVICE] Sending batch batch_1705324802100_ef56gh78 transaction to network...

[TRANSFER_SERVICE] Batch batch_1705324802000_cd34ef56 transaction sent successfully
[TRANSFER_SERVICE] Batch batch_1705324802000_cd34ef56 completed successfully
[NONCE_MANAGER] Released access key, new nonce: 1234578

[TRANSFER_SERVICE] Batch batch_1705324802100_ef56gh78 transaction sent successfully
[TRANSFER_SERVICE] Batch batch_1705324802100_ef56gh78 completed successfully
[NONCE_MANAGER] Released access key, new nonce: 1234579
```

## Statistics Request

```
[API] Stats requested
{
  "queue_size": 50,
  "processing_queue_size": 3,
  "total_transfers": 1500,
  "statuses": {
    "confirmed": 1400,
    "queued": 50,
    "processing": 45,
    "failed": 5
  },
  "nonce_manager": {
    "total": 10,
    "in_use": 3,
    "available": 7,
    "nonces": [1234587, 1234588, 1234589, 1234590, 1234591, 1234592, 1234593, 1234594, 1234595, 1234596]
  }
}
```

## Error Handling

```
[TRANSFER_SERVICE] Executing batch batch_1705324803000_gh78ij90 with 100 transfers
[NONCE_MANAGER] Allocated access key 4 with nonce 1234570
[TRANSFER_SERVICE] Using access key with nonce 1234570 for batch batch_1705324803000_gh78ij90
[TRANSFER_SERVICE] Sending batch batch_1705324803000_gh78ij90 transaction to network...
[TRANSFER_SERVICE] Batch batch_1705324803000_gh78ij90 failed: Transaction nonce 1234570 is too small
[TRANSFER_SERVICE] Error details: {...}
[TRANSFER_SERVICE] Transfer tx_1705324800050_abc123def456 status: processing -> failed (Transaction nonce 1234570 is too small)
[TRANSFER_SERVICE] Transfer tx_1705324800051_bcd234efg567 status: processing -> failed (Transaction nonce 1234570 is too small)
... (98 more failures)
[TRANSFER_SERVICE] Re-queued transfer tx_1705324800050_abc123def456 (retry 1/3)
[TRANSFER_SERVICE] Re-queued transfer tx_1705324800051_bcd234efg567 (retry 1/3)
... (98 more re-queues)
```

## Benchmark Output

```
==========================================
NEAR FT Transfer API - Testnet Benchmark
==========================================
Configuration:
  Total Transfers: 60000
  Concurrent Requests: 100
  Duration: 10 minutes
  API URL: http://localhost:3000
==========================================

[BENCHMARK] Checking API health...
[BENCHMARK] API is ready!

[BENCHMARK] Running 600 batches of 100 requests

[BENCHMARK] Batch 1/600: Sending 100 requests...
[BENCHMARK] Transfer 1/60000 queued: tx_1705324800000_a1b2c3d4e5f6g7h8 (45ms)
[BENCHMARK] Transfer 2/60000 queued: tx_1705324800001_b2c3d4e5f6g7h8i9 (47ms)
... (98 more)
[BENCHMARK] Batch 1/600 completed in 2500ms (40.00 tx/sec)

[BENCHMARK] Batch 2/600: Sending 100 requests...
[BENCHMARK] Transfer 101/60000 queued: tx_1705324802500_c3d4e5f6g7h8i9j0 (43ms)
... (99 more)
[BENCHMARK] Batch 2/600 completed in 2400ms (41.67 tx/sec)

... (598 more batches)

[BENCHMARK] Batch 600/600: Sending 100 requests...
[BENCHMARK] Transfer 59901/60000 queued: tx_1705325400000_x9y0z1a2b3c4d5e6 (48ms)
... (99 more)
[BENCHMARK] Batch 600/600 completed in 2550ms (39.22 tx/sec)


==========================================
TESTNET BENCHMARK RESULTS
==========================================
Total Transfers:      60000
Successful Transfers: 59850
Failed Transfers:     150
Success Rate:         99.75%
Duration:             600.45s (10.01 minutes)
Throughput:           99.67 tx/sec
Average Latency:      52.34ms
P50 Latency:          48.00ms
P99 Latency:          145.00ms
==========================================

✅ TARGET MET:
   - Achieved 100+ transfers per second
   - Sustained for 10+ minutes
==========================================

[BENCHMARK] Fetching final API stats...
[BENCHMARK] API Stats:
{
  "queue_size": 0,
  "processing_queue_size": 0,
  "total_transfers": 60000,
  "statuses": {
    "confirmed": 59850,
    "failed": 150
  },
  "nonce_manager": {
    "total": 10,
    "in_use": 0,
    "available": 10,
    "nonces": [1240567, 1240577, 1240587, 1240597, 1240607, 1240617, 1240627, 1240637, 1240647, 1240657]
  }
}

[BENCHMARK] Results saved to benchmark-results-testnet-1705325400000.json
```

## Health Check

```
[API] Health check requested
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

## Graceful Shutdown

```
^C
[SERVER] SIGINT received, shutting down gracefully...
[TRANSFER_SERVICE] Shutting down...
[TRANSFER_SERVICE] Shutdown complete
```

---

## Log Prefixes Explained

| Prefix | Component | Purpose |
|--------|-----------|---------|
| `[CONFIG]` | Configuration | Settings loading and validation |
| `[NONCE_MANAGER]` | Nonce Manager | Access key allocation and nonce tracking |
| `[TRANSFER_SERVICE]` | Transfer Service | Transfer queuing and batch processing |
| `[API]` | API Server | HTTP request handling |
| `[BENCHMARK]` | Benchmark Tools | Performance testing |
| `[SERVER]` | Server | Server lifecycle events |

## Typical Flow

1. **Startup**: Configuration → NEAR connection → Nonce manager → Server ready
2. **Request**: API receives → Service queues → Status returned
3. **Processing**: Queue fills → Batch created → Access key allocated → Transaction sent
4. **Completion**: Transaction confirmed → Statuses updated → Access key released
5. **Monitoring**: Stats endpoint shows real-time metrics

---

This logging system provides complete visibility into:
- System initialization
- Request processing
- Batch formation
- Transaction submission
- Success/failure tracking
- Performance metrics
- Error handling
