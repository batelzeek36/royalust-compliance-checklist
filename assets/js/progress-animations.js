/**
 * Progress Animations Module
 * Handles visual progress updates and animations
 * Part of the modular progress calculation and tracking system
 */

class ProgressAnimations {
    constructor() {
        this.animationDuration = 800; // Default animation duration in ms
        this.easing = 'cubic-bezier(0.4, 0, 0.2, 1)'; // Material Design easing
        this.activeAnimations = new Map(); // Track running animations
        this.animationQueue = []; // Queue for sequential animations
        this.isAnimating = false;

        // Animation configuration
        this.config = {
            progressBar: {
                duration: 600,
                easing: 'ease-out',
                delay: 0
            },
            progressRing: {
                duration: 800,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                delay: 100
            },
            counter: {
                duration: 1000,
                easing: 'ease-out',
                delay: 200
            },
            milestone: {
                duration: 400,
                easing: 'ease-in-out',
                delay: 0
            }
        };
    }

    /**
     * Animate progress bar from current to target percentage
     * @param {HTMLElement} element - Progress bar element
     * @param {number} targetPercentage - Target percentage (0-100)
     * @param {Object} options - Animation options
     * @returns {Promise} Animation completion promise
     */
    animateProgressBar(element, targetPercentage, options = {}) {
        return new Promise((resolve) => {
            if (!element) {
                resolve();
                return;
            }

            const config = { ...this.config.progressBar, ...options };
            const currentPercentage = parseFloat(element.style.width) || 0;
            const animationId = `progress-bar-${element.id || Math.random()}`;

            // Cancel existing animation for this element
            this._cancelAnimation(animationId);

            // Create animation
            const animation = element.animate([
                { width: `${currentPercentage}%` },
                { width: `${Math.min(targetPercentage, 100)}%` }
            ], {
                duration: config.duration,
                easing: config.easing,
                fill: 'forwards'
            });

            // Track animation
            this.activeAnimations.set(animationId, animation);

            // Handle completion
            animation.onfinish = () => {
                element.style.width = `${Math.min(targetPercentage, 100)}%`;
                this.activeAnimations.delete(animationId);
                this._triggerProgressUpdate(element, targetPercentage);
                resolve();
            };

            // Add glow effect for significant progress
            if (targetPercentage - currentPercentage >= 10) {
                this._addProgressGlow(element, config.duration);
            }
        });
    }

    /**
     * Animate circular progress ring
     * @param {HTMLElement} element - SVG circle element for progress ring
     * @param {number} targetPercentage - Target percentage (0-100)
     * @param {Object} options - Animation options
     * @returns {Promise} Animation completion promise
     */
    animateProgressRing(element, targetPercentage, options = {}) {
        return new Promise((resolve) => {
            if (!element) {
                resolve();
                return;
            }

            const config = { ...this.config.progressRing, ...options };
            const radius = element.r.baseVal.value;
            const circumference = 2 * Math.PI * radius;

            // Calculate current and target dash offset
            const currentOffset = parseFloat(element.style.strokeDashoffset) || circumference;
            const targetOffset = circumference - (targetPercentage / 100) * circumference;

            const animationId = `progress-ring-${element.id || Math.random()}`;
            this._cancelAnimation(animationId);

            // Set up stroke properties
            element.style.strokeDasharray = circumference;

            // Create animation
            const animation = element.animate([
                { strokeDashoffset: currentOffset },
                { strokeDashoffset: targetOffset }
            ], {
                duration: config.duration,
                easing: config.easing,
                fill: 'forwards'
            });

            this.activeAnimations.set(animationId, animation);

            animation.onfinish = () => {
                element.style.strokeDashoffset = targetOffset;
                this.activeAnimations.delete(animationId);
                resolve();
            };

            // Add shimmer effect for milestone achievements
            if (this._isMilestone(targetPercentage)) {
                this._addRingShimmer(element, config.duration);
            }
        });
    }

