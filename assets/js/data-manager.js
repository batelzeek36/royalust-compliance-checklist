/**
 * DataManager - Comprehensive data management system for compliance tracking
 * Handles all data operations including loading, validation, persistence, and synchronization
 */

class DataManager {
    constructor() {
        this.complianceData = null;
        this.userProgress = new Map();
        this.dataVersion = '1.0';
        this.lastSyncTime = null;
        this.isDirty = false;
        this.autoSaveInterval = null;
        this.validationRules = new Map();
        this.dataObservers = new Set();
        this.backupQueue = [];
        
        this.initializeValidationRules();
        this.setupAutoSave();
    }

    /**
     * Initialize the data manager with compliance data
     * @param {Object} options - Configuration options
     * @returns {Promise<boolean>} Success status
     */
    async initialize(options = {}) {
        try {
            const { autoLoad = true, enableAutoSave = true } = options;
            
            if (autoLoad) {
                await this.loadComplianceData();
                await this.loadUserProgress();
            }
            
            if (enableAutoSave) {
                this.startAutoSave();
            }
            
            this.notifyObservers('initialized', { success: true });
            return true;
        } catch (error) {
            console.error('DataManager initialization failed:', error);
            this.notifyObservers('error', { type: 'initialization', error });
            return false;
        }
    }

    /**
     * Load compliance data from JSON file
     * @returns {Promise<Object>} Loaded compliance data
     */
    async loadComplianceData() {
        try {
            const response = await fetch('./data/compliance.json');
            if (!response.ok) {
                throw new Error(`Failed to load compliance data: ${response.status}`);
            }
            
            const data = await response.json();
            const validationResult = this.validateComplianceData(data);
            
            if (!validationResult.isValid) {
                throw new Error(`Invalid compliance data: ${validationResult.errors.join(', ')}`);
            }
            
            this.complianceData = data;
            this.lastSyncTime = new Date().toISOString();
            
            this.notifyObservers('dataLoaded', { data: this.complianceData });
            return this.complianceData;
        } catch (error) {
            console.error('Failed to load compliance data:', error);
            
            // Fallback to default structure
            this.complianceData = this.getDefaultComplianceStructure();
            this.notifyObservers('dataLoadFallback', { error });
            
            throw error;
        }
    }

    /**
     * Load user progress from localStorage
     * @returns {Object} User progress data
     */
    async loadUserProgress() {
        try {
            const stored = localStorage.getItem('royalust_compliance_progress');
            if (stored) {
                const progressData = JSON.parse(stored);
                
                // Validate progress data structure
                if (this.validateProgressData(progressData)) {
                    this.userProgress = new Map(Object.entries(progressData.items || {}));
                    this.lastSyncTime = progressData.lastSync || null;
                    
                    this.notifyObservers('progressLoaded', { 
                        itemCount: this.userProgress.size,
                        lastSync: this.lastSyncTime 
                    });
                }
            }
            
            return Object.fromEntries(this.userProgress);
        } catch (error) {
            console.error('Failed to load user progress:', error);
            this.userProgress = new Map();
            this.notifyObservers('progressLoadError', { error });
            return {};
        }
    }

    /**
     * Save user progress to localStorage
     * @param {boolean} force - Force save even if not dirty
     * @returns {boolean} Success status
     */
    async saveUserProgress(force = false) {
        if (!this.isDirty && !force) {
            return true;
        }
        
        try {
            const progressData = {
                items: Object.fromEntries(this.userProgress),
                lastSync: new Date().toISOString(),
                version: this.dataVersion,
                metadata: {
                    totalItems: this.userProgress.size,
                    completedItems: Array.from(this.userProgress.values()).filter(Boolean).length
                }
            };
            
            localStorage.setItem('royalust_compliance_progress', JSON.stringify(progressData));
            this.isDirty = false;
            this.lastSyncTime = progressData.lastSync;
            
            this.notifyObservers('progressSaved', { 
                itemCount: this.userProgress.size,
                timestamp: this.lastSyncTime 
            });
            
            return true;
        } catch (error) {
            console.error('Failed to save user progress:', error);
            this.notifyObservers('progressSaveError', { error });
            return false;
        }
    }

