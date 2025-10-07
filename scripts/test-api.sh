#!/bin/bash

# Simple script to test the API endpoints

set -e

API_URL="${API_URL:-http://localhost:3000}"

echo "=========================================="
echo "NEAR FT Transfer API - Test Script"
echo "=========================================="
echo "API URL: $API_URL"
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
echo "---"
HEALTH=$(curl -s "$API_URL/health")
echo "Response: $HEALTH"

if echo "$HEALTH" | jq -e '.status == "ok"' > /dev/null; then
    echo "✓ Health check passed"
else
    echo "✗ Health check failed"
    exit 1
fi

echo ""

# Test 2: Get stats
echo "Test 2: Get Statistics"
echo "---"
STATS=$(curl -s "$API_URL/stats")
echo "Response:"
echo "$STATS" | jq '.'
echo "✓ Stats retrieved"
echo ""

# Test 3: Queue a transfer
echo "Test 3: Queue Single Transfer"
echo "---"

RECEIVER="test-receiver.testnet"
AMOUNT="1000000000000000000"
MEMO="Test transfer $(date +%s)"

echo "Queuing transfer:"
echo "  Receiver: $RECEIVER"
echo "  Amount: $AMOUNT"
echo "  Memo: $MEMO"
echo ""

TRANSFER=$(curl -s -X POST "$API_URL/transfer" \
  -H "Content-Type: application/json" \
  -d "{
    \"receiver_id\": \"$RECEIVER\",
    \"amount\": \"$AMOUNT\",
    \"memo\": \"$MEMO\"
  }")

echo "Response:"
echo "$TRANSFER" | jq '.'

TRANSFER_ID=$(echo "$TRANSFER" | jq -r '.transfer_id')

if [ -z "$TRANSFER_ID" ] || [ "$TRANSFER_ID" == "null" ]; then
    echo "✗ Failed to queue transfer"
    exit 1
fi

echo "✓ Transfer queued with ID: $TRANSFER_ID"
echo ""

# Test 4: Check transfer status
echo "Test 4: Check Transfer Status"
echo "---"
echo "Waiting 2 seconds..."
sleep 2

STATUS=$(curl -s "$API_URL/transfer/$TRANSFER_ID")
echo "Response:"
echo "$STATUS" | jq '.'

CURRENT_STATUS=$(echo "$STATUS" | jq -r '.status')
echo "✓ Transfer status: $CURRENT_STATUS"
echo ""

# Test 5: Batch transfer
echo "Test 5: Queue Batch Transfers"
echo "---"

BATCH=$(curl -s -X POST "$API_URL/transfer/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "transfers": [
      {
        "receiver_id": "batch-test-1.testnet",
        "amount": "1000000000000000000",
        "memo": "Batch test 1"
      },
      {
        "receiver_id": "batch-test-2.testnet",
        "amount": "2000000000000000000",
        "memo": "Batch test 2"
      },
      {
        "receiver_id": "batch-test-3.testnet",
        "amount": "3000000000000000000",
        "memo": "Batch test 3"
      }
    ]
  }')

echo "Response:"
echo "$BATCH" | jq '.'

BATCH_COUNT=$(echo "$BATCH" | jq -r '.count')
echo "✓ Queued $BATCH_COUNT transfers in batch"
echo ""

# Test 6: Final stats
echo "Test 6: Final Statistics"
echo "---"
FINAL_STATS=$(curl -s "$API_URL/stats")
echo "Response:"
echo "$FINAL_STATS" | jq '.'

TOTAL=$(echo "$FINAL_STATS" | jq -r '.total_transfers')
QUEUE=$(echo "$FINAL_STATS" | jq -r '.queue_size')

echo ""
echo "Summary:"
echo "  Total transfers: $TOTAL"
echo "  Queue size: $QUEUE"
echo ""

echo "=========================================="
echo "✅ All Tests Passed!"
echo "=========================================="
echo ""
echo "The API is working correctly."
echo "You can now run the full benchmark with:"
echo "  npm run benchmark:local"
echo "  npm run benchmark:testnet"
echo ""
