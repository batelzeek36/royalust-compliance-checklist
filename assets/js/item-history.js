/**
 * Item History Module
 * Tracks completion history and changes for checklist items
 * Part of the Royalust Compliance Dashboard modular architecture
 */

class ItemHistoryTracker {
    constructor(options = {}) {
        this.options = {
            maxHistoryEntries: 100,
            trackUserActions: true,
            trackSystemActions: true,
            enableTimestamps: true,
            enableUserTracking: true,
            autoSave: true,
            compressionEnabled: true,
            ...options
        };
        
        this.historyStore = new Map();
        this.userSessions = new Map();
        this.actionTypes = new Map();
        this.eventListeners = new Map();
        this.currentUser = 'Anonymous';
        this.sessionId = this.generateSessionId();
        
        this.init();
    }

    init() {
        this.registerActionTypes();
        this.loadHistoryData();
        this.startSession();
        this.bindEvents();
    }

    // Action Types Registration
    registerActionTypes() {
        // Completion actions
        this.actionTypes.set('completed', {
            name: 'Item Completed',
            icon: '✅',
            color: '#4caf50',
            category: 'completion',
            description: 'Item marked as completed'
        });

        this.actionTypes.set('uncompleted', {
            name: 'Item Uncompleted',
            icon: '⏳',
            color: '#ff9800',
            category: 'completion',
            description: 'Item marked as incomplete'
        });

        // Modification actions
        this.actionTypes.set('created', {
            name: 'Item Created',
            icon: '➕',
            color: '#2196f3',
            category: 'modification',
            description: 'New item created'
        });

        this.actionTypes.set('updated', {
            name: 'Item Updated',
            icon: '📝',
            color: '#9c27b0',
            category: 'modification',
            description: 'Item details modified'
        });

        this.actionTypes.set('deleted', {
            name: 'Item Deleted',
            icon: '🗑️',
            color: '#f44336',
            category: 'modification',
            description: 'Item removed'
        });

        // Priority actions
        this.actionTypes.set('priority_changed', {
            name: 'Priority Changed',
            icon: '🔄',
            color: '#ff5722',
            category: 'priority',
            description: 'Item priority level modified'
        });

        this.actionTypes.set('deadline_set', {
            name: 'Deadline Set',
            icon: '📅',
            color: '#795548',
            category: 'scheduling',
            description: 'Deadline assigned to item'
        });

        this.actionTypes.set('deadline_changed', {
            name: 'Deadline Changed',
            icon: '📆',
            color: '#607d8b',
            category: 'scheduling',
            description: 'Item deadline modified'
        });

        // Source actions
        this.actionTypes.set('source_added', {
            name: 'Source Added',
            icon: '🔗',
            color: '#3f51b5',
            category: 'sources',
            description: 'Reference source added'
        });

        this.actionTypes.set('source_removed', {
            name: 'Source Removed',
            icon: '🔓',
            color: '#e91e63',
            category: 'sources',
            description: 'Reference source removed'
        });

        // System actions
        this.actionTypes.set('imported', {
            name: 'Data Imported',
            icon: '📥',
            color: '#009688',
            category: 'system',
            description: 'Item imported from external source'
        });

        this.actionTypes.set('exported', {
            name: 'Data Exported',
            icon: '📤',
            color: '#4caf50',
            category: 'system',
            description: 'Item included in export'
        });

        this.actionTypes.set('validated', {
            name: 'Validation Check',
            icon: '✔️',
            color: '#8bc34a',
            category: 'system',
            description: 'Item passed validation'
        });

        this.actionTypes.set('validation_failed', {
            name: 'Validation Failed',
            icon: '❌',
            color: '#f44336',
            category: 'system',
            description: 'Item failed validation'
        });
    }

