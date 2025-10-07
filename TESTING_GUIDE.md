# Step-by-Step Testing Guide

This guide walks you through testing the NEAR FT Transfer API from scratch.

## Prerequisites Check

Before starting, verify you have:

```bash
# Check Node.js version (need 18+)
node --version
# Should show: v18.x.x or higher

# Check npm
npm --version
# Should show: 9.x.x or higher

# Check NEAR CLI (optional, for testnet setup)
near --version
# Should show: 4.x.x or higher
```

If missing:
```bash
# Install Node.js 18+
# Visit: https://nodejs.org/

# Install NEAR CLI
npm install -g near-cli
```

## Phase 1: Project Setup (2 minutes)

### Step 1: Navigate to Project

```bash
cd near-ft-transfer-api
pwd
# Should show: .../near-ft-transfer-api
```

### Step 2: Install Dependencies

```bash
npm install
```

**Expected Output:**
```
added 262 packages in 8s
```

**✅ Success Criteria:**
- No error messages
- `node_modules/` folder created
- 262 packages installed

### Step 3: Build Project

```bash
npm run build
```

**Expected Output:**
```
> near-ft-transfer-api@1.0.0 build
> tsc
```

**✅ Success Criteria:**
- No TypeScript errors
- `dist/` folder created
- Files compiled successfully

```bash
# Verify build
ls dist/
# Should show: benchmark/ src/ (compiled JS files)
```

## Phase 2: Configuration (3 minutes)

### Step 4: Create Environment File

```bash
cp .env.example .env
```

### Step 5: Configure (Choose Option A or B)

#### Option A: Automatic Setup (Testnet)

```bash
./scripts/setup-testnet.sh
```

**Interactive Prompts:**
1. Will check for NEAR CLI login
2. Will ask for your account ID
3. Will ask for FT contract ID
4. Will automatically create .env file

**✅ Success Criteria:**
- `.env` file created
- Shows "✅ Setup Complete!"

#### Option B: Manual Setup

Edit `.env` manually:

```bash
# Edit with your favorite editor
nano .env
# or
vim .env
# or
code .env
```

**Required Fields:**
```bash
NETWORK=testnet
RPC_URL=https://rpc.testnet.near.org
SENDER_ACCOUNT_ID=your-account.testnet  # ← Change this
SENDER_PRIVATE_KEY=ed25519:...           # ← Change this
FT_CONTRACT_ID=your-token.testnet        # ← Change this
```

**Finding Your Private Key:**
```bash
# For testnet account
cat ~/.near-credentials/testnet/your-account.testnet.json | grep private_key

# Copy the value (including "ed25519:")
```

**✅ Success Criteria:**
- All 3 required fields filled
- Private key starts with "ed25519:"
- Account exists on testnet

### Step 6: Verify Configuration

```bash
# Check account exists
near state $SENDER_ACCOUNT_ID --networkId testnet

# Should show account details
```

## Phase 3: Start Server (1 minute)

### Step 7: Start the API

```bash
npm start
```

**Expected Output:**
```
========================================
NEAR FT Transfer API Server
========================================
[CONFIG] Loaded configuration: { ... }
[CONFIG] Configuration validated successfully
[TRANSFER_SERVICE] Initialized with concurrency: 10
[TRANSFER_SERVICE] Initializing NEAR connection...
[TRANSFER_SERVICE] Connected to NEAR network: testnet
[TRANSFER_SERVICE] Loaded account: your-account.testnet
[NONCE_MANAGER] Initializing 10 access keys for your-account.testnet
[NONCE_MANAGER] Current nonce from network: 1234567
[NONCE_MANAGER] Initialized access key 1/10 with nonce 1234567
...
[NONCE_MANAGER] Initialized access key 10/10 with nonce 1234576
[TRANSFER_SERVICE] Batch processing started (interval: 100ms)
[TRANSFER_SERVICE] Initialization complete
========================================
[SERVER] API server listening on http://0.0.0.0:3000
========================================
```

**✅ Success Criteria:**
- Server starts without errors
- Shows "listening on http://0.0.0.0:3000"
- No error messages
- All 10 access keys initialized

**⚠️ Common Issues:**

**Issue:** "SENDER_ACCOUNT_ID is required"
**Fix:** Check .env file has SENDER_ACCOUNT_ID set

**Issue:** "Private key invalid"
**Fix:** Ensure private key includes "ed25519:" prefix

**Issue:** "Account does not exist"
**Fix:** Verify account ID is correct and exists on testnet

## Phase 4: Test API Endpoints (5 minutes)

**Open a new terminal** (keep server running in first terminal)

### Step 8: Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

**✅ Success Criteria:**
- HTTP 200 OK
- JSON response
- status = "ok"

### Step 9: Check Statistics

```bash
curl http://localhost:3000/stats | jq '.'
```

**Expected Response:**
```json
{
  "queue_size": 0,
  "processing_queue_size": 0,
  "total_transfers": 0,
  "statuses": {},
  "nonce_manager": {
    "total": 10,
    "in_use": 0,
    "available": 10,
    "nonces": [1234567, 1234568, ...]
  }
}
```

