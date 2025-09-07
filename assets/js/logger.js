/**
 * Logger Module
 * Centralized logging system for debugging and error tracking
 */

import { CONFIG } from './config.js';

class Logger {
  constructor() {
    this.logs = [];
    this.maxEntries = CONFIG.LOGGING.MAX_ENTRIES;
    this.enabled = CONFIG.LOGGING.ENABLED;
    this.level = CONFIG.LOGGING.LEVEL;
    this.consoleOutput = CONFIG.LOGGING.CONSOLE_OUTPUT;
    
    // Log levels with numeric values for comparison
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    this.currentLevel = this.levels[this.level] || 1;
    
    // Initialize with startup log
    this.info('Logger initialized', { 
      level: this.level, 
      enabled: this.enabled,
      maxEntries: this.maxEntries 
    });
  }

  /**
   * Add a log entry
   * @param {string} level - Log level (debug, info, warn, error)
   * @param {string} message - Log message
   * @param {*} data - Additional data to log
   * @param {string} category - Optional category for filtering
   */
  log(level, message, data = null, category = 'general') {
    if (!this.enabled || this.levels[level] < this.currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      category,
      stack: level === 'error' ? new Error().stack : null
    };

    // Add to internal log storage
    this.logs.push(logEntry);
    
    // Maintain max entries limit
    if (this.logs.length > this.maxEntries) {
      this.logs.shift();
    }

    // Output to console if enabled
    if (this.consoleOutput) {
      this.outputToConsole(logEntry);
    }

    // Emit log event for external listeners
    this.emitLogEvent(logEntry);
  }

  /**
   * Debug level logging
   */
  debug(message, data = null, category = 'general') {
    this.log('debug', message, data, category);
  }

  /**
   * Info level logging
   */
  info(message, data = null, category = 'general') {
    this.log('info', message, data, category);
  }

  /**
   * Warning level logging
   */
  warn(message, data = null, category = 'general') {
    this.log('warn', message, data, category);
  }

  /**
   * Error level logging
   */
  error(message, data = null, category = 'general') {
    this.log('error', message, data, category);
  }

  /**
   * Output log entry to browser console
   */
  outputToConsole(logEntry) {
    const { level, message, data, timestamp, category } = logEntry;
    const prefix = `[${timestamp}] [${category.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data || '');
        break;
      case 'info':
        console.info(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        if (logEntry.stack) {
          console.error('Stack trace:', logEntry.stack);
        }
        break;
    }
  }

  /**
   * Emit log event for external listeners
   */
  emitLogEvent(logEntry) {
    const event = new CustomEvent('logger:entry', {
      detail: logEntry
    });
    window.dispatchEvent(event);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category) {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 10) {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    this.info('Logs cleared');
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Set log level
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.level = level;
      this.currentLevel = this.levels[level];
      this.info(`Log level changed to: ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) {
      this.info('Logging enabled');
    }
  }

  /**
   * Performance timing helper
   */
  time(label) {
    const startTime = performance.now();
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.debug(`Timer: ${label}`, { duration: `${duration.toFixed(2)}ms` }, 'performance');
        return duration;
      }
    };
  }

  /**
   * Log application errors with context
   */
  logError(error, context = {}) {
    this.error('Application Error', {
      message: error.message,
      stack: error.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    }, 'error');
  }

  /**
   * Log user interactions for analytics
   */
  logInteraction(action, element, data = {}) {
    this.info(`User interaction: ${action}`, {
      element: element?.tagName || 'unknown',
      elementId: element?.id || null,
      elementClass: element?.className || null,
      data
    }, 'interaction');
  }

  /**
   * Log performance metrics
   */
  logPerformance(metric, value, unit = 'ms') {
    this.info(`Performance: ${metric}`, {
      value,
      unit,
      timestamp: performance.now()
    }, 'performance');
  }
}

// Create singleton instance
const logger = new Logger();

// Global error handler
window.addEventListener('error', (event) => {
  logger.logError(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  logger.logError(new Error(event.reason), {
    type: 'unhandled_promise_rejection',
    reason: event.reason
  });
});

export default logger;