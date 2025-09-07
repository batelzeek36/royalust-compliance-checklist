/**
 * Events Module
 * Pub/Sub event system for decoupled component communication
 */

import { CONFIG } from './config.js';
import logger from './logger.js';

class EventManager {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 50;
    
    logger.debug('EventManager initialized', null, 'events');
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event
   * @param {Function} callback - Callback function
   * @param {Object} options - Options (priority, context)
   */
  on(eventName, callback, options = {}) {
    if (typeof callback !== 'function') {
      logger.warn('Event callback must be a function', { eventName }, 'events');
      return;
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    const listener = {
      callback,
      priority: options.priority || 0,
      context: options.context || null,
      id: this.generateListenerId()
    };

    const listeners = this.listeners.get(eventName);
    listeners.push(listener);
    
    // Sort by priority (higher priority first)
    listeners.sort((a, b) => b.priority - a.priority);

    logger.debug(`Event listener added: ${eventName}`, { 
      listenerId: listener.id, 
      priority: listener.priority 
    }, 'events');

    return listener.id;
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first trigger)
   * @param {string} eventName - Name of the event
   * @param {Function} callback - Callback function
   * @param {Object} options - Options
   */
  once(eventName, callback, options = {}) {
    if (typeof callback !== 'function') {
      logger.warn('Event callback must be a function', { eventName }, 'events');
      return;
    }

    if (!this.onceListeners.has(eventName)) {
      this.onceListeners.set(eventName, []);
    }

    const listener = {
      callback,
      priority: options.priority || 0,
      context: options.context || null,
      id: this.generateListenerId()
    };

    const listeners = this.onceListeners.get(eventName);
    listeners.push(listener);
    listeners.sort((a, b) => b.priority - a.priority);

    logger.debug(`One-time event listener added: ${eventName}`, { 
      listenerId: listener.id 
    }, 'events');

    return listener.id;
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Name of the event
   * @param {string|Function} listenerIdOrCallback - Listener ID or callback function
   */
  off(eventName, listenerIdOrCallback) {
    const removed = this.removeListener(this.listeners, eventName, listenerIdOrCallback) ||
                   this.removeListener(this.onceListeners, eventName, listenerIdOrCallback);

    if (removed) {
      logger.debug(`Event listener removed: ${eventName}`, { 
        listenerId: removed.id 
      }, 'events');
    } else {
      logger.warn(`Event listener not found: ${eventName}`, { 
        listenerIdOrCallback 
      }, 'events');
    }
  }

  /**
   * Remove listener from a listeners map
   */
  removeListener(listenersMap, eventName, listenerIdOrCallback) {
    if (!listenersMap.has(eventName)) {
      return null;
    }

    const listeners = listenersMap.get(eventName);
    const index = listeners.findIndex(listener => {
      return listener.id === listenerIdOrCallback || 
             listener.callback === listenerIdOrCallback;
    });

    if (index !== -1) {
      const removed = listeners.splice(index, 1)[0];
      
      // Clean up empty arrays
      if (listeners.length === 0) {
        listenersMap.delete(eventName);
      }
      
      return removed;
    }

    return null;
  }

  /**
   * Emit an event
   * @param {string} eventName - Name of the event
   * @param {*} data - Data to pass to listeners
   * @param {Object} options - Emission options
   */
  emit(eventName, data = null, options = {}) {
    const startTime = performance.now();
    
    logger.debug(`Emitting event: ${eventName}`, { data }, 'events');

    // Add to event history
    this.addToHistory(eventName, data);

    let listenersExecuted = 0;
    const errors = [];

    // Execute regular listeners
    if (this.listeners.has(eventName)) {
      const listeners = this.listeners.get(eventName);
      listenersExecuted += this.executeListeners(listeners, eventName, data, errors);
    }

    // Execute one-time listeners and remove them
    if (this.onceListeners.has(eventName)) {
      const listeners = this.onceListeners.get(eventName);
      listenersExecuted += this.executeListeners(listeners, eventName, data, errors);
      this.onceListeners.delete(eventName);
    }

    const duration = performance.now() - startTime;
    
    logger.debug(`Event completed: ${eventName}`, {
      listenersExecuted,
      errors: errors.length,
      duration: `${duration.toFixed(2)}ms`
    }, 'events');

    // Log errors if any occurred
    if (errors.length > 0) {
      logger.error(`Errors in event listeners for: ${eventName}`, { errors }, 'events');
    }

    return {
      listenersExecuted,
      errors,
      duration
    };
  }

  /**
   * Execute listeners array
   */
  executeListeners(listeners, eventName, data, errors) {
    let executed = 0;

    for (const listener of listeners) {
      try {
        if (listener.context) {
          listener.callback.call(listener.context, data, eventName);
        } else {
          listener.callback(data, eventName);
        }
        executed++;
      } catch (error) {
        errors.push({
          listenerId: listener.id,
          error: error.message,
          stack: error.stack
        });
        logger.error(`Error in event listener: ${eventName}`, {
          listenerId: listener.id,
          error: error.message
        }, 'events');
      }
    }

    return executed;
  }

  /**
   * Add event to history
   */
  addToHistory(eventName, data) {
    this.eventHistory.push({
      eventName,
      data,
      timestamp: Date.now()
    });

    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Generate unique listener ID
   */
  generateListenerId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all listeners for an event
   */
  getListeners(eventName) {
    const regular = this.listeners.get(eventName) || [];
    const once = this.onceListeners.get(eventName) || [];
    return [...regular, ...once];
  }

  /**
   * Check if event has listeners
   */
  hasListeners(eventName) {
    return this.listeners.has(eventName) || this.onceListeners.has(eventName);
  }

  /**
   * Get event history
   */
  getEventHistory(eventName = null) {
    if (eventName) {
      return this.eventHistory.filter(event => event.eventName === eventName);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear all listeners
   */
  clear() {
    this.listeners.clear();
    this.onceListeners.clear();
    logger.info('All event listeners cleared', null, 'events');
  }

  /**
   * Clear listeners for specific event
   */
  clearEvent(eventName) {
    this.listeners.delete(eventName);
    this.onceListeners.delete(eventName);
    logger.info(`Event listeners cleared for: ${eventName}`, null, 'events');
  }

  /**
   * Get statistics about the event system
   */
  getStats() {
    const regularEvents = Array.from(this.listeners.keys());
    const onceEvents = Array.from(this.onceListeners.keys());
    
    let totalListeners = 0;
    this.listeners.forEach(listeners => {
      totalListeners += listeners.length;
    });
    this.onceListeners.forEach(listeners => {
      totalListeners += listeners.length;
    });

    return {
      totalEvents: regularEvents.length + onceEvents.length,
      regularEvents: regularEvents.length,
      onceEvents: onceEvents.length,
      totalListeners,
      historySize: this.eventHistory.length
    };
  }
}

// Create singleton instance
const eventManager = new EventManager();

// Export convenience functions
export const on = (eventName, callback, options) => eventManager.on(eventName, callback, options);
export const once = (eventName, callback, options) => eventManager.once(eventName, callback, options);
export const off = (eventName, listenerIdOrCallback) => eventManager.off(eventName, listenerIdOrCallback);
export const emit = (eventName, data, options) => eventManager.emit(eventName, data, options);

// Export the manager instance and CONFIG events
export { eventManager as default, CONFIG };

// Set up some built-in event listeners for debugging
if (CONFIG.LOGGING.ENABLED && CONFIG.LOGGING.LEVEL === 'debug') {
  on('*', (data, eventName) => {
    logger.debug(`Global event listener: ${eventName}`, data, 'events');
  });
}