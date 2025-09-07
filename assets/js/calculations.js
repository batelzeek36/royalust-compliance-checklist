/**
 * Calculations Module
 * Handles category-level and overall progress computation
 * Part of the modular progress calculation and tracking system
 */

class ProgressCalculations {
    constructor() {
        this.precision = 2; // Decimal places for percentage calculations
        this.weightingEnabled = false; // Future feature for weighted categories
        this.categoryWeights = new Map(); // For future weighted calculations
    }

    /**
     * Calculate overall progress across all categories
     * @param {Array} categories - Array of category objects with completion data
     * @returns {Object} Overall progress statistics
     */
    calculateOverallProgress(categories) {
        if (!categories || categories.length === 0) {
            return this._createProgressResult(0, 0, 0);
        }

        let totalItems = 0;
        let completedItems = 0;
        let totalCategories = categories.length;
        let completedCategories = 0;

        // Calculate totals across all categories
        categories.forEach(category => {
            const categoryProgress = this.calculateCategoryProgress(category);
            totalItems += categoryProgress.totalItems;
            completedItems += categoryProgress.completedItems;
            
            // Consider category complete if 100% of items are done
            if (categoryProgress.percentage === 100) {
                completedCategories++;
            }
        });

        const overallPercentage = totalItems > 0 ? 
            this._roundToDecimal((completedItems / totalItems) * 100) : 0;

        const categoryCompletionRate = totalCategories > 0 ? 
            this._roundToDecimal((completedCategories / totalCategories) * 100) : 0;

        return {
            percentage: overallPercentage,
            completedItems,
            totalItems,
            completedCategories,
            totalCategories,
            categoryCompletionRate,
            timestamp: new Date().toISOString(),
            breakdown: this._generateProgressBreakdown(categories)
        };
    }

    /**
     * Calculate progress for a single category
     * @param {Object} category - Category object with items array
     * @returns {Object} Category progress statistics
     */
    calculateCategoryProgress(category) {
        if (!category || !category.items || !Array.isArray(category.items)) {
            return this._createProgressResult(0, 0, 0);
        }

        const totalItems = category.items.length;
        const completedItems = category.items.filter(item => 
            item.completed === true || item.status === 'completed'
        ).length;

        const percentage = totalItems > 0 ? 
            this._roundToDecimal((completedItems / totalItems) * 100) : 0;

        return {
            categoryId: category.id,
            categoryTitle: category.title,
            percentage,
            completedItems,
            totalItems,
            timestamp: new Date().toISOString(),
            items: this._getItemCompletionStatus(category.items)
        };
    }

    /**
     * Calculate progress for multiple categories with detailed breakdown
     * @param {Array} categories - Array of category objects
     * @returns {Map} Map of category IDs to progress objects
     */
    calculateMultipleCategoryProgress(categories) {
        const progressMap = new Map();

        if (!categories || !Array.isArray(categories)) {
            return progressMap;
        }

        categories.forEach(category => {
            if (category && category.id) {
                const progress = this.calculateCategoryProgress(category);
                progressMap.set(category.id, progress);
            }
        });

        return progressMap;
    }

