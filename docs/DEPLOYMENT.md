# Deployment Guide

This guide covers deploying the NEAR FT Transfer API to production environments.

## Prerequisites

1. **NEAR Account Setup**
   - Create a NEAR account (testnet or mainnet)
   - Fund the account with sufficient NEAR for gas fees
   - Ensure the account has FT tokens to distribute

2. **System Requirements**
   - Node.js 18+ or Docker
   - 2GB+ RAM
   - Stable internet connection
   - Access to NEAR RPC endpoint

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# NEAR Network Configuration
NETWORK=testnet                              # or mainnet
RPC_URL=https://rpc.testnet.near.org        # or mainnet RPC
SENDER_ACCOUNT_ID=your-account.testnet
SENDER_PRIVATE_KEY=ed25519:your_private_key_here

# FT Contract
FT_CONTRACT_ID=your-token.testnet

# API Server Configuration
PORT=3000
API_HOST=0.0.0.0

# Performance Tuning
MAX_BATCH_SIZE=100                   # Max actions per transaction
MAX_CONCURRENT_BATCHES=10            # Parallel batches
ACCESS_KEY_COUNT=10                  # Number of access keys
BATCH_INTERVAL_MS=100                # Batch processing interval
```

### Performance Tuning

Adjust these parameters based on your load requirements:

| Parameter | Description | Default | Recommended Range |
|-----------|-------------|---------|-------------------|
| `MAX_BATCH_SIZE` | Actions per transaction | 100 | 50-100 |
| `MAX_CONCURRENT_BATCHES` | Parallel batches | 10 | 5-20 |
| `ACCESS_KEY_COUNT` | Number of access keys | 10 | 5-15 |
| `BATCH_INTERVAL_MS` | Batch processing interval | 100 | 50-500 |

**Higher throughput**: Increase `MAX_CONCURRENT_BATCHES` and `ACCESS_KEY_COUNT`
**Lower latency**: Decrease `BATCH_INTERVAL_MS` and `MAX_BATCH_SIZE`
**Network congestion**: Decrease `MAX_CONCURRENT_BATCHES`

## Deployment Methods

### Method 1: Direct Node.js Deployment

```bash
# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Start the server
NODE_ENV=production npm start
```

### Method 2: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY tsconfig.json ./
COPY src ./src
COPY benchmark ./benchmark

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
# Build image
docker build -t near-ft-api .

# Run container
docker run -d \
  --name near-ft-api \
  --env-file .env \
  -p 3000:3000 \
  near-ft-api
```

### Method 3: Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Deploy:

```bash
docker-compose up -d
```

### Method 4: PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'near-ft-api',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

## Production Considerations

### 1. Access Key Management

For production, you should create multiple access keys on-chain:

```bash
# Using NEAR CLI
near add-key your-account.testnet --function-call \
  --contract-id your-token.testnet \
  --method-names 'ft_transfer' \
  --allowance 10000000000000000000000

# Repeat for multiple keys
```

Then configure the service to use different keys:
- Update `src/nonce-manager.ts` to load different private keys
- Store keys securely (environment variables, secrets manager)

### 2. Security

**Private Key Protection:**
```bash
# Use environment variables
export SENDER_PRIVATE_KEY="ed25519:..."

# Or use a secrets manager
# AWS Secrets Manager
# Google Cloud Secret Manager
# HashiCorp Vault
```

**Network Security:**
- Run API behind a firewall
- Use internal network for backend communication
- Implement rate limiting on frontend
- Add authentication/authorization layer

**Input Validation:**
- Service validates receiver_id and amount
- Add additional business logic validation as needed
- Implement whitelist/blacklist if required

### 3. Monitoring

**Health Checks:**
```bash
# Setup monitoring for /health endpoint
curl http://localhost:3000/health

# Monitor stats
curl http://localhost:3000/stats
```

**Logging:**
```bash
# Redirect logs to file
npm start > logs/api.log 2>&1

# Use log aggregation tools
# - ELK Stack (Elasticsearch, Logstash, Kibana)
# - Datadog
# - CloudWatch
```