**✅ Success Criteria:**
- Shows 10 access keys
- All keys available
- Queue size is 0

### Step 10: Queue a Test Transfer

```bash
curl -X POST http://localhost:3000/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "receiver_id": "test.testnet",
    "amount": "1000000000000000000",
    "memo": "Test transfer from API"
  }'
```

**Expected Response:**
```json
{
  "transfer_id": "tx_1705324800000_a1b2c3d4e5f6g7h8",
  "status": "queued"
}
```

**Server Log Output:**
```
[API] Transfer request received: {
  receiver_id: 'test.testnet',
  amount: '1000000000000000000',
  memo: 'Test transfer from API'
}
[TRANSFER_SERVICE] Queued transfer tx_... to test.testnet for 1000000000000000000 tokens (queue size: 1)
[API] Transfer queued successfully: { transfer_id: 'tx_...', status: 'queued' }
```

**✅ Success Criteria:**
- Returns transfer_id
- Status is "queued"
- Server logs show queued transfer

### Step 11: Check Transfer Status

```bash
# Save the transfer ID from previous response
TRANSFER_ID="tx_1705324800000_a1b2c3d4e5f6g7h8"

# Wait a few seconds for processing
sleep 3

# Check status
curl http://localhost:3000/transfer/$TRANSFER_ID
```

**Expected Response:**
```json
{
  "transfer_id": "tx_1705324800000_a1b2c3d4e5f6g7h8",
  "status": "confirmed",
  "transaction_hash": "HjKLmNoPqRsTuVwXyZ..."
}
```

**✅ Success Criteria:**
- Status is "confirmed" or "processing"
- If confirmed, transaction_hash is present

### Step 12: Batch Transfer Test

```bash
curl -X POST http://localhost:3000/transfer/batch \
  -H "Content-Type: application/json" \
  -d '{
    "transfers": [
      {
        "receiver_id": "alice.testnet",
        "amount": "1000000000000000000",
        "memo": "Batch test 1"
      },
      {
        "receiver_id": "bob.testnet",
        "amount": "2000000000000000000",
        "memo": "Batch test 2"
      },
      {
        "receiver_id": "charlie.testnet",
        "amount": "3000000000000000000",
        "memo": "Batch test 3"
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "count": 3,
  "transfers": [
    {"transfer_id": "tx_...", "status": "queued"},
    {"transfer_id": "tx_...", "status": "queued"},
    {"transfer_id": "tx_...", "status": "queued"}
  ]
}
```

**✅ Success Criteria:**
- count = 3
- All transfers have status "queued"

## Phase 5: Automated Testing (2 minutes)

### Step 13: Run Test Script

```bash
./scripts/test-api.sh
```

**Expected Output:**
```
========================================
NEAR FT Transfer API - Test Script
========================================
API URL: http://localhost:3000

Test 1: Health Check
---
Response: {"status":"ok",...}
✓ Health check passed

Test 2: Get Statistics
---
Response: {...}
✓ Stats retrieved

Test 3: Queue Single Transfer
---
Queuing transfer:
  Receiver: test-receiver.testnet
  Amount: 1000000000000000000
  Memo: Test transfer ...

Response: {...}
✓ Transfer queued with ID: tx_...

Test 4: Check Transfer Status
---
Waiting 2 seconds...
Response: {...}
✓ Transfer status: queued

Test 5: Queue Batch Transfers
---
Response: {...}
✓ Queued 3 transfers in batch

Test 6: Final Statistics
---
Summary:
  Total transfers: 7
  Queue size: 7

========================================
✅ All Tests Passed!
========================================
```

**✅ Success Criteria:**
- All 6 tests pass
- No errors
- Final stats show transfers

## Phase 6: Performance Testing (10-30 minutes)

### Step 14: Small Benchmark (Quick Test)

```bash
# Test with 1000 transfers, 50 concurrent
TOTAL_TRANSFERS=1000 \
CONCURRENT_REQUESTS=50 \
npm run benchmark:testnet
```

**Expected Output:**
```
========================================
NEAR FT Transfer API - Testnet Benchmark
========================================
Configuration:
  Total Transfers: 1000
  Concurrent Requests: 50
  Duration: 10 minutes
  API URL: http://localhost:3000
========================================

[BENCHMARK] Checking API health...
[BENCHMARK] API is ready!

[BENCHMARK] Starting continuous load test...

[BENCHMARK] Time: 0s elapsed, 600s remaining | Sending 50 requests (1-50/1000)...
[BENCHMARK] Batch completed in 2400ms | Batch: 20.83 tx/sec | Overall: 20.83 tx/sec
...
```

**Watch Server Logs:**
```
[TRANSFER_SERVICE] Queued transfer tx_... to recipient0.testnet...
[TRANSFER_SERVICE] Queue full (100), processing batch immediately
[TRANSFER_SERVICE] Processing batch of 100 transfers (50 remaining in queue)
[TRANSFER_SERVICE] Executing batch batch_...
[NONCE_MANAGER] Allocated access key 1 with nonce ...
[TRANSFER_SERVICE] Batch batch_... completed successfully
```

