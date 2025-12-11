/**
 * Centralized Logger for Deadblock
 * Provides consistent logging with levels, namespaces, and production safety
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// Set log level based on environment
const getLogLevel = () => {
  // In production, only show warnings and errors
  if (import.meta.env.PROD) {
    return LOG_LEVELS.WARN;
  }
  // In development, show everything
  return LOG_LEVELS.DEBUG;
};

class Logger {
  constructor(namespace = 'App') {
    this.namespace = namespace;
    this.level = getLogLevel();
  }

  /**
   * Create a namespaced logger
   * @param {string} namespace - The namespace for this logger instance
   * @returns {Logger} A new logger with the given namespace
   */
  static create(namespace) {
    return new Logger(namespace);
  }

  /**
   * Format the log message with timestamp and namespace
   */
  _format(level, ...args) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const prefix = `[${timestamp}] [${this.namespace}]`;
    return [prefix, ...args];
  }

  /**
   * Check if the given level should be logged
   */
  _shouldLog(level) {
    return level >= this.level;
  }

  /**
   * Debug level logging - development only
   */
  debug(...args) {
    if (this._shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(...this._format('DEBUG', ...args));
    }
  }

  /**
   * Info level logging
   */
  info(...args) {
    if (this._shouldLog(LOG_LEVELS.INFO)) {
      console.info(...this._format('INFO', ...args));
    }
  }

  /**
   * Warning level logging
   */
  warn(...args) {
    if (this._shouldLog(LOG_LEVELS.WARN)) {
      console.warn(...this._format('WARN', ...args));
    }
  }

  /**
   * Error level logging - always logged
   */
  error(...args) {
    if (this._shouldLog(LOG_LEVELS.ERROR)) {
      console.error(...this._format('ERROR', ...args));
    }
  }

  /**
   * Log a group of related messages
   */
  group(label, fn) {
    if (this._shouldLog(LOG_LEVELS.DEBUG)) {
      console.group(`[${this.namespace}] ${label}`);
      fn();
      console.groupEnd();
    }
  }

  /**
   * Log with timing information
   */
  time(label) {
    if (this._shouldLog(LOG_LEVELS.DEBUG)) {
      console.time(`[${this.namespace}] ${label}`);
    }
  }

  timeEnd(label) {
    if (this._shouldLog(LOG_LEVELS.DEBUG)) {
      console.timeEnd(`[${this.namespace}] ${label}`);
    }
  }

  /**
   * Log a table of data
   */
  table(data) {
    if (this._shouldLog(LOG_LEVELS.DEBUG)) {
      console.table(data);
    }
  }

  /**
   * Assert a condition
   */
  assert(condition, ...args) {
    if (this._shouldLog(LOG_LEVELS.DEBUG)) {
      console.assert(condition, ...this._format('ASSERT', ...args));
    }
  }

  /**
   * Track performance of async operations
   */
  async track(label, asyncFn) {
    const start = performance.now();
    try {
      const result = await asyncFn();
      const duration = performance.now() - start;
      this.debug(`${label} completed in ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${label} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }
}

// Pre-created loggers for common namespaces
export const logger = {
  app: Logger.create('App'),
  auth: Logger.create('Auth'),
  game: Logger.create('Game'),
  ai: Logger.create('AI'),
  audio: Logger.create('Audio'),
  network: Logger.create('Network'),
  stats: Logger.create('Stats'),
  achievements: Logger.create('Achievements'),
  puzzle: Logger.create('Puzzle'),
  online: Logger.create('Online'),
  ui: Logger.create('UI'),
};

// Default export for creating custom loggers
export default Logger;
