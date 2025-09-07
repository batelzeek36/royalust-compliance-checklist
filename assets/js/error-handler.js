/**
 * Centralized Error Management System
 * Handles all application errors with logging, recovery, and user notification
 */

class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.errorCallbacks = new Map();
        this.maxLogSize = 100;
        this.isInitialized = false;
        
        // Error severity levels
        this.SEVERITY = {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            CRITICAL: 'critical'
        };
        
        // Error categories
        this.CATEGORIES = {
            DATA: 'data',
            UI: 'ui',
            NETWORK: 'network',
            VALIDATION: 'validation',
            STORAGE: 'storage',
            ANIMATION: 'animation',
            EXPORT: 'export',
            SYSTEM: 'system'
        };
        
        this.init();
    }
    
    /**
     * Initialize error handler with global error listeners
     */
    init() {
        if (this.isInitialized) return;
        
        // Global error handlers
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                category: this.CATEGORIES.SYSTEM,
                severity: this.SEVERITY.HIGH
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled promise rejection',
                error: event.reason,
                category: this.CATEGORIES.SYSTEM,
                severity: this.SEVERITY.HIGH
            });
        });
        
        this.isInitialized = true;
        this.log('ErrorHandler initialized successfully', this.CATEGORIES.SYSTEM, this.SEVERITY.LOW);
    }
    
    /**
     * Handle and process errors
     * @param {Object} errorInfo - Error information object
     */
    handleError(errorInfo) {
        const processedError = this.processError(errorInfo);
        this.logError(processedError);
        this.notifyCallbacks(processedError);
        this.executeRecoveryStrategy(processedError);
        
        return processedError;
    }
    
    /**
     * Process and standardize error information
     * @param {Object} errorInfo - Raw error information
     * @returns {Object} Processed error object
     */
    processError(errorInfo) {
        const timestamp = new Date().toISOString();
        const errorId = this.generateErrorId();
        
        return {
            id: errorId,
            timestamp,
            type: errorInfo.type || 'unknown',
            message: errorInfo.message || 'Unknown error occurred',
            category: errorInfo.category || this.CATEGORIES.SYSTEM,
            severity: errorInfo.severity || this.SEVERITY.MEDIUM,
            context: errorInfo.context || {},
            stack: errorInfo.error?.stack || null,
            filename: errorInfo.filename || null,
            lineno: errorInfo.lineno || null,
            colno: errorInfo.colno || null,
            userAgent: navigator.userAgent,
            url: window.location.href,
            recoverable: errorInfo.recoverable !== false,
            handled: false
        };
    }
    
    /**
     * Log error to internal error log
     * @param {Object} error - Processed error object
     */
    logError(error) {
        this.errorLog.unshift(error);
        
        // Maintain log size limit
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(0, this.maxLogSize);
        }
        
        // Console logging based on severity
        const consoleMethod = this.getConsoleMethod(error.severity);
        console[consoleMethod](`[${error.category.toUpperCase()}] ${error.message}`, error);
    }
    
    /**
     * Get appropriate console method for error severity
     * @param {string} severity - Error severity level
     * @returns {string} Console method name
     */
    getConsoleMethod(severity) {
        switch (severity) {
            case this.SEVERITY.LOW:
                return 'info';
            case this.SEVERITY.MEDIUM:
                return 'warn';
            case this.SEVERITY.HIGH:
            case this.SEVERITY.CRITICAL:
                return 'error';
            default:
                return 'log';
        }
    }
    
    /**
     * Execute recovery strategy based on error type and severity
     * @param {Object} error - Processed error object
     */
    executeRecoveryStrategy(error) {
        try {
            switch (error.category) {
                case this.CATEGORIES.DATA:
                    this.handleDataError(error);
                    break;
                case this.CATEGORIES.UI:
                    this.handleUIError(error);
                    break;
                case this.CATEGORIES.STORAGE:
                    this.handleStorageError(error);
                    break;
                case this.CATEGORIES.NETWORK:
                    this.handleNetworkError(error);
                    break;
                case this.CATEGORIES.ANIMATION:
                    this.handleAnimationError(error);
                    break;
                default:
                    this.handleGenericError(error);
            }
            
            error.handled = true;
        } catch (recoveryError) {
            this.log(`Recovery strategy failed for error ${error.id}: ${recoveryError.message}`, 
                    this.CATEGORIES.SYSTEM, this.SEVERITY.HIGH);
        }
    }
    
    /**
     * Handle data-related errors
     * @param {Object} error - Error object
     */
    handleDataError(error) {
        if (error.severity === this.SEVERITY.CRITICAL) {
            // Attempt to reload from backup or default data
            this.triggerCallback('data.reload', error);
        }
    }
    
    /**
     * Handle UI-related errors
     * @param {Object} error - Error object
     */
    handleUIError(error) {
        // Attempt to re-render affected components
        this.triggerCallback('ui.refresh', error);
    }
    
    /**
     * Handle storage-related errors
     * @param {Object} error - Error object
     */
    handleStorageError(error) {
        // Clear corrupted storage and reinitialize
        this.triggerCallback('storage.reset', error);
    }
    
    /**
     * Handle network-related errors
     * @param {Object} error - Error object
     */
    handleNetworkError(error) {
        // Implement retry logic or offline mode
        this.triggerCallback('network.retry', error);
    }
    
    /**
     * Handle animation-related errors
     * @param {Object} error - Error object
     */
    handleAnimationError(error) {
        // Disable animations and use fallback
        this.triggerCallback('animation.disable', error);
    }
    
    /**
     * Handle generic errors
     * @param {Object} error - Error object
     */
    handleGenericError(error) {
        if (error.severity === this.SEVERITY.CRITICAL) {
            this.triggerCallback('app.restart', error);
        }
    }
    
    /**
     * Register error callback for specific error types
     * @param {string} eventType - Error event type
     * @param {Function} callback - Callback function
     */
    onError(eventType, callback) {
        if (!this.errorCallbacks.has(eventType)) {
            this.errorCallbacks.set(eventType, []);
        }
        this.errorCallbacks.get(eventType).push(callback);
    }
    
    /**
     * Trigger callbacks for specific error events
     * @param {string} eventType - Error event type
     * @param {Object} error - Error object
     */
    triggerCallback(eventType, error) {
        const callbacks = this.errorCallbacks.get(eventType);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(error);
                } catch (callbackError) {
                    this.log(`Error callback failed: ${callbackError.message}`, 
                            this.CATEGORIES.SYSTEM, this.SEVERITY.MEDIUM);
                }
            });
        }
    }
    
    /**
     * Notify all registered callbacks about error
     * @param {Object} error - Error object
     */
    notifyCallbacks(error) {
        this.triggerCallback('error.all', error);
        this.triggerCallback(`error.${error.category}`, error);
        this.triggerCallback(`error.${error.severity}`, error);
    }
    
    /**
     * Generate unique error ID
     * @returns {string} Unique error identifier
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Log informational message
     * @param {string} message - Log message
     * @param {string} category - Error category
     * @param {string} severity - Error severity
     */
    log(message, category = this.CATEGORIES.SYSTEM, severity = this.SEVERITY.LOW) {
        this.handleError({
            type: 'log',
            message,
            category,
            severity,
            recoverable: true
        });
    }
    
    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getStats() {
        const stats = {
            total: this.errorLog.length,
            byCategory: {},
            bySeverity: {},
            recent: this.errorLog.slice(0, 10)
        };
        
        this.errorLog.forEach(error => {
            stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
        });
        
        return stats;
    }
    
    /**
     * Clear error log
     */
    clearLog() {
        this.errorLog = [];
        this.log('Error log cleared', this.CATEGORIES.SYSTEM, this.SEVERITY.LOW);
    }
    
    /**
     * Export error log for debugging
     * @returns {string} JSON string of error log
     */
    exportLog() {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            stats: this.getStats(),
            errors: this.errorLog
        }, null, 2);
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
} else {
    window.ErrorHandler = ErrorHandler;
    window.errorHandler = errorHandler;
}