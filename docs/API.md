# API Documentation

Complete reference for the NEAR FT Transfer API endpoints.

## Base URL

```
http://localhost:3000
```

Replace with your deployed server URL in production.

## Endpoints

### 1. Health Check

Check if the API server is running.

**Endpoint:** `GET /health`

**Request:**
```bash
curl http://localhost:3000/health
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

**Use Case:** Health monitoring, load balancer checks

---

### 2. Queue Single Transfer

Queue a single FT transfer for processing.

**Endpoint:** `POST /transfer`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "receiver_id": "alice.testnet",
  "amount": "1000000000000000000",
  "memo": "Payment for services"
}
```

**Parameters:**
- `receiver_id` (string, required): NEAR account ID of the recipient
- `amount` (string, required): Amount to transfer in smallest token units (e.g., yoctoNEAR)
- `memo` (string, optional): Transfer memo/description

**Example:**
```bash
curl -X POST http://localhost:3000/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "receiver_id": "alice.testnet",
    "amount": "1000000000000000000",
    "memo": "Reward payment"
  }'
```

**Response:** `200 OK`
```json
{
  "transfer_id": "tx_1705324800000_a1b2c3d4e5f6g7h8",
  "status": "queued"
}
```

**Error Responses:**

`400 Bad Request` - Missing required fields:
```json
{
  "error": "receiver_id is required"
}
```

`400 Bad Request` - Invalid amount:
```json
{
  "error": "amount must be a valid number string"
}
```

`500 Internal Server Error` - Server error:
```json
{
  "error": "Error message"
}
```

---

### 3. Queue Batch Transfers

Queue multiple FT transfers at once.

**Endpoint:** `POST /transfer/batch`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "transfers": [
    {
      "receiver_id": "alice.testnet",
      "amount": "1000000000000000000",
      "memo": "Transfer 1"
    },
    {
      "receiver_id": "bob.testnet",
      "amount": "2000000000000000000",
      "memo": "Transfer 2"
    },
    {
      "receiver_id": "charlie.testnet",
      "amount": "3000000000000000000"
    }
  ]
}
```

**Parameters:**
- `transfers` (array, required): Array of transfer objects
  - Each object has the same structure as single transfer

**Example:**
```bash
curl -X POST http://localhost:3000/transfer/batch \
  -H "Content-Type: application/json" \
  -d '{
    "transfers": [
      {"receiver_id": "alice.testnet", "amount": "1000000000000000000"},
      {"receiver_id": "bob.testnet", "amount": "2000000000000000000"}
    ]
  }'
```

**Response:** `200 OK`
```json
{
  "count": 2,
  "transfers": [
    {
      "transfer_id": "tx_1705324800000_a1b2c3d4e5f6g7h8",
      "status": "queued"
    },
    {
      "transfer_id": "tx_1705324800001_b2c3d4e5f6g7h8i9",
      "status": "queued"
    }
  ]
}
```

**Error Responses:**

`400 Bad Request`:
```json
{
  "error": "transfers must be an array"
}
```

---

### 4. Get Transfer Status

Retrieve the status of a specific transfer.

**Endpoint:** `GET /transfer/:id`

**Parameters:**
- `id` (string, required): Transfer ID returned from POST /transfer

**Example:**
```bash
curl http://localhost:3000/transfer/tx_1705324800000_a1b2c3d4e5f6g7h8
```

**Response:** `200 OK`

Transfer is queued:
```json
{
  "transfer_id": "tx_1705324800000_a1b2c3d4e5f6g7h8",
  "status": "queued"
}
```

Transfer is confirmed:
```json
{
  "transfer_id": "tx_1705324800000_a1b2c3d4e5f6g7h8",
  "status": "confirmed",
  "transaction_hash": "HjKLmNoPqRsTuVwXyZ1234567890aBcDeFgHiJkLmNoPqRsTuVwXyZ"
}
```

Transfer failed:
```json
{
  "transfer_id": "tx_1705324800000_a1b2c3d4e5f6g7h8",
  "status": "failed",
  "error": "Account does not exist"
}
```

**Status Values:**
- `queued`: Transfer is in queue waiting to be processed
- `processing`: Transfer is being processed
- `sent`: Transaction has been sent to NEAR network
- `confirmed`: Transfer confirmed on-chain
- `failed`: Transfer failed (see error field)

**Error Responses:**

`404 Not Found`:
```json
{
  "error": "Transfer not found"
}
```

---

### 5. Get Service Statistics

Retrieve service statistics and performance metrics.

**Endpoint:** `GET /stats`

**Example:**
```bash
curl http://localhost:3000/stats
```

**Response:** `200 OK`
```json
{
  "queue_size": 150,
  "processing_queue_size": 5,
  "total_transfers": 60000,
  "statuses": {
    "confirmed": 58500,
    "queued": 150,
    "processing": 500,
    "failed": 850
  },
  "nonce_manager": {
    "total": 10,
    "in_use": 3,
    "available": 7,
    "nonces": [1001, 1011, 1021, 1031, 1041, 1051, 1061, 1071, 1081, 1091]
  }
}
```

**Response Fields:**
- `queue_size`: Number of transfers in queue
- `processing_queue_size`: Number of batches currently being processed
- `total_transfers`: Total transfers handled since server start
- `statuses`: Breakdown of transfer statuses
- `nonce_manager`: Access key statistics
  - `total`: Total access keys
  - `in_use`: Keys currently in use
  - `available`: Keys available for use
  - `nonces`: Current nonce values for each key

---

## Amount Format

The `amount` field must be a string representation of the token amount in the smallest unit.

**Examples:**

For a token with 18 decimals (like most FT tokens):
- 1 token = `"1000000000000000000"`
- 0.5 tokens = `"500000000000000000"`
- 100 tokens = `"100000000000000000000"`

For a token with 6 decimals (like USDC):
- 1 USDC = `"1000000"`
- 0.5 USDC = `"500000"`
- 100 USDC = `"100000000"`

**Helper function:**
```javascript
function tokenToAmount(tokens, decimals = 18) {
  const amount = BigInt(Math.floor(tokens * 10 ** decimals));
  return amount.toString();
}

