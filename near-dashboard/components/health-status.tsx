'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useHealth } from '@/lib/hooks';
import { AlertCircle, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function HealthStatus() {
  const { health, error } = useHealth(5000);

  const isHealthy = health?.status === 'healthy' || health?.status === 'ok';
  const hasError = !!error;

  const getStatusIcon = () => {
    if (hasError) return <XCircle className="h-5 w-5" />;
    if (isHealthy) return <CheckCircle2 className="h-5 w-5" />;
    return <AlertCircle className="h-5 w-5" />;
  };

  const getStatusColor = () => {
    if (hasError) return 'destructive';
    if (isHealthy) return 'default';
    return 'secondary';
  };

  const getStatusText = () => {
    if (hasError) return 'Offline';
    if (isHealthy) return 'Healthy';
    return 'Unknown';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Alert
        className={cn(
          'glass-card border-l-4',
          hasError && 'border-l-destructive',
          isHealthy && 'border-l-primary',
          !hasError && !isHealthy && 'border-l-secondary'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex items-center gap-2',
                hasError && 'text-destructive',
                isHealthy && 'text-primary'
              )}
            >
              {getStatusIcon()}
              <AlertTitle className="mb-0">System Status</AlertTitle>
            </div>
            <Badge variant={getStatusColor()} className="font-mono">
              {getStatusText()}
            </Badge>
          </div>

          {health && !hasError && (
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Uptime: {formatUptime(health.uptime)}</span>
              </div>
              {health.version && (
                <div>
                  <span>v{health.version}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {hasError && (
          <AlertDescription className="mt-2 text-destructive">
            {error}
          </AlertDescription>
        )}
      </Alert>
    </motion.div>
  );
}
