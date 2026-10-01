/**
 * LeadTR Structured Logger
 * Lightweight, zero-dependency structured logger that works across Node and Edge runtimes.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  module?: string;
  requestId?: string;
  businessId?: string;
  jobId?: string;
  [key: string]: unknown;
}

export class Logger {
  constructor(private readonly context: LogContext = {}) {}

  public child(extraContext: LogContext): Logger {
    return new Logger({ ...this.context, ...extraContext });
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      message,
      ...this.context,
      ...(data ? { data } : {}),
    };

    if (process.env.NODE_ENV === 'production') {
      const output = JSON.stringify(entry);
      if (level === 'error') {
        console.error(output);
      } else if (level === 'warn') {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      const color =
        level === 'error' ? '\x1b[31m' :
        level === 'warn' ? '\x1b[33m' :
        level === 'debug' ? '\x1b[35m' : '\x1b[36m';
      const mod = this.context.module ? `[${this.context.module}] ` : '';
      console.log(`${color}[${level.toUpperCase()}]\x1b[0m ${mod}${message}`, data ?? '');
    }
  }

  public debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  public info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  public error(message: string, error?: unknown): void {
    this.log('error', message, error instanceof Error ? { message: error.message, stack: error.stack } : error);
  }
}

export const logger = new Logger({ module: 'LeadTR' });
