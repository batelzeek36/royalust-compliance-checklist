/**
 * Badge System Module - Comprehensive badge management for priority, risk, and status indicators
 * Provides dynamic badge creation, theming, and interactive features
 */

class Badge {
    constructor(options = {}) {
        this.options = {
            type: 'default',
            value: '',
            text: '',
            icon: '',
            size: 'medium',
            variant: 'filled',
            interactive: false,
            dismissible: false,
            animated: true,
            tooltip: '',
            container: null,
            ...options
        };

        this.element = null;
        this.isVisible = true;
        
        this.init();
    }

    init() {
        this.createElement();
        this.applyTheme();
        this.setupInteractions();
        
        if (this.options.container) {
            this.options.container.appendChild(this.element);
        }
    }

    createElement() {
        this.element = document.createElement('span');
        this.element.className = this.buildClassName();
        this.element.setAttribute('role', 'status');
        
        // Create badge content
        const content = this.createContent();
        this.element.appendChild(content);
        
        // Add dismiss button if dismissible
        if (this.options.dismissible) {
            const dismissButton = this.createDismissButton();
            this.element.appendChild(dismissButton);
        }
        
        // Setup tooltip if provided
        if (this.options.tooltip) {
            this.setupTooltip();
        }
    }

    buildClassName() {
        const classes = ['badge'];
        
        classes.push(`badge-${this.options.type}`);
        classes.push(`badge-${this.options.size}`);
        classes.push(`badge-${this.options.variant}`);
        
        if (this.options.interactive) classes.push('badge-interactive');
        if (this.options.dismissible) classes.push('badge-dismissible');
        if (this.options.animated) classes.push('badge-animated');
        
        return classes.join(' ');
    }

    createContent() {
        const content = document.createElement('span');
        content.className = 'badge-content';
        
        // Add icon if provided
        if (this.options.icon) {
            const icon = document.createElement('span');
            icon.className = 'badge-icon';
            icon.textContent = this.options.icon;
            icon.setAttribute('aria-hidden', 'true');
            content.appendChild(icon);
        }
        
        // Add text content
        const text = document.createElement('span');
        text.className = 'badge-text';
        text.textContent = this.getText();
        content.appendChild(text);
        
        return content;
    }