    /**
     * Update completion status for a specific item
     * @param {string} itemId - Item identifier
     * @param {boolean} completed - Completion status
     * @param {Object} metadata - Additional metadata
     */
    updateItemStatus(itemId, completed, metadata = {}) {
        if (!itemId) {
            throw new Error('Item ID is required');
        }
        
        const previousStatus = this.userProgress.get(itemId);
        this.userProgress.set(itemId, completed);
        
        // Add to backup queue for change tracking
        this.backupQueue.push({
            type: 'statusUpdate',
            itemId,
            previousStatus,
            newStatus: completed,
            timestamp: new Date().toISOString(),
            metadata
        });
        
        this.isDirty = true;
        
        this.notifyObservers('itemStatusChanged', {
            itemId,
            completed,
            previousStatus,
            metadata
        });
    }

    /**
     * Get completion status for a specific item
     * @param {string} itemId - Item identifier
     * @returns {boolean} Completion status
     */
    getItemStatus(itemId) {
        return this.userProgress.get(itemId) || false;
    }

    /**
     * Get all completion statuses
     * @returns {Object} All item statuses
     */
    getAllStatuses() {
        return Object.fromEntries(this.userProgress);
    }

    /**
     * Calculate progress statistics
     * @param {string} categoryId - Optional category filter
     * @returns {Object} Progress statistics
     */
    calculateProgress(categoryId = null) {
        if (!this.complianceData) {
            return { overall: 0, completed: 0, total: 0 };
        }
        
        let totalItems = 0;
        let completedItems = 0;
        
        const categories = categoryId 
            ? this.complianceData.categories.filter(cat => cat.id === categoryId)
            : this.complianceData.categories;
        
        categories.forEach(category => {
            category.items.forEach(item => {
                totalItems++;
                if (this.getItemStatus(item.id)) {
                    completedItems++;
                }
            });
        });
        
        const percentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
        
        return {
            overall: Math.round(percentage * 100) / 100,
            completed: completedItems,
            total: totalItems,
            remaining: totalItems - completedItems
        };
    }

    /**
     * Get category-specific progress
     * @returns {Object} Progress by category
     */
    getCategoryProgress() {
        if (!this.complianceData) {
            return {};
        }
        
        const categoryProgress = {};
        
        this.complianceData.categories.forEach(category => {
            const progress = this.calculateProgress(category.id);
            categoryProgress[category.id] = {
                ...progress,
                title: category.title,
                riskLevel: this.assessCategoryRisk(category.id, progress.overall)
            };
        });
        
        return categoryProgress;
    }

    /**
     * Assess risk level based on completion percentage
     * @param {string} categoryId - Category identifier
     * @param {number} completionPercentage - Completion percentage
     * @returns {string} Risk level
     */
    assessCategoryRisk(categoryId, completionPercentage) {
        if (completionPercentage >= 90) return 'low';
        if (completionPercentage >= 70) return 'medium';
        if (completionPercentage >= 50) return 'high';
        return 'critical';
    }

    /**
     * Search items by query
     * @param {string} query - Search query
     * @param {Object} filters - Additional filters
     * @returns {Array} Matching items
     */
    searchItems(query, filters = {}) {
        if (!this.complianceData || !query) {
            return [];
        }
        
        const results = [];
        const searchTerm = query.toLowerCase();
        
        this.complianceData.categories.forEach(category => {
            // Apply category filter if specified
            if (filters.categoryId && category.id !== filters.categoryId) {
                return;
            }
            
            category.items.forEach(item => {
                const matchesTitle = item.title.toLowerCase().includes(searchTerm);
                const matchesDescription = item.description?.toLowerCase().includes(searchTerm);
                const matchesStatus = filters.completed !== undefined 
                    ? this.getItemStatus(item.id) === filters.completed
                    : true;
                
                if ((matchesTitle || matchesDescription) && matchesStatus) {
                    results.push({
                        ...item,
                        categoryId: category.id,
                        categoryTitle: category.title,
                        completed: this.getItemStatus(item.id)
                    });
                }
            });
        });
        
        return results;
    }

