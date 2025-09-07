/**
 * Checklist Manager Module
 * Manages completion state, progress tracking, and coordination between checklist items
 * Part of the Royalust Compliance Dashboard modular architecture
 */

class ChecklistManager {
    constructor(options = {}) {
        this.options = {
            autoSave: true,
            trackHistory: true,
            enableNotifications: true,
            progressUpdateDelay: 100,
            ...options
        };
        
        this.categories = new Map();
        this.items = new Map();
        this.completionState = new Map();
        this.progressCache = new Map();
        this.eventListeners = new Map();
        this.updateQueue = [];
        this.isUpdating = false;
        
        this.init();
    }

    init() {
        this.loadState();
        this.bindGlobalEvents();
        this.startProgressUpdateLoop();
    }

    // Category Management
    registerCategory(categoryId, categoryData) {
        if (!categoryId || !categoryData) {
            throw new Error('Category ID and data are required');
        }
        
        this.categories.set(categoryId, {
            ...categoryData,
            items: categoryData.items || [],
            progress: 0,
            completedCount: 0,
            totalCount: categoryData.items ? categoryData.items.length : 0
        });
        
        // Register all items in the category
        if (categoryData.items) {
            categoryData.items.forEach(item => {
                this.registerItem(categoryId, item);
            });
        }
        
        this.calculateCategoryProgress(categoryId);
        this.dispatchEvent('category-registered', { categoryId, categoryData });
    }

    unregisterCategory(categoryId) {
        const category = this.categories.get(categoryId);
        if (!category) return false;
        
        // Unregister all items in the category
        category.items.forEach(item => {
            this.unregisterItem(categoryId, item.id);
        });
        
        this.categories.delete(categoryId);
        this.progressCache.delete(categoryId);
        
        this.dispatchEvent('category-unregistered', { categoryId });
        return true;
    }

    // Item Management
    registerItem(categoryId, itemData) {
        if (!categoryId || !itemData || !itemData.id) {
            throw new Error('Category ID and item data with ID are required');
        }
        
        const itemKey = `${categoryId}:${itemData.id}`;
        
        // Load saved completion state
        const savedState = this.loadItemState(categoryId, itemData.id);
        const completed = savedState ? savedState.completed : (itemData.completed || false);
        
        this.items.set(itemKey, {
            ...itemData,
            categoryId,
            completed
        });
        
        this.completionState.set(itemKey, {
            completed,
            lastModified: savedState ? savedState.lastModified : new Date().toISOString(),
            history: savedState ? savedState.history : []
        });
        
        this.dispatchEvent('item-registered', { categoryId, itemId: itemData.id, itemData });
    }

    unregisterItem(categoryId, itemId) {
        const itemKey = `${categoryId}:${itemId}`;
        
        if (!this.items.has(itemKey)) return false;
        
        this.items.delete(itemKey);
        this.completionState.delete(itemKey);
        
        this.dispatchEvent('item-unregistered', { categoryId, itemId });
        return true;
    }

    // Completion State Management
    setItemCompletion(categoryId, itemId, completed, options = {}) {
        const itemKey = `${categoryId}:${itemId}`;
        const item = this.items.get(itemKey);
        
        if (!item) {
            console.warn(`Item not found: ${itemKey}`);
            return false;
        }
        
        const previousState = this.completionState.get(itemKey);
        const wasCompleted = previousState ? previousState.completed : false;
        
        if (wasCompleted === completed) {
            return true; // No change needed
        }
        
        // Update completion state
        const newState = {
            completed,
            lastModified: new Date().toISOString(),
            history: previousState ? [...previousState.history] : []
        };
        
        // Add history entry if tracking is enabled
        if (this.options.trackHistory) {
            newState.history.push({
                action: completed ? 'completed' : 'uncompleted',
                timestamp: newState.lastModified,
                user: options.user || 'System',
                source: options.source || 'manual'
            });
            
            // Keep only last 20 entries
            if (newState.history.length > 20) {
                newState.history = newState.history.slice(-20);
            }
        }
        
        this.completionState.set(itemKey, newState);
        
        // Update item data
        item.completed = completed;
        
        // Queue progress update
        this.queueProgressUpdate(categoryId);
        
        // Auto-save if enabled
        if (this.options.autoSave) {
            this.saveItemState(categoryId, itemId);
        }
        
        // Dispatch events
        this.dispatchEvent('item-completion-changed', {
            categoryId,
            itemId,
            completed,
            previousState: wasCompleted,
            timestamp: newState.lastModified
        });
        
        // Trigger notifications if enabled
        if (this.options.enableNotifications && completed) {
            this.triggerCompletionNotification(categoryId, itemId);
        }
        
        return true;
    }

