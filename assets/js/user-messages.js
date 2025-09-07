/**
 * User Messages and Recovery Options System
 * Provides user-friendly error messages and recovery guidance
 */

class UserMessageSystem {
    constructor() {
        this.messageContainer = null;
        this.messageQueue = [];
        this.activeMessages = new Map();
        this.messageTypes = {
            ERROR: 'error',
            WARNING: 'warning',
            INFO: 'info',
            SUCCESS: 'success',
            RECOVERY: 'recovery'
        };
        
        this.messageTemplates = new Map();
        this.recoveryActions = new Map();
        this.isInitialized = false;
        
        this.init();
    }
    
    /**
     * Initialize the user message system
     */
    init() {
        if (this.isInitialized) return;
        
        this.createMessageContainer();
        this.setupMessageTemplates();
        this.setupRecoveryActions();
        this.setupKeyboardHandlers();
        
        this.isInitialized = true;
    }
    
    /**
     * Create the message container in the DOM
     */
    createMessageContainer() {
        // Check if container already exists
        this.messageContainer = document.getElementById('user-messages');
        
        if (!this.messageContainer) {
            this.messageContainer = document.createElement('div');
            this.messageContainer.id = 'user-messages';
            this.messageContainer.className = 'user-messages-container';
            this.messageContainer.setAttribute('aria-live', 'polite');
            this.messageContainer.setAttribute('aria-atomic', 'false');
            
            // Add CSS styles
            this.addMessageStyles();
            
            // Insert at the beginning of body
            document.body.insertBefore(this.messageContainer, document.body.firstChild);
        }
    }
    
