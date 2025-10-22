import type { MonitorConfig } from "./config";

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private level: LogLevel;

  constructor(level: string = "info") {
    this.level = this.parseLogLevel(level);
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case "error":
        return LogLevel.ERROR;
      case "warn":
        return LogLevel.WARN;
      case "info":
        return LogLevel.INFO;
      case "debug":
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  error(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage("error", message, context));
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage("warn", message, context));
    }
  }

  info(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage("info", message, context));
    }
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage("debug", message, context));
    }
  }

  // Specialized logging methods for monitor context
  networkLog(network: string, message: string, context?: any): void {
    this.info(message, { network, ...context });
  }

  intentLog(
    intentId: number,
    network: string,
    message: string,
    context?: any
  ): void {
    this.info(message, { intentId, network, ...context });
  }

  syncLog(network: string, message: string, context?: any): void {
    this.info(message, { network, sync: true, ...context });
  }

  errorLog(
    network: string,
    message: string,
    error: Error,
    context?: any
  ): void {
    this.error(message, {
      network,
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }
}

// Global logger instance
let globalLogger: Logger;

export function createLogger(config: MonitorConfig): Logger {
  globalLogger = new Logger(config.logLevel);
  return globalLogger;
}

export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}
