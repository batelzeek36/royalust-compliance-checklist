/**
 * Notifications Module
 * Handles completion alerts, reminders, and user notifications
 * Part of the Royalust Compliance Dashboard modular architecture
 */

class NotificationManager {
    constructor(options = {}) {
        this.options = {
            enableBrowserNotifications: true,
            enableInAppNotifications: true,
            enableSoundAlerts: false,
            defaultDuration: 5000,
            maxNotifications: 10,
            enablePersistence: true,
            enableReminders: true,
            reminderIntervals: [24, 7, 1], // hours before deadline
            ...options
        };
        
        this.notifications = new Map();
        this.notificationQueue = [];
        this.activeNotifications = new Set();
        this.notificationHistory = [];
        this.reminderSchedule = new Map();
        this.eventListeners = new Map();
        this.permissionStatus = 'default';
        this.soundEnabled = false;
        
        this.init();
    }

    async init() {
        await this.requestPermissions();
        this.setupNotificationTypes();
        this.loadNotificationHistory();
        this.bindEvents();
        this.startReminderScheduler();
        this.createNotificationContainer();
    }

    // Permission Management
    async requestPermissions() {
        if ('Notification' in window && this.options.enableBrowserNotifications) {
            try {
                this.permissionStatus = await Notification.requestPermission();
            } catch (error) {
                console.warn('Failed to request notification permission:', error);
                this.permissionStatus = 'denied';
            }
        }
        
        // Check for sound permission (if needed)
        if (this.options.enableSoundAlerts) {
            this.soundEnabled = true; // Assume enabled for now
        }
    }

    // Notification Types Setup
    setupNotificationTypes() {
        this.notificationTypes = new Map();
        
        // Completion notifications
        this.notificationTypes.set('item-completed', {
            title: 'Item Completed',
            icon: '✅',
            color: '#4caf50',
            sound: 'success',
            priority: 'normal',
            category: 'completion',
            template: 'Completed: {{itemTitle}}'
        });

        this.notificationTypes.set('category-completed', {
            title: 'Category Completed',
            icon: '🎉',
            color: '#4caf50',
            sound: 'achievement',
            priority: 'high',
            category: 'completion',
            template: 'All items completed in {{categoryTitle}}'
        });

        this.notificationTypes.set('milestone-reached', {
            title: 'Milestone Reached',
            icon: '🏆',
            color: '#ff9800',
            sound: 'achievement',
            priority: 'high',
            category: 'progress',
            template: '{{progress}}% completion milestone reached'
        });

        // Reminder notifications
        this.notificationTypes.set('deadline-reminder', {
            title: 'Deadline Reminder',
            icon: '⏰',
            color: '#ff5722',
            sound: 'reminder',
            priority: 'high',
            category: 'reminder',
            template: '{{itemTitle}} is due {{timeUntilDeadline}}'
        });

        this.notificationTypes.set('overdue-item', {
            title: 'Overdue Item',
            icon: '🚨',
            color: '#f44336',
            sound: 'alert',
            priority: 'urgent',
            category: 'alert',
            template: '{{itemTitle}} is overdue by {{overdueTime}}'
        });

        // Progress notifications
        this.notificationTypes.set('progress-update', {
            title: 'Progress Update',
            icon: '📊',
            color: '#2196f3',
            sound: 'info',
            priority: 'low',
            category: 'progress',
            template: 'Overall progress: {{progress}}%'
        });

        // System notifications
        this.notificationTypes.set('export-complete', {
            title: 'Export Complete',
            icon: '📤',
            color: '#009688',
            sound: 'success',
            priority: 'normal',
            category: 'system',
            template: 'Export completed: {{filename}}'
        });

        this.notificationTypes.set('validation-error', {
            title: 'Validation Error',
            icon: '⚠️',
            color: '#ff9800',
            sound: 'warning',
            priority: 'high',
            category: 'system',
            template: 'Validation failed: {{errorMessage}}'
        });

        // User action notifications
        this.notificationTypes.set('bulk-update', {
            title: 'Bulk Update Complete',
            icon: '📝',
            color: '#9c27b0',
            sound: 'success',
            priority: 'normal',
            category: 'action',
            template: '{{count}} items updated successfully'
        });
    }

