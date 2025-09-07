/**
 * Card Themes Module - Dynamic theming system for category cards
 * Provides theme variations based on priority, risk level, and completion status
 */

class CardThemes {
    constructor() {
        this.themes = this.initializeThemes();
        this.customThemes = new Map();
        this.activeThemes = new Map();
        
        this.init();
    }

    init() {
        this.injectThemeStyles();
        this.setupThemeObserver();
    }

    initializeThemes() {
        return {
            // Base themes
            default: {
                name: 'default',
                cssProperties: {
                    '--card-bg': 'var(--glass-white)',
                    '--card-border': 'var(--glass-border)',
                    '--card-text': 'var(--champagne)',
                    '--card-accent': 'var(--royalust-gold)',
                    '--card-shadow': 'rgba(0, 0, 0, 0.1)',
                    '--card-hover-shadow': 'rgba(212, 175, 55, 0.15)'
                },
                gradients: {
                    background: 'linear-gradient(135deg, var(--glass-white) 0%, rgba(255, 255, 255, 0.01) 100%)',
                    border: 'linear-gradient(135deg, var(--glass-border) 0%, transparent 100%)'
                }
            },

            // Priority-based themes
            critical: {
                name: 'critical',
                cssProperties: {
                    '--card-bg': 'rgba(244, 67, 54, 0.05)',
                    '--card-border': 'var(--error-red)',
                    '--card-text': 'var(--champagne)',
                    '--card-accent': 'var(--error-red)',
                    '--card-shadow': 'rgba(244, 67, 54, 0.1)',
                    '--card-hover-shadow': 'rgba(244, 67, 54, 0.25)'
                },
                gradients: {
                    background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.05) 0%, rgba(244, 67, 54, 0.01) 100%)',
                    border: 'linear-gradient(135deg, var(--error-red) 0%, rgba(244, 67, 54, 0.3) 100%)'
                },
                effects: {
                    glow: 'var(--error-red)',
                    pulse: true
                }
            },