    /**
     * Add CSS styles for message system
     */
    addMessageStyles() {
        const styleId = 'user-messages-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .user-messages-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            }
            
            .user-message {
                background: var(--glass-white, rgba(255, 255, 255, 0.1));
                backdrop-filter: blur(10px);
                border: 1px solid var(--glass-border, rgba(212, 175, 55, 0.2));
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
                color: var(--champagne, #f7e7ce);
                font-family: var(--font-body, 'Inter', sans-serif);
                font-size: 14px;
                line-height: 1.4;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
                pointer-events: auto;
                position: relative;
            }
            
            .user-message.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .user-message.error {
                border-left: 4px solid var(--error-red, #f44336);
                background: rgba(244, 67, 54, 0.1);
            }
            
            .user-message.warning {
                border-left: 4px solid var(--warning-amber, #ff9800);
                background: rgba(255, 152, 0, 0.1);
            }
            
            .user-message.info {
                border-left: 4px solid var(--info-blue, #2196f3);
                background: rgba(33, 150, 243, 0.1);
            }
            
            .user-message.success {
                border-left: 4px solid var(--success-green, #4caf50);
                background: rgba(76, 175, 80, 0.1);
            }
            
            .user-message.recovery {
                border-left: 4px solid var(--mystic-violet, #4a148c);
                background: rgba(74, 20, 140, 0.1);
            }
            
            .message-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            
            .message-title {
                font-weight: 600;
                color: var(--royalust-gold, #d4af37);
                margin: 0;
            }
            
            .message-close {
                background: none;
                border: none;
                color: var(--champagne, #f7e7ce);
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s ease;
            }
            
            .message-close:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .message-content {
                margin-bottom: 12px;
            }
            
            .message-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .message-action {
                background: var(--royalust-gold, #d4af37);
                color: var(--midnight-blue, #0f1419);
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .message-action:hover {
                background: var(--bronze-light, #cd7f32);
                transform: translateY(-1px);
            }
            
            .message-action.secondary {
                background: transparent;
                color: var(--champagne, #f7e7ce);
                border: 1px solid var(--glass-border, rgba(212, 175, 55, 0.2));
            }
            
            .message-action.secondary:hover {
                background: var(--glass-white, rgba(255, 255, 255, 0.1));
            }
            
            .message-icon {
                margin-right: 8px;
                font-size: 16px;
            }
            
            @media (max-width: 480px) {
                .user-messages-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
                
                .user-message {
                    margin-bottom: 8px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Setup default message templates
     */
    setupMessageTemplates() {
        // Data-related messages
        this.messageTemplates.set('data.load.failed', {
            title: 'Data Loading Failed',
            message: 'Unable to load compliance data. Using backup data instead.',
            type: this.messageTypes.WARNING,
            icon: '⚠️',
            recoveryActions: ['reload.data', 'use.backup']
        });
        
        this.messageTemplates.set('data.save.failed', {
            title: 'Save Failed',
            message: 'Your progress could not be saved. Changes will be lost when you refresh.',
            type: this.messageTypes.ERROR,
            icon: '💾',
            recoveryActions: ['retry.save', 'export.data']
        });
        
        this.messageTemplates.set('data.corrupted', {
            title: 'Data Corruption Detected',
            message: 'Some data appears to be corrupted. We\'ve restored from a backup.',
            type: this.messageTypes.WARNING,
            icon: '🔧',
            recoveryActions: ['reset.data', 'contact.support']
        });
        
        // Storage-related messages
        this.messageTemplates.set('storage.unavailable', {
            title: 'Storage Unavailable',
            message: 'Local storage is not available. Progress will not be saved between sessions.',
            type: this.messageTypes.WARNING,
            icon: '💿',
            recoveryActions: ['enable.storage', 'use.session']
        });
        
        this.messageTemplates.set('storage.quota.exceeded', {
            title: 'Storage Full',
            message: 'Local storage is full. Some data may not be saved.',
            type: this.messageTypes.ERROR,
            icon: '📦',
            recoveryActions: ['clear.storage', 'export.data']
        });
        
        // Network-related messages
        this.messageTemplates.set('network.offline', {
            title: 'You\'re Offline',
            message: 'No internet connection detected. Some features may be limited.',
            type: this.messageTypes.INFO,
            icon: '📡',
            recoveryActions: ['retry.connection', 'work.offline']
        });
        
        this.messageTemplates.set('network.timeout', {
            title: 'Connection Timeout',
            message: 'The request took too long to complete. Please try again.',
            type: this.messageTypes.WARNING,
            icon: '⏱️',
            recoveryActions: ['retry.request', 'check.connection']
        });
        
        // UI-related messages
        this.messageTemplates.set('ui.render.failed', {
            title: 'Display Error',
            message: 'Some content could not be displayed properly. Refreshing may help.',
            type: this.messageTypes.WARNING,
            icon: '🖥️',
            recoveryActions: ['refresh.page', 'reset.ui']
        });
        
        this.messageTemplates.set('animation.disabled', {
            title: 'Animations Disabled',
            message: 'Animations have been disabled due to performance issues or browser limitations.',
            type: this.messageTypes.INFO,
            icon: '🎬',
            recoveryActions: ['enable.animations', 'keep.disabled']
        });
        
        // Validation messages
        this.messageTemplates.set('validation.failed', {
            title: 'Invalid Data',
            message: 'Some data failed validation checks. Please review and correct any issues.',
            type: this.messageTypes.ERROR,
            icon: '✅',
            recoveryActions: ['show.errors', 'reset.form']
        });
        
        // Export messages
        this.messageTemplates.set('export.failed', {
            title: 'Export Failed',
            message: 'Unable to export your data. Please try again or contact support.',
            type: this.messageTypes.ERROR,
            icon: '📤',
            recoveryActions: ['retry.export', 'copy.data']
        });
        
        // Success messages
        this.messageTemplates.set('data.saved', {
            title: 'Progress Saved',
            message: 'Your compliance progress has been saved successfully.',
            type: this.messageTypes.SUCCESS,
            icon: '✅',
            autoHide: 3000
        });
        
        this.messageTemplates.set('export.success', {
            title: 'Export Complete',
            message: 'Your compliance report has been exported successfully.',
            type: this.messageTypes.SUCCESS,
            icon: '📋',
            autoHide: 3000
        });
    }
    
    /**
     * Setup recovery action handlers
     */
    setupRecoveryActions() {
        // Data recovery actions
        this.recoveryActions.set('reload.data', {
            label: 'Reload Data',
            action: () => {
                if (window.dataManager) {
                    window.dataManager.loadComplianceData(true);
                }
                this.showMessage('data.reload.attempt', {
                    title: 'Reloading Data',
                    message: 'Attempting to reload compliance data...',
                    type: this.messageTypes.INFO,
                    autoHide: 2000
                });
            }
        });
        
        this.recoveryActions.set('use.backup', {
            label: 'Use Backup',
            action: () => {
                if (window.fallbackSystem) {
                    const backupData = window.fallbackSystem.getFallbackData('complianceData');
                    if (window.dataManager) {
                        window.dataManager.setData(backupData);
                    }
                }
                this.showMessage('backup.loaded', {
                    title: 'Backup Loaded',
                    message: 'Backup data has been loaded successfully.',
                    type: this.messageTypes.SUCCESS,
                    autoHide: 3000
                });
            }
        });
        
        this.recoveryActions.set('retry.save', {
            label: 'Retry Save',
            action: () => {
                if (window.dataManager) {
                    window.dataManager.saveProgress();
                }
            }
        });
        
        this.recoveryActions.set('export.data', {
            label: 'Export Data',
            action: () => {
                if (window.dataManager) {
                    window.dataManager.exportReport();
                }
            }
        });
        
        // Storage recovery actions
        this.recoveryActions.set('clear.storage', {
            label: 'Clear Storage',
            action: () => {
                try {
                    localStorage.clear();
                    this.showMessage('storage.cleared', {
                        title: 'Storage Cleared',
                        message: 'Local storage has been cleared. You may need to reload the page.',
                        type: this.messageTypes.INFO,
                        recoveryActions: ['refresh.page']
                    });
                } catch (error) {
                    this.showMessage('storage.clear.failed', {
                        title: 'Clear Failed',
                        message: 'Unable to clear storage. Please try manually.',
                        type: this.messageTypes.ERROR
                    });
                }
            }
        });
        
        this.recoveryActions.set('enable.storage', {
            label: 'Enable Storage',
            action: () => {
                this.showMessage('storage.enable.help', {
                    title: 'Enable Storage',
                    message: 'Please enable local storage in your browser settings to save progress.',
                    type: this.messageTypes.INFO
                });
            }
        });
        
        // Network recovery actions
        this.recoveryActions.set('retry.connection', {
            label: 'Retry',
            action: () => {
                // Simple connectivity test
                fetch('/', { method: 'HEAD', cache: 'no-cache' })
                    .then(() => {
                        this.showMessage('connection.restored', {
                            title: 'Connection Restored',
                            message: 'Internet connection is working again.',
                            type: this.messageTypes.SUCCESS,
                            autoHide: 3000
                        });
                    })
                    .catch(() => {
                        this.showMessage('connection.still.offline', {
                            title: 'Still Offline',
                            message: 'Connection could not be established. Please check your internet.',
                            type: this.messageTypes.WARNING
                        });
                    });
            }
        });
        
        // UI recovery actions
        this.recoveryActions.set('refresh.page', {
            label: 'Refresh Page',
            action: () => {
                window.location.reload();
            }
        });
        
        this.recoveryActions.set('reset.ui', {
            label: 'Reset Interface',
            action: () => {
                if (window.app && window.app.reset) {
                    window.app.reset();
                }
            }
        });
        
        // Animation recovery actions
        this.recoveryActions.set('enable.animations', {
            label: 'Enable Animations',
            action: () => {
                if (window.ANIMATIONS_DISABLED) {
                    window.ANIMATIONS_DISABLED = false;
                    // Remove disable styles
                    const disableStyle = document.querySelector('style[data-disable-animations]');
                    if (disableStyle) {
                        disableStyle.remove();
                    }
                }
            }
        });
        
        this.recoveryActions.set('keep.disabled', {
            label: 'Keep Disabled',
            action: () => {
                this.hideMessage('animation.disabled');
            }
        });
    }
    
    /**
     * Setup keyboard handlers for accessibility
     */
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (event) => {
            // ESC key closes all messages
            if (event.key === 'Escape') {
                this.hideAllMessages();
            }
        });
    }
    
    /**
     * Show a user message
     * @param {string} messageId - Message identifier
     * @param {Object} customOptions - Custom message options
     * @returns {string} Message element ID
     */
    showMessage(messageId, customOptions = {}) {
        const template = this.messageTemplates.get(messageId);
        const options = { ...template, ...customOptions };
        
        if (!options) {
            console.warn(`Unknown message template: ${messageId}`);
            return null;
        }
        
        const messageElementId = this.createMessageElement(messageId, options);
        
        // Auto-hide if specified
        if (options.autoHide) {
            setTimeout(() => {
                this.hideMessage(messageElementId);
            }, options.autoHide);
        }
        
        return messageElementId;
    }
    
    /**
     * Create message DOM element
     * @param {string} messageId - Message identifier
     * @param {Object} options - Message options
     * @returns {string} Message element ID
     */
    createMessageElement(messageId, options) {
        const elementId = `message-${messageId}-${Date.now()}`;
        
        const messageElement = document.createElement('div');
        messageElement.id = elementId;
        messageElement.className = `user-message ${options.type}`;
        messageElement.setAttribute('role', 'alert');
        
        // Create header
        const header = document.createElement('div');
        header.className = 'message-header';
        
        const title = document.createElement('h4');
        title.className = 'message-title';
        title.innerHTML = `${options.icon || ''} ${options.title}`;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'message-close';
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', 'Close message');
        closeButton.onclick = () => this.hideMessage(elementId);
        
        header.appendChild(title);
        header.appendChild(closeButton);
        
        // Create content
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = options.message;
        
        messageElement.appendChild(header);
        messageElement.appendChild(content);
        
        // Create actions if specified
        if (options.recoveryActions && options.recoveryActions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'message-actions';
            
            options.recoveryActions.forEach((actionId, index) => {
                const actionConfig = this.recoveryActions.get(actionId);
                if (actionConfig) {
                    const actionButton = document.createElement('button');
                    actionButton.className = `message-action ${index > 0 ? 'secondary' : ''}`;
                    actionButton.textContent = actionConfig.label;
                    actionButton.onclick = () => {
                        actionConfig.action();
                        if (actionId !== 'keep.disabled') {
                            this.hideMessage(elementId);
                        }
                    };
                    actionsContainer.appendChild(actionButton);
                }
            });
            
            messageElement.appendChild(actionsContainer);
        }
        
        // Add to container
        this.messageContainer.appendChild(messageElement);
        this.activeMessages.set(elementId, messageElement);
        
        // Trigger show animation
        requestAnimationFrame(() => {
            messageElement.classList.add('show');
        });
        
        return elementId;
    }
    
    /**
     * Hide a specific message
     * @param {string} messageId - Message element ID
     */
    hideMessage(messageId) {
        const messageElement = this.activeMessages.get(messageId);
        if (messageElement) {
            messageElement.classList.remove('show');
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
                this.activeMessages.delete(messageId);
            }, 300);
        }
    }
    
    /**
     * Hide all active messages
     */
    hideAllMessages() {
        this.activeMessages.forEach((element, id) => {
            this.hideMessage(id);
        });
    }
    
    /**
     * Show error message with recovery options
     * @param {Error} error - Error object
     * @param {Object} context - Additional context
     */
    showError(error, context = {}) {
        const errorType = this.categorizeError(error, context);
        const messageId = `error.${errorType}`;
        
        // Try to use specific template or create generic one
        let template = this.messageTemplates.get(messageId);
        if (!template) {
            template = {
                title: 'An Error Occurred',
                message: error.message || 'An unexpected error occurred. Please try again.',
                type: this.messageTypes.ERROR,
                icon: '❌',
                recoveryActions: ['refresh.page']
            };
        }
        
        return this.showMessage(messageId, template);
    }
    
    /**
     * Categorize error for appropriate message template
     * @param {Error} error - Error object
     * @param {Object} context - Error context
     * @returns {string} Error category
     */
    categorizeError(error, context) {
        const message = error.message?.toLowerCase() || '';
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'network';
        } else if (message.includes('storage') || message.includes('quota')) {
            return 'storage';
        } else if (message.includes('validation')) {
            return 'validation';
        } else if (context.category) {
            return context.category;
        } else {
            return 'generic';
        }
    }
    
    /**
     * Add custom message template
     * @param {string} messageId - Message identifier
     * @param {Object} template - Message template
     */
    addMessageTemplate(messageId, template) {
        this.messageTemplates.set(messageId, template);
    }
    
    /**
     * Add custom recovery action
     * @param {string} actionId - Action identifier
     * @param {Object} actionConfig - Action configuration
     */
    addRecoveryAction(actionId, actionConfig) {
        this.recoveryActions.set(actionId, actionConfig);
    }
    
    /**
     * Get message statistics
     * @returns {Object} Message statistics
     */
    getStats() {
        return {
            activeMessages: this.activeMessages.size,
            totalTemplates: this.messageTemplates.size,
            totalActions: this.recoveryActions.size
        };
    }
}

// Create singleton instance
const userMessageSystem = new UserMessageSystem();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserMessageSystem;
} else {
    window.UserMessageSystem = UserMessageSystem;
    window.userMessageSystem = userMessageSystem;
}