/**
 * Risk Assessment Module
 * Handles completion-based risk evaluation for compliance tracking
 * Part of the modular progress calculation and tracking system
 */

class RiskAssessment {
    constructor() {
        this.riskThresholds = {
            critical: 25,    // Below 25% completion
            high: 50,        // 25-50% completion
            medium: 75,      // 50-75% completion
            low: 90,         // 75-90% completion
            minimal: 100     // 90-100% completion
        };

        this.categoryPriorities = {
            critical: 1.5,   // Multiply risk by 1.5 for critical categories
            high: 1.2,       // Multiply risk by 1.2 for high priority
            medium: 1.0,     // Standard risk calculation
            low: 0.8         // Reduce risk by 20% for low priority
        };

        this.riskFactors = new Map();
        this.initializeRiskFactors();
    }

    /**
     * Assess overall risk based on completion percentage and category priorities
     * @param {Object} overallProgress - Overall progress statistics
     * @param {Array} categories - Array of category objects with priority levels
     * @returns {Object} Risk assessment results
     */
    assessOverallRisk(overallProgress, categories = []) {
        const baseRisk = this._calculateBaseRisk(overallProgress.percentage);
        const categoryRiskFactors = this._calculateCategoryRiskFactors(categories);
        const timeRiskFactor = this._calculateTimeRiskFactor(overallProgress);
        
        const adjustedRiskScore = baseRisk * categoryRiskFactors * timeRiskFactor;
        const riskLevel = this._determineRiskLevel(adjustedRiskScore);

        return {
            level: riskLevel,
            score: Math.round(adjustedRiskScore * 100) / 100,
            baseScore: baseRisk,
            factors: {
                categoryPriority: categoryRiskFactors,
                timeBasedRisk: timeRiskFactor,
                completionRate: overallProgress.percentage
            },
            recommendations: this._generateRiskRecommendations(riskLevel, overallProgress),
            criticalAreas: this._identifyCriticalAreas(categories),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Assess risk for individual category
     * @param {Object} categoryProgress - Category progress data
     * @param {Object} categoryData - Category metadata including priority
     * @returns {Object} Category-specific risk assessment
     */
    assessCategoryRisk(categoryProgress, categoryData = {}) {
        const baseRisk = this._calculateBaseRisk(categoryProgress.percentage);
        const priorityMultiplier = this.categoryPriorities[categoryData.priority] || 1.0;
        const itemRiskFactor = this._calculateItemRiskFactor(categoryProgress.items || []);
        
        const adjustedRiskScore = baseRisk * priorityMultiplier * itemRiskFactor;
        const riskLevel = this._determineRiskLevel(adjustedRiskScore);

        return {
            categoryId: categoryProgress.categoryId,
            level: riskLevel,
            score: Math.round(adjustedRiskScore * 100) / 100,
            baseScore: baseRisk,
            factors: {
                priority: categoryData.priority || 'medium',
                priorityMultiplier,
                itemComplexity: itemRiskFactor,
                completionRate: categoryProgress.percentage
            },
            incompleteItems: this._getIncompleteHighRiskItems(categoryProgress.items || []),
            recommendations: this._generateCategoryRecommendations(riskLevel, categoryData),
            timestamp: new Date().toISOString()
        };
    }   
 /**
     * Calculate risk trends over time
     * @param {Array} riskHistory - Array of historical risk assessments
     * @returns {Object} Risk trend analysis
     */
    calculateRiskTrends(riskHistory) {
        if (!riskHistory || riskHistory.length < 2) {
            return { trend: 'insufficient_data', confidence: 'low' };
        }

        const recentAssessments = riskHistory.slice(-5);
        let improvementCount = 0;
        let deteriorationCount = 0;

        for (let i = 1; i < recentAssessments.length; i++) {
            const current = recentAssessments[i].score;
            const previous = recentAssessments[i - 1].score;
            
            if (current < previous) improvementCount++;
            else if (current > previous) deteriorationCount++;
        }

        const trend = improvementCount > deteriorationCount ? 'improving' :
                     deteriorationCount > improvementCount ? 'deteriorating' : 'stable';

        return {
            trend,
            confidence: recentAssessments.length >= 4 ? 'high' : 'medium',
            improvementRate: improvementCount / (recentAssessments.length - 1),
            deteriorationRate: deteriorationCount / (recentAssessments.length - 1),
            averageScore: recentAssessments.reduce((sum, r) => sum + r.score, 0) / recentAssessments.length,
            scoreRange: {
                min: Math.min(...recentAssessments.map(r => r.score)),
                max: Math.max(...recentAssessments.map(r => r.score))
            }
        };
    }

    /**
     * Generate risk mitigation strategies
     * @param {Object} riskAssessment - Current risk assessment
     * @param {Array} categories - Category data for context
     * @returns {Array} Array of mitigation strategies
     */
    generateMitigationStrategies(riskAssessment, categories = []) {
        const strategies = [];

        // High-level strategies based on overall risk
        if (riskAssessment.level === 'critical' || riskAssessment.level === 'high') {
            strategies.push({
                priority: 'immediate',
                action: 'Focus on critical compliance categories',
                description: 'Prioritize completion of high-risk, high-priority items',
                estimatedImpact: 'high'
            });
        }

        // Category-specific strategies
        riskAssessment.criticalAreas.forEach(area => {
            strategies.push({
                priority: area.priority,
                action: `Address ${area.title} compliance gaps`,
                description: `Complete remaining items in ${area.title} category`,
                category: area.categoryId,
                estimatedImpact: area.priority === 'critical' ? 'high' : 'medium'
            });
        });

        // Time-based strategies
        if (riskAssessment.factors.timeBasedRisk > 1.2) {
            strategies.push({
                priority: 'urgent',
                action: 'Accelerate completion timeline',
                description: 'Increase resources or adjust scope to meet deadlines',
                estimatedImpact: 'high'
            });
        }

        return strategies.sort((a, b) => {
            const priorityOrder = { immediate: 0, urgent: 1, high: 2, medium: 3, low: 4 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    /**
     * Initialize risk factors for different compliance areas
     * @private
     */
    initializeRiskFactors() {
        this.riskFactors.set('regulatory', 1.3);
        this.riskFactors.set('safety', 1.4);
        this.riskFactors.set('financial', 1.2);
        this.riskFactors.set('operational', 1.1);
        this.riskFactors.set('documentation', 1.0);
    }

    /**
     * Calculate base risk score from completion percentage
     * @private
     */
    _calculateBaseRisk(completionPercentage) {
        if (completionPercentage >= this.riskThresholds.low) return 0.2;
        if (completionPercentage >= this.riskThresholds.medium) return 0.4;
        if (completionPercentage >= this.riskThresholds.high) return 0.6;
        if (completionPercentage >= this.riskThresholds.critical) return 0.8;
        return 1.0;
    }

    /**
     * Calculate category-based risk factors
     * @private
     */
    _calculateCategoryRiskFactors(categories) {
        if (!categories.length) return 1.0;

        let totalWeight = 0;
        let weightedRisk = 0;

        categories.forEach(category => {
            const priority = category.priority || 'medium';
            const weight = this.categoryPriorities[priority] || 1.0;
            const categoryProgress = category.completionPercentage || 0;
            const categoryRisk = this._calculateBaseRisk(categoryProgress);
            
            totalWeight += weight;
            weightedRisk += categoryRisk * weight;
        });

        return totalWeight > 0 ? weightedRisk / totalWeight : 1.0;
    }

    /**
     * Calculate time-based risk factor
     * @private
     */
    _calculateTimeRiskFactor(progress) {
        // Simple time-based risk - could be enhanced with actual deadlines
        const completionRate = progress.percentage;
        if (completionRate < 25) return 1.3;
        if (completionRate < 50) return 1.1;
        return 1.0;
    }

    /**
     * Calculate item-level risk factors
     * @private
     */
    _calculateItemRiskFactor(items) {
        if (!items.length) return 1.0;

        const incompleteItems = items.filter(item => !item.completed);
        const highPriorityIncomplete = incompleteItems.filter(item => 
            item.priority === 'critical' || item.priority === 'high'
        );

        return 1.0 + (highPriorityIncomplete.length / items.length) * 0.3;
    }

    /**
     * Determine risk level from score
     * @private
     */
    _determineRiskLevel(score) {
        if (score >= 0.8) return 'critical';
        if (score >= 0.6) return 'high';
        if (score >= 0.4) return 'medium';
        if (score >= 0.2) return 'low';
        return 'minimal';
    }

    /**
     * Generate risk-based recommendations
     * @private
     */
    _generateRiskRecommendations(riskLevel, progress) {
        const recommendations = [];

        switch (riskLevel) {
            case 'critical':
                recommendations.push('Immediate action required - focus on critical compliance items');
                recommendations.push('Consider additional resources or timeline adjustment');
                break;
            case 'high':
                recommendations.push('Prioritize high-impact compliance areas');
                recommendations.push('Review and accelerate completion timeline');
                break;
            case 'medium':
                recommendations.push('Maintain steady progress on all categories');
                recommendations.push('Monitor for potential delays');
                break;
            case 'low':
                recommendations.push('Continue current pace');
                recommendations.push('Focus on remaining high-priority items');
                break;
            case 'minimal':
                recommendations.push('Excellent progress - maintain quality');
                break;
        }

        return recommendations;
    }

    /**
     * Identify critical areas needing attention
     * @private
     */
    _identifyCriticalAreas(categories) {
        return categories
            .filter(category => {
                const completion = category.completionPercentage || 0;
                const priority = category.priority || 'medium';
                return completion < 50 && (priority === 'critical' || priority === 'high');
            })
            .map(category => ({
                categoryId: category.id,
                title: category.title,
                priority: category.priority,
                completionPercentage: category.completionPercentage || 0
            }));
    }

    /**
     * Get incomplete high-risk items
     * @private
     */
    _getIncompleteHighRiskItems(items) {
        return items
            .filter(item => !item.completed && 
                   (item.priority === 'critical' || item.priority === 'high'))
            .map(item => ({
                id: item.id,
                title: item.title,
                priority: item.priority
            }));
    }

    /**
     * Generate category-specific recommendations
     * @private
     */
    _generateCategoryRecommendations(riskLevel, categoryData) {
        const recommendations = [];
        const categoryType = categoryData.type || 'general';

        if (riskLevel === 'critical' || riskLevel === 'high') {
            recommendations.push(`Focus immediate attention on ${categoryData.title || 'this category'}`);
            
            if (categoryType === 'regulatory') {
                recommendations.push('Review regulatory requirements and compliance deadlines');
            } else if (categoryType === 'safety') {
                recommendations.push('Prioritize safety-related items to minimize operational risk');
            }
        }

        return recommendations;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RiskAssessment;
} else if (typeof window !== 'undefined') {
    window.RiskAssessment = RiskAssessment;
}