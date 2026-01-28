/**
 * Logger utility with DEBUG_MODE support
 *
 * Set DEBUG_MODE=true in environment to enable debug logs
 * In production, only warn and error logs are shown by default
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  debugMode: boolean;
  prefix?: string;
}

const getDebugMode = (): boolean => {
  // Check environment variable (works on server-side)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development';
  }
  // Check window for client-side (can be set via localStorage for testing)
  if (typeof window !== 'undefined') {
    return localStorage.getItem('DEBUG_MODE') === 'true';
  }
  return false;
};

class Logger {
  private config: LoggerConfig;

  constructor(prefix?: string) {
    this.config = {
      debugMode: getDebugMode(),
      prefix: prefix,
    };
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): void {
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    const timestamp = new Date().toISOString();
    const formattedMessage = `${timestamp} ${prefix} ${message}`;

    switch (level) {
      case 'debug':
        if (this.config.debugMode) {
          console.debug(formattedMessage, ...args);
        }
        break;
      case 'info':
        if (this.config.debugMode) {
          console.info(formattedMessage, ...args);
        }
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      case 'error':
        console.error(formattedMessage, ...args);
        break;
    }
  }

  /**
   * Debug level - only shown when DEBUG_MODE=true
   */
  debug(message: string, ...args: unknown[]): void {
    this.formatMessage('debug', message, ...args);
  }

  /**
   * Info level - only shown when DEBUG_MODE=true
   */
  info(message: string, ...args: unknown[]): void {
    this.formatMessage('info', message, ...args);
  }

  /**
   * Warning level - always shown
   */
  warn(message: string, ...args: unknown[]): void {
    this.formatMessage('warn', message, ...args);
  }

  /**
   * Error level - always shown
   */
  error(message: string, ...args: unknown[]): void {
    this.formatMessage('error', message, ...args);
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.config.debugMode;
  }
}

// Create logger instances for different modules
export const logger = new Logger();
export const apiLogger = new Logger('API');
export const serviceLogger = new Logger('Service');
export const flowLogger = new Logger('Flow');
export const schemaLogger = new Logger('Schema');

// Factory function to create custom loggers
export function createLogger(prefix: string): Logger {
  return new Logger(prefix);
}

// Export the Logger class for type usage
export { Logger };
