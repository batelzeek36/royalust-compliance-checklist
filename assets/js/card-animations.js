/**
 * Card Animations Module - Advanced animation system for category cards
 * Provides smooth, performant animations with accessibility considerations
 */

class CardAnimations {
    constructor() {
        this.activeAnimations = new Map();
        this.settings = {
            duration: {
                fast: 200,
                normal: 300,
                slow: 500
            },
            easing: {
                easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                easeIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
                easeInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
                bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            },
            stagger: 50,
            reducedMotion: false
        };
        
        this.init();
    }

    init() {
        this.checkReducedMotion();
        this.setupGlobalStyles();
        this.setupIntersectionObserver();
    }

    checkReducedMotion() {
        this.settings.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Listen for changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.settings.reducedMotion = e.matches;
        });
    }

    setupGlobalStyles() {
        if (!document.getElementById('card-animations-styles')) {
            const styles = document.createElement('style');
            styles.id = 'card-animations-styles';
            styles.textContent = this.getAnimationCSS();
            document.head.appendChild(styles);
        }
    }

    getAnimationCSS() {
        return `
            /* Card Animation Base Styles */
            .category-card {
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                will-change: transform, box-shadow;
            }

            .category-card.animating {
                pointer-events: none;
            }

            /* Entrance Animations */
            .card-entrance-fade {
                opacity: 0;
                transform: translateY(20px);
                animation: cardEntranceFade 0.6s ease forwards;
            }

            .card-entrance-slide {
                opacity: 0;
                transform: translateX(-30px);
                animation: cardEntranceSlide 0.5s ease forwards;
            }

            .card-entrance-scale {
                opacity: 0;
                transform: scale(0.9);
                animation: cardEntranceScale 0.4s ease forwards;
            }

            /* Hover Animations */
            .category-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(212, 175, 55, 0.15);
            }

            .category-card.hovered .card-header {
                background: linear-gradient(135deg, 
                    rgba(212, 175, 55, 0.1) 0%, 
                    rgba(106, 27, 154, 0.05) 100%);
            }

            /* Expand/Collapse Animations */
            .card-content {
                overflow: hidden;
                transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .category-card.expanding .card-content {
                animation: cardExpand 0.3s ease forwards;
            }

            .category-card.collapsing .card-content {
                animation: cardCollapse 0.3s ease forwards;
            }

            /* Progress Animations */
            .progress-fill {
                transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .progress-glow {
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .progress-bar.animating .progress-glow {
                opacity: 1;
                animation: progressGlow 2s ease-in-out infinite;
            }

            /* Badge Animations */
            .badge {
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            .badge.badge-show {
                animation: badgeShow 0.3s ease forwards;
            }

            .badge.badge-pulse {
                animation: badgePulse 1s ease-in-out;
            }

            .badge.badge-flash {
                animation: badgeFlash 0.6s ease;
            }

            .badge.badge-clicked {
                animation: badgeClick 0.2s ease;
            }

            /* Checkbox Animations */
            .checkbox-custom {
                transition: all 0.2s ease;
            }

            .item-checkbox:checked + .checkbox-label .checkbox-custom {
                animation: checkboxCheck 0.3s ease;
            }

            .checkbox-checkmark {
                transition: transform 0.2s ease, opacity 0.2s ease;
            }

            /* Loading Animations */
            .loading-spinner {
                animation: spin 1s linear infinite;
            }

            .spinner-ring {
                border: 3px solid rgba(212, 175, 55, 0.1);
                border-top: 3px solid var(--royalust-gold);
                border-radius: 50%;
                width: 30px;
                height: 30px;
                animation: spin 1s linear infinite;
            }

            /* Keyframe Definitions */
            @keyframes cardEntranceFade {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes cardEntranceSlide {
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @keyframes cardEntranceScale {
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            @keyframes cardExpand {
                from {
                    opacity: 0.7;
                    transform: scaleY(0.95);
                }
                to {
                    opacity: 1;
                    transform: scaleY(1);
                }
            }

            @keyframes cardCollapse {
                from {
                    opacity: 1;
                    transform: scaleY(1);
                }
                to {
                    opacity: 0.7;
                    transform: scaleY(0.95);
                }
            }

            @keyframes progressGlow {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 1; }
            }

            @keyframes badgeShow {
                from {
                    opacity: 0;
                    transform: scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            @keyframes badgePulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            @keyframes badgeFlash {
                0%, 100% { background-color: var(--badge-bg); }
                50% { background-color: var(--royalust-gold); }
            }

            @keyframes badgeClick {
                0% { transform: scale(1); }
                50% { transform: scale(0.95); }
                100% { transform: scale(1); }
            }

            @keyframes checkboxCheck {
                0% {
                    transform: scale(1);
                    background-color: transparent;
                }
                50% {
                    transform: scale(1.1);
                    background-color: var(--royalust-gold);
                }
                100% {
                    transform: scale(1);
                    background-color: var(--royalust-gold);
                }
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Reduced Motion Overrides */
            @media (prefers-reduced-motion: reduce) {
                .category-card,
                .card-content,
                .progress-fill,
                .badge,
                .checkbox-custom,
                .checkbox-checkmark {
                    transition: none !important;
                    animation: none !important;
                }
                
                .category-card:hover {
                    transform: none;
                }
            }
        `;
    }

    setupIntersectionObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCardEntrance(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
    }

    // Card entrance animations
    animateCardEntrance(cardElement, type = 'fade') {
        if (this.settings.reducedMotion) return;
        
        const animationClass = `card-entrance-${type}`;
        cardElement.classList.add(animationClass);
        
        // Remove animation class after completion
        setTimeout(() => {
            cardElement.classList.remove(animationClass);
        }, 600);
    }

    animateCardsStaggered(cardElements, type = 'fade') {
        if (this.settings.reducedMotion) return;
        
        cardElements.forEach((card, index) => {
            setTimeout(() => {
                this.animateCardEntrance(card, type);
            }, index * this.settings.stagger);
        });
    }

    // Expand/Collapse animations
    expandCard(contentElement, duration = 300) {
        return new Promise((resolve) => {
            if (this.settings.reducedMotion) {
                contentElement.style.display = 'block';
                resolve();
                return;
            }

            const card = contentElement.closest('.category-card');
            card.classList.add('expanding', 'animating');
            
            // Set initial state
            contentElement.style.display = 'block';
            const targetHeight = contentElement.scrollHeight;
            contentElement.style.height = '0px';
            
            // Force reflow
            contentElement.offsetHeight;
            
            // Animate to target height
            contentElement.style.transition = `height ${duration}ms ${this.settings.easing.easeOut}`;
            contentElement.style.height = `${targetHeight}px`;
            
            setTimeout(() => {
                contentElement.style.height = 'auto';
                contentElement.style.transition = '';
                card.classList.remove('expanding', 'animating');
                resolve();
            }, duration);
        });
    }

    collapseCard(contentElement, duration = 300) {
        return new Promise((resolve) => {
            if (this.settings.reducedMotion) {
                contentElement.style.display = 'none';
                resolve();
                return;
            }

            const card = contentElement.closest('.category-card');
            card.classList.add('collapsing', 'animating');
            
            // Set initial height
            const currentHeight = contentElement.scrollHeight;
            contentElement.style.height = `${currentHeight}px`;
            
            // Force reflow
            contentElement.offsetHeight;
            
            // Animate to zero height
            contentElement.style.transition = `height ${duration}ms ${this.settings.easing.easeIn}`;
            contentElement.style.height = '0px';
            
            setTimeout(() => {
                contentElement.style.display = 'none';
                contentElement.style.height = '';
                contentElement.style.transition = '';
                card.classList.remove('collapsing', 'animating');
                resolve();
            }, duration);
        });
    }

    // Progress animations
    animateProgress(progressElement, fromValue, toValue, duration = 800) {
        if (this.settings.reducedMotion) {
            progressElement.style.width = `${toValue}%`;
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const startTime = performance.now();
            const valueChange = toValue - fromValue;
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Apply easing
                const easedProgress = this.easeInOutCubic(progress);
                const currentValue = fromValue + (valueChange * easedProgress);
                
                progressElement.style.width = `${currentValue}%`;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    // Checkbox animations
    animateCheckbox(checkboxElement, isChecked) {
        if (this.settings.reducedMotion) return;
        
        const customCheckbox = checkboxElement.parentElement.querySelector('.checkbox-custom');
        const checkmark = checkboxElement.parentElement.querySelector('.checkbox-checkmark');
        
        if (isChecked) {
            customCheckbox.style.animation = 'checkboxCheck 0.3s ease';
            if (checkmark) {
                checkmark.style.transform = 'scale(1)';
                checkmark.style.opacity = '1';
            }
        } else {
            if (checkmark) {
                checkmark.style.transform = 'scale(0)';
                checkmark.style.opacity = '0';
            }
        }
        
        // Clear animation after completion
        setTimeout(() => {
            customCheckbox.style.animation = '';
        }, 300);
    }

    // Badge animations
    animateBadgeAppearance(badgeElement, type = 'show') {
        if (this.settings.reducedMotion) return;
        
        badgeElement.classList.add(`badge-${type}`);
        
        setTimeout(() => {
            badgeElement.classList.remove(`badge-${type}`);
        }, type === 'pulse' ? 1000 : 300);
    }

    // Loading animations
    showLoadingState(cardElement) {
        const loadingElement = cardElement.querySelector('.card-loading');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
            loadingElement.setAttribute('aria-hidden', 'false');
        }
    }

    hideLoadingState(cardElement) {
        const loadingElement = cardElement.querySelector('.card-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
            loadingElement.setAttribute('aria-hidden', 'true');
        }
    }

    // Hover effects
    addHoverEffects(cardElement) {
        if (this.settings.reducedMotion) return;
        
        cardElement.addEventListener('mouseenter', () => {
            this.animateHoverIn(cardElement);
        });
        
        cardElement.addEventListener('mouseleave', () => {
            this.animateHoverOut(cardElement);
        });
    }

    animateHoverIn(cardElement) {
        cardElement.style.transform = 'translateY(-2px)';
        cardElement.style.boxShadow = '0 8px 25px rgba(212, 175, 55, 0.15)';
    }

    animateHoverOut(cardElement) {
        cardElement.style.transform = '';
        cardElement.style.boxShadow = '';
    }

    // Utility functions
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    // Intersection observer management
    observeCard(cardElement) {
        this.observer.observe(cardElement);
    }

    unobserveCard(cardElement) {
        this.observer.unobserve(cardElement);
    }

    // Animation queue management
    queueAnimation(animationFunction, priority = 'normal') {
        const animationId = this.generateAnimationId();
        
        const animation = {
            id: animationId,
            function: animationFunction,
            priority: priority,
            timestamp: performance.now()
        };
        
        this.activeAnimations.set(animationId, animation);
        
        return this.executeAnimation(animation);
    }

    executeAnimation(animation) {
        return new Promise((resolve) => {
            animation.function().then(() => {
                this.activeAnimations.delete(animation.id);
                resolve();
            });
        });
    }

    generateAnimationId() {
        return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Performance monitoring
    measureAnimationPerformance(animationName, animationFunction) {
        const startTime = performance.now();
        
        return animationFunction().then(() => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            console.log(`Animation "${animationName}" took ${duration.toFixed(2)}ms`);
            
            // Log performance warning if animation is slow
            if (duration > 100) {
                console.warn(`Slow animation detected: ${animationName} (${duration.toFixed(2)}ms)`);
            }
        });
    }

    // Cleanup
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.activeAnimations.clear();
        
        // Remove global styles
        const styles = document.getElementById('card-animations-styles');
        if (styles) {
            styles.remove();
        }
    }
}

// Create global instance
const cardAnimations = new CardAnimations();

// Static methods for easy access
CardAnimations.expandCard = (contentElement, duration) => {
    return cardAnimations.expandCard(contentElement, duration);
};

CardAnimations.collapseCard = (contentElement, duration) => {
    return cardAnimations.collapseCard(contentElement, duration);
};

CardAnimations.animateProgress = (progressElement, fromValue, toValue, duration) => {
    return cardAnimations.animateProgress(progressElement, fromValue, toValue, duration);
};

CardAnimations.animateCheckbox = (checkboxElement, isChecked) => {
    return cardAnimations.animateCheckbox(checkboxElement, isChecked);
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardAnimations;
}