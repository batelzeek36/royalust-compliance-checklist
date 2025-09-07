/**
 * Progress Tracker Module
 * Main coordinator for progress calculation and tracking system
 * Integrates calculations, risk assessment, and animations
 */

class ProgressTracker {
    constructor(options = {}) {
        // Initialize sub-modules
        this.calculations = new ProgressCalculations();
        this.riskAssessment = new RiskAssessment();
        this.animations = new ProgressAnimations();
        
        // Configuration
        this.config = {
            autoSave: options.autoSave !== false,
            animateUpdates: options.animateUpdates !== false,
            trackHistory: options.trackHistory !== false,
            historyLimit: options.historyLimit || 50,
            updateInterval: options.updateInterval || 1000,
            ...options
        };

        // State management
        this.currentProgress = null;
        this.previousProgress = null;
        this.progressHistory = [];
        this.riskHistory = [];
        this.categories = [];
        this.isInitialized = false;
        this.updateTimer = null;
        
        // Event listeners
        this.listeners = new Map();
        
        // Bind methods
        this.update = this.update.bind(this);
        this.handleDataChange = this.handleDataChange.bind(this);
    }

    /**
     * Initialize the progress tracker with compliance data
     * @param {Array} categories - Array of category objects with items
     * @param {Object} options - Initialization options
     * @returns {Promise} Initialization promise
     */
    async initialize(categories, options = {}) {
        try {
            this.categories = categories || [];
            
            // Calculate initial progress
            await this.calculateProgress();
            
            // Load historical data if available
            if (this.config.trackHistory) {
                await this.loadProgressHistory();
            }
            
            // Set up auto-update if enabled
            if (options.autoUpdate) {
                this.startAutoUpdate();
            }
            
            this.isInitialized = true;
            this.emit('initialized', { progress: this.currentProgress });
            
            return this.currentProgress;
        } catch (error) {
            console.error('Failed to initialize ProgressTracker:', error);
            throw error;
        }
    }

    /**
     * Calculate current progress across all categories
     * @param {boolean} animate - Whether to animate the update
     * @returns {Promise} Progress calculation promise
     */
    async calculateProgress(animate = false) {
        try {
            // Store previous progress for comparison
            this.previousProgress = this.currentProgress;
            
            // Calculate overall progress
            const overallProgress = this.calculations.calculateOverallProgress(this.categories);
            
            // Calculate individual category progress
            const categoryProgress = this.calculations.calculateMultipleCategoryProgress(this.categories);
            
            // Assess risk levels
            const overallRisk = this.riskAssessment.assessOverallRisk(overallProgress, this.categories);
            const categoryRisks = new Map();
            
            categoryProgress.forEach((progress, categoryId) => {
                const categoryData = this.categories.find(cat => cat.id === categoryId);
                if (categoryData) {
                    const risk = this.riskAssessment.assessCategoryRisk(progress, categoryData);
                    categoryRisks.set(categoryId, risk);
                }
            });
            
            // Calculate progress statistics
            const statistics = this.calculations.calculateProgressStatistics(overallProgress, categoryProgress);
            
            // Create comprehensive progress object
            this.currentProgress = {
                overall: overallProgress,
                categories: Array.from(categoryProgress.values()),
                categoryMap: categoryProgress,
                risk: overallRisk,
                categoryRisks: Array.from(categoryRisks.values()),
                categoryRiskMap: categoryRisks,
                statistics,
                timestamp: new Date().toISOString(),
                delta: this.previousProgress ? 
                    this.calculations.calculateProgressDelta(this.previousProgress.overall, overallProgress) : 
                    null
            };
            
            // Update history
            if (this.config.trackHistory) {
                this.addToHistory(this.currentProgress);
            }
            
            // Save progress if auto-save is enabled
            if (this.config.autoSave) {
                await this.saveProgress();
            }
            
            // Animate updates if enabled
            if (animate && this.config.animateUpdates) {
                await this.animateProgressUpdate();
            }
            
            // Emit progress update event
            this.emit('progressUpdated', {
                current: this.currentProgress,
                previous: this.previousProgress,
                delta: this.currentProgress.delta
            });
            
            return this.currentProgress;
        } catch (error) {
            console.error('Failed to calculate progress:', error);
            throw error;
        }
    } 
   /**
     * Update progress when category or item data changes
     * @param {string} categoryId - ID of changed category
     * @param {string} itemId - ID of changed item (optional)
     * @param {boolean} completed - New completion status
     * @returns {Promise} Update promise
     */
    async updateItemStatus(categoryId, itemId, completed) {
        try {
            // Find and update the item
            const category = this.categories.find(cat => cat.id === categoryId);
            if (!category) {
                throw new Error(`Category not found: ${categoryId}`);
            }
            
            const item = category.items.find(item => item.id === itemId);
            if (!item) {
                throw new Error(`Item not found: ${itemId}`);
            }
            
            // Update item status
            const previousStatus = item.completed;
            item.completed = completed;
            item.lastModified = new Date().toISOString();
            
            // Recalculate progress with animation
            await this.calculateProgress(true);
            
            // Emit item update event
            this.emit('itemUpdated', {
                categoryId,
                itemId,
                previousStatus,
                newStatus: completed,
                progress: this.currentProgress
            });
            
            return this.currentProgress;
        } catch (error) {
            console.error('Failed to update item status:', error);
            throw error;
        }
    }

