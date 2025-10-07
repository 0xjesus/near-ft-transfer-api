#!/bin/bash

# Setup script for testnet deployment
# This script helps you set up a NEAR testnet account and deploy an FT contract for testing

set -e

echo "=========================================="
echo "NEAR FT Transfer API - Testnet Setup"
echo "=========================================="
echo ""

# Check if near-cli is installed
if ! command -v near &> /dev/null; then
    echo "❌ near-cli is not installed"
    echo "Please install it with: npm install -g near-cli"
    exit 1
fi

echo "✓ near-cli is installed"
echo ""

# Check if user is logged in
if [ ! -d ~/.near-credentials/testnet ]; then
    echo "📝 You need to log in to NEAR testnet"
    echo "This will open a browser window..."
    read -p "Press enter to continue..."
    near login
fi

echo "✓ Logged in to NEAR testnet"
echo ""

# Get account ID
read -p "Enter your NEAR testnet account ID: " ACCOUNT_ID

# Verify account exists
echo "Checking account $ACCOUNT_ID..."
if ! near state $ACCOUNT_ID --networkId testnet &> /dev/null; then
    echo "❌ Account $ACCOUNT_ID does not exist"
    exit 1
fi

echo "✓ Account verified"
echo ""

# Ask about FT contract
echo "Do you already have an FT contract deployed?"
read -p "(y/n): " HAS_CONTRACT

if [ "$HAS_CONTRACT" != "y" ]; then
    echo ""
    echo "📝 You need to deploy an FT contract first"
    echo ""
    echo "Option 1: Use an existing FT contract (e.g., usdn.testnet)"
    echo "Option 2: Deploy your own FT contract"
    echo ""
    echo "For testing, you can use this sample FT contract:"
    echo "https://github.com/near-examples/FT"
    echo ""
    echo "Deploy it with:"
    echo "  near deploy --accountId YOUR-TOKEN.testnet --wasmFile path/to/ft.wasm"
    echo "  near call YOUR-TOKEN.testnet new '{\"owner_id\": \"$ACCOUNT_ID\", \"total_supply\": \"1000000000000000000000000\"}' --accountId $ACCOUNT_ID"
    echo ""
    read -p "Press enter when you have deployed your FT contract..."
fi

read -p "Enter your FT contract ID (e.g., your-token.testnet): " FT_CONTRACT

# Verify FT contract
echo "Checking FT contract $FT_CONTRACT..."
if ! near state $FT_CONTRACT --networkId testnet &> /dev/null; then
    echo "❌ Contract $FT_CONTRACT does not exist"
    exit 1
fi

echo "✓ FT contract verified"
echo ""

# Get private key
echo "Getting private key for $ACCOUNT_ID..."
PRIVATE_KEY=$(cat ~/.near-credentials/testnet/$ACCOUNT_ID.json | jq -r '.private_key')

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Could not find private key"
    exit 1
fi

echo "✓ Private key found"
echo ""

# Create .env file
echo "Creating .env file..."
cat > .env << EOF
# NEAR Configuration
NETWORK=testnet
RPC_URL=https://rpc.testnet.near.org
SENDER_ACCOUNT_ID=$ACCOUNT_ID
SENDER_PRIVATE_KEY=$PRIVATE_KEY

# FT Contract
FT_CONTRACT_ID=$FT_CONTRACT

# API Configuration
PORT=3000
API_HOST=0.0.0.0

# Performance Settings
MAX_BATCH_SIZE=100
MAX_CONCURRENT_BATCHES=10
ACCESS_KEY_COUNT=10
BATCH_INTERVAL_MS=100
EOF

echo "✓ .env file created"
echo ""

# Check account balance
echo "Checking account balance..."
BALANCE=$(near state $ACCOUNT_ID --networkId testnet | grep formattedAmount | awk '{print $2}')
echo "Balance: $BALANCE NEAR"

if [ -z "$BALANCE" ]; then
    echo "⚠️  Warning: Could not check balance"
else
    # Compare balance to 5 NEAR (rough minimum for testing)
    if (( $(echo "$BALANCE < 5" | bc -l) )); then
        echo "⚠️  Warning: Balance is low. You may need more NEAR for gas fees"
        echo "Get testnet NEAR from: https://near-faucet.io/"
    else
        echo "✓ Balance is sufficient"
    fi
fi

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Configuration saved to .env"
echo ""
echo "Next steps:"
echo "  1. Install dependencies: npm install"
echo "  2. Build the project: npm run build"
echo "  3. Start the server: npm start"
echo "  4. Test with: npm run benchmark:testnet"
echo ""
echo "API will be available at: http://localhost:3000"
echo "=========================================="