    /**
     * Calculate progress delta between two states
     * @param {Object} previousProgress - Previous progress state
     * @param {Object} currentProgress - Current progress state
     * @returns {Object} Progress change information
     */
    calculateProgressDelta(previousProgress, currentProgress) {
        if (!previousProgress || !currentProgress) {
            return { hasChanged: false, delta: 0 };
        }

        const percentageDelta = currentProgress.percentage - previousProgress.percentage;
        const itemsDelta = currentProgress.completedItems - previousProgress.completedItems;

        return {
            hasChanged: percentageDelta !== 0,
            percentageDelta: this._roundToDecimal(percentageDelta),
            itemsDelta,
            direction: percentageDelta > 0 ? 'increase' : percentageDelta < 0 ? 'decrease' : 'unchanged',
            previousPercentage: previousProgress.percentage,
            currentPercentage: currentProgress.percentage,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Calculate estimated completion time based on current progress rate
     * @param {Array} progressHistory - Array of historical progress snapshots
     * @returns {Object} Completion time estimates
     */
    calculateCompletionEstimate(progressHistory) {
        if (!progressHistory || progressHistory.length < 2) {
            return { estimatedDays: null, confidence: 'low' };
        }

        // Calculate average progress rate over recent history
        const recentHistory = progressHistory.slice(-5); // Last 5 data points
        let totalRate = 0;
        let validRates = 0;

        for (let i = 1; i < recentHistory.length; i++) {
            const timeDiff = new Date(recentHistory[i].timestamp) - 
                           new Date(recentHistory[i-1].timestamp);
            const progressDiff = recentHistory[i].percentage - 
                               recentHistory[i-1].percentage;

            if (timeDiff > 0 && progressDiff > 0) {
                const ratePerDay = progressDiff / (timeDiff / (1000 * 60 * 60 * 24));
                totalRate += ratePerDay;
                validRates++;
            }
        }

        if (validRates === 0) {
            return { estimatedDays: null, confidence: 'low' };
        }

        const averageRatePerDay = totalRate / validRates;
        const currentProgress = recentHistory[recentHistory.length - 1].percentage;
        const remainingProgress = 100 - currentProgress;
        const estimatedDays = remainingProgress / averageRatePerDay;

        return {
            estimatedDays: Math.ceil(estimatedDays),
            confidence: validRates >= 3 ? 'high' : validRates >= 2 ? 'medium' : 'low',
            averageRatePerDay: this._roundToDecimal(averageRatePerDay),
            remainingProgress: this._roundToDecimal(remainingProgress)
        };
    }

    /**
     * Calculate progress statistics for reporting
     * @param {Object} overallProgress - Overall progress object
     * @param {Map} categoryProgress - Category progress map
     * @returns {Object} Comprehensive statistics
     */
    calculateProgressStatistics(overallProgress, categoryProgress) {
        const stats = {
            overall: overallProgress,
            categories: {
                total: categoryProgress.size,
                completed: 0,
                inProgress: 0,
                notStarted: 0,
                averageCompletion: 0
            },
            items: {
                total: overallProgress.totalItems,
                completed: overallProgress.completedItems,
                remaining: overallProgress.totalItems - overallProgress.completedItems
            },
            milestones: this._calculateMilestones(overallProgress.percentage)
        };

        // Calculate category statistics
        let totalCategoryProgress = 0;
        categoryProgress.forEach(progress => {
            totalCategoryProgress += progress.percentage;
            
            if (progress.percentage === 100) {
                stats.categories.completed++;
            } else if (progress.percentage > 0) {
                stats.categories.inProgress++;
            } else {
                stats.categories.notStarted++;
            }
        });

        stats.categories.averageCompletion = categoryProgress.size > 0 ? 
            this._roundToDecimal(totalCategoryProgress / categoryProgress.size) : 0;

        return stats;
    }

    /**
     * Helper method to create standardized progress result
     * @private
     */
    _createProgressResult(percentage, completed, total) {
        return {
            percentage: this._roundToDecimal(percentage),
            completedItems: completed,
            totalItems: total,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Helper method to round numbers to specified decimal places
     * @private
     */
    _roundToDecimal(number) {
        return Math.round(number * Math.pow(10, this.precision)) / Math.pow(10, this.precision);
    }

    /**
     * Generate detailed progress breakdown by category
     * @private
     */
    _generateProgressBreakdown(categories) {
        return categories.map(category => {
            const progress = this.calculateCategoryProgress(category);
            return {
                categoryId: category.id,
                title: category.title,
                percentage: progress.percentage,
                completedItems: progress.completedItems,
                totalItems: progress.totalItems,
                priority: category.priority || 'medium',
                riskLevel: category.riskLevel || 'medium'
            };
        });
    }

    /**
     * Get completion status for individual items
     * @private
     */
    _getItemCompletionStatus(items) {
        return items.map(item => ({
            id: item.id,
            title: item.title,
            completed: item.completed || item.status === 'completed',
            priority: item.priority || 'medium'
        }));
    }

    /**
     * Calculate milestone achievements
     * @private
     */
    _calculateMilestones(percentage) {
        const milestones = [25, 50, 75, 90, 100];
        const achieved = milestones.filter(milestone => percentage >= milestone);
        const next = milestones.find(milestone => percentage < milestone);

        return {
            achieved,
            next,
            progressToNext: next ? this._roundToDecimal(percentage - (achieved[achieved.length - 1] || 0)) : 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressCalculations;
} else if (typeof window !== 'undefined') {
    window.ProgressCalculations = ProgressCalculations;
}