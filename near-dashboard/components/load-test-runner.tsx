'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Zap, TrendingUp, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface TestResult {
  totalTransfers: number;
  successful: number;
  failed: number;
  avgResponseTime: number;
  throughput: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'idle' | 'running' | 'completed' | 'error';
}

export function LoadTestRunner() {
  const [testConfig, setTestConfig] = useState({
    totalTransfers: 60000,
    concurrency: 100,
    receiverId: 'receiver.testnet',
    amount: '1',
  });

  const [result, setResult] = useState<TestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const startTest = async () => {
    setIsRunning(true);
    setProgress(0);

    const startTime = Date.now();
    setResult({
      totalTransfers: testConfig.totalTransfers,
      successful: 0,
      failed: 0,
      avgResponseTime: 0,
      throughput: 0,
      startTime: new Date().toISOString(),
      status: 'running',
    });

    toast.info(`Starting load test with ${testConfig.totalTransfers.toLocaleString()} transfers...`);

    try {
      let successful = 0;
      let failed = 0;
      const batchSize = testConfig.concurrency;
      const batches = Math.ceil(testConfig.totalTransfers / batchSize);
      const responseTimes: number[] = [];

      for (let i = 0; i < batches; i++) {
        const currentBatchSize = Math.min(batchSize, testConfig.totalTransfers - i * batchSize);
        const batchStartTime = Date.now();

        try {
          // Create batch of transfers
          const transfers = Array.from({ length: currentBatchSize }, () => ({
            receiverId: testConfig.receiverId,
            amount: testConfig.amount,
          }));

          const batchResponse = await apiClient.createBatchTransfer({ transfers });
          successful += batchResponse.length;

          const batchEndTime = Date.now();
          responseTimes.push(batchEndTime - batchStartTime);

          // Update progress
          const currentProgress = ((i + 1) / batches) * 100;
          setProgress(currentProgress);

          setResult((prev) => ({
            ...prev!,
            successful,
            failed,
            avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          }));

        } catch (error) {
          failed += currentBatchSize;
          console.error(`Batch ${i + 1} failed:`, error);
        }
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // seconds

      setResult({
        totalTransfers: testConfig.totalTransfers,
        successful,
        failed,
        avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        throughput: testConfig.totalTransfers / duration,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration,
        status: 'completed',
      });

      setProgress(100);
      toast.success(`Load test completed! ${successful.toLocaleString()} successful, ${failed} failed`);

    } catch (error) {
      console.error('Load test error:', error);
      setResult((prev) => ({
        ...prev!,
        status: 'error',
      }));
      toast.error('Load test failed. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const resetTest = () => {
    setResult(null);
    setProgress(0);
    setIsRunning(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-muted';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="glass-card glass-card-hover border-2 border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl gradient-text flex items-center gap-2">
                <Zap className="h-8 w-8" />
                Load Test Runner
              </CardTitle>
              <CardDescription className="text-base mt-2 text-muted-foreground">
                Execute high-volume transaction tests to benchmark your API performance
              </CardDescription>
            </div>
            {result && (
              <Badge
                variant="outline"
                className={`${getStatusColor(result.status)} text-white px-4 py-2 text-sm`}
              >
                {result.status.toUpperCase()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Total Transfers
              </label>
              <Input
                type="number"
                value={testConfig.totalTransfers}
                onChange={(e) =>
                  setTestConfig({ ...testConfig, totalTransfers: parseInt(e.target.value) })
                }
                disabled={isRunning}
                className="bg-muted/50 border-primary/20 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Concurrency Level
              </label>
              <Input
                type="number"
                value={testConfig.concurrency}
                onChange={(e) =>
                  setTestConfig({ ...testConfig, concurrency: parseInt(e.target.value) })
                }
                disabled={isRunning}
                className="bg-muted/50 border-primary/20 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Receiver Account ID
              </label>
              <Input
                value={testConfig.receiverId}
                onChange={(e) =>
                  setTestConfig({ ...testConfig, receiverId: e.target.value })
                }
                disabled={isRunning}
                className="bg-muted/50 border-primary/20 text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Amount (NEAR)
              </label>
              <Input
                value={testConfig.amount}
                onChange={(e) =>
                  setTestConfig({ ...testConfig, amount: e.target.value })
                }
                disabled={isRunning}
                className="bg-muted/50 border-primary/20 text-foreground"
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={startTest}
              disabled={isRunning}
              className="flex-1 h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Load Test
            </Button>
            <Button
              onClick={resetTest}
              variant="outline"
              className="h-12 px-6 border-primary/30 text-foreground hover:bg-primary/10"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-foreground">
                <span>Progress</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary via-secondary to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {result && result.status !== 'idle' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Test Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-card p-4 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Activity className="h-4 w-4" />
                    Total
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {result.totalTransfers.toLocaleString()}
                  </div>
                </div>
                <div className="glass-card p-4 space-y-1">
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Successful
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {result.successful.toLocaleString()}
                  </div>
                </div>
                <div className="glass-card p-4 space-y-1">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <Activity className="h-4 w-4" />
                    Failed
                  </div>
                  <div className="text-2xl font-bold text-red-400">
                    {result.failed.toLocaleString()}
                  </div>
                </div>
                <div className="glass-card p-4 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <TrendingUp className="h-4 w-4" />
                    Throughput
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {result.throughput.toFixed(0)} tx/s
                  </div>
                </div>
              </div>

              {result.duration && (
                <Alert className="bg-primary/10 border-primary/30">
                  <Zap className="h-5 w-5 text-primary" />
                  <AlertDescription className="text-foreground">
                    Test completed in <strong>{result.duration}s</strong> with an average response time of{' '}
                    <strong>{result.avgResponseTime}ms</strong>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