    /**
     * Animate numerical counter from current to target value
     * @param {HTMLElement} element - Element containing the number
     * @param {number} targetValue - Target numerical value
     * @param {Object} options - Animation options
     * @returns {Promise} Animation completion promise
     */
    animateCounter(element, targetValue, options = {}) {
        return new Promise((resolve) => {
            if (!element) {
                resolve();
                return;
            }

            const config = { ...this.config.counter, ...options };
            const currentValue = parseFloat(element.textContent) || 0;
            const animationId = `counter-${element.id || Math.random()}`;

            this._cancelAnimation(animationId);

            let startTime = null;
            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / config.duration, 1);

                // Apply easing
                const easedProgress = this._applyEasing(progress, config.easing);
                const currentDisplayValue = currentValue + (targetValue - currentValue) * easedProgress;

                // Format and display value
                const formattedValue = options.formatter ?
                    options.formatter(currentDisplayValue) :
                    Math.round(currentDisplayValue);

                element.textContent = formattedValue;

                if (progress < 1) {
                    const animationFrame = requestAnimationFrame(animate);
                    this.activeAnimations.set(animationId, { cancel: () => cancelAnimationFrame(animationFrame) });
                } else {
                    element.textContent = options.formatter ?
                        options.formatter(targetValue) : targetValue;
                    this.activeAnimations.delete(animationId);
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * Animate milestone achievement with celebration effect
     * @param {HTMLElement} element - Element to animate
     * @param {number} milestonePercentage - Milestone percentage achieved
     * @param {Object} options - Animation options
     * @returns {Promise} Animation completion promise
     */
    animateMilestone(element, milestonePercentage, options = {}) {
        return new Promise((resolve) => {
            if (!element) {
                resolve();
                return;
            }

            const config = { ...this.config.milestone, ...options };

            // Create celebration sequence
            const celebrationSequence = [
                // Scale up
                { transform: 'scale(1)', opacity: 1 },
                { transform: 'scale(1.2)', opacity: 0.8 },
                { transform: 'scale(1)', opacity: 1 }
            ];

            const animation = element.animate(celebrationSequence, {
                duration: config.duration,
                easing: config.easing,
                iterations: 1
            });

            // Add golden glow effect
            this._addMilestoneGlow(element, config.duration);

            // Add particle effect if available
            if (options.particles) {
                this._createParticleEffect(element, milestonePercentage);
            }

            animation.onfinish = () => {
                resolve();
            };
        });
    }

    /**
     * Animate multiple progress elements in sequence
     * @param {Array} animations - Array of animation configurations
     * @param {Object} options - Global animation options
     * @returns {Promise} All animations completion promise
     */
    animateSequence(animations, options = {}) {
        return new Promise(async (resolve) => {
            this.isAnimating = true;

            for (const animConfig of animations) {
                const { type, element, value, delay = 0, ...animOptions } = animConfig;

                if (delay > 0) {
                    await this._delay(delay);
                }

                switch (type) {
                    case 'progressBar':
                        await this.animateProgressBar(element, value, animOptions);
                        break;
                    case 'progressRing':
                        await this.animateProgressRing(element, value, animOptions);
                        break;
                    case 'counter':
                        await this.animateCounter(element, value, animOptions);
                        break;
                    case 'milestone':
                        await this.animateMilestone(element, value, animOptions);
                        break;
                }
            }

            this.isAnimating = false;
            resolve();
        });
    }

    /**
     * Animate progress update with staggered category animations
     * @param {Object} progressData - Progress data for all categories
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Animation options
     * @returns {Promise} Animation completion promise
     */
    animateProgressUpdate(progressData, container, options = {}) {
        return new Promise(async (resolve) => {
            if (!container || !progressData) {
                resolve();
                return;
            }

            const animations = [];
            const staggerDelay = options.staggerDelay || 100;

            // Overall progress animation
            const overallProgressBar = container.querySelector('.overall-progress-bar');
            const overallProgressRing = container.querySelector('.overall-progress-ring');
            const overallCounter = container.querySelector('.overall-progress-counter');

            if (overallProgressBar) {
                animations.push({
                    type: 'progressBar',
                    element: overallProgressBar,
                    value: progressData.overall.percentage,
                    delay: 0
                });
            }

            if (overallProgressRing) {
                animations.push({
                    type: 'progressRing',
                    element: overallProgressRing,
                    value: progressData.overall.percentage,
                    delay: 100
                });
            }

            if (overallCounter) {
                animations.push({
                    type: 'counter',
                    element: overallCounter,
                    value: progressData.overall.percentage,
                    delay: 200,
                    formatter: (value) => `${Math.round(value)}%`
                });
            }

            // Category progress animations
            if (progressData.categories) {
                progressData.categories.forEach((category, index) => {
                    const categoryElement = container.querySelector(`[data-category-id="${category.categoryId}"]`);
                    if (categoryElement) {
                        const categoryBar = categoryElement.querySelector('.category-progress-bar');
                        const categoryCounter = categoryElement.querySelector('.category-progress-counter');

                        if (categoryBar) {
                            animations.push({
                                type: 'progressBar',
                                element: categoryBar,
                                value: category.percentage,
                                delay: 300 + (index * staggerDelay)
                            });
                        }

                        if (categoryCounter) {
                            animations.push({
                                type: 'counter',
                                element: categoryCounter,
                                value: category.percentage,
                                delay: 350 + (index * staggerDelay),
                                formatter: (value) => `${Math.round(value)}%`
                            });
                        }
                    }
                });
            }

            // Check for milestone achievements
            const milestones = this._checkMilestones(progressData.overall.percentage);
            if (milestones.length > 0) {
                milestones.forEach(milestone => {
                    const milestoneElement = container.querySelector(`[data-milestone="${milestone}"]`);
                    if (milestoneElement) {
                        animations.push({
                            type: 'milestone',
                            element: milestoneElement,
                            value: milestone,
                            delay: animations.length * 50,
                            particles: true
                        });
                    }
                });
            }

            await this.animateSequence(animations, options);
            resolve();
        });
    }

    /**
     * Cancel all running animations
     */
    cancelAllAnimations() {
        this.activeAnimations.forEach(animation => {
            if (animation.cancel) {
                animation.cancel();
            }
        });
        this.activeAnimations.clear();
        this.isAnimating = false;
    }

    /**
     * Cancel specific animation by ID
     * @param {string} animationId - Animation identifier
     * @private
     */
    _cancelAnimation(animationId) {
        const animation = this.activeAnimations.get(animationId);
        if (animation && animation.cancel) {
            animation.cancel();
            this.activeAnimations.delete(animationId);
        }
    }

    /**
     * Add glow effect to progress element
     * @param {HTMLElement} element - Element to add glow to
     * @param {number} duration - Glow duration
     * @private
     */
    _addProgressGlow(element, duration) {
        element.classList.add('progress-glow');
        setTimeout(() => {
            element.classList.remove('progress-glow');
        }, duration);
    }

    /**
     * Add shimmer effect to progress ring
     * @param {HTMLElement} element - Ring element
     * @param {number} duration - Shimmer duration
     * @private
     */
    _addRingShimmer(element, duration) {
        element.classList.add('ring-shimmer');
        setTimeout(() => {
            element.classList.remove('ring-shimmer');
        }, duration);
    }

    /**
     * Add milestone glow effect
     * @param {HTMLElement} element - Milestone element
     * @param {number} duration - Glow duration
     * @private
     */
    _addMilestoneGlow(element, duration) {
        element.classList.add('milestone-glow');
        setTimeout(() => {
            element.classList.remove('milestone-glow');
        }, duration * 2);
    }

    /**
     * Create particle effect for milestone
     * @param {HTMLElement} element - Element to create particles around
     * @param {number} milestone - Milestone percentage
     * @private
     */
    _createParticleEffect(element, milestone) {
        // Simple particle effect implementation
        const particles = document.createElement('div');
        particles.className = 'milestone-particles';
        particles.innerHTML = '✨'.repeat(5);

        element.appendChild(particles);

        setTimeout(() => {
            if (particles.parentNode) {
                particles.parentNode.removeChild(particles);
            }
        }, 2000);
    }

    /**
     * Check if percentage represents a milestone
     * @param {number} percentage - Percentage to check
     * @returns {boolean} True if milestone
     * @private
     */
    _isMilestone(percentage) {
        const milestones = [25, 50, 75, 90, 100];
        return milestones.includes(Math.round(percentage));
    }

    /**
     * Check for newly achieved milestones
     * @param {number} currentPercentage - Current progress percentage
     * @returns {Array} Array of newly achieved milestones
     * @private
     */
    _checkMilestones(currentPercentage) {
        const milestones = [25, 50, 75, 90, 100];
        return milestones.filter(milestone =>
            currentPercentage >= milestone &&
            !this._wasMilestoneAchieved(milestone)
        );
    }

    /**
     * Check if milestone was previously achieved
     * @param {number} milestone - Milestone to check
     * @returns {boolean} True if previously achieved
     * @private
     */
    _wasMilestoneAchieved(milestone) {
        // This would typically check against stored state
        // For now, return false to allow milestone animations
        return false;
    }

    /**
     * Apply easing function to progress value
     * @param {number} progress - Linear progress (0-1)
     * @param {string} easing - Easing function name
     * @returns {number} Eased progress value
     * @private
     */
    _applyEasing(progress, easing) {
        switch (easing) {
            case 'ease-out':
                return 1 - Math.pow(1 - progress, 2);
            case 'ease-in':
                return Math.pow(progress, 2);
            case 'ease-in-out':
                return progress < 0.5 ?
                    2 * Math.pow(progress, 2) :
                    1 - Math.pow(-2 * progress + 2, 2) / 2;
            default:
                return progress;
        }
    }

    /**
     * Trigger progress update event
     * @param {HTMLElement} element - Element that was updated
     * @param {number} percentage - New percentage value
     * @private
     */
    _triggerProgressUpdate(element, percentage) {
        const event = new CustomEvent('progressUpdated', {
            detail: { element, percentage },
            bubbles: true
        });
        element.dispatchEvent(event);
    }

    /**
     * Create delay promise
     * @param {number} ms - Delay in milliseconds
     * @returns {Promise} Delay promise
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressAnimations;
} else if (typeof window !== 'undefined') {
    window.ProgressAnimations = ProgressAnimations;
}