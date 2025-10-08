import { eventLog, LogLevel } from './event-log';

type Metadata = Record<string, unknown> | undefined;

export function logComponent(
  component: string,
  message: string,
  metadata?: Metadata,
  level: LogLevel = 'info'
): void {
  const timestamp = Date.now();
  const formatted = `[${component}] ${message}`;

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }

  eventLog.record({
    timestamp,
    category: 'service',
    component,
    level,
    message,
    metadata,
  });
}

export function logApiEvent(params: {
  method: string;
  path: string;
  status: number;
  message: string;
  metadata?: Metadata;
}): void {
  const { method, path, status, message, metadata } = params;
  const timestamp = Date.now();

  eventLog.record({
    timestamp,
    category: 'api',
    method,
    path,
    status,
    message,
    metadata,
  });
}
