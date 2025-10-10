#!/bin/bash
set -e

echo "🚀 Deploying NEAR FT Transfer API (TESTNET)"
echo "============================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production no encontrado"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Verify critical variables
if [ -z "$SENDER_ACCOUNT_ID" ] || [ -z "$SENDER_PRIVATE_KEY" ]; then
    echo "❌ Error: Falta SENDER_ACCOUNT_ID o SENDER_PRIVATE_KEY"
    exit 1
fi

echo -e "${YELLOW}📋 Configuración:${NC}"
echo "   Account: $SENDER_ACCOUNT_ID"
echo "   FT Contract: $FT_CONTRACT_ID"
echo "   Network: TESTNET"
echo ""

# Build and start
echo -e "${GREEN}🔨 Building Docker image...${NC}"
docker-compose build

echo -e "${GREEN}🚀 Starting services...${NC}"
docker-compose up -d

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 Check status:"
echo "   docker-compose ps"
echo "   docker-compose logs -f api"
echo ""
echo "🔍 Health check:"
echo "   curl http://localhost:3000/health"
echo ""
echo "📈 Stats:"
echo "   curl http://localhost:3000/stats"
echo ""
