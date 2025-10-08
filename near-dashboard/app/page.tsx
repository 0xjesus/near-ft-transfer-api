'use client';

import { BenchmarkMonitor } from '@/components/benchmark-monitor';
import { MetricCard } from '@/components/metric-card';
import { PerformanceCharts } from '@/components/performance-charts';
import { TransferForm } from '@/components/transfer-form';
import { TransfersTable } from '@/components/transfers-table';
import { HealthStatus } from '@/components/health-status';
import { LoadTestRunner } from '@/components/load-test-runner';
import { EndpointConsole } from '@/components/endpoint-console';
import { ApiDocumentation } from '@/components/api-documentation';
import { useStats, usePerformanceMetrics, useRecentTransfers } from '@/lib/hooks';
import type { TransferResponse } from '@/lib/types';
import {
  Activity,
  CheckCircle,
  TrendingUp,
  Users,
  Clock,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { stats, isLoading } = useStats(1000);
  const metrics = usePerformanceMetrics(60);
  const { transfers, addTransfer } = useRecentTransfers();

  const handleTransferCreated = (transfer: TransferResponse) => {
    addTransfer(transfer);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2"
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text">
            NEAR FT Transfer Dashboard
          </h1>
          <p className="text-foreground/80 text-lg">
            Real-time monitoring and load testing for your NEAR FT Transfer API
          </p>
        </motion.div>

        {/* Live Benchmark */}
        <BenchmarkMonitor />

        {/* Health Status */}
        <HealthStatus />

        {/* Load Test Runner */}
        <LoadTestRunner />

        {/* Endpoint Console */}
        <EndpointConsole />

        {/* API Documentation */}
        <ApiDocumentation />

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Transfers"
            value={stats?.stats?.totalTransfers?.toLocaleString() || '0'}
            icon={Activity}
            isLoading={isLoading}
          />
          <MetricCard
            title="Success Rate"
            value={`${stats?.stats?.successRate?.toFixed(1) || '0'}%`}
            icon={CheckCircle}
            isLoading={isLoading}
          />
          <MetricCard
            title="Throughput"
            value={`${stats?.stats?.throughput?.toFixed(2) || '0'} tx/s`}
            icon={TrendingUp}
            isLoading={isLoading}
          />
          <MetricCard
            title="Queue Size"
            value={stats?.stats?.queueSize?.toLocaleString() || '0'}
            icon={Clock}
            isLoading={isLoading}
          />
        </div>

        {/* Additional Metrics */}
        {stats?.nonceManager && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Active Nonces"
              value={stats.nonceManager.activeNonces.toLocaleString()}
              icon={Zap}
              isLoading={isLoading}
            />
            <MetricCard
              title="Available Nonces"
              value={stats.nonceManager.availableNonces.toLocaleString()}
              icon={CheckCircle}
              isLoading={isLoading}
            />
            <MetricCard
              title="Locked Nonces"
              value={stats.nonceManager.lockedNonces.toLocaleString()}
              icon={Users}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Charts and Transfer Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PerformanceCharts metrics={metrics} />
          </div>
          <div>
            <TransferForm onTransferCreated={handleTransferCreated} />
          </div>
        </div>

        {/* Transfers Table */}
        <TransfersTable transfers={transfers} />

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground py-4"
        >
          <p>
            Built with{' '}
            <span className="gradient-text font-semibold">Next.js</span>,{' '}
            <span className="gradient-text font-semibold">shadcn/ui</span>, and{' '}
            <span className="gradient-text font-semibold">Tailwind CSS</span>
          </p>
          <p className="mt-1">
            Data updates every second · API: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
