# Quick Start Guide

Get the NEAR FT Transfer API running in 5 minutes!

## Prerequisites

- Node.js 18+
- A NEAR testnet account
- FT tokens to distribute

## Step 1: Installation

```bash
cd near-ft-transfer-api
npm install
```

## Step 2: Configuration

### Option A: Automatic Setup (Testnet)

```bash
./scripts/setup-testnet.sh
```

This script will:
- Verify your NEAR CLI login
- Get your account credentials
- Create a `.env` file automatically

### Option B: Manual Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
NETWORK=testnet
RPC_URL=https://rpc.testnet.near.org
SENDER_ACCOUNT_ID=your-account.testnet
SENDER_PRIVATE_KEY=ed25519:your_private_key_here
FT_CONTRACT_ID=your-token.testnet
```

**Finding your private key:**
```bash
cat ~/.near-credentials/testnet/your-account.testnet.json
```

## Step 3: Build

```bash
npm run build
```

## Step 4: Run

```bash
npm start
```

You should see:

```
========================================
NEAR FT Transfer API Server
========================================
[CONFIG] Loaded configuration: { network: 'testnet', ... }
[TRANSFER_SERVICE] Initializing NEAR connection...
[NONCE_MANAGER] Initialized 10 access keys for your-account.testnet
========================================
[SERVER] API server listening on http://0.0.0.0:3000
========================================
```

## Step 5: Test

In another terminal:

```bash
./scripts/test-api.sh
```

Or manually test with curl:

```bash
# Health check
curl http://localhost:3000/health

# Queue a transfer
curl -X POST http://localhost:3000/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "receiver_id": "alice.testnet",
    "amount": "1000000000000000000",
    "memo": "Test transfer"
  }'

# Check stats
curl http://localhost:3000/stats
```

## Step 6: Benchmark

Run a benchmark to test performance:

```bash
# Smaller test (1000 transfers)
TOTAL_TRANSFERS=1000 CONCURRENT_REQUESTS=50 npm run benchmark:testnet

# Full test (60,000 transfers over 10 minutes)
npm run benchmark:testnet
```

## Common Issues

### "Account does not exist"
- Make sure your account has NEAR balance
- Verify the account ID is correct

### "Private key invalid"
- Check the private key format: `ed25519:...`
- Ensure no extra spaces or quotes

### "FT contract not found"
- Verify the FT contract is deployed
- Check the contract ID is correct

### "Insufficient funds"
- Add more NEAR to your account
- Get testnet NEAR from: https://near-faucet.io/

## Next Steps

- Read [README.md](README.md) for full documentation
- See [docs/API.md](docs/API.md) for API reference
- Check [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/stats` | Service statistics |
| POST | `/transfer` | Queue single transfer |
| POST | `/transfer/batch` | Queue multiple transfers |
| GET | `/transfer/:id` | Get transfer status |

## Example: Queue a Transfer

```javascript
// Node.js example
const response = await fetch('http://localhost:3000/transfer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    receiver_id: 'alice.testnet',
    amount: '1000000000000000000', // 1 token (18 decimals)
    memo: 'Payment'
  })
});

const data = await response.json();
console.log('Transfer ID:', data.transfer_id);
```

## Performance Targets

The API is designed to achieve:

- **100+ transfers per second** sustained throughput
- **Sub-100ms** API response time
- **99%+** success rate

Run benchmarks to verify performance on your infrastructure.

## Support

- Check logs for detailed error messages
- All operations are logged with `[COMPONENT]` prefixes
- See README.md for troubleshooting tips
- Open an issue on GitHub for help

---

**Ready to scale!** 🚀

Your NEAR FT Transfer API is now ready to handle high-volume token distributions.
