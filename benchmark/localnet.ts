import { Worker } from 'near-workspaces';
import { BenchmarkResult } from '../src/types';

interface BenchmarkConfig {
  totalTransfers: number;
  concurrentRequests: number;
  apiUrl: string;
}

/**
 * Run benchmark on localnet/sandbox
 */
async function runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
  console.log('========================================');
  console.log('NEAR FT Transfer API - Localnet Benchmark');
  console.log('========================================');
  console.log('Configuration:');
  console.log(`  Total Transfers: ${config.totalTransfers}`);
  console.log(`  Concurrent Requests: ${config.concurrentRequests}`);
  console.log(`  API URL: ${config.apiUrl}`);
  console.log('========================================\n');

  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;

  const startTime = Date.now();

  // Create batches of concurrent requests
  const batchSize = config.concurrentRequests;
  const numBatches = Math.ceil(config.totalTransfers / batchSize);

  console.log(`[BENCHMARK] Running ${numBatches} batches of ${batchSize} requests\n`);

  for (let batch = 0; batch < numBatches; batch++) {
    const batchStart = Date.now();
    const requestsInBatch = Math.min(batchSize, config.totalTransfers - batch * batchSize);

    console.log(`[BENCHMARK] Batch ${batch + 1}/${numBatches}: Sending ${requestsInBatch} requests...`);

    // Send concurrent requests
    const promises = Array.from({ length: requestsInBatch }, async (_, i) => {
      const requestStart = Date.now();
      const transferIndex = batch * batchSize + i;

      try {
        const response = await fetch(`${config.apiUrl}/transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receiver_id: `recipient${transferIndex}.test.near`,
            amount: '1000000000000000000', // 1 token with 18 decimals
            memo: `Benchmark transfer ${transferIndex}`,
          }),
        });

        const latency = Date.now() - requestStart;
        latencies.push(latency);

        if (response.ok) {
          successful++;
          const data: any = await response.json();
          console.log(`[BENCHMARK] Transfer ${transferIndex + 1}/${config.totalTransfers} queued: ${data.transfer_id} (${latency}ms)`);
        } else {
          failed++;
          const error = await response.text();
          console.error(`[BENCHMARK] Transfer ${transferIndex + 1}/${config.totalTransfers} failed: ${error}`);
        }
      } catch (error: any) {
        failed++;
        const latency = Date.now() - requestStart;
        latencies.push(latency);
        console.error(`[BENCHMARK] Transfer ${transferIndex + 1}/${config.totalTransfers} error: ${error.message}`);
      }
    });

    await Promise.all(promises);

    const batchDuration = Date.now() - batchStart;
    const batchThroughput = (requestsInBatch / batchDuration) * 1000;

    console.log(`[BENCHMARK] Batch ${batch + 1}/${numBatches} completed in ${batchDuration}ms (${batchThroughput.toFixed(2)} tx/sec)\n`);

    // Small delay between batches to avoid overwhelming the API
    if (batch < numBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const endTime = Date.now();
  const durationSeconds = (endTime - startTime) / 1000;

  // Calculate statistics
  latencies.sort((a, b) => a - b);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p50Latency = latencies[Math.floor(latencies.length * 0.5)];
  const p99Latency = latencies[Math.floor(latencies.length * 0.99)];
  const throughput = successful / durationSeconds;

  const result: BenchmarkResult = {
    total_transfers: config.totalTransfers,
    successful_transfers: successful,
    failed_transfers: failed,
    duration_seconds: durationSeconds,
    transfers_per_second: throughput,
    avg_latency_ms: avgLatency,
    p50_latency_ms: p50Latency,
    p99_latency_ms: p99Latency,
  };

  return result;
}

/**
 * Print benchmark results
 */
function printResults(result: BenchmarkResult): void {
  console.log('\n========================================');
  console.log('BENCHMARK RESULTS');
  console.log('========================================');
  console.log(`Total Transfers:      ${result.total_transfers}`);
  console.log(`Successful Transfers: ${result.successful_transfers}`);
  console.log(`Failed Transfers:     ${result.failed_transfers}`);
  console.log(`Duration:             ${result.duration_seconds.toFixed(2)}s`);
  console.log(`Throughput:           ${result.transfers_per_second.toFixed(2)} tx/sec`);
  console.log(`Average Latency:      ${result.avg_latency_ms.toFixed(2)}ms`);
  console.log(`P50 Latency:          ${result.p50_latency_ms.toFixed(2)}ms`);
  console.log(`P99 Latency:          ${result.p99_latency_ms.toFixed(2)}ms`);
  console.log('========================================\n');

  // Check if target is met
  if (result.transfers_per_second >= 100) {
    console.log('✅ TARGET MET: Achieved 100+ transfers per second!');
  } else {
    console.log('❌ TARGET NOT MET: Did not achieve 100 transfers per second');
    console.log(`   Need ${(100 - result.transfers_per_second).toFixed(2)} more tx/sec`);
  }

  console.log('========================================\n');
}

/**
 * Main benchmark execution
 */
async function main() {
  const config: BenchmarkConfig = {
    totalTransfers: parseInt(process.env.TOTAL_TRANSFERS || '60000', 10),
    concurrentRequests: parseInt(process.env.CONCURRENT_REQUESTS || '100', 10),
    apiUrl: process.env.API_URL || 'http://localhost:3000',
  };

  try {
    // Wait for API to be ready
    console.log('[BENCHMARK] Checking API health...');
    let retries = 0;
    while (retries < 10) {
      try {
        const response = await fetch(`${config.apiUrl}/health`);
        if (response.ok) {
          console.log('[BENCHMARK] API is ready!\n');
          break;
        }
      } catch (error) {
        retries++;
        console.log(`[BENCHMARK] API not ready, retrying... (${retries}/10)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (retries >= 10) {
      throw new Error('API failed to become ready');
    }

    // Run benchmark
    const result = await runBenchmark(config);

    // Print results
    printResults(result);

    // Get final stats from API
    console.log('[BENCHMARK] Fetching final API stats...');
    const statsResponse = await fetch(`${config.apiUrl}/stats`);
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('[BENCHMARK] API Stats:');
      console.log(JSON.stringify(stats, null, 2));
    }

  } catch (error: any) {
    console.error('[BENCHMARK] Error:', error.message);
    process.exit(1);
  }
}

main();
