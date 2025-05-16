/**
 * Logger Service for Analytics Suite
 * Provides unified logging across the application
 */

// Log levels in order of severity
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Environment-specific configuration
const isProduction = process.env.NODE_ENV === 'production';
const defaultLevel = isProduction ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

// Symbols for visual clarity in the console
const SYMBOLS = {
  DEBUG: '🔍',
  INFO: 'ℹ️',
  WARN: '⚠️',
  ERROR: '❌'
};

// ANSI colors for console output
const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  UNDERSCORE: '\x1b[4m',
  BLINK: '\x1b[5m',
  REVERSE: '\x1b[7m',
  HIDDEN: '\x1b[8m',
  
  FG_BLACK: '\x1b[30m',
  FG_RED: '\x1b[31m',
  FG_GREEN: '\x1b[32m',
  FG_YELLOW: '\x1b[33m',
  FG_BLUE: '\x1b[34m',
  FG_MAGENTA: '\x1b[35m',
  FG_CYAN: '\x1b[36m',
  FG_WHITE: '\x1b[37m',
  
  BG_BLACK: '\x1b[40m',
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
  BG_MAGENTA: '\x1b[45m',
  BG_CYAN: '\x1b[46m',
  BG_WHITE: '\x1b[47m'
};

export class LoggerService {
  constructor(options = {}) {
    this.context = options.context || 'app';
    this.level = options.level !== undefined ? options.level : defaultLevel;
    this.metadata = options.metadata || {};
    this.useColors = options.useColors !== undefined ? options.useColors : !isProduction;
    
    this.logs = [];
    this.maxLogSize = options.maxLogSize || 100;
  }
  
  /**
   * Create a child logger with additional context
   */
  child(context, metadata = {}) {
    return new LoggerService({
      context: `${this.context}:${context}`,
      level: this.level,
      metadata: { ...this.metadata, ...metadata },
      useColors: this.useColors
    });
  }
  
  /**
   * Log a debug message
   */
  debug(message, data = {}) {
    this._log(LOG_LEVELS.DEBUG, message, data);
  }
  
  /**
   * Log an info message
   */
  info(message, data = {}) {
    this._log(LOG_LEVELS.INFO, message, data);
  }
  
  /**
   * Log a warning message
   */
  warn(message, data = {}) {
    this._log(LOG_LEVELS.WARN, message, data);
  }
  
  /**
   * Log an error message
   */
  error(message, error = null, data = {}) {
    const errorData = error ? {
      errorMessage: error.message,
      stack: error.stack,
      ...data
    } : data;
    
    this._log(LOG_LEVELS.ERROR, message, errorData);
  }
  
  /**
   * Measure performance of a function
   */
  async measure(label, fn) {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.debug(`⏱️ ${label}`, { duration: `${duration.toFixed(2)}ms` });
    }
  }
  
  /**
   * Internal logging method
   */
  _log(level, message, data = {}) {
    if (level < this.level) return;
    
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
    const timestamp = new Date().toISOString();
    const symbol = SYMBOLS[levelName] || '';
    
    // Prepare log entry
    const logEntry = {
      timestamp,
      level: levelName,
      context: this.context,
      message,
      ...this.metadata,
      ...data
    };
    
    // Store log entry
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }
    
    // Console output with colors for development
    if (typeof console !== 'undefined') {
      let consoleMethod;
      let consoleColor;
      
      switch (level) {
        case LOG_LEVELS.DEBUG:
          consoleMethod = console.debug || console.log;
          consoleColor = COLORS.FG_CYAN;
          break;
        case LOG_LEVELS.INFO:
          consoleMethod = console.info;
          consoleColor = COLORS.FG_GREEN;
          break;
        case LOG_LEVELS.WARN:
          consoleMethod = console.warn;
          consoleColor = COLORS.FG_YELLOW;
          break;
        case LOG_LEVELS.ERROR:
          consoleMethod = console.error;
          consoleColor = COLORS.FG_RED;
          break;
        default:
          consoleMethod = console.log;
          consoleColor = COLORS.RESET;
      }
      
      const contextStr = this.context ? `[${this.context}]` : '';
      
      if (this.useColors) {
        consoleMethod(
          `${consoleColor}${symbol} ${timestamp} ${levelName}${COLORS.RESET} ${contextStr} ${message}`,
          Object.keys(data).length ? data : ''
        );
      } else {
        consoleMethod(
          `${symbol} ${timestamp} ${levelName} ${contextStr} ${message}`,
          Object.keys(data).length ? data : ''
        );
      }
    }
    
    // In production, we would also write to file or send to a logging service
    if (isProduction && level >= LOG_LEVELS.ERROR) {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(data.error || new Error(message), {
      //   extra: logEntry
      // });
    }
  }
  
  /**
   * Get all stored logs
   */
  getLogs() {
    return [...this.logs];
  }
  
  /**
   * Clear stored logs
   */
  clearLogs() {
    this.logs = [];
  }
}

// Create specialized loggers
export const apiLogger = new LoggerService({ context: 'api' });
export const analyticsLogger = new LoggerService({ context: 'analytics' });
export const uiLogger = new LoggerService({ context: 'ui' });

// Alias eventLogger to uiLogger to resolve import errors for now.
// TODO: Implement a proper EventLogger with specific tracking methods if needed.
export const eventLogger = uiLogger; 

export const billingLogger = new LoggerService({ context: 'billing' });

// Default logger for general use
export default new LoggerService();