    /**
     * Get current progress summary
     * @returns {Object} Progress summary object
     */
    getProgressSummary() {
        if (!this.currentProgress) {
            return null;
        }
        
        return {
            overallPercentage: this.currentProgress.overall.percentage,
            completedItems: this.currentProgress.overall.completedItems,
            totalItems: this.currentProgress.overall.totalItems,
            riskLevel: this.currentProgress.risk.level,
            riskScore: this.currentProgress.risk.score,
            categoriesComplete: this.currentProgress.overall.completedCategories,
            totalCategories: this.currentProgress.overall.totalCategories,
            lastUpdated: this.currentProgress.timestamp
        };
    }

    /**
     * Get detailed category progress
     * @param {string} categoryId - Category ID (optional, returns all if not specified)
     * @returns {Object|Array} Category progress data
     */
    getCategoryProgress(categoryId = null) {
        if (!this.currentProgress) {
            return null;
        }
        
        if (categoryId) {
            return this.currentProgress.categoryMap.get(categoryId) || null;
        }
        
        return this.currentProgress.categories;
    }

    /**
     * Get risk assessment data
     * @param {string} categoryId - Category ID (optional, returns overall if not specified)
     * @returns {Object} Risk assessment data
     */
    getRiskAssessment(categoryId = null) {
        if (!this.currentProgress) {
            return null;
        }
        
        if (categoryId) {
            return this.currentProgress.categoryRiskMap.get(categoryId) || null;
        }
        
        return this.currentProgress.risk;
    }

    /**
     * Get progress trends and analytics
     * @param {number} days - Number of days to analyze (default: 7)
     * @returns {Object} Trend analysis data
     */
    getProgressTrends(days = 7) {
        if (!this.config.trackHistory || this.progressHistory.length < 2) {
            return { trend: 'insufficient_data' };
        }
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const recentHistory = this.progressHistory.filter(entry => 
            new Date(entry.timestamp) >= cutoffDate
        );
        
        if (recentHistory.length < 2) {
            return { trend: 'insufficient_data' };
        }
        
        // Calculate completion estimate
        const completionEstimate = this.calculations.calculateCompletionEstimate(
            recentHistory.map(entry => entry.overall)
        );
        
        // Calculate risk trends
        const riskTrends = this.riskAssessment.calculateRiskTrends(
            recentHistory.map(entry => entry.risk)
        );
        
        return {
            progressTrend: this._calculateProgressTrend(recentHistory),
            riskTrend: riskTrends,
            completionEstimate,
            dataPoints: recentHistory.length,
            periodDays: days
        };
    }

    /**
     * Generate mitigation strategies based on current risk assessment
     * @returns {Array} Array of mitigation strategies
     */
    getMitigationStrategies() {
        if (!this.currentProgress) {
            return [];
        }
        
        return this.riskAssessment.generateMitigationStrategies(
            this.currentProgress.risk,
            this.categories
        );
    }

    /**
     * Animate progress update in UI
     * @param {HTMLElement} container - Container element for animations
     * @param {Object} options - Animation options
     * @returns {Promise} Animation completion promise
     */
    async animateProgressUpdate(container = null, options = {}) {
        if (!this.currentProgress || !this.config.animateUpdates) {
            return;
        }
        
        // Find container if not provided
        if (!container) {
            container = document.querySelector('.progress-container') || 
                       document.querySelector('.compliance-dashboard') ||
                       document.body;
        }
        
        if (!container) {
            console.warn('No container found for progress animations');
            return;
        }
        
        try {
            await this.animations.animateProgressUpdate(this.currentProgress, container, options);
        } catch (error) {
            console.error('Failed to animate progress update:', error);
        }
    }

