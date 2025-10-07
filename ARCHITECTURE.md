# Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NEAR FT Transfer API                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   Client    │ (Your Backend/Frontend)
│ Application │
└──────┬──────┘
       │ HTTP POST /transfer
       │ { receiver_id, amount, memo }
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Express API Server                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Endpoints:                                                     │ │
│  │  - POST /transfer        (queue single transfer)               │ │
│  │  - POST /transfer/batch  (queue multiple transfers)            │ │
│  │  - GET  /transfer/:id    (check status)                        │ │
│  │  - GET  /stats           (service metrics)                     │ │
│  │  - GET  /health          (health check)                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Transfer Service                              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Transfer Queue (In-Memory)                                    │ │
│  │  ┌──────┬──────┬──────┬──────┬─────┬──────────────┐           │ │
│  │  │ TX 1 │ TX 2 │ TX 3 │ ... │ ... │ TX N (queued) │           │ │
│  │  └──────┴──────┴──────┴──────┴─────┴──────────────┘           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                │                                     │
│                                │ Batch every 100ms or when          │
│                                │ queue reaches 100 transfers        │
│                                ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Batch Processor (PQueue - Concurrency: 10)                    │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐           ┌─────────┐  │ │
│  │  │ Batch 1 │  │ Batch 2 │  │ Batch 3 │    ...    │Batch 10 │  │ │
│  │  │ (100 tx)│  │ (100 tx)│  │ (100 tx)│           │ (100 tx)│  │ │
│  │  └────┬────┘  └────┬────┘  └────┬────┘           └────┬────┘  │ │
│  └───────┼────────────┼────────────┼─────────────────────┼────────┘ │
└──────────┼────────────┼────────────┼─────────────────────┼──────────┘
           │            │            │                     │
           │            │            │                     │
           ▼            ▼            ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Nonce Manager                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Access Keys (Round-Robin Allocation)                          │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           ┌─────┐ ┌─────┐   │ │