**Metrics to Monitor:**
- Throughput (transfers/second)
- Queue size
- Error rate
- Latency (p50, p99)
- Nonce manager statistics

### 4. Load Balancing

For higher throughput, run multiple instances:

```yaml
# docker-compose.yml with load balancer
version: '3.8'

services:
  api:
    build: .
    env_file:
      - .env
    deploy:
      replicas: 3
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api
```

**Note**: Each instance should use different access keys to avoid nonce conflicts.

### 5. Database (Optional)

For transfer tracking and analytics:

```typescript
// Add PostgreSQL/MongoDB for persistence
interface TransferRecord {
  id: string;
  receiver_id: string;
  amount: string;
  status: string;
  transaction_hash?: string;
  created_at: Date;
  updated_at: Date;
}
```

### 6. Error Handling

The service includes automatic retry logic:
- Failed batches are retried up to 3 times
- Individual transfers can be re-queued
- Monitor failed transfers via `/stats` endpoint

### 7. Backup and Recovery

**Configuration Backup:**
```bash
# Backup environment configuration
cp .env .env.backup

# Store private keys securely
# Use encrypted storage
```

**State Recovery:**
- Service is stateless (in-memory queue)
- After restart, queue will be empty
- Consider persistent queue for critical deployments

## Testing the Deployment

### 1. Health Check

```bash
curl http://your-server:3000/health
```

### 2. Single Transfer

```bash
curl -X POST http://your-server:3000/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "receiver_id": "test.testnet",
    "amount": "1000000000000000000",
    "memo": "Test transfer"
  }'
```

### 3. Check Stats

```bash
curl http://your-server:3000/stats
```

### 4. Run Benchmark

```bash
# From your local machine
TOTAL_TRANSFERS=1000 \
CONCURRENT_REQUESTS=50 \
API_URL=http://your-server:3000 \
npm run benchmark:testnet
```

## Troubleshooting

### Issue: High nonce errors

**Solution**: Increase `ACCESS_KEY_COUNT` or decrease `MAX_CONCURRENT_BATCHES`

### Issue: Transaction timeouts

**Solution**:
- Check RPC_URL is responsive
- Reduce `MAX_BATCH_SIZE`
- Ensure sufficient gas

### Issue: Out of memory

**Solution**:
- Reduce `MAX_CONCURRENT_BATCHES`
- Clear old transfer records periodically
- Increase server RAM

### Issue: Low throughput

**Solution**:
- Increase `MAX_CONCURRENT_BATCHES`
- Increase `ACCESS_KEY_COUNT`
- Optimize `BATCH_INTERVAL_MS`
- Check network latency to RPC

## Scaling Guidelines

| Load (tx/sec) | Concurrent Batches | Access Keys | Instance Count |
|---------------|-------------------|-------------|----------------|
| 0-50          | 5                 | 5           | 1              |
| 50-100        | 10                | 10          | 1              |
| 100-200       | 15                | 15          | 2              |
| 200-500       | 20                | 20          | 3-5            |
| 500+          | 20                | 20+         | 5+             |

## Cost Estimation

**Gas Costs:**
- Each `ft_transfer` call: ~2-3 TGas
- Transaction with 100 transfers: ~250 TGas
- At 100 tx/sec: ~60,000 transfers/10min ≈ 15,000 TGas
- Cost depends on NEAR gas prices

**Infrastructure Costs:**
- Small instance (1-2 CPU, 2GB RAM): $10-20/month
- Medium instance (2-4 CPU, 4GB RAM): $40-80/month
- Load balancer: $10-30/month

## Maintenance

**Regular Tasks:**
1. Monitor logs for errors
2. Check stats endpoint for queue buildup
3. Verify transaction success rate
4. Update dependencies (`npm audit`)
5. Rotate access keys periodically
6. Review and optimize performance settings

**Updates:**
```bash
# Pull latest code
git pull

# Install dependencies
npm install

# Rebuild
npm run build

# Restart service
pm2 restart near-ft-api
# or
docker-compose restart
```

## Support

For deployment issues:
1. Check server logs
2. Verify NEAR account has sufficient balance
3. Test RPC connectivity
4. Review configuration
5. Open GitHub issue with logs