    getItemCompletion(categoryId, itemId) {
        const itemKey = `${categoryId}:${itemId}`;
        const state = this.completionState.get(itemKey);
        return state ? state.completed : false;
    }

    toggleItemCompletion(categoryId, itemId, options = {}) {
        const currentState = this.getItemCompletion(categoryId, itemId);
        return this.setItemCompletion(categoryId, itemId, !currentState, options);
    }

    // Bulk Operations
    setMultipleItemsCompletion(items, completed, options = {}) {
        const results = [];
        
        items.forEach(({ categoryId, itemId }) => {
            const success = this.setItemCompletion(categoryId, itemId, completed, options);
            results.push({ categoryId, itemId, success });
        });
        
        // Batch save if auto-save is enabled
        if (this.options.autoSave) {
            this.saveAllStates();
        }
        
        return results;
    }

    setCategoryCompletion(categoryId, completed, options = {}) {
        const category = this.categories.get(categoryId);
        if (!category) return false;
        
        const items = category.items.map(item => ({
            categoryId,
            itemId: item.id
        }));
        
        return this.setMultipleItemsCompletion(items, completed, options);
    }

    // Progress Calculation
    calculateCategoryProgress(categoryId) {
        const category = this.categories.get(categoryId);
        if (!category) return 0;
        
        let completedCount = 0;
        let totalCount = 0;
        
        category.items.forEach(item => {
            totalCount++;
            if (this.getItemCompletion(categoryId, item.id)) {
                completedCount++;
            }
        });
        
        const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
        
        // Update category data
        category.progress = progress;
        category.completedCount = completedCount;
        category.totalCount = totalCount;
        
        // Cache the result
        this.progressCache.set(categoryId, {
            progress,
            completedCount,
            totalCount,
            lastCalculated: new Date().toISOString()
        });
        
        return progress;
    }

    calculateOverallProgress() {
        let totalItems = 0;
        let completedItems = 0;
        
        this.categories.forEach((category, categoryId) => {
            const categoryProgress = this.getCategoryProgress(categoryId);
            totalItems += category.totalCount;
            completedItems += category.completedCount;
        });
        
        return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    }

    getCategoryProgress(categoryId) {
        const cached = this.progressCache.get(categoryId);
        if (cached) {
            return cached.progress;
        }
        
        return this.calculateCategoryProgress(categoryId);
    }

    getCategoryStats(categoryId) {
        const category = this.categories.get(categoryId);
        const cached = this.progressCache.get(categoryId);
        
        if (!category) return null;
        
        return {
            progress: cached ? cached.progress : this.calculateCategoryProgress(categoryId),
            completedCount: category.completedCount,
            totalCount: category.totalCount,
            items: category.items.map(item => ({
                id: item.id,
                title: item.title,
                completed: this.getItemCompletion(categoryId, item.id),
                priority: item.priority,
                riskLevel: item.riskLevel
            }))
        };
    }

    getOverallStats() {
        const categories = [];
        let totalProgress = 0;
        let totalItems = 0;
        let completedItems = 0;
        
        this.categories.forEach((category, categoryId) => {
            const stats = this.getCategoryStats(categoryId);
            categories.push({
                id: categoryId,
                title: category.title,
                ...stats
            });
            
            totalItems += stats.totalCount;
            completedItems += stats.completedCount;
        });
        
        totalProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
        
        return {
            overallProgress: totalProgress,
            totalItems,
            completedItems,
            categories
        };
    }