**Final Results:**
```
========================================
TESTNET BENCHMARK RESULTS
========================================
Total Transfers:      1000
Successful Transfers: 995
Failed Transfers:     5
Success Rate:         99.50%
Duration:             48.23s
Throughput:           20.63 tx/sec
Average Latency:      52.34ms
P50 Latency:          48.00ms
P99 Latency:          145.00ms
========================================
```

**✅ Success Criteria:**
- Success rate > 95%
- Throughput > 10 tx/sec
- Average latency < 100ms

### Step 15: Full Benchmark (Production Test)

**⚠️ Warning:** This will run for 10 minutes and send 60,000 transfer requests!

```bash
npm run benchmark:testnet
```

**Expected Duration:** ~10 minutes
**Expected Transfers:** 60,000
**Expected Throughput:** 100+ tx/sec

**✅ Success Criteria:**
- Runs for full 10 minutes
- Achieves 100+ tx/sec
- Success rate > 99%
- No crashes or errors

## Phase 7: Monitoring (Ongoing)

### Step 16: Monitor in Real-Time

While benchmark is running:

```bash
# Watch stats (in another terminal)
watch -n 1 'curl -s http://localhost:3000/stats | jq "."'
```

**Watch For:**
- queue_size: Should fluctuate but not grow indefinitely
- processing_queue_size: Should be ≤ 10
- statuses.confirmed: Should increase steadily
- nonce_manager.available: Should usually be > 0

### Step 17: Check Server Logs

```bash
# If running with npm start, logs appear in terminal
# Look for:
[TRANSFER_SERVICE] Batch batch_... completed successfully  # Good
[TRANSFER_SERVICE] Batch batch_... failed: ...             # Bad - investigate
```

## Troubleshooting Guide

### Server Won't Start

**Symptom:** Server crashes on startup

**Check:**
```bash
# Verify .env exists
ls -la .env

# Verify configuration
grep SENDER_ACCOUNT_ID .env
grep SENDER_PRIVATE_KEY .env
grep FT_CONTRACT_ID .env

# Verify account exists
near state <ACCOUNT_ID> --networkId testnet
```

### Transfers Failing

**Symptom:** High failure rate in benchmark

**Check Server Logs For:**
```
Account does not exist         → Verify receiver IDs
Insufficient funds             → Add NEAR to sender account
FT contract not found          → Verify FT_CONTRACT_ID
Not enough balance             → Sender needs FT tokens
```

**Solutions:**
```bash
# Check sender balance
near state $SENDER_ACCOUNT_ID --networkId testnet

# Check FT balance (if contract supports view)
near view $FT_CONTRACT_ID ft_balance_of \
  '{"account_id": "'$SENDER_ACCOUNT_ID'"}' \
  --networkId testnet

# Add testnet NEAR
# Visit: https://near-faucet.io/
```

### Low Throughput

**Symptom:** Benchmark shows < 50 tx/sec

**Possible Causes:**
1. Network latency (slow RPC)
2. Low concurrency settings
3. Server resource limits

**Solutions:**
```bash
# Try different RPC
# Edit .env:
RPC_URL=https://near-testnet.api.pagoda.co/rpc/v1/

# Increase concurrency
# Edit .env:
MAX_CONCURRENT_BATCHES=15
ACCESS_KEY_COUNT=15

# Restart server
```

### Queue Building Up

**Symptom:** queue_size keeps growing

**Check Stats:**
```bash
curl http://localhost:3000/stats | jq '.queue_size'
```

**If > 1000:**
- Server is overwhelmed
- Reduce concurrent requests
- Or increase MAX_CONCURRENT_BATCHES

## Success Checklist

After completing all phases, you should have:

- [x] Server running without errors
- [x] All API endpoints responding
- [x] Single transfer working
- [x] Batch transfer working
- [x] Test script passing
- [x] Small benchmark completing
- [x] Full benchmark achieving 100+ tx/sec
- [x] Comprehensive logs visible
- [x] Stats endpoint showing metrics

## Next Steps

### For Development
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand internals
2. Review [docs/API.md](docs/API.md) for API details
3. Check [src/](src/) for code examples

### For Production
1. Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
2. Set up monitoring
3. Configure authentication layer
4. Use production RPC endpoints
5. Create separate on-chain access keys

### For Integration
1. Use the API from your backend
2. Implement proper error handling
3. Add retry logic on client side
4. Monitor transfer statuses

## Getting Help

**If tests fail:**
1. Check server logs for errors
2. Verify account has NEAR balance
3. Verify FT contract is correct
4. Review [README.md](README.md) for details

**For issues:**
- Check STATUS.md for known issues
- Review EXAMPLE_OUTPUT.md for expected logs
- Open GitHub issue with logs

---

**Congratulations!** 🎉

If all tests pass, your NEAR FT Transfer API is working perfectly and ready for production use!