    // History Recording
    recordAction(itemId, categoryId, actionType, details = {}) {
        if (!this.shouldTrackAction(actionType)) {
            return null;
        }

        const historyEntry = this.createHistoryEntry(itemId, categoryId, actionType, details);
        
        // Get or create history for this item
        if (!this.historyStore.has(itemId)) {
            this.historyStore.set(itemId, []);
        }
        
        const itemHistory = this.historyStore.get(itemId);
        itemHistory.push(historyEntry);
        
        // Maintain history size limit
        if (itemHistory.length > this.options.maxHistoryEntries) {
            itemHistory.splice(0, itemHistory.length - this.options.maxHistoryEntries);
        }
        
        // Auto-save if enabled
        if (this.options.autoSave) {
            this.saveItemHistory(itemId);
        }
        
        // Dispatch event
        this.dispatchEvent('action-recorded', {
            itemId,
            categoryId,
            actionType,
            historyEntry
        });
        
        return historyEntry;
    }

    createHistoryEntry(itemId, categoryId, actionType, details) {
        const actionConfig = this.actionTypes.get(actionType);
        
        return {
            id: this.generateEntryId(),
            itemId,
            categoryId,
            actionType,
            actionName: actionConfig ? actionConfig.name : actionType,
            actionIcon: actionConfig ? actionConfig.icon : '📋',
            actionColor: actionConfig ? actionConfig.color : '#666666',
            actionCategory: actionConfig ? actionConfig.category : 'other',
            timestamp: new Date().toISOString(),
            user: this.currentUser,
            sessionId: this.sessionId,
            details: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                ...details
            },
            metadata: {
                version: '1.0',
                source: 'item-history-tracker'
            }
        };
    }

    shouldTrackAction(actionType) {
        const actionConfig = this.actionTypes.get(actionType);
        
        if (!actionConfig) return false;
        
        // Check if we should track user vs system actions
        if (actionConfig.category === 'system' && !this.options.trackSystemActions) {
            return false;
        }
        
        if (actionConfig.category !== 'system' && !this.options.trackUserActions) {
            return false;
        }
        
        return true;
    }

    // Batch Recording
    recordBatchActions(actions) {
        const results = [];
        
        actions.forEach(action => {
            try {
                const result = this.recordAction(
                    action.itemId,
                    action.categoryId,
                    action.actionType,
                    action.details
                );
                results.push({ success: true, entry: result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        });
        
        // Batch save
        if (this.options.autoSave) {
            this.saveAllHistory();
        }
        
        return results;
    }

    // History Retrieval
    getItemHistory(itemId, options = {}) {
        const {
            limit = null,
            actionTypes = null,
            dateRange = null,
            userFilter = null,
            sortOrder = 'desc'
        } = options;
        
        let history = this.historyStore.get(itemId) || [];
        
        // Apply filters
        if (actionTypes && actionTypes.length > 0) {
            history = history.filter(entry => actionTypes.includes(entry.actionType));
        }
        
        if (dateRange) {
            const startDate = dateRange.start ? new Date(dateRange.start) : null;
            const endDate = dateRange.end ? new Date(dateRange.end) : null;
            
            history = history.filter(entry => {
                const entryDate = new Date(entry.timestamp);
                if (startDate && entryDate < startDate) return false;
                if (endDate && entryDate > endDate) return false;
                return true;
            });
        }
        
        if (userFilter) {
            history = history.filter(entry => entry.user === userFilter);
        }
        
        // Sort
        history.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        
        // Limit results
        if (limit && limit > 0) {
            history = history.slice(0, limit);
        }
        
        return history.map(entry => ({
            ...entry,
            formattedTimestamp: this.formatTimestamp(entry.timestamp),
            timeAgo: this.getTimeAgo(entry.timestamp),
            isRecent: this.isRecentAction(entry.timestamp)
        }));
    }

    getRecentActivity(options = {}) {
        const {
            limit = 20,
            categoryId = null,
            actionTypes = null,
            hoursBack = 24
        } = options;
        
        const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
        const allActivity = [];
        
        // Collect activity from all items
        this.historyStore.forEach((history, itemId) => {
            history.forEach(entry => {
                const entryDate = new Date(entry.timestamp);
                if (entryDate >= cutoffTime) {
                    // Apply filters
                    if (categoryId && entry.categoryId !== categoryId) return;
                    if (actionTypes && !actionTypes.includes(entry.actionType)) return;
                    
                    allActivity.push(entry);
                }
            });
        });
        
        // Sort by timestamp (most recent first)
        allActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Limit results
        const limitedActivity = limit ? allActivity.slice(0, limit) : allActivity;
        
        return limitedActivity.map(entry => ({
            ...entry,
            formattedTimestamp: this.formatTimestamp(entry.timestamp),
            timeAgo: this.getTimeAgo(entry.timestamp),
            isRecent: true
        }));
    }

    getActivitySummary(itemId, options = {}) {
        const history = this.getItemHistory(itemId, options);
        
        const summary = {
            totalActions: history.length,
            actionsByType: {},
            actionsByUser: {},
            actionsByCategory: {},
            firstAction: null,
            lastAction: null,
            mostActiveUser: null,
            completionHistory: []
        };
        
        if (history.length === 0) {
            return summary;
        }
        
        // Analyze history
        history.forEach(entry => {
            // Count by type
            summary.actionsByType[entry.actionType] = 
                (summary.actionsByType[entry.actionType] || 0) + 1;
            
            // Count by user
            summary.actionsByUser[entry.user] = 
                (summary.actionsByUser[entry.user] || 0) + 1;
            
            // Count by category
            summary.actionsByCategory[entry.actionCategory] = 
                (summary.actionsByCategory[entry.actionCategory] || 0) + 1;
            
            // Track completion actions
            if (entry.actionType === 'completed' || entry.actionType === 'uncompleted') {
                summary.completionHistory.push({
                    timestamp: entry.timestamp,
                    completed: entry.actionType === 'completed',
                    user: entry.user
                });
            }
        });
        
        // Find first and last actions
        const sortedHistory = [...history].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
        summary.firstAction = sortedHistory[0];
        summary.lastAction = sortedHistory[sortedHistory.length - 1];
        
        // Find most active user
        let maxActions = 0;
        Object.entries(summary.actionsByUser).forEach(([user, count]) => {
            if (count > maxActions) {
                maxActions = count;
                summary.mostActiveUser = user;
            }
        });
        
        return summary;
    }

    // Timeline Generation
    generateTimeline(itemIds = null, options = {}) {
        const {
            groupByDay = true,
            includeSystemActions = false,
            limit = 100
        } = options;
        
        const timelineEvents = [];
        const itemsToProcess = itemIds || Array.from(this.historyStore.keys());
        
        itemsToProcess.forEach(itemId => {
            const history = this.getItemHistory(itemId, {
                actionTypes: includeSystemActions ? null : 
                    Array.from(this.actionTypes.keys()).filter(type => {
                        const config = this.actionTypes.get(type);
                        return config.category !== 'system';
                    })
            });
            
            history.forEach(entry => {
                timelineEvents.push({
                    ...entry,
                    date: entry.timestamp.split('T')[0], // Extract date part
                    time: entry.timestamp.split('T')[1]  // Extract time part
                });
            });
        });
        
        // Sort by timestamp
        timelineEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Group by day if requested
        if (groupByDay) {
            const groupedEvents = {};
            
            timelineEvents.forEach(event => {
                if (!groupedEvents[event.date]) {
                    groupedEvents[event.date] = [];
                }
                groupedEvents[event.date].push(event);
            });
            
            return Object.entries(groupedEvents)
                .map(([date, events]) => ({
                    date,
                    formattedDate: this.formatDate(date),
                    eventCount: events.length,
                    events: events.slice(0, limit)
                }))
                .slice(0, Math.ceil(limit / 10)); // Limit number of days
        }
        
        return timelineEvents.slice(0, limit);
    }

    // Statistics and Analytics
    getStatistics(options = {}) {
        const {
            categoryId = null,
            dateRange = null,
            userFilter = null
        } = options;
        
        const stats = {
            totalItems: this.historyStore.size,
            totalActions: 0,
            actionsByType: {},
            actionsByCategory: {},
            actionsByUser: {},
            actionsByDay: {},
            mostActiveItems: [],
            completionRate: 0,
            averageActionsPerItem: 0
        };
        
        let completedItems = 0;
        const itemActivityCounts = [];
        
        this.historyStore.forEach((history, itemId) => {
            let itemActionCount = 0;
            let itemCompleted = false;
            
            history.forEach(entry => {
                // Apply filters
                if (categoryId && entry.categoryId !== categoryId) return;
                if (userFilter && entry.user !== userFilter) return;
                if (dateRange) {
                    const entryDate = new Date(entry.timestamp);
                    if (dateRange.start && entryDate < new Date(dateRange.start)) return;
                    if (dateRange.end && entryDate > new Date(dateRange.end)) return;
                }
                
                stats.totalActions++;
                itemActionCount++;
                
                // Count by type
                stats.actionsByType[entry.actionType] = 
                    (stats.actionsByType[entry.actionType] || 0) + 1;
                
                // Count by category
                stats.actionsByCategory[entry.actionCategory] = 
                    (stats.actionsByCategory[entry.actionCategory] || 0) + 1;
                
                // Count by user
                stats.actionsByUser[entry.user] = 
                    (stats.actionsByUser[entry.user] || 0) + 1;
                
                // Count by day
                const day = entry.timestamp.split('T')[0];
                stats.actionsByDay[day] = (stats.actionsByDay[day] || 0) + 1;
                
                // Track completion
                if (entry.actionType === 'completed') {
                    itemCompleted = true;
                }
            });
            
            if (itemActionCount > 0) {
                itemActivityCounts.push({ itemId, actionCount: itemActionCount });
                if (itemCompleted) completedItems++;
            }
        });
        
        // Calculate derived statistics
        stats.completionRate = stats.totalItems > 0 ? 
            (completedItems / stats.totalItems) * 100 : 0;
        
        stats.averageActionsPerItem = stats.totalItems > 0 ? 
            stats.totalActions / stats.totalItems : 0;
        
        // Find most active items
        stats.mostActiveItems = itemActivityCounts
            .sort((a, b) => b.actionCount - a.actionCount)
            .slice(0, 10);
        
        return stats;
    }

    // User Session Management
    startSession() {
        const session = {
            id: this.sessionId,
            user: this.currentUser,
            startTime: new Date().toISOString(),
            actions: 0,
            lastActivity: new Date().toISOString()
        };
        
        this.userSessions.set(this.sessionId, session);
        this.saveSessionData();
    }

    updateSession() {
        const session = this.userSessions.get(this.sessionId);
        if (session) {
            session.actions++;
            session.lastActivity = new Date().toISOString();
            this.saveSessionData();
        }
    }

    setCurrentUser(username) {
        this.currentUser = username || 'Anonymous';
        
        // Start new session for new user
        this.sessionId = this.generateSessionId();
        this.startSession();
    }

    // Data Persistence
    saveItemHistory(itemId) {
        const history = this.historyStore.get(itemId);
        if (history) {
            const key = `item-history-${itemId}`;
            const data = this.options.compressionEnabled ? 
                this.compressHistory(history) : history;
            
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (error) {
                console.warn(`Failed to save history for item ${itemId}:`, error);
            }
        }
    }

    loadItemHistory(itemId) {
        const key = `item-history-${itemId}`;
        const stored = localStorage.getItem(key);
        
        if (stored) {
            try {
                const data = JSON.parse(stored);
                const history = this.options.compressionEnabled ? 
                    this.decompressHistory(data) : data;
                
                this.historyStore.set(itemId, history);
                return history;
            } catch (error) {
                console.warn(`Failed to load history for item ${itemId}:`, error);
            }
        }
        
        return [];
    }

    saveAllHistory() {
        this.historyStore.forEach((_, itemId) => {
            this.saveItemHistory(itemId);
        });
    }

    loadHistoryData() {
        // Load history for all items that have stored data
        const keys = Object.keys(localStorage).filter(key => 
            key.startsWith('item-history-')
        );
        
        keys.forEach(key => {
            const itemId = key.replace('item-history-', '');
            this.loadItemHistory(itemId);
        });
    }

    saveSessionData() {
        const sessions = Array.from(this.userSessions.values());
        localStorage.setItem('item-history-sessions', JSON.stringify(sessions));
    }

    // Compression (basic implementation)
    compressHistory(history) {
        // Simple compression by removing redundant data
        return history.map(entry => ({
            ...entry,
            details: entry.details ? {
                // Keep only essential details
                previousValue: entry.details.previousValue,
                newValue: entry.details.newValue
            } : {}
        }));
    }

    decompressHistory(compressedHistory) {
        // Restore compressed history
        return compressedHistory.map(entry => ({
            ...entry,
            details: entry.details || {}
        }));
    }

    // Utility Methods
    generateEntryId() {
        return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 30) return `${diffDays} days ago`;
        
        return this.formatDate(timestamp);
    }

    isRecentAction(timestamp) {
        const now = new Date();
        const actionTime = new Date(timestamp);
        const diffHours = (now - actionTime) / (1000 * 60 * 60);
        
        return diffHours <= 24; // Consider actions within 24 hours as recent
    }

    // Event Management
    bindEvents() {
        // Listen for checklist item events
        document.addEventListener('checklist-item:completion-changed', (event) => {
            const { itemId, categoryId, completed, previousState } = event.detail;
            
            this.recordAction(itemId, categoryId, completed ? 'completed' : 'uncompleted', {
                previousValue: previousState,
                newValue: completed
            });
        });
        
        // Update session on any action
        document.addEventListener('checklist-item:completion-changed', () => {
            this.updateSession();
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
                    console.error(`Error in history event listener for ${eventName}:`, e);
                }
            });
        }
        
        // Also dispatch as DOM event
        const event = new CustomEvent(`item-history:${eventName}`, {
            detail,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Public API
    record(itemId, categoryId, actionType, details = {}) {
        return this.recordAction(itemId, categoryId, actionType, details);
    }

    getHistory(itemId, options = {}) {
        return this.getItemHistory(itemId, options);
    }

    getActivity(options = {}) {
        return this.getRecentActivity(options);
    }

    getSummary(itemId, options = {}) {
        return this.getActivitySummary(itemId, options);
    }

    getTimeline(itemIds = null, options = {}) {
        return this.generateTimeline(itemIds, options);
    }

    getStats(options = {}) {
        return this.getStatistics(options);
    }

    setUser(username) {
        this.setCurrentUser(username);
    }

    // Cleanup
    clearHistory(itemId = null) {
        if (itemId) {
            this.historyStore.delete(itemId);
            localStorage.removeItem(`item-history-${itemId}`);
        } else {
            this.historyStore.clear();
            const keys = Object.keys(localStorage).filter(key => 
                key.startsWith('item-history-')
            );
            keys.forEach(key => localStorage.removeItem(key));
        }
    }

    destroy() {
        this.saveAllHistory();
        this.saveSessionData();
        this.historyStore.clear();
        this.userSessions.clear();
        this.eventListeners.clear();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ItemHistoryTracker;
}

// Global registration for direct script inclusion
if (typeof window !== 'undefined') {
    window.ItemHistoryTracker = ItemHistoryTracker;
}