    /**
     * Get items by completion status
     * @param {boolean} completed - Completion status to filter by
     * @returns {Array} Filtered items
     */
    getItemsByStatus(completed) {
        if (!this.complianceData) {
            return [];
        }
        
        const items = [];
        
        this.complianceData.categories.forEach(category => {
            category.items.forEach(item => {
                if (this.getItemStatus(item.id) === completed) {
                    items.push({
                        ...item,
                        categoryId: category.id,
                        categoryTitle: category.title
                    });
                }
            });
        });
        
        return items;
    }

    /**
     * Validate compliance data structure
     * @param {Object} data - Data to validate
     * @returns {Object} Validation result
     */
    validateComplianceData(data) {
        const errors = [];
        
        if (!data || typeof data !== 'object') {
            errors.push('Data must be an object');
            return { isValid: false, errors };
        }
        
        if (!Array.isArray(data.categories)) {
            errors.push('Categories must be an array');
        } else {
            data.categories.forEach((category, index) => {
                if (!category.id) {
                    errors.push(`Category ${index} missing id`);
                }
                if (!category.title) {
                    errors.push(`Category ${index} missing title`);
                }
                if (!Array.isArray(category.items)) {
                    errors.push(`Category ${index} items must be an array`);
                } else {
                    category.items.forEach((item, itemIndex) => {
                        if (!item.id) {
                            errors.push(`Category ${index}, item ${itemIndex} missing id`);
                        }
                        if (!item.title) {
                            errors.push(`Category ${index}, item ${itemIndex} missing title`);
                        }
                    });
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate progress data structure
     * @param {Object} data - Progress data to validate
     * @returns {boolean} Validation result
     */
    validateProgressData(data) {
        return data && 
               typeof data === 'object' && 
               typeof data.items === 'object' &&
               typeof data.version === 'string';
    }

    /**
     * Get default compliance structure for fallback
     * @returns {Object} Default structure
     */
    getDefaultComplianceStructure() {
        return {
            categories: [],
            metadata: {
                version: this.dataVersion,
                lastUpdated: new Date().toISOString(),
                totalCategories: 0,
                totalItems: 0
            }
        };
    }

    /**
     * Initialize validation rules
     */
    initializeValidationRules() {
        this.validationRules.set('itemId', (value) => {
            return typeof value === 'string' && value.length > 0;
        });
        
        this.validationRules.set('completed', (value) => {
            return typeof value === 'boolean';
        });
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        // Auto-save every 30 seconds if data is dirty
        this.autoSaveInterval = setInterval(() => {
            if (this.isDirty) {
                this.saveUserProgress();
            }
        }, 30000);
    }

    /**
     * Start auto-save
     */
    startAutoSave() {
        if (!this.autoSaveInterval) {
            this.setupAutoSave();
        }
    }

    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    /**
     * Add data observer
     * @param {Function} callback - Observer callback
     */
    addObserver(callback) {
        this.dataObservers.add(callback);
    }

    /**
     * Remove data observer
     * @param {Function} callback - Observer callback
     */
    removeObserver(callback) {
        this.dataObservers.delete(callback);
    }

    /**
     * Notify all observers of data changes
     * @param {string} event - Event type
     * @param {Object} data - Event data
     */
    notifyObservers(event, data) {
        this.dataObservers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Observer callback error:', error);
            }
        });
    }

    /**
     * Clear all data
     */
    clearAllData() {
        this.userProgress.clear();
        this.backupQueue = [];
        this.isDirty = true;
        localStorage.removeItem('royalust_compliance_progress');
        
        this.notifyObservers('dataCleared', {
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get data summary for export
     * @returns {Object} Data summary
     */
    getDataSummary() {
        const progress = this.calculateProgress();
        const categoryProgress = this.getCategoryProgress();
        
        return {
            overall: progress,
            categories: categoryProgress,
            lastSync: this.lastSyncTime,
            version: this.dataVersion,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAutoSave();
        this.dataObservers.clear();
        this.userProgress.clear();
        this.backupQueue = [];
        this.complianceData = null;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}