// Examples:
tokenToAmount(1, 18)    // "1000000000000000000"
tokenToAmount(0.5, 18)  // "500000000000000000"
tokenToAmount(100, 6)   // "100000000"
```

---

## Rate Limiting

The service does not implement rate limiting internally. It is designed to be deployed behind a frontend/gateway that handles:
- Authentication
- Authorization
- Rate limiting
- Request validation

**Recommended limits:**
- Individual users: 10-100 requests/minute
- Batch endpoint: 1-10 requests/minute
- Monitor `/stats` endpoint for queue buildup

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Error description"
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad request (invalid input)
- `404`: Not found (transfer ID doesn't exist)
- `500`: Internal server error

---

## Best Practices

### 1. Batch Requests When Possible

Instead of sending 100 individual requests:
```bash
# Don't do this:
for i in {1..100}; do
  curl -X POST http://localhost:3000/transfer -d "{...}"
done
```

Use the batch endpoint:
```bash
# Do this:
curl -X POST http://localhost:3000/transfer/batch \
  -d '{"transfers": [...]}'
```

### 2. Check Transfer Status

After queuing, check status periodically:
```bash
# Queue transfer
TRANSFER_ID=$(curl -X POST ... | jq -r '.transfer_id')

# Wait a moment
sleep 2

# Check status
curl http://localhost:3000/transfer/$TRANSFER_ID
```

### 3. Monitor Statistics

Regularly check `/stats` to ensure the queue isn't backing up:
```bash
while true; do
  curl http://localhost:3000/stats | jq '.queue_size'
  sleep 5
done
```

### 4. Handle Failures

Check for failed transfers and retry if needed:
```bash
# Get stats
STATS=$(curl http://localhost:3000/stats)

# Check failed count
FAILED=$(echo $STATS | jq '.statuses.failed')

if [ $FAILED -gt 0 ]; then
  echo "Warning: $FAILED failed transfers"
fi
```

---

## Integration Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function transferTokens(receiverId, amount, memo) {
  try {
    const response = await axios.post(`${API_URL}/transfer`, {
      receiver_id: receiverId,
      amount: amount,
      memo: memo
    });

    console.log('Transfer queued:', response.data.transfer_id);
    return response.data;
  } catch (error) {
    console.error('Transfer failed:', error.response.data);
    throw error;
  }
}

async function checkStatus(transferId) {
  const response = await axios.get(`${API_URL}/transfer/${transferId}`);
  return response.data;
}

// Usage
(async () => {
  const transfer = await transferTokens(
    'alice.testnet',
    '1000000000000000000',
    'Payment'
  );

  // Wait and check status
  await new Promise(resolve => setTimeout(resolve, 2000));
  const status = await checkStatus(transfer.transfer_id);
  console.log('Status:', status);
})();
```

### Python

```python
import requests
import time

API_URL = 'http://localhost:3000'

def transfer_tokens(receiver_id, amount, memo=None):
    response = requests.post(f'{API_URL}/transfer', json={
        'receiver_id': receiver_id,
        'amount': amount,
        'memo': memo
    })
    response.raise_for_status()
    return response.json()

def check_status(transfer_id):
    response = requests.get(f'{API_URL}/transfer/{transfer_id}')
    response.raise_for_status()
    return response.json()

# Usage
transfer = transfer_tokens('alice.testnet', '1000000000000000000', 'Payment')
print(f"Transfer queued: {transfer['transfer_id']}")

time.sleep(2)
status = check_status(transfer['transfer_id'])
print(f"Status: {status['status']}")
```

### cURL

```bash
#!/bin/bash

API_URL="http://localhost:3000"

# Transfer tokens
RESPONSE=$(curl -s -X POST "$API_URL/transfer" \
  -H "Content-Type: application/json" \
  -d '{
    "receiver_id": "alice.testnet",
    "amount": "1000000000000000000",
    "memo": "Payment"
  }')

TRANSFER_ID=$(echo $RESPONSE | jq -r '.transfer_id')
echo "Transfer queued: $TRANSFER_ID"

# Wait
sleep 2

# Check status
STATUS=$(curl -s "$API_URL/transfer/$TRANSFER_ID")
echo "Status: $(echo $STATUS | jq -r '.status')"
```

---

## Testing

See the benchmark scripts for load testing examples:
- `benchmark/localnet.ts` - Localnet testing
- `benchmark/testnet.ts` - Testnet testing

Run with:
```bash
npm run benchmark:local
npm run benchmark:testnet
```