            high: {
                name: 'high',
                cssProperties: {
                    '--card-bg': 'rgba(255, 152, 0, 0.05)',
                    '--card-border': 'var(--warning-amber)',
                    '--card-text': 'var(--champagne)',
                    '--card-accent': 'var(--warning-amber)',
                    '--card-shadow': 'rgba(255, 152, 0, 0.1)',
                    '--card-hover-shadow': 'rgba(255, 152, 0, 0.2)'
                },
                gradients: {
                    background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.01) 100%)',
                    border: 'linear-gradient(135deg, var(--warning-amber) 0%, rgba(255, 152, 0, 0.3) 100%)'
                }
            },

            medium: {
                name: 'medium',
                cssProperties: {
                    '--card-bg': 'rgba(33, 150, 243, 0.05)',
                    '--card-border': 'var(--info-blue)',
                    '--card-text': 'var(--champagne)',
                    '--card-accent': 'var(--info-blue)',
                    '--card-shadow': 'rgba(33, 150, 243, 0.1)',
                    '--card-hover-shadow': 'rgba(33, 150, 243, 0.2)'
                },
                gradients: {
                    background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(33, 150, 243, 0.01) 100%)',
                    border: 'linear-gradient(135deg, var(--info-blue) 0%, rgba(33, 150, 243, 0.3) 100%)'
                }
            },

            low: {
                name: 'low',
                cssProperties: {
                    '--card-bg': 'rgba(76, 175, 80, 0.05)',
                    '--card-border': 'var(--success-green)',
                    '--card-text': 'var(--champagne)',
                    '--card-accent': 'var(--success-green)',
                    '--card-shadow': 'rgba(76, 175, 80, 0.1)',
                    '--card-hover-shadow': 'rgba(76, 175, 80, 0.2)'
                },
                gradients: {
                    background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(76, 175, 80, 0.01) 100%)',
                    border: 'linear-gradient(135deg, var(--success-green) 0%, rgba(76, 175, 80, 0.3) 100%)'
                }
            },

            // Completion-based themes
            complete: {
                name: 'complete',
                cssProperties: {
                    '--card-bg': 'rgba(76, 175, 80, 0.08)',
                    '--card-border': 'var(--success-green)',
                    '--card-text': 'var(--champagne)',
                    '--card-accent': 'var(--success-green)',
                    '--card-shadow': 'rgba(76, 175, 80, 0.15)',
                    '--card-hover-shadow': 'rgba(76, 175, 80, 0.3)'
                },
                gradients: {
                    background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.02) 100%)',
                    border: 'linear-gradient(135deg, var(--success-green) 0%, rgba(76, 175, 80, 0.5) 100%)'
                },
                effects: {
                    glow: 'var(--success-green)',
                    shimmer: true
                }
            },

            'in-progress': {
                name: 'in-progress',
                cssProperties: {
                    '--card-bg': 'rgba(212, 175, 55, 0.08)',
                    '--card-border': 'var(--royalust-gold)',
                    '--card-text': 'var(--champagne)',
                    '--card-accent': 'var(--royalust-gold)',
                    '--card-shadow': 'rgba(212, 175, 55, 0.15)',
                    '--card-hover-shadow': 'rgba(212, 175, 55, 0.3)'
                },
                gradients: {
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.02) 100%)',
                    border: 'linear-gradient(135deg, var(--royalust-gold) 0%, var(--bronze-light) 100%)'
                },
                effects: {
                    glow: 'var(--royalust-gold)',
                    pulse: true
                }
            },

            'not-started': {
                name: 'not-started',
                cssProperties: {
                    '--card-bg': 'var(--glass-white)',
                    '--card-border': 'rgba(255, 255, 255, 0.1)',
                    '--card-text': 'rgba(247, 231, 206, 0.7)',
                    '--card-accent': 'rgba(212, 175, 55, 0.5)',
                    '--card-shadow': 'rgba(0, 0, 0, 0.05)',
                    '--card-hover-shadow': 'rgba(212, 175, 55, 0.1)'
                },
                gradients: {
                    background: 'linear-gradient(135deg, var(--glass-white) 0%, rgba(255, 255, 255, 0.005) 100%)',
                    border: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%)'
                }
            },

            // Risk-based themes
            'risk-critical': {
                name: 'risk-critical',
                cssProperties: {
                    '--card-bg': 'rgba(244, 67, 54, 0.1)',
                    '--card-border': 'var(--error-red)',
                    '--card-text': 'var(--champagne)',
                    '--card-accent': 'var(--error-red)',
                    '--card-shadow': 'rgba(244, 67, 54, 0.2)',
                    '--card-hover-shadow': 'rgba(244, 67, 54, 0.4)'
                },
                gradients: {
                    background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.1) 0%, rgba(244, 67, 54, 0.02) 100%)',
                    border: 'linear-gradient(135deg, var(--error-red) 0%, rgba(244, 67, 54, 0.6) 100%)'
                },
                effects: {
                    glow: 'var(--error-red)',
                    pulse: true,
                    urgent: true
                }
            },

            'risk-low': {
                name: 'risk-low',
                cssProperties: {
                    '--card-bg': 'rgba(76, 175, 80, 0.03)',
                    '--card-border': 'rgba(76, 175, 80, 0.3)',
                    '--card-text': 'var(--champagne)',
                    '--card-accent': 'var(--success-green)',
                    '--card-shadow': 'rgba(76, 175, 80, 0.05)',
                    '--card-hover-shadow': 'rgba(76, 175, 80, 0.15)'
                },
                gradients: {
                    background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.03) 0%, rgba(76, 175, 80, 0.005) 100%)',
                    border: 'linear-gradient(135deg, rgba(76, 175, 80, 0.3) 0%, rgba(76, 175, 80, 0.1) 100%)'
                }
            },

            // Special themes
            violet: {
                name: 'violet',
                cssProperties: {
                    '--card-bg': 'var(--glass-violet)',
                    '--card-border': 'var(--mystic-violet)',
                    '--card-text': 'var(--champagne)',
                    '--card-accent': 'var(--ethereal-purple)',
                    '--card-shadow': 'rgba(106, 27, 154, 0.1)',
                    '--card-hover-shadow': 'rgba(106, 27, 154, 0.25)'
                },
                gradients: {
                    background: 'linear-gradient(135deg, var(--glass-violet) 0%, rgba(106, 27, 154, 0.02) 100%)',
                    border: 'linear-gradient(135deg, var(--mystic-violet) 0%, var(--ethereal-purple) 100%)'
                },
                effects: {
                    glow: 'var(--ethereal-purple)',
                    mystical: true
                }
            },

            gold: {
                name: 'gold',
                cssProperties: {
                    '--card-bg': 'var(--glass-gold)',
                    '--card-border': 'var(--royalust-gold)',
                    '--card-text': 'var(--champagne)',
                    '--card-accent': 'var(--bronze-light)',
                    '--card-shadow': 'rgba(212, 175, 55, 0.15)',
                    '--card-hover-shadow': 'rgba(212, 175, 55, 0.35)'
                },
                gradients: {
                    background: 'linear-gradient(135deg, var(--glass-gold) 0%, rgba(212, 175, 55, 0.02) 100%)',
                    border: 'linear-gradient(135deg, var(--royalust-gold) 0%, var(--bronze-light) 100%)'
                },
                effects: {
                    glow: 'var(--royalust-gold)',
                    shimmer: true,
                    luxury: true
                }
            }
        };
    }

    injectThemeStyles() {
        if (!document.getElementById('card-theme-styles')) {
            const styles = document.createElement('style');
            styles.id = 'card-theme-styles';
            styles.textContent = this.generateThemeCSS();
            document.head.appendChild(styles);
        }
    }

    generateThemeCSS() {
        return `
            /* Base Card Theme Styles */
            .category-card {
                background: var(--card-bg, var(--glass-white));
                border: 1px solid var(--card-border, var(--glass-border));
                color: var(--card-text, var(--champagne));
                box-shadow: 0 4px 12px var(--card-shadow, rgba(0, 0, 0, 0.1));
                transition: all 0.3s ease;
            }

            .category-card:hover {
                box-shadow: 0 8px 25px var(--card-hover-shadow, rgba(212, 175, 55, 0.15));
            }

            /* Theme-specific effects */
            .theme-critical {
                animation: criticalPulse 2s ease-in-out infinite;
            }

            .theme-complete .card-header::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(45deg, transparent 30%, rgba(76, 175, 80, 0.1) 50%, transparent 70%);
                animation: shimmer 3s ease-in-out infinite;
                pointer-events: none;
            }

            .theme-in-progress .progress-fill {
                position: relative;
                overflow: hidden;
            }

            .theme-in-progress .progress-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                animation: progressShine 2s ease-in-out infinite;
            }

            .theme-violet {
                position: relative;
            }

            .theme-violet::before {
                content: '';
                position: absolute;
                top: -1px;
                left: -1px;
                right: -1px;
                bottom: -1px;
                background: linear-gradient(45deg, var(--mystic-violet), var(--ethereal-purple), var(--mystic-violet));
                border-radius: inherit;
                z-index: -1;
                opacity: 0.5;
                filter: blur(1px);
            }

            .theme-gold .card-header {
                position: relative;
                overflow: hidden;
            }

            .theme-gold .card-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent);
                animation: goldShimmer 4s ease-in-out infinite;
            }

            /* Risk-based visual indicators */
            .theme-risk-critical::after {
                content: '⚠️';
                position: absolute;
                top: 10px;
                right: 10px;
                font-size: 1.2em;
                animation: urgentBlink 1s ease-in-out infinite;
            }

            /* Keyframe animations */
            @keyframes criticalPulse {
                0%, 100% { 
                    box-shadow: 0 4px 12px var(--card-shadow);
                }
                50% { 
                    box-shadow: 0 4px 20px rgba(244, 67, 54, 0.3);
                }
            }

            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            @keyframes progressShine {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            @keyframes goldShimmer {
                0% { left: -100%; }
                50% { left: 100%; }
                100% { left: 100%; }
            }

            @keyframes urgentBlink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            /* Reduced motion overrides */
            @media (prefers-reduced-motion: reduce) {
                .theme-critical,
                .theme-complete .card-header::after,
                .theme-in-progress .progress-fill::after,
                .theme-gold .card-header::before,
                .theme-risk-critical::after {
                    animation: none !important;
                }
            }
        `;
    }

    setupThemeObserver() {
        // Observe theme changes and update accordingly
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    this.handleThemeChange(mutation.target);
                }
            });
        });
    }

    // Public API methods
    getTheme(priority, riskLevel, completionStatus) {
        // Determine theme based on multiple factors
        if (completionStatus === 'complete') {
            return this.themes.complete;
        }
        
        if (riskLevel === 'critical' || priority === 'critical') {
            return this.themes.critical;
        }
        
        if (completionStatus === 'in-progress') {
            return this.themes['in-progress'];
        }
        
        if (riskLevel === 'low' && completionStatus !== 'not-started') {
            return this.themes['risk-low'];
        }
        
        // Priority-based fallback
        if (priority && this.themes[priority]) {
            return this.themes[priority];
        }
        
        // Risk-based fallback
        if (riskLevel && this.themes[`risk-${riskLevel}`]) {
            return this.themes[`risk-${riskLevel}`];
        }
        
        return this.themes.default;
    }

    applyTheme(cardElement, themeName) {
        const theme = this.themes[themeName] || this.customThemes.get(themeName);
        if (!theme) {
            console.warn(`Theme "${themeName}" not found`);
            return;
        }

        // Remove existing theme classes
        this.removeExistingThemes(cardElement);
        
        // Add new theme class
        cardElement.classList.add(`theme-${theme.name}`);
        
        // Apply CSS properties
        Object.entries(theme.cssProperties).forEach(([property, value]) => {
            cardElement.style.setProperty(property, value);
        });
        
        // Apply gradients if supported
        if (theme.gradients) {
            this.applyGradients(cardElement, theme.gradients);
        }
        
        // Apply special effects
        if (theme.effects) {
            this.applyEffects(cardElement, theme.effects);
        }
        
        // Track active theme
        this.activeThemes.set(cardElement, theme.name);
    }

    removeExistingThemes(cardElement) {
        const themeClasses = Array.from(cardElement.classList).filter(cls => cls.startsWith('theme-'));
        themeClasses.forEach(cls => cardElement.classList.remove(cls));
    }

    applyGradients(cardElement, gradients) {
        if (gradients.background) {
            cardElement.style.setProperty('--card-gradient-bg', gradients.background);
        }
        
        if (gradients.border) {
            cardElement.style.setProperty('--card-gradient-border', gradients.border);
        }
    }

    applyEffects(cardElement, effects) {
        if (effects.glow) {
            cardElement.style.setProperty('--card-glow-color', effects.glow);
            cardElement.classList.add('card-glow-effect');
        }
        
        if (effects.pulse) {
            cardElement.classList.add('card-pulse-effect');
        }
        
        if (effects.shimmer) {
            cardElement.classList.add('card-shimmer-effect');
        }
        
        if (effects.urgent) {
            cardElement.classList.add('card-urgent-effect');
        }
        
        if (effects.mystical) {
            cardElement.classList.add('card-mystical-effect');
        }
        
        if (effects.luxury) {
            cardElement.classList.add('card-luxury-effect');
        }
    }

    createCustomTheme(name, themeConfig) {
        const theme = {
            name: name,
            cssProperties: {},
            gradients: {},
            effects: {},
            ...themeConfig
        };
        
        this.customThemes.set(name, theme);
        return theme;
    }

    updateTheme(cardElement, updates) {
        const currentTheme = this.activeThemes.get(cardElement);
        if (!currentTheme) return;
        
        const theme = this.themes[currentTheme] || this.customThemes.get(currentTheme);
        if (!theme) return;
        
        // Apply updates
        Object.entries(updates).forEach(([property, value]) => {
            cardElement.style.setProperty(property, value);
        });
    }

    getActiveTheme(cardElement) {
        return this.activeThemes.get(cardElement);
    }

    resetTheme(cardElement) {
        this.removeExistingThemes(cardElement);
        
        // Remove custom properties
        const computedStyle = getComputedStyle(cardElement);
        Object.keys(computedStyle).forEach(property => {
            if (property.startsWith('--card-')) {
                cardElement.style.removeProperty(property);
            }
        });
        
        // Remove effect classes
        const effectClasses = [
            'card-glow-effect', 'card-pulse-effect', 'card-shimmer-effect',
            'card-urgent-effect', 'card-mystical-effect', 'card-luxury-effect'
        ];
        
        effectClasses.forEach(cls => cardElement.classList.remove(cls));
        
        this.activeThemes.delete(cardElement);
    }

    // Theme transition effects
    transitionToTheme(cardElement, newThemeName, duration = 300) {
        return new Promise((resolve) => {
            // Add transition class
            cardElement.classList.add('theme-transitioning');
            cardElement.style.transition = `all ${duration}ms ease`;
            
            // Apply new theme
            setTimeout(() => {
                this.applyTheme(cardElement, newThemeName);
                
                setTimeout(() => {
                    cardElement.classList.remove('theme-transitioning');
                    cardElement.style.transition = '';
                    resolve();
                }, duration);
            }, 50);
        });
    }

    // Utility methods
    getAllThemeNames() {
        return [...Object.keys(this.themes), ...this.customThemes.keys()];
    }

    getThemesByCategory(category) {
        const categories = {
            priority: ['critical', 'high', 'medium', 'low'],
            completion: ['complete', 'in-progress', 'not-started'],
            risk: ['risk-critical', 'risk-low'],
            special: ['violet', 'gold']
        };
        
        return categories[category] || [];
    }

    handleThemeChange(cardElement) {
        // React to external class changes
        const currentTheme = this.getActiveTheme(cardElement);
        const hasThemeClass = Array.from(cardElement.classList).some(cls => cls.startsWith('theme-'));
        
        if (currentTheme && !hasThemeClass) {
            // Theme was removed externally
            this.activeThemes.delete(cardElement);
        }
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.activeThemes.clear();
        this.customThemes.clear();
        
        // Remove theme styles
        const styles = document.getElementById('card-theme-styles');
        if (styles) {
            styles.remove();
        }
    }
}

// Create global instance
const cardThemes = new CardThemes();

// Static methods for easy access
CardThemes.getTheme = (priority, riskLevel, completionStatus) => {
    return cardThemes.getTheme(priority, riskLevel, completionStatus);
};

CardThemes.applyTheme = (cardElement, themeName) => {
    return cardThemes.applyTheme(cardElement, themeName);
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardThemes;
}