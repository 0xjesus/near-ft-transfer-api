'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEventStream } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Terminal, Zap } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-300',
  info: 'text-primary',
};

function getStatusTone(status: number): keyof typeof STATUS_COLORS {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500) return 'error';
  return 'info';
}

function getLevelTone(level?: string): keyof typeof STATUS_COLORS {
  switch (level) {
    case 'error':
      return 'error';
    case 'warn':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
}

export function EndpointConsole() {
  const { events, isLoading, error } = useEventStream(1000, 300);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [events]);

  const formattedEvents = useMemo(() => {
    return events
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((event) => {
        const datetime = new Date(event.timestamp);
        const time = datetime.toLocaleTimeString();
        const tone =
          typeof event.status === 'number'
            ? getStatusTone(event.status)
            : getLevelTone(event.level);

        const label = event.method && event.path
          ? `${event.method.toUpperCase()} ${event.path}`
          : event.component
            ? `[${event.component}]`
            : event.category || 'event';

        const statusLabel =
          typeof event.status === 'number'
            ? `${event.status}`
            : (event.level ?? '').toUpperCase() || 'INFO';

        const message = event.message ?? '';

        return {
          id: event.id,
          time,
          label,
          tone,
          statusLabel,
          message,
          metadata: event.metadata,
        };
      });
  }, [events]);

  return (
    <Card className="glass-card glass-card-hover border border-primary/30">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <CardTitle className="gradient-text">Live Service Console</CardTitle>
        </div>
        <Badge variant="outline" className="bg-muted/40 text-muted-foreground">
          <Zap className="h-4 w-4 mr-1" />
          Live feed · {formattedEvents.length.toString().padStart(3, '0')} entries
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-white/10 bg-black/40 font-mono text-xs">
          <div
            ref={viewportRef}
            className="max-h-80 overflow-y-auto p-3 space-y-1"
          >
            {formattedEvents.length === 0 && (
              <div className="text-muted-foreground">Waiting for activity…</div>
            )}
            {formattedEvents.map((event) => (
              <div key={event.id} className="whitespace-pre-wrap leading-relaxed">
                <span className="text-muted-foreground mr-2">{event.time}</span>
                <span className="text-primary mr-2">{event.label}</span>
                <span
                  className={cn(
                    'mr-2 font-semibold',
                    STATUS_COLORS[event.tone]
                  )}
                >
                  {event.statusLabel}
                </span>
                {event.message && (
                  <span className="text-foreground mr-2">{event.message}</span>
                )}
                {event.metadata && (
                  <span className="text-muted-foreground">
                    {JSON.stringify(event.metadata)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{isLoading ? 'Loading activity…' : 'Live updates every second'}</span>
          {error && <span className="text-red-400">Error: {error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