│  │  │ K0  │ │ K1  │ │ K2  │ │ K3  │    ...    │ K8  │ │ K9  │   │ │
│  │  │ N:X │ │ N:Y │ │ N:Z │ │ N:W │           │ N:A │ │ N:B │   │ │
│  │  │ 🔓  │ │ 🔒  │ │ 🔒  │ │ 🔒  │           │ 🔓  │ │ 🔓  │   │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘           └─────┘ └─────┘   │ │
│  │  Free    In Use   In Use   In Use            Free    Free     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ Allocate key, get nonce
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Transaction Builder                               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Single Transaction with Multiple Actions:                     │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │ ft_transfer(alice.testnet, 1000000000000000000)          │  │ │
│  │  │ ft_transfer(bob.testnet, 2000000000000000000)            │  │ │
│  │  │ ft_transfer(charlie.testnet, 3000000000000000000)        │  │ │
│  │  │ ... (up to 100 ft_transfer calls)                        │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │  • Sign with allocated access key                              │ │
│  │  • Use incremented nonce                                        │ │
│  │  • Get recent block hash                                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Send signed transaction
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         NEAR Network                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  RPC Endpoint (https://rpc.testnet.near.org)                   │ │
│  │  • Receives signed transaction                                 │ │
│  │  • Validates signatures                                         │ │
│  │  • Executes ft_transfer calls sequentially                     │ │
│  │  • Returns transaction hash                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Transaction result
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FT Contract (NEP-141)                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  For each ft_transfer call:                                    │ │
│  │  1. Deduct tokens from sender's balance                        │ │
│  │  2. Add tokens to receiver's balance                           │ │
│  │  3. Emit FtTransfer event                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Express API Server (`src/server.ts`)
- **Purpose**: HTTP interface for clients
- **Responsibilities**:
  - Request validation
  - Response formatting
  - Error handling
  - Health monitoring
- **Endpoints**: 5 REST endpoints
- **Port**: Configurable (default: 3000)

### 2. Transfer Service (`src/transfer-service.ts`)
- **Purpose**: Core business logic
- **Responsibilities**:
  - Queue management
  - Batch creation
  - Transaction orchestration
  - Status tracking
  - Retry logic
- **Key Features**:
  - In-memory queue
  - Automatic batching
  - Configurable concurrency
  - Graceful error handling

### 3. Nonce Manager (`src/nonce-manager.ts`)
- **Purpose**: Access key and nonce management
- **Responsibilities**:
  - Key allocation (round-robin)
  - Nonce tracking and increment
  - Key release
  - Conflict prevention
- **Key Features**:
  - 10 virtual access keys
  - In-memory nonce cache
  - Automatic nonce increment
  - Thread-safe allocation

### 4. Config Manager (`src/config.ts`)
- **Purpose**: Configuration management
- **Responsibilities**:
  - Environment variable loading
  - Configuration validation
  - Default values
  - Type safety

## Data Flow

### Single Transfer Request

```
1. Client Request
   POST /transfer
   { receiver_id: "alice.testnet", amount: "1000000000000000000" }
   ↓
2. API Validation
   ✓ receiver_id present
   ✓ amount valid number
   ↓
3. Transfer Service
   → Generate unique transfer ID
   → Add to queue
   → Return { transfer_id, status: "queued" }
   ↓
4. Batch Processing (after 100ms or 100 transfers)
   → Group 100 transfers
   → Allocate access key
   → Create transaction
   ↓
5. Transaction Creation
   → 100 ft_transfer actions
   → Sign with access key
   → Use nonce N+1
   ↓
6. NEAR Network
   → Validate transaction
   → Execute ft_transfer calls
   → Return transaction hash
   ↓
7. Status Update
   → Update all 100 transfers to "confirmed"
   → Release access key (nonce = N+10)
   → Log completion
```

### Nonce Management Flow

```
Initial State:
K0: nonce=100, free
K1: nonce=101, free
K2: nonce=102, free
...
K9: nonce=109, free

Batch 1 arrives:
→ Allocate K0 (nonce=100)
→ Send transaction with nonce=101
→ K0 is now "in use"

Batch 2 arrives (parallel):
→ Allocate K1 (nonce=101)
→ Send transaction with nonce=102
→ K1 is now "in use"

Batch 1 completes:
→ Release K0
→ K0 nonce = 100 + 10 = 110 (increment by number of keys)
→ K0 is now "free"

Batch 11 arrives:
→ Allocate K0 (nonce=110)
→ Send transaction with nonce=111
→ No nonce conflicts!
```

## Performance Characteristics

### Throughput Calculation

```
Given:
- Batch size: 100 transfers
- Batch interval: 100ms
- Concurrent batches: 10

Theoretical Max:
= (100 transfers × 10 batches) / 0.1 seconds
= 1000 transfers / 0.1 seconds
= 10,000 transfers/second

Practical Throughput (network limited):
≈ 100-200 transfers/second
```

### Latency Breakdown

```
Total Latency = Queue Time + Batch Time + Network Time

Queue Time:
- Best case: 0ms (batch immediately)
- Worst case: 100ms (wait for batch interval)
- Average: 50ms

Batch Processing:
- Transaction creation: 5-10ms
- Signing: 1-2ms
- Total: 6-12ms

Network Time:
- RPC round-trip: 50-200ms (depends on location)
- Transaction execution: 1-2 seconds
- Total: 1050-2200ms

API Response Time:
= Queue Time + Immediate Return
= 0-100ms (returns before transaction completes)

Transfer Confirmation Time:
= Queue Time + Batch Time + Network Time
= 1056-2312ms
```

## Scaling Strategies

### Vertical Scaling
```
Increase single instance capacity:
• MAX_CONCURRENT_BATCHES: 10 → 20
• ACCESS_KEY_COUNT: 10 → 20
• Server resources: 2GB → 4GB RAM
• Result: 100 → 200 tx/sec
```

### Horizontal Scaling
```
Multiple API instances:
┌──────────┐
│ Instance │ ──┐
│    1     │   │
└──────────┘   │
               ├──→ Load Balancer ──→ Clients
┌──────────┐   │
│ Instance │ ──┘
│    2     │
└──────────┘

Requirements:
• Separate access keys per instance
• Shared FT contract
• Independent queues
• Result: Linear scaling
```

## Error Handling

```
Transaction Failure:
┌─────────────┐
│  Batch Fails│
└──────┬──────┘
       │
       ▼
┌────────────────────┐
│ Update transfers   │
│ status = "failed"  │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│ Retry < 3 times?   │
└──────┬─────────────┘
       │
   Yes │         No
       ▼         ▼
┌──────────┐  ┌────────────┐
│ Re-queue │  │ Mark as    │
│ transfer │  │ permanently│
│          │  │ failed     │
└──────────┘  └────────────┘
```

## Key Design Decisions

### 1. In-Memory Queue
**Pros:**
- Fast operation
- Low latency
- Simple implementation

**Cons:**
- Lost on restart
- Not distributed

**Mitigation:**
- For critical deployments, add persistent queue (Redis, DB)

### 2. Virtual Access Keys
**Pros:**
- Easy setup
- No on-chain operations
- Quick testing

**Cons:**
- All use same key
- Limited by single key rate limits

**Production:**
- Use separate on-chain access keys

### 3. Batching Strategy
**Why 100 actions/tx?**
- NEAR protocol limit: ~100 actions
- Gas limit: 300 TGas
- Each ft_transfer: ~3 TGas
- 100 × 3 = 300 TGas ✓

### 4. Round-Robin Key Allocation
**Why not random?**
- Predictable nonce sequence
- Even distribution
- Simple implementation
- Easy debugging

## Monitoring Points

```
┌─────────────┐
│   Metrics   │
└─────────────┘

Queue Size:
• Alert if > 1000
• Indicates backlog

Processing Queue:
• Should be ≤ MAX_CONCURRENT_BATCHES
• Alert if always maxed

Success Rate:
• Should be > 99%
• Alert if < 95%

Nonce Manager:
• Available keys > 0
• Alert if all keys in use

Latency:
• P99 < 200ms API response
• P99 < 3s confirmation
```

## Summary

This architecture achieves:
- ✅ High throughput (100+ tx/sec)
- ✅ Low latency (sub-100ms API)
- ✅ Scalability (horizontal & vertical)
- ✅ Reliability (retry logic)
- ✅ Observability (comprehensive logs)
- ✅ Simplicity (easy to deploy)

Perfect for token launches and high-volume distributions on NEAR!
