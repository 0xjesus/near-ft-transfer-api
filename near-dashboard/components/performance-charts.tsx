'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceMetrics } from '@/lib/types';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { motion } from 'framer-motion';

interface PerformanceChartsProps {
  metrics: PerformanceMetrics;
}

export function PerformanceCharts({ metrics }: PerformanceChartsProps) {
  const formatData = (data: typeof metrics.throughput) => {
    return data.map((point) => ({
      time: point.label,
      value: point.value,
    }));
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { time: string } }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 border border-primary/20">
          <p className="text-sm font-medium text-foreground">
            {payload[0].payload.time}
          </p>
          <p className="text-sm text-primary font-bold">
            {payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="gradient-text">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="throughput" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="throughput">Throughput</TabsTrigger>
              <TabsTrigger value="success-rate">Success Rate</TabsTrigger>
              <TabsTrigger value="queue">Queue Size</TabsTrigger>
            </TabsList>

            <TabsContent value="throughput" className="space-y-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formatData(metrics.throughput)}>
                    <defs>
                      <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(0, 224, 193)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="rgb(0, 224, 193)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis
                      dataKey="time"
                      stroke="rgba(255, 255, 255, 0.5)"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="rgba(255, 255, 255, 0.5)" tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="rgb(0, 224, 193)"
                      strokeWidth={2}
                      fill="url(#colorThroughput)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="success-rate" className="space-y-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formatData(metrics.successRate)}>
                    <defs>
                      <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(138, 43, 226)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="rgb(138, 43, 226)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis
                      dataKey="time"
                      stroke="rgba(255, 255, 255, 0.5)"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="rgba(255, 255, 255, 0.5)"
                      tick={{ fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="rgb(138, 43, 226)"
                      strokeWidth={2}
                      fill="url(#colorSuccess)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="queue" className="space-y-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formatData(metrics.queueSize)}>
                    <defs>
                      <linearGradient id="colorQueue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(59, 130, 246)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis
                      dataKey="time"
                      stroke="rgba(255, 255, 255, 0.5)"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="rgba(255, 255, 255, 0.5)" tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="rgb(59, 130, 246)"
                      strokeWidth={2}
                      fill="url(#colorQueue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