    // Main Notification Methods
    async showNotification(type, data = {}, options = {}) {
        const notificationType = this.notificationTypes.get(type);
        if (!notificationType) {
            throw new Error(`Unknown notification type: ${type}`);
        }

        const notification = this.createNotification(type, notificationType, data, options);
        
        // Add to queue if too many active notifications
        if (this.activeNotifications.size >= this.options.maxNotifications) {
            this.notificationQueue.push(notification);
            return notification.id;
        }

        await this.displayNotification(notification);
        return notification.id;
    }

    createNotification(type, typeConfig, data, options) {
        const notification = {
            id: this.generateNotificationId(),
            type,
            title: options.title || typeConfig.title,
            message: this.processTemplate(typeConfig.template, data),
            icon: options.icon || typeConfig.icon,
            color: options.color || typeConfig.color,
            priority: options.priority || typeConfig.priority,
            category: typeConfig.category,
            sound: options.sound || typeConfig.sound,
            duration: options.duration || this.getDurationByPriority(typeConfig.priority),
            persistent: options.persistent || false,
            actions: options.actions || [],
            data: data,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        this.notifications.set(notification.id, notification);
        return notification;
    }

    async displayNotification(notification) {
        try {
            notification.status = 'displaying';
            this.activeNotifications.add(notification.id);

            // Show browser notification if enabled and permitted
            if (this.options.enableBrowserNotifications && this.permissionStatus === 'granted') {
                await this.showBrowserNotification(notification);
            }

            // Show in-app notification if enabled
            if (this.options.enableInAppNotifications) {
                this.showInAppNotification(notification);
            }

            // Play sound if enabled
            if (this.options.enableSoundAlerts && this.soundEnabled) {
                this.playNotificationSound(notification.sound);
            }

            // Add to history
            this.addToHistory(notification);

            // Auto-dismiss if not persistent
            if (!notification.persistent && notification.duration > 0) {
                setTimeout(() => {
                    this.dismissNotification(notification.id);
                }, notification.duration);
            }

            this.dispatchEvent('notification-shown', { notification });

        } catch (error) {
            console.error('Failed to display notification:', error);
            notification.status = 'failed';
            notification.error = error.message;
        }
    }

    async showBrowserNotification(notification) {
        const browserNotification = new Notification(notification.title, {
            body: notification.message,
            icon: this.getNotificationIcon(notification.icon),
            badge: '/assets/images/badge-icon.png',
            tag: notification.id,
            requireInteraction: notification.priority === 'urgent',
            actions: notification.actions.map(action => ({
                action: action.id,
                title: action.title,
                icon: action.icon
            }))
        });

        browserNotification.onclick = () => {
            this.handleNotificationClick(notification.id);
            browserNotification.close();
        };

        browserNotification.onclose = () => {
            this.dismissNotification(notification.id);
        };

        // Handle action clicks
        browserNotification.addEventListener('notificationclick', (event) => {
            if (event.action) {
                this.handleNotificationAction(notification.id, event.action);
            }
        });

        return browserNotification;
    }

    showInAppNotification(notification) {
        const container = this.getNotificationContainer();
        const element = this.createNotificationElement(notification);
        
        container.appendChild(element);
        
        // Animate in
        requestAnimationFrame(() => {
            element.classList.add('notification-enter');
        });

        // Store reference
        notification.element = element;
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification notification-${notification.priority} notification-${notification.category}`;
        element.setAttribute('data-notification-id', notification.id);
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', 'polite');

        const actionsHtml = notification.actions.length > 0 ? `
            <div class="notification-actions">
                ${notification.actions.map(action => `
                    <button class="notification-action" data-action="${action.id}">
                        ${action.icon ? `<span class="action-icon">${action.icon}</span>` : ''}
                        <span class="action-title">${action.title}</span>
                    </button>
                `).join('')}
            </div>
        ` : '';

        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <span class="notification-icon" style="color: ${notification.color}">
                        ${notification.icon}
                    </span>
                    <span class="notification-title">${notification.title}</span>
                    <button class="notification-close" aria-label="Close notification">×</button>
                </div>
                <div class="notification-body">
                    <p class="notification-message">${notification.message}</p>
                    ${actionsHtml}
                </div>
                <div class="notification-footer">
                    <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                    ${notification.priority === 'urgent' ? '<span class="priority-indicator">URGENT</span>' : ''}
                </div>
            </div>
            <div class="notification-progress" style="animation-duration: ${notification.duration}ms"></div>
        `;

        // Bind events
        this.bindNotificationEvents(element, notification);

        return element;
    }

    bindNotificationEvents(element, notification) {
        // Close button
        const closeButton = element.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.dismissNotification(notification.id);
            });
        }

        // Action buttons
        const actionButtons = element.querySelectorAll('.notification-action');
        actionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const actionId = button.dataset.action;
                this.handleNotificationAction(notification.id, actionId);
            });
        });

        // Click to focus/expand
        element.addEventListener('click', (event) => {
            if (!event.target.closest('.notification-close') && 
                !event.target.closest('.notification-action')) {
                this.handleNotificationClick(notification.id);
            }
        });
    }

    // Notification Management
    dismissNotification(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;

        notification.status = 'dismissed';
        this.activeNotifications.delete(notificationId);

        // Remove in-app notification element
        if (notification.element) {
            notification.element.classList.add('notification-exit');
            setTimeout(() => {
                if (notification.element && notification.element.parentNode) {
                    notification.element.parentNode.removeChild(notification.element);
                }
            }, 300);
        }

        this.dispatchEvent('notification-dismissed', { notification });

        // Process queue
        this.processNotificationQueue();
    }

    dismissAll() {
        const activeIds = Array.from(this.activeNotifications);
        activeIds.forEach(id => this.dismissNotification(id));
    }

    processNotificationQueue() {
        if (this.notificationQueue.length > 0 && 
            this.activeNotifications.size < this.options.maxNotifications) {
            const nextNotification = this.notificationQueue.shift();
            this.displayNotification(nextNotification);
        }
    }

    // Event Handlers
    handleNotificationClick(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;

        this.dispatchEvent('notification-clicked', { notification });

        // Default behavior based on notification type
        switch (notification.type) {
            case 'deadline-reminder':
            case 'overdue-item':
                this.focusOnItem(notification.data.itemId);
                break;
            case 'category-completed':
                this.focusOnCategory(notification.data.categoryId);
                break;
            case 'export-complete':
                this.showExportResult(notification.data.exportId);
                break;
        }
    }

    handleNotificationAction(notificationId, actionId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) return;

        this.dispatchEvent('notification-action', { 
            notification, 
            actionId 
        });

        // Handle common actions
        switch (actionId) {
            case 'mark-complete':
                this.markItemComplete(notification.data.itemId);
                break;
            case 'snooze':
                this.snoozeReminder(notification.data.itemId);
                break;
            case 'view-details':
                this.showItemDetails(notification.data.itemId);
                break;
        }

        // Auto-dismiss after action
        this.dismissNotification(notificationId);
    }

    // Reminder System
    scheduleReminder(itemId, deadline, reminderType = 'deadline-reminder') {
        if (!this.options.enableReminders || !deadline) return;

        const deadlineDate = new Date(deadline);
        const now = new Date();

        this.options.reminderIntervals.forEach(hoursBeforeDeadline => {
            const reminderTime = new Date(deadlineDate.getTime() - (hoursBeforeDeadline * 60 * 60 * 1000));
            
            if (reminderTime > now) {
                const reminderId = `${itemId}-${hoursBeforeDeadline}h`;
                const timeoutId = setTimeout(() => {
                    this.triggerReminder(itemId, reminderType, hoursBeforeDeadline);
                }, reminderTime.getTime() - now.getTime());

                this.reminderSchedule.set(reminderId, {
                    itemId,
                    timeoutId,
                    reminderTime: reminderTime.toISOString(),
                    hoursBeforeDeadline
                });
            }
        });
    }

    triggerReminder(itemId, reminderType, hoursBeforeDeadline) {
        // Get item data (this would come from the checklist manager)
        const itemData = this.getItemData(itemId);
        if (!itemData || itemData.completed) return;

        const timeUntilDeadline = hoursBeforeDeadline === 0 ? 'now' : 
            hoursBeforeDeadline < 24 ? `in ${hoursBeforeDeadline} hours` :
            `in ${Math.round(hoursBeforeDeadline / 24)} days`;

        this.showNotification(reminderType, {
            itemId,
            itemTitle: itemData.title,
            timeUntilDeadline,
            deadline: itemData.deadline
        }, {
            actions: [
                { id: 'mark-complete', title: 'Mark Complete', icon: '✅' },
                { id: 'snooze', title: 'Snooze 1h', icon: '⏰' },
                { id: 'view-details', title: 'View Details', icon: '👁️' }
            ]
        });
    }

    cancelReminders(itemId) {
        const remindersToCancel = Array.from(this.reminderSchedule.entries())
            .filter(([reminderId, reminder]) => reminder.itemId === itemId);

        remindersToCancel.forEach(([reminderId, reminder]) => {
            clearTimeout(reminder.timeoutId);
            this.reminderSchedule.delete(reminderId);
        });
    }

    snoozeReminder(itemId, snoozeHours = 1) {
        // Cancel existing reminders
        this.cancelReminders(itemId);

        // Schedule new reminder
        const snoozeTime = new Date(Date.now() + (snoozeHours * 60 * 60 * 1000));
        const timeoutId = setTimeout(() => {
            this.triggerReminder(itemId, 'deadline-reminder', 0);
        }, snoozeHours * 60 * 60 * 1000);

        this.reminderSchedule.set(`${itemId}-snoozed`, {
            itemId,
            timeoutId,
            reminderTime: snoozeTime.toISOString(),
            isSnoozed: true
        });
    }

    startReminderScheduler() {
        // Check for overdue items every hour
        setInterval(() => {
            this.checkOverdueItems();
        }, 60 * 60 * 1000);

        // Initial check
        this.checkOverdueItems();
    }

    checkOverdueItems() {
        // This would integrate with the checklist manager to get overdue items
        const overdueItems = this.getOverdueItems();
        
        overdueItems.forEach(item => {
            const overdueTime = this.calculateOverdueTime(item.deadline);
            
            this.showNotification('overdue-item', {
                itemId: item.id,
                itemTitle: item.title,
                overdueTime
            }, {
                priority: 'urgent',
                persistent: true,
                actions: [
                    { id: 'mark-complete', title: 'Mark Complete', icon: '✅' },
                    { id: 'view-details', title: 'View Details', icon: '👁️' }
                ]
            });
        });
    }

    // Progress Notifications
    checkProgressMilestones(newProgress, oldProgress) {
        const milestones = [25, 50, 75, 90, 100];
        
        milestones.forEach(milestone => {
            if (newProgress >= milestone && oldProgress < milestone) {
                this.showNotification('milestone-reached', {
                    progress: milestone
                }, {
                    priority: milestone === 100 ? 'high' : 'normal'
                });
            }
        });
    }

    // Sound Management
    playNotificationSound(soundType) {
        if (!this.soundEnabled) return;

        // This would play actual sound files
        // For now, we'll use the Web Audio API beep
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different frequencies for different sound types
            const frequencies = {
                success: 800,
                achievement: 1000,
                reminder: 600,
                alert: 400,
                warning: 500,
                info: 700
            };

            oscillator.frequency.setValueAtTime(frequencies[soundType] || 600, audioContext.currentTime);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('Failed to play notification sound:', error);
        }
    }

    // UI Management
    createNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-label', 'Notifications');
            document.body.appendChild(container);
        }
        return container;
    }

    getNotificationContainer() {
        return document.getElementById('notification-container') || this.createNotificationContainer();
    }

    // Utility Methods
    processTemplate(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    getDurationByPriority(priority) {
        const durations = {
            low: 3000,
            normal: 5000,
            high: 8000,
            urgent: 0 // Persistent
        };
        return durations[priority] || this.options.defaultDuration;
    }

    generateNotificationId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getNotificationIcon(iconText) {
        // Convert emoji to image path if needed
        return iconText; // For now, just return the emoji
    }

    calculateOverdueTime(deadline) {
        const now = new Date();
        const deadlineDate = new Date(deadline);
        const diffMs = now - deadlineDate;
        
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        } else {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        }
    }

    // Data Integration (these would be implemented with actual data sources)
    getItemData(itemId) {
        // This would integrate with ChecklistManager
        return null;
    }

    getOverdueItems() {
        // This would integrate with ChecklistManager
        return [];
    }

    focusOnItem(itemId) {
        // This would scroll to and highlight the item
        this.dispatchEvent('focus-item', { itemId });
    }

    focusOnCategory(categoryId) {
        // This would scroll to and expand the category
        this.dispatchEvent('focus-category', { categoryId });
    }

    showExportResult(exportId) {
        // This would show export details
        this.dispatchEvent('show-export', { exportId });
    }

    markItemComplete(itemId) {
        // This would mark the item as complete
        this.dispatchEvent('mark-complete', { itemId });
    }

    showItemDetails(itemId) {
        // This would show item details modal
        this.dispatchEvent('show-details', { itemId });
    }

    // History Management
    addToHistory(notification) {
        this.notificationHistory.unshift({
            ...notification,
            dismissedAt: null
        });

        // Keep only last 100 notifications
        if (this.notificationHistory.length > 100) {
            this.notificationHistory = this.notificationHistory.slice(0, 100);
        }

        if (this.options.enablePersistence) {
            this.saveNotificationHistory();
        }
    }

    getNotificationHistory(limit = 20) {
        return this.notificationHistory.slice(0, limit);
    }

    saveNotificationHistory() {
        try {
            localStorage.setItem('notification-history', JSON.stringify(this.notificationHistory));
        } catch (error) {
            console.warn('Failed to save notification history:', error);
        }
    }

    loadNotificationHistory() {
        if (!this.options.enablePersistence) return;

        try {
            const stored = localStorage.getItem('notification-history');
            if (stored) {
                this.notificationHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load notification history:', error);
            this.notificationHistory = [];
        }
    }

    // Event Management
    bindEvents() {
        // Listen for checklist events
        document.addEventListener('checklist-manager:item-completion-changed', (event) => {
            const { itemId, categoryId, completed } = event.detail;
            
            if (completed) {
                this.showNotification('item-completed', {
                    itemId,
                    itemTitle: event.detail.itemTitle || 'Item'
                });
                
                // Cancel any pending reminders
                this.cancelReminders(itemId);
            }
        });

        document.addEventListener('checklist-manager:category-progress-updated', (event) => {
            const { categoryId, newProgress, oldProgress } = event.detail;
            
            if (newProgress === 100 && oldProgress < 100) {
                this.showNotification('category-completed', {
                    categoryId,
                    categoryTitle: event.detail.categoryTitle || 'Category'
                });
            }
        });

        document.addEventListener('checklist-manager:overall-progress-updated', (event) => {
            const { overallProgress } = event.detail;
            
            // Check for milestone notifications (throttled)
            if (!this.lastProgressCheck || 
                Math.abs(overallProgress - this.lastProgressCheck) >= 5) {
                this.checkProgressMilestones(overallProgress, this.lastProgressCheck || 0);
                this.lastProgressCheck = overallProgress;
            }
        });
    }

    addEventListener(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }

    dispatchEvent(eventName, detail) {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(detail);
                } catch (e) {
                    console.error(`Error in notification event listener for ${eventName}:`, e);
                }
            });
        }

        // Also dispatch as DOM event
        const event = new CustomEvent(`notifications:${eventName}`, {
            detail,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Public API
    notify(type, data = {}, options = {}) {
        return this.showNotification(type, data, options);
    }

    dismiss(notificationId) {
        this.dismissNotification(notificationId);
    }

    dismissAllNotifications() {
        this.dismissAll();
    }

    scheduleItemReminder(itemId, deadline) {
        this.scheduleReminder(itemId, deadline);
    }

    getHistory(limit = 20) {
        return this.getNotificationHistory(limit);
    }

    // Cleanup
    destroy() {
        // Clear all timeouts
        this.reminderSchedule.forEach(reminder => {
            clearTimeout(reminder.timeoutId);
        });

        // Dismiss all notifications
        this.dismissAll();

        // Save state
        if (this.options.enablePersistence) {
            this.saveNotificationHistory();
        }

        // Clear data
        this.notifications.clear();
        this.reminderSchedule.clear();
        this.eventListeners.clear();

        // Remove container
        const container = document.getElementById('notification-container');
        if (container) {
            container.remove();
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}

// Global registration for direct script inclusion
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
}