    /**
     * Save current progress to storage
     * @returns {Promise} Save operation promise
     */
    async saveProgress() {
        try {
            if (typeof localStorage !== 'undefined') {
                const progressData = {
                    current: this.currentProgress,
                    history: this.config.trackHistory ? this.progressHistory : [],
                    categories: this.categories,
                    timestamp: new Date().toISOString()
                };
                
                localStorage.setItem('royalust-progress', JSON.stringify(progressData));
            }
            
            this.emit('progressSaved', { progress: this.currentProgress });
        } catch (error) {
            console.error('Failed to save progress:', error);
            throw error;
        }
    }

    /**
     * Load progress from storage
     * @returns {Promise} Load operation promise
     */
    async loadProgress() {
        try {
            if (typeof localStorage !== 'undefined') {
                const savedData = localStorage.getItem('royalust-progress');
                if (savedData) {
                    const progressData = JSON.parse(savedData);
                    
                    this.currentProgress = progressData.current;
                    this.categories = progressData.categories || [];
                    
                    if (this.config.trackHistory && progressData.history) {
                        this.progressHistory = progressData.history;
                    }
                    
                    this.emit('progressLoaded', { progress: this.currentProgress });
                    return this.currentProgress;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Failed to load progress:', error);
            throw error;
        }
    }

    /**
     * Load progress history from storage
     * @returns {Promise} Load operation promise
     */
    async loadProgressHistory() {
        try {
            if (typeof localStorage !== 'undefined') {
                const historyData = localStorage.getItem('royalust-progress-history');
                if (historyData) {
                    this.progressHistory = JSON.parse(historyData);
                    
                    // Limit history size
                    if (this.progressHistory.length > this.config.historyLimit) {
                        this.progressHistory = this.progressHistory.slice(-this.config.historyLimit);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load progress history:', error);
        }
    }

    /**
     * Add current progress to history
     * @param {Object} progress - Progress data to add
     */
    addToHistory(progress) {
        if (!this.config.trackHistory) {
            return;
        }
        
        // Add to history with timestamp
        this.progressHistory.push({
            ...progress,
            historyTimestamp: new Date().toISOString()
        });
        
        // Limit history size
        if (this.progressHistory.length > this.config.historyLimit) {
            this.progressHistory = this.progressHistory.slice(-this.config.historyLimit);
        }
        
        // Save history to storage
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('royalust-progress-history', JSON.stringify(this.progressHistory));
            } catch (error) {
                console.error('Failed to save progress history:', error);
            }
        }
    }

    /**
     * Start automatic progress updates
     */
    startAutoUpdate() {
        if (this.updateTimer) {
            this.stopAutoUpdate();
        }
        
        this.updateTimer = setInterval(async () => {
            try {
                await this.calculateProgress();
            } catch (error) {
                console.error('Auto-update failed:', error);
            }
        }, this.config.updateInterval);
    }

    /**
     * Stop automatic progress updates
     */
    stopAutoUpdate() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    /**
     * Handle data change events
     * @param {Object} event - Data change event
     */
    async handleDataChange(event) {
        const { type, categoryId, itemId, data } = event.detail || event;
        
        switch (type) {
            case 'item-completed':
            case 'item-uncompleted':
                await this.updateItemStatus(categoryId, itemId, type === 'item-completed');
                break;
            case 'category-updated':
                await this.calculateProgress(true);
                break;
            case 'data-refreshed':
                this.categories = data.categories || this.categories;
                await this.calculateProgress(true);
                break;
        }
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            const index = eventListeners.indexOf(callback);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Calculate progress trend from history
     * @param {Array} history - Progress history array
     * @returns {Object} Trend analysis
     * @private
     */
    _calculateProgressTrend(history) {
        if (history.length < 2) {
            return { trend: 'insufficient_data' };
        }
        
        const first = history[0].overall.percentage;
        const last = history[history.length - 1].overall.percentage;
        const change = last - first;
        
        return {
            trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
            change: Math.round(change * 100) / 100,
            rate: change / history.length,
            confidence: history.length >= 5 ? 'high' : 'medium'
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAutoUpdate();
        this.animations.cancelAllAnimations();
        this.listeners.clear();
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressTracker;
} else if (typeof window !== 'undefined') {
    window.ProgressTracker = ProgressTracker;
}