    createDismissButton() {
        const button = document.createElement('button');
        button.className = 'badge-dismiss';
        button.setAttribute('aria-label', 'Dismiss badge');
        button.innerHTML = '<span aria-hidden="true">×</span>';
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dismiss();
        });
        
        return button;
    }

    getText() {
        if (this.options.text) {
            return this.options.text;
        }
        
        // Generate text based on type and value
        return this.generateTextFromValue();
    }

    generateTextFromValue() {
        const { type, value } = this.options;
        
        switch (type) {
            case 'priority':
                return this.getPriorityText(value);
            case 'risk':
                return this.getRiskText(value);
            case 'completion':
                return this.getCompletionText(value);
            case 'status':
                return this.getStatusText(value);
            default:
                return value.toString();
        }
    }

    getPriorityText(priority) {
        const priorities = {
            'critical': 'Critical',
            'high': 'High Priority',
            'medium': 'Medium',
            'low': 'Low Priority'
        };
        return priorities[priority] || priority;
    }

    getRiskText(risk) {
        const risks = {
            'critical': 'Critical Risk',
            'high': 'High Risk',
            'medium': 'Medium Risk',
            'low': 'Low Risk',
            'minimal': 'Minimal Risk'
        };
        return risks[risk] || risk;
    }

    getCompletionText(completion) {
        const completions = {
            'complete': 'Complete',
            'in-progress': 'In Progress',
            'not-started': 'Not Started',
            'blocked': 'Blocked',
            'review': 'Under Review'
        };
        return completions[completion] || completion;
    }

    getStatusText(status) {
        const statuses = {
            'active': 'Active',
            'inactive': 'Inactive',
            'pending': 'Pending',
            'approved': 'Approved',
            'rejected': 'Rejected'
        };
        return statuses[status] || status;
    }

    applyTheme() {
        const theme = this.getThemeConfig();
        
        // Apply CSS custom properties
        Object.entries(theme.cssProperties).forEach(([property, value]) => {
            this.element.style.setProperty(property, value);
        });
        
        // Add theme-specific classes
        if (theme.className) {
            this.element.classList.add(theme.className);
        }
    }

    getThemeConfig() {
        const { type, value } = this.options;
        
        const themes = {
            priority: {
                critical: {
                    cssProperties: {
                        '--badge-bg': 'var(--error-red)',
                        '--badge-color': 'white',
                        '--badge-border': 'var(--error-red)'
                    },
                    className: 'badge-critical'
                },
                high: {
                    cssProperties: {
                        '--badge-bg': 'var(--warning-amber)',
                        '--badge-color': 'var(--midnight-blue)',
                        '--badge-border': 'var(--warning-amber)'
                    },
                    className: 'badge-high'
                },
                medium: {
                    cssProperties: {
                        '--badge-bg': 'var(--info-blue)',
                        '--badge-color': 'white',
                        '--badge-border': 'var(--info-blue)'
                    },
                    className: 'badge-medium'
                },
                low: {
                    cssProperties: {
                        '--badge-bg': 'var(--glass-white)',
                        '--badge-color': 'var(--champagne)',
                        '--badge-border': 'var(--glass-border)'
                    },
                    className: 'badge-low'
                }
            },
            risk: {
                critical: {
                    cssProperties: {
                        '--badge-bg': 'var(--error-red)',
                        '--badge-color': 'white',
                        '--badge-border': 'var(--error-red)'
                    },
                    className: 'badge-risk-critical'
                },
                high: {
                    cssProperties: {
                        '--badge-bg': 'var(--warning-amber)',
                        '--badge-color': 'var(--midnight-blue)',
                        '--badge-border': 'var(--warning-amber)'
                    },
                    className: 'badge-risk-high'
                },
                medium: {
                    cssProperties: {
                        '--badge-bg': 'var(--mystic-violet)',
                        '--badge-color': 'white',
                        '--badge-border': 'var(--mystic-violet)'
                    },
                    className: 'badge-risk-medium'
                },
                low: {
                    cssProperties: {
                        '--badge-bg': 'var(--success-green)',
                        '--badge-color': 'white',
                        '--badge-border': 'var(--success-green)'
                    },
                    className: 'badge-risk-low'
                },
                minimal: {
                    cssProperties: {
                        '--badge-bg': 'var(--glass-white)',
                        '--badge-color': 'var(--champagne)',
                        '--badge-border': 'var(--glass-border)'
                    },
                    className: 'badge-risk-minimal'
                }
            },
            completion: {
                complete: {
                    cssProperties: {
                        '--badge-bg': 'var(--success-green)',
                        '--badge-color': 'white',
                        '--badge-border': 'var(--success-green)'
                    },
                    className: 'badge-complete'
                },
                'in-progress': {
                    cssProperties: {
                        '--badge-bg': 'var(--royalust-gold)',
                        '--badge-color': 'var(--midnight-blue)',
                        '--badge-border': 'var(--royalust-gold)'
                    },
                    className: 'badge-in-progress'
                },
                'not-started': {
                    cssProperties: {
                        '--badge-bg': 'var(--glass-white)',
                        '--badge-color': 'var(--champagne)',
                        '--badge-border': 'var(--glass-border)'
                    },
                    className: 'badge-not-started'
                },
                blocked: {
                    cssProperties: {
                        '--badge-bg': 'var(--error-red)',
                        '--badge-color': 'white',
                        '--badge-border': 'var(--error-red)'
                    },
                    className: 'badge-blocked'
                }
            }
        };
        
        const typeThemes = themes[type];
        if (typeThemes && typeThemes[value]) {
            return typeThemes[value];
        }
        
        // Default theme
        return {
            cssProperties: {
                '--badge-bg': 'var(--glass-white)',
                '--badge-color': 'var(--champagne)',
                '--badge-border': 'var(--glass-border)'
            },
            className: 'badge-default'
        };
    }

    setupInteractions() {
        if (this.options.interactive) {
            this.element.addEventListener('click', (e) => {
                this.handleClick(e);
            });
            
            this.element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleClick(e);
                }
            });
            
            // Make focusable
            this.element.setAttribute('tabindex', '0');
        }
    }

    setupTooltip() {
        this.element.setAttribute('data-tooltip', this.options.tooltip);
        this.element.setAttribute('aria-describedby', `tooltip-${this.generateId()}`);
    }

    handleClick(event) {
        // Emit custom event
        const clickEvent = new CustomEvent('badgeClick', {
            detail: {
                type: this.options.type,
                value: this.options.value,
                badge: this
            },
            bubbles: true
        });
        
        this.element.dispatchEvent(clickEvent);
        
        // Add click animation
        if (this.options.animated) {
            this.animateClick();
        }
    }

    animateClick() {
        this.element.classList.add('badge-clicked');
        setTimeout(() => {
            this.element.classList.remove('badge-clicked');
        }, 200);
    }

    // Public API methods
    setValue(newValue) {
        this.options.value = newValue;
        const textElement = this.element.querySelector('.badge-text');
        if (textElement) {
            textElement.textContent = this.getText();
        }
        this.applyTheme();
    }

    setText(newText) {
        this.options.text = newText;
        const textElement = this.element.querySelector('.badge-text');
        if (textElement) {
            textElement.textContent = this.getText();
        }
    }

    setIcon(newIcon) {
        this.options.icon = newIcon;
        let iconElement = this.element.querySelector('.badge-icon');
        
        if (newIcon && !iconElement) {
            // Create icon element
            iconElement = document.createElement('span');
            iconElement.className = 'badge-icon';
            iconElement.setAttribute('aria-hidden', 'true');
            
            const content = this.element.querySelector('.badge-content');
            content.insertBefore(iconElement, content.firstChild);
        }
        
        if (iconElement) {
            if (newIcon) {
                iconElement.textContent = newIcon;
                iconElement.style.display = '';
            } else {
                iconElement.style.display = 'none';
            }
        }
    }

    show() {
        this.isVisible = true;
        this.element.style.display = '';
        this.element.setAttribute('aria-hidden', 'false');
        
        if (this.options.animated) {
            this.element.classList.add('badge-show');
            setTimeout(() => {
                this.element.classList.remove('badge-show');
            }, 300);
        }
    }

    hide() {
        this.isVisible = false;
        this.element.style.display = 'none';
        this.element.setAttribute('aria-hidden', 'true');
    }

    dismiss() {
        if (this.options.animated) {
            this.element.classList.add('badge-dismissing');
            setTimeout(() => {
                this.remove();
            }, 300);
        } else {
            this.remove();
        }
        
        // Emit dismiss event
        const dismissEvent = new CustomEvent('badgeDismiss', {
            detail: {
                type: this.options.type,
                value: this.options.value,
                badge: this
            },
            bubbles: true
        });
        
        this.element.dispatchEvent(dismissEvent);
    }

    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    pulse() {
        if (this.options.animated) {
            this.element.classList.add('badge-pulse');
            setTimeout(() => {
                this.element.classList.remove('badge-pulse');
            }, 1000);
        }
    }

    flash() {
        if (this.options.animated) {
            this.element.classList.add('badge-flash');
            setTimeout(() => {
                this.element.classList.remove('badge-flash');
            }, 600);
        }
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    getElement() {
        return this.element;
    }

    getValue() {
        return this.options.value;
    }

    getType() {
        return this.options.type;
    }

    isInteractive() {
        return this.options.interactive;
    }

    destroy() {
        this.remove();
        this.element = null;
    }
}

