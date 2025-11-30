import { useCallback } from 'react';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private sessionId = Math.random().toString(36).substring(2, 15);

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: Date.now(),
      context,
      sessionId: this.sessionId
    };
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry(level, message, context);

    // Add to internal storage
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest
    }

    // Console output with formatting
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix} ${message}`, context || '');
        break;
      case LogLevel.INFO:
        console.info(`${prefix} ${message}`, context || '');
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} ${message}`, context || '');
        break;
      case LogLevel.ERROR:
        console.error(`${prefix} ${message}`, context || '');
        break;
    }

    // Send to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry) {
    try {
      // Example: Send to logging service
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // });
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Global logger instance
const logger = new Logger();

export const useLogger = () => {
  const debug = useCallback((message: string, context?: Record<string, any>) => {
    logger.debug(message, context);
  }, []);

  const info = useCallback((message: string, context?: Record<string, any>) => {
    logger.info(message, context);
  }, []);

  const warn = useCallback((message: string, context?: Record<string, any>) => {
    logger.warn(message, context);
  }, []);

  const error = useCallback((message: string, context?: Record<string, any>) => {
    logger.error(message, context);
  }, []);

  const getLogs = useCallback((level?: LogLevel) => {
    return logger.getLogs(level);
  }, []);

  const clearLogs = useCallback(() => {
    logger.clearLogs();
  }, []);

  const exportLogs = useCallback(() => {
    return logger.exportLogs();
  }, []);

  return {
    debug,
    info,
    warn,
    error,
    getLogs,
    clearLogs,
    exportLogs
  };
};

export default logger;