import { BenchmarkResult } from '../src/types';

interface BenchmarkConfig {
  totalTransfers: number;
  concurrentRequests: number;
  apiUrl: string;
  durationMinutes: number;
}

/**
 * Run benchmark on testnet
 */
async function runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
  console.log('========================================');
  console.log('NEAR FT Transfer API - Testnet Benchmark');
  console.log('========================================');
  console.log('Configuration:');
  console.log(`  Total Transfers: ${config.totalTransfers}`);
  console.log(`  Concurrent Requests: ${config.concurrentRequests}`);
  console.log(`  Duration: ${config.durationMinutes} minutes`);
  console.log(`  API URL: ${config.apiUrl}`);
  console.log('========================================\n');

  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;

  const startTime = Date.now();
  const endTimeTarget = startTime + config.durationMinutes * 60 * 1000;

  let transferIndex = 0;

  console.log(`[BENCHMARK] Starting continuous load test for ${config.durationMinutes} minutes...\n`);

  // Run continuous load test
  while (Date.now() < endTimeTarget && transferIndex < config.totalTransfers) {
    const batchStart = Date.now();
    const requestsInBatch = Math.min(config.concurrentRequests, config.totalTransfers - transferIndex);

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.floor((endTimeTarget - Date.now()) / 1000);

    console.log(`[BENCHMARK] Time: ${elapsed}s elapsed, ${remaining}s remaining | Sending ${requestsInBatch} requests (${transferIndex + 1}-${transferIndex + requestsInBatch}/${config.totalTransfers})...`);

    // Send concurrent requests
    const promises = Array.from({ length: requestsInBatch }, async (_, i) => {
      const requestStart = Date.now();
      const currentIndex = transferIndex + i;

      try {
        const response = await fetch(`${config.apiUrl}/transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receiver_id: `nearquantum.near`,
            amount: '1000000000000000000', // 1 token with 18 decimals
            memo: `Testnet benchmark transfer ${currentIndex}`,
          }),
        });

        const latency = Date.now() - requestStart;
        latencies.push(latency);

        if (response.ok) {
          successful++;
          const data: any = await response.json();
          if (currentIndex % 100 === 0) {
            console.log(`[BENCHMARK] ✓ Transfer ${currentIndex + 1} queued: ${data.transfer_id} (${latency}ms)`);
          }
        } else {
          failed++;
          const error = await response.text();
          console.error(`[BENCHMARK] ✗ Transfer ${currentIndex + 1} failed: ${error}`);
        }
      } catch (error: any) {
        failed++;
        const latency = Date.now() - requestStart;
        latencies.push(latency);
        console.error(`[BENCHMARK] ✗ Transfer ${currentIndex + 1} error: ${error.message}`);
      }
    });

    await Promise.all(promises);

    transferIndex += requestsInBatch;

    const batchDuration = Date.now() - batchStart;
    const batchThroughput = (requestsInBatch / batchDuration) * 1000;
    const overallThroughput = (successful / ((Date.now() - startTime) / 1000));

    console.log(`[BENCHMARK] Batch completed in ${batchDuration}ms | Batch: ${batchThroughput.toFixed(2)} tx/sec | Overall: ${overallThroughput.toFixed(2)} tx/sec\n`);

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
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
    total_transfers: transferIndex,
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
  console.log('TESTNET BENCHMARK RESULTS');
  console.log('========================================');
  console.log(`Total Transfers:      ${result.total_transfers}`);
  console.log(`Successful Transfers: ${result.successful_transfers}`);
  console.log(`Failed Transfers:     ${result.failed_transfers}`);
  console.log(`Success Rate:         ${((result.successful_transfers / result.total_transfers) * 100).toFixed(2)}%`);
  console.log(`Duration:             ${result.duration_seconds.toFixed(2)}s (${(result.duration_seconds / 60).toFixed(2)} minutes)`);
  console.log(`Throughput:           ${result.transfers_per_second.toFixed(2)} tx/sec`);
  console.log(`Average Latency:      ${result.avg_latency_ms.toFixed(2)}ms`);
  console.log(`P50 Latency:          ${result.p50_latency_ms.toFixed(2)}ms`);
  console.log(`P99 Latency:          ${result.p99_latency_ms.toFixed(2)}ms`);
  console.log('========================================\n');

  // Check if target is met
  const targetMet = result.transfers_per_second >= 100 && result.duration_seconds >= 600;

  if (targetMet) {
    console.log('✅ TARGET MET:');
    console.log('   - Achieved 100+ transfers per second');
    console.log('   - Sustained for 10+ minutes');
  } else {
    console.log('❌ TARGET NOT MET:');
    if (result.transfers_per_second < 100) {
      console.log(`   - Throughput: ${result.transfers_per_second.toFixed(2)} tx/sec (need 100+)`);
    }
    if (result.duration_seconds < 600) {
      console.log(`   - Duration: ${(result.duration_seconds / 60).toFixed(2)} minutes (need 10+)`);
    }
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
    durationMinutes: parseInt(process.env.DURATION_MINUTES || '10', 10),
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

    // Save results to file
    const resultsFile = `benchmark-results-testnet-${Date.now()}.json`;
    const fs = await import('fs');
    fs.writeFileSync(
      resultsFile,
      JSON.stringify({ config, result, timestamp: new Date().toISOString() }, null, 2)
    );
    console.log(`\n[BENCHMARK] Results saved to ${resultsFile}`);

  } catch (error: any) {
    console.error('[BENCHMARK] Error:', error.message);
    process.exit(1);
  }
}

main();
