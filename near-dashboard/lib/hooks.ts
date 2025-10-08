'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from './api-client';
import {
  HealthResponse,
  StatsResponse,
  TransferStatusResponse,
  PerformanceMetrics,
  ChartDataPoint,
  EventLogEntry,
} from './types';

export function useHealth(interval: number = 5000) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await apiClient.getHealth();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch health');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealth();
    const timer = setInterval(fetchHealth, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return { health, isLoading, error };
}

export function useStats(interval: number = 1000) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.getStats();
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const timer = setInterval(fetchStats, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return { stats, isLoading, error };
}

export function usePerformanceMetrics(maxDataPoints: number = 60) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    throughput: [],
    successRate: [],
    queueSize: [],
  });

  const { stats } = useStats(1000);

  useEffect(() => {
    if (!stats?.stats) return;

    const timestamp = Date.now();
    const label = new Date().toLocaleTimeString();

    setMetrics((prev) => {
      const addDataPoint = (
        arr: ChartDataPoint[],
        value: number
      ): ChartDataPoint[] => {
        const newArr = [
          ...arr,
          {
            timestamp,
            value,
            label,
          },
        ];
        return newArr.slice(-maxDataPoints);
      };

      return {
        throughput: addDataPoint(prev.throughput, stats.stats.throughput),
        successRate: addDataPoint(prev.successRate, stats.stats.successRate),
        queueSize: addDataPoint(prev.queueSize, stats.stats.queueSize),
      };
    });
  }, [stats, maxDataPoints]);

  return metrics;
}

export function useTransferStatus(id: string | null, interval: number = 2000) {
  const [transfer, setTransfer] = useState<TransferStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setTransfer(null);
      return;
    }

    setIsLoading(true);
    let isMounted = true;

    const fetchTransfer = async () => {
      try {
        const data = await apiClient.getTransferStatus(id);
        if (isMounted) {
          setTransfer(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch transfer'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTransfer();

    // Only poll if transfer is not completed or failed
    const timer = setInterval(() => {
      if (
        transfer?.status === 'pending' ||
        transfer?.status === 'processing'
      ) {
        fetchTransfer();
      }
    }, interval);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [id, interval, transfer?.status]);

  return { transfer, isLoading, error };
}

export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, 2000);

      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { copy, isCopied };
}

export function useRecentTransfers() {
  const [transfers, setTransfers] = useState<TransferStatusResponse[]>([]);

  const addTransfer = useCallback((transfer: TransferStatusResponse) => {
    setTransfers((prev) => [transfer, ...prev].slice(0, 100)); // Keep last 100
  }, []);

  const updateTransfer = useCallback((id: string, updates: Partial<TransferStatusResponse>) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const clearTransfers = useCallback(() => {
    setTransfers([]);
  }, []);

  return { transfers, addTransfer, updateTransfer, clearTransfers };
}

export function useEventStream(interval: number = 1000, maxEntries: number = 200) {
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    const fetchEvents = async () => {
      try {
        const data = await apiClient.getEvents();
        if (!isMounted) return;
        setEvents((prev) => {
          const existingIds = new Set(prev.map((event) => event.id));
          const merged = [...prev];

          data.forEach((event) => {
            if (!existingIds.has(event.id)) {
              merged.push(event);
            }
          });

          return merged.slice(-maxEntries);
        });
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchEvents();
    timer = setInterval(fetchEvents, interval);

    return () => {
      isMounted = false;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [interval, maxEntries]);

  return { events, isLoading, error };
}
