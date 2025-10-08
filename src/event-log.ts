import { randomBytes } from 'crypto';

export type LogLevel = 'info' | 'warn' | 'error';

export interface EventLogEntry {
  id: string;
  timestamp: number;
  category?: string;
  component?: string;
  level?: LogLevel;
  method?: string;
  path?: string;
  status?: number;
  message: string;
  metadata?: Record<string, unknown>;
}

export class EventLog {
  private entries: EventLogEntry[] = [];

  constructor(private readonly maxEntries: number = 500) {}

  record(entry: Omit<EventLogEntry, 'id'>): EventLogEntry {
    const fullEntry: EventLogEntry = {
      id: `evt_${Date.now()}_${randomBytes(3).toString('hex')}`,
      ...entry,
    };

    this.entries.push(fullEntry);

    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }

    return fullEntry;
  }

  all(): EventLogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

export const eventLog = new EventLog();