// Badge Manager for handling multiple badges
class BadgeManager {
    constructor() {
        this.badges = new Map();
        this.containers = new Map();
    }

    createBadge(id, options) {
        const badge = new Badge(options);
        this.badges.set(id, badge);
        return badge;
    }

    getBadge(id) {
        return this.badges.get(id);
    }

    removeBadge(id) {
        const badge = this.badges.get(id);
        if (badge) {
            badge.destroy();
            this.badges.delete(id);
        }
    }

    updateBadge(id, updates) {
        const badge = this.badges.get(id);
        if (badge) {
            if (updates.value !== undefined) badge.setValue(updates.value);
            if (updates.text !== undefined) badge.setText(updates.text);
            if (updates.icon !== undefined) badge.setIcon(updates.icon);
        }
    }

    createBadgeSet(containerId, badgeConfigs) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.containers.set(containerId, []);
        
        badgeConfigs.forEach((config, index) => {
            const badgeId = `${containerId}-badge-${index}`;
            const badge = this.createBadge(badgeId, {
                ...config,
                container: container
            });
            
            this.containers.get(containerId).push(badgeId);
        });
    }

    clearContainer(containerId) {
        const badgeIds = this.containers.get(containerId);
        if (badgeIds) {
            badgeIds.forEach(id => this.removeBadge(id));
            this.containers.delete(containerId);
        }
    }

    getAllBadges() {
        return Array.from(this.badges.values());
    }

    getBadgesByType(type) {
        return Array.from(this.badges.values()).filter(badge => badge.getType() === type);
    }

    showAll() {
        this.badges.forEach(badge => badge.show());
    }

    hideAll() {
        this.badges.forEach(badge => badge.hide());
    }

    pulseAll() {
        this.badges.forEach(badge => badge.pulse());
    }

    destroy() {
        this.badges.forEach(badge => badge.destroy());
        this.badges.clear();
        this.containers.clear();
    }
}

// Create global badge manager instance
const badgeManager = new BadgeManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Badge, BadgeManager, badgeManager };
}