    // Progress Update Queue Management
    queueProgressUpdate(categoryId) {
        if (!this.updateQueue.includes(categoryId)) {
            this.updateQueue.push(categoryId);
        }
        
        if (!this.isUpdating) {
            this.processUpdateQueue();
        }
    }

    async processUpdateQueue() {
        if (this.isUpdating || this.updateQueue.length === 0) return;
        
        this.isUpdating = true;
        
        // Debounce updates
        await new Promise(resolve => setTimeout(resolve, this.options.progressUpdateDelay));
        
        const categoriesToUpdate = [...this.updateQueue];
        this.updateQueue = [];
        
        categoriesToUpdate.forEach(categoryId => {
            const oldProgress = this.getCategoryProgress(categoryId);
            const newProgress = this.calculateCategoryProgress(categoryId);
            
            if (Math.abs(oldProgress - newProgress) > 0.01) { // Only dispatch if significant change
                this.dispatchEvent('category-progress-updated', {
                    categoryId,
                    oldProgress,
                    newProgress,
                    stats: this.getCategoryStats(categoryId)
                });
            }
        });
        
        // Calculate and dispatch overall progress update
        const overallStats = this.getOverallStats();
        this.dispatchEvent('overall-progress-updated', overallStats);
        
        this.isUpdating = false;
        
        // Process any queued updates that came in during processing
        if (this.updateQueue.length > 0) {
            this.processUpdateQueue();
        }
    }

    startProgressUpdateLoop() {
        // Periodic progress recalculation to catch any missed updates
        setInterval(() => {
            this.categories.forEach((_, categoryId) => {
                this.queueProgressUpdate(categoryId);
            });
        }, 30000); // Every 30 seconds
    }

    // Search and Filtering
    searchItems(query, options = {}) {
        const {
            categoryId = null,
            includeCompleted = true,
            includeIncomplete = true,
            searchFields = ['title', 'description'],
            caseSensitive = false
        } = options;
        
        const results = [];
        const searchTerm = caseSensitive ? query : query.toLowerCase();
        
        this.items.forEach((item, itemKey) => {
            const [itemCategoryId, itemId] = itemKey.split(':');
            
            // Filter by category if specified
            if (categoryId && itemCategoryId !== categoryId) return;
            
            // Filter by completion status
            const isCompleted = this.getItemCompletion(itemCategoryId, itemId);
            if (!includeCompleted && isCompleted) return;
            if (!includeIncomplete && !isCompleted) return;
            
            // Search in specified fields
            const matchFound = searchFields.some(field => {
                const fieldValue = item[field];
                if (!fieldValue) return false;
                
                const searchValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
                return searchValue.includes(searchTerm);
            });
            
            if (matchFound) {
                results.push({
                    categoryId: itemCategoryId,
                    itemId,
                    item: { ...item },
                    completed: isCompleted
                });
            }
        });
        
        return results;
    }

    filterItemsByStatus(categoryId = null, completed = null) {
        const results = [];
        
        this.items.forEach((item, itemKey) => {
            const [itemCategoryId, itemId] = itemKey.split(':');
            
            // Filter by category if specified
            if (categoryId && itemCategoryId !== categoryId) return;
            
            // Filter by completion status if specified
            if (completed !== null) {
                const isCompleted = this.getItemCompletion(itemCategoryId, itemId);
                if (isCompleted !== completed) return;
            }
            
            results.push({
                categoryId: itemCategoryId,
                itemId,
                item: { ...item },
                completed: this.getItemCompletion(itemCategoryId, itemId)
            });
        });
        
        return results;
    }

    // State Persistence
    saveItemState(categoryId, itemId) {
        const itemKey = `${categoryId}:${itemId}`;
        const state = this.completionState.get(itemKey);
        
        if (state) {
            const stateKey = `checklist-manager-item-${categoryId}-${itemId}`;
            localStorage.setItem(stateKey, JSON.stringify(state));
        }
    }

    loadItemState(categoryId, itemId) {
        const stateKey = `checklist-manager-item-${categoryId}-${itemId}`;
        const stored = localStorage.getItem(stateKey);
        
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.warn(`Failed to load item state for ${categoryId}:${itemId}`, e);
            }
        }
        
        return null;
    }

    saveAllStates() {
        this.completionState.forEach((state, itemKey) => {
            const [categoryId, itemId] = itemKey.split(':');
            this.saveItemState(categoryId, itemId);
        });
        
        // Save manager state
        const managerState = {
            lastSaved: new Date().toISOString(),
            version: '1.0'
        };
        
        localStorage.setItem('checklist-manager-state', JSON.stringify(managerState));
    }

    loadState() {
        // Manager state loading is handled during item registration
        // This method is here for future expansion
    }

    // Event Management
    bindGlobalEvents() {
        // Listen for item completion events from ChecklistItem components
        document.addEventListener('checklist-item:completion-changed', (event) => {
            const { itemId, categoryId, completed } = event.detail;
            this.setItemCompletion(categoryId, itemId, completed, { source: 'component' });
        });
    }

    addEventListener(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        
        this.eventListeners.get(eventName).push(callback);
    }

    removeEventListener(eventName, callback) {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    dispatchEvent(eventName, detail) {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(detail);
                } catch (e) {
                    console.error(`Error in event listener for ${eventName}:`, e);
                }
            });
        }
        
        // Also dispatch as DOM event for component integration
        const event = new CustomEvent(`checklist-manager:${eventName}`, {
            detail,
            bubbles: true
        });
        
        document.dispatchEvent(event);
    }

    // Notification System
    triggerCompletionNotification(categoryId, itemId) {
        const item = this.items.get(`${categoryId}:${itemId}`);
        const category = this.categories.get(categoryId);
        
        if (!item || !category) return;
        
        this.dispatchEvent('completion-notification', {
            categoryId,
            categoryTitle: category.title,
            itemId,
            itemTitle: item.title,
            timestamp: new Date().toISOString()
        });
    }

    // Utility Methods
    getItem(categoryId, itemId) {
        const itemKey = `${categoryId}:${itemId}`;
        return this.items.get(itemKey);
    }

    getCategory(categoryId) {
        return this.categories.get(categoryId);
    }

    getAllCategories() {
        return Array.from(this.categories.entries()).map(([id, category]) => ({
            id,
            ...category
        }));
    }

    getAllItems(categoryId = null) {
        const results = [];
        
        this.items.forEach((item, itemKey) => {
            const [itemCategoryId, itemId] = itemKey.split(':');
            
            if (!categoryId || itemCategoryId === categoryId) {
                results.push({
                    categoryId: itemCategoryId,
                    itemId,
                    ...item,
                    completed: this.getItemCompletion(itemCategoryId, itemId)
                });
            }
        });
        
        return results;
    }

    // Validation
    validateData() {
        const errors = [];
        
        // Validate categories
        this.categories.forEach((category, categoryId) => {
            if (!category.title) {
                errors.push(`Category ${categoryId} missing title`);
            }
            
            if (!Array.isArray(category.items)) {
                errors.push(`Category ${categoryId} items must be an array`);
            }
        });
        
        // Validate items
        this.items.forEach((item, itemKey) => {
            const [categoryId, itemId] = itemKey.split(':');
            
            if (!item.title) {
                errors.push(`Item ${itemKey} missing title`);
            }
            
            if (!this.categories.has(categoryId)) {
                errors.push(`Item ${itemKey} references non-existent category ${categoryId}`);
            }
        });
        
        return errors;
    }

    // Cleanup
    destroy() {
        // Save final state
        if (this.options.autoSave) {
            this.saveAllStates();
        }
        
        // Clear all data
        this.categories.clear();
        this.items.clear();
        this.completionState.clear();
        this.progressCache.clear();
        this.eventListeners.clear();
        this.updateQueue = [];
        
        // Remove global event listeners
        document.removeEventListener('checklist-item:completion-changed', this.handleItemCompletion);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChecklistManager;
}

// Global registration for direct script inclusion
if (typeof window !== 'undefined') {
    window.ChecklistManager = ChecklistManager;
}