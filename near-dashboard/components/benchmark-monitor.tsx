'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStats } from '@/lib/hooks';
import { motion } from 'framer-motion';
import {
  Activity,
  Gauge,
  Rocket,
  Timer,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { useMemo, type ElementType } from 'react';
import { cn } from '@/lib/utils';

const DEFAULT_TARGET = 60000;

export function BenchmarkMonitor() {
  const { stats, isLoading } = useStats(1000);

  const {
    targetTransfers,
    concurrentRequests,
    totalProcessed,
    progressPercent,
    throughput,
    successRate,
    queueSize,
    averageProcessingTime,
    etaSeconds,
    timestamp,
  } = useMemo(() => {
    const target = stats?.benchmark?.targetTransfers ?? DEFAULT_TARGET;
    const throughputValue = stats?.stats?.throughput ?? 0;
    const success = stats?.stats?.successfulTransfers ?? 0;
    const failed = stats?.stats?.failedTransfers ?? 0;
    const processed = success + failed;

    const progress =
      target > 0 ? Math.min(100, (processed / target) * 100) : 0;

    const remaining = Math.max(target - processed, 0);
    const eta =
      throughputValue > 0 ? Math.round(remaining / throughputValue) : null;

    return {
      targetTransfers: target,
      concurrentRequests: stats?.benchmark?.concurrentRequests ?? null,
      totalProcessed: processed,
      progressPercent: Number.isFinite(progress) ? progress : 0,
      throughput: throughputValue,
      successRate: stats?.stats?.successRate ?? 0,
      queueSize: stats?.stats?.queueSize ?? 0,
      averageProcessingTime: stats?.stats?.averageProcessingTime ?? null,
      etaSeconds: eta,
      timestamp: stats?.timestamp,
    };
  }, [stats]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card glass-card-hover border border-primary/30">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-3xl gradient-text flex items-center gap-2">
              <Rocket className="h-7 w-7" />
              Live Benchmark Monitor
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Tracking real-time performance for the 60,000 transfer testnet benchmark.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary">
              <Gauge className="h-4 w-4 mr-1" />
              Target: {targetTransfers.toLocaleString()} transfers
            </Badge>
            {concurrentRequests && (
              <Badge variant="outline" className="bg-secondary/20 text-secondary-foreground">
                <Zap className="h-4 w-4 mr-1" />
                Concurrency: {concurrentRequests}
              </Badge>
            )}
            <Badge variant="outline" className="bg-muted/40 text-muted-foreground">
              <Timer className="h-4 w-4 mr-1" />
              Updated: {timestamp ? new Date(timestamp).toLocaleTimeString() : '—'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Total Processed</span>
              <span>
                {totalProcessed.toLocaleString()} / {targetTransfers.toLocaleString()} (
                {progressPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent',
                  progressPercent >= 100 && 'from-green-400 via-green-500 to-green-600'
                )}
              />
            </div>
            {etaSeconds !== null && etaSeconds > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Estimated time remaining: ~{formatEta(etaSeconds)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricPill
              icon={TrendingUp}
              label="Throughput"
              value={`${throughput.toFixed(2)} tx/s`}
              accent="text-primary"
              isLoading={isLoading}
            />
            <MetricPill
              icon={Activity}
              label="Success Rate"
              value={`${successRate.toFixed(2)}%`}
              accent="text-green-400"
              isLoading={isLoading}
            />
            <MetricPill
              icon={Gauge}
              label="Queue Size"
              value={queueSize.toLocaleString()}
              accent="text-accent"
              isLoading={isLoading}
            />
            <MetricPill
              icon={Timer}
              label="Avg Processing"
              value={
                averageProcessingTime
                  ? `${averageProcessingTime.toFixed(0)} ms`
                  : '—'
              }
              accent="text-secondary"
              isLoading={isLoading}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface MetricPillProps {
  icon: ElementType;
  label: string;
  value: string;
  accent?: string;
  isLoading?: boolean;
}

function MetricPill({
  icon: Icon,
  label,
  value,
  accent,
  isLoading,
}: MetricPillProps) {
  return (
    <div className="glass-card p-4 border border-white/10 rounded-xl">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <Icon className={cn('h-4 w-4', accent)} />
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">
        {isLoading ? '—' : value}
      </div>
    </div>
  );
}

function formatEta(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
