import { prisma } from './prisma';
import { LogLevel, LogModule } from '@prisma/client';

interface LogOptions {
  userId?: string;
  level: LogLevel;
  module: LogModule;
  action: string;
  resourceType?: string;
  resourceId?: string;
  input?: any;
  output?: any;
  message: string;
  metadata?: any;
  error?: string;
  stackTrace?: string;
  duration?: number;
}

/**
 * System Logger
 * Logs all system events with input/output tracking for debugging and auditing
 */
export class Logger {
  /**
   * Log an informational event
   */
  static async info(options: Omit<LogOptions, 'level'>) {
    return this.log({ ...options, level: 'INFO' });
  }

  /**
   * Log a warning event
   */
  static async warning(options: Omit<LogOptions, 'level'>) {
    return this.log({ ...options, level: 'WARNING' });
  }

  /**
   * Log an error event
   */
  static async error(options: Omit<LogOptions, 'level'>) {
    return this.log({ ...options, level: 'ERROR' });
  }

  /**
   * Log a success event
   */
  static async success(options: Omit<LogOptions, 'level'>) {
    return this.log({ ...options, level: 'SUCCESS' });
  }

  /**
   * Core logging method
   */
  private static async log(options: LogOptions) {
    try {
      const logEntry = await prisma.systemLog.create({
        data: {
          userId: options.userId || null,
          level: options.level,
          module: options.module,
          action: options.action,
          resourceType: options.resourceType || null,
          resourceId: options.resourceId || null,
          input: options.input ? JSON.stringify(options.input, null, 2) : null,
          output: options.output ? JSON.stringify(options.output, null, 2) : null,
          message: options.message,
          metadata: options.metadata ? JSON.stringify(options.metadata, null, 2) : null,
          error: options.error || null,
          stackTrace: options.stackTrace || null,
          duration: options.duration || null,
        },
      });

      // Also log to console in development
      if (process.env.NODE_ENV !== 'production') {
        const logMethod = options.level === 'ERROR' ? console.error : console.log;
        logMethod(`[${options.level}] [${options.module}] ${options.action}: ${options.message}`);
      }

      return logEntry;
    } catch (error) {
      // Fallback to console if database logging fails
      console.error('Failed to write to system log:', error);
      console.error('Original log entry:', options);
    }
  }

  /**
   * Helper to measure execution time and log results
   */
  static async track<T>(
    options: Omit<LogOptions, 'duration' | 'output' | 'level'>,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let result: T;
    let error: Error | undefined;

    try {
      result = await fn();
      const duration = Date.now() - startTime;

      await this.success({
        ...options,
        output: result,
        duration,
      });

      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      error = err as Error;

      await this.error({
        ...options,
        error: error.message,
        stackTrace: error.stack,
        duration,
      });

      throw err;
    }
  }
}

/**
 * Helper function to create a log context for a user
 */
export function createUserLogger(userId: string) {
  return {
    info: (options: Omit<LogOptions, 'level' | 'userId'>) =>
      Logger.info({ ...options, userId }),
    warning: (options: Omit<LogOptions, 'level' | 'userId'>) =>
      Logger.warning({ ...options, userId }),
    error: (options: Omit<LogOptions, 'level' | 'userId'>) =>
      Logger.error({ ...options, userId }),
    success: (options: Omit<LogOptions, 'level' | 'userId'>) =>
      Logger.success({ ...options, userId }),
    track: <T>(
      options: Omit<LogOptions, 'duration' | 'output' | 'level' | 'userId'>,
      fn: () => Promise<T>
    ) => Logger.track({ ...options, userId }, fn),
  };
}
