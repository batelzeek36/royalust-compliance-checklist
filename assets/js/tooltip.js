/**
 * Tooltip Module - Advanced tooltip system with positioning and accessibility
 * Provides contextual information with smart positioning and keyboard navigation
 */

class Tooltip {
    constructor(options = {}) {
        this.options = {
            element: null,
            content: '',
            position: 'top',
            trigger: 'hover',
            delay: 300,
            hideDelay: 100,
            offset: 8,
            arrow: true,
            animation: true,
            theme: 'dark',
            maxWidth: 250,
            interactive: false,
            html: false,
            zIndex: 9999,
            boundary: 'viewport',
            ...options
        };

        this.element = this.options.element;
        this.tooltipElement = null;
        this.arrowElement = null;
        this.isVisible = false;
        this.showTimeout = null;
        this.hideTimeout = null;
        this.boundaryElement = null;

        if (this.element) {
            this.init();
        }
    }

    init() {
        this.createTooltip();
        this.setupEventListeners();
        this.setupBoundary();
        this.setupAccessibility();
    }

    createTooltip() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = this.buildClassName();
        this.tooltipElement.setAttribute('role', 'tooltip');
        this.tooltipElement.style.cssText = this.getBaseStyles();

        // Create content container
        const contentElement = document.createElement('div');
        contentElement.className = 'tooltip-content';
        this.setContent(this.options.content);
        contentElement.appendChild(this.contentElement || document.createTextNode(this.options.content));
        this.tooltipElement.appendChild(contentElement);

        // Create arrow if enabled
        if (this.options.arrow) {
            this.arrowElement = document.createElement('div');
            this.arrowElement.className = 'tooltip-arrow';
            this.tooltipElement.appendChild(this.arrowElement);
        }

        // Add to DOM but keep hidden
        document.body.appendChild(this.tooltipElement);
        this.hide(false);
    }

    buildClassName() {
        const classes = ['tooltip'];
        classes.push(`tooltip-${this.options.theme}`);
        classes.push(`tooltip-${this.options.position}`);
        
        if (this.options.animation) classes.push('tooltip-animated');
        if (this.options.interactive) classes.push('tooltip-interactive');
        if (this.options.arrow) classes.push('tooltip-with-arrow');
        
        return classes.join(' ');
    }

    getBaseStyles() {
        return `
            position: absolute;
            z-index: ${this.options.zIndex};
            max-width: ${this.options.maxWidth}px;
            padding: 8px 12px;
            font-size: 14px;
            line-height: 1.4;
            border-radius: 6px;
            pointer-events: ${this.options.interactive ? 'auto' : 'none'};
            opacity: 0;
            visibility: hidden;
            transform: scale(0.8);
            transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
        `;
    }

    setupEventListeners() {
        if (this.options.trigger === 'hover') {
            this.element.addEventListener('mouseenter', () => this.handleMouseEnter());
            this.element.addEventListener('mouseleave', () => this.handleMouseLeave());
            
            if (this.options.interactive) {
                this.tooltipElement.addEventListener('mouseenter', () => this.handleTooltipMouseEnter());
                this.tooltipElement.addEventListener('mouseleave', () => this.handleTooltipMouseLeave());
            }
        } else if (this.options.trigger === 'click') {
            this.element.addEventListener('click', (e) => this.handleClick(e));
            document.addEventListener('click', (e) => this.handleDocumentClick(e));
        } else if (this.options.trigger === 'focus') {
            this.element.addEventListener('focus', () => this.show());
            this.element.addEventListener('blur', () => this.hide());
        }

        // Keyboard navigation
        this.element.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Window events
        window.addEventListener('resize', () => this.updatePosition());
        window.addEventListener('scroll', () => this.updatePosition(), true);
    }

    setupBoundary() {
        if (this.options.boundary === 'viewport') {
            this.boundaryElement = document.documentElement;
        } else if (typeof this.options.boundary === 'string') {
            this.boundaryElement = document.querySelector(this.options.boundary);
        } else if (this.options.boundary instanceof Element) {
            this.boundaryElement = this.options.boundary;
        }
    }

    setupAccessibility() {
        // Generate unique ID for tooltip
        const tooltipId = this.generateId();
        this.tooltipElement.id = tooltipId;
        
        // Link element to tooltip
        this.element.setAttribute('aria-describedby', tooltipId);
        
        // Make element focusable if not already
        if (!this.element.hasAttribute('tabindex') && !this.isFocusable(this.element)) {
            this.element.setAttribute('tabindex', '0');
        }
    }

    // Event handlers
    handleMouseEnter() {
        this.clearHideTimeout();
        this.showTimeout = setTimeout(() => {
            this.show();
        }, this.options.delay);
    }

    handleMouseLeave() {
        this.clearShowTimeout();
        if (!this.options.interactive) {
            this.hideTimeout = setTimeout(() => {
                this.hide();
            }, this.options.hideDelay);
        } else {
            // Delay hiding to allow mouse to move to tooltip
            this.hideTimeout = setTimeout(() => {
                if (!this.isMouseOverTooltip) {
                    this.hide();
                }
            }, this.options.hideDelay);
        }
    }

    handleTooltipMouseEnter() {
        this.isMouseOverTooltip = true;
        this.clearHideTimeout();
    }

    handleTooltipMouseLeave() {
        this.isMouseOverTooltip = false;
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, this.options.hideDelay);
    }

    handleClick(event) {
        event.preventDefault();
        this.toggle();
    }

    handleDocumentClick(event) {
        if (this.options.trigger === 'click' && 
            !this.element.contains(event.target) && 
            !this.tooltipElement.contains(event.target)) {
            this.hide();
        }
    }

    handleKeydown(event) {
        if (event.key === 'Escape' && this.isVisible) {
            this.hide();
            this.element.focus();
        } else if ((event.key === 'Enter' || event.key === ' ') && this.options.trigger === 'click') {
            event.preventDefault();
            this.toggle();
        }
    }

    // Core methods
    show() {
        if (this.isVisible) return;

        this.clearTimeouts();
        this.isVisible = true;
        
        // Update content before showing
        this.updateContent();
        
        // Position tooltip
        this.updatePosition();
        
        // Apply theme
        this.applyTheme();
        
        // Show with animation
        this.tooltipElement.style.visibility = 'visible';
        this.tooltipElement.style.opacity = '1';
        this.tooltipElement.style.transform = 'scale(1)';
        
        // Emit show event
        this.emitEvent('show');
        
        // Announce to screen readers
        this.announceToScreenReader();
    }

    hide(animate = true) {
        if (!this.isVisible && animate) return;

        this.clearTimeouts();
        this.isVisible = false;
        
        if (animate && this.options.animation) {
            this.tooltipElement.style.opacity = '0';
            this.tooltipElement.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                this.tooltipElement.style.visibility = 'hidden';
            }, 200);
        } else {
            this.tooltipElement.style.visibility = 'hidden';
            this.tooltipElement.style.opacity = '0';
            this.tooltipElement.style.transform = 'scale(0.8)';
        }
        
        // Emit hide event
        this.emitEvent('hide');
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    updatePosition() {
        if (!this.isVisible) return;

        const elementRect = this.element.getBoundingClientRect();
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        const boundaryRect = this.boundaryElement ? this.boundaryElement.getBoundingClientRect() : {
            top: 0,
            left: 0,
            right: window.innerWidth,
            bottom: window.innerHeight,
            width: window.innerWidth,
            height: window.innerHeight
        };

        let position = this.calculateOptimalPosition(elementRect, tooltipRect, boundaryRect);
        
        // Apply position
        this.tooltipElement.style.left = `${position.left}px`;
        this.tooltipElement.style.top = `${position.top}px`;
        
        // Update arrow position
        if (this.arrowElement) {
            this.updateArrowPosition(position, elementRect, tooltipRect);
        }
        
        // Update position class
        this.updatePositionClass(position.placement);
    }

    calculateOptimalPosition(elementRect, tooltipRect, boundaryRect) {
        const positions = {
            top: {
                left: elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2),
                top: elementRect.top - tooltipRect.height - this.options.offset,
                placement: 'top'
            },
            bottom: {
                left: elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2),
                top: elementRect.bottom + this.options.offset,
                placement: 'bottom'
            },
            left: {
                left: elementRect.left - tooltipRect.width - this.options.offset,
                top: elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2),
                placement: 'left'
            },
            right: {
                left: elementRect.right + this.options.offset,
                top: elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2),
                placement: 'right'
            }
        };

        // Try preferred position first
        let position = positions[this.options.position];
        
        // Check if position fits in boundary
        if (!this.fitsInBoundary(position, tooltipRect, boundaryRect)) {
            // Try other positions
            const fallbackOrder = this.getFallbackOrder(this.options.position);
            
            for (const pos of fallbackOrder) {
                const testPosition = positions[pos];
                if (this.fitsInBoundary(testPosition, tooltipRect, boundaryRect)) {
                    position = testPosition;
                    break;
                }
            }
        }

        // Adjust position to stay within boundary
        position = this.adjustPositionToBoundary(position, tooltipRect, boundaryRect);
        
        return position;
    }

    fitsInBoundary(position, tooltipRect, boundaryRect) {
        return (
            position.left >= boundaryRect.left &&
            position.top >= boundaryRect.top &&
            position.left + tooltipRect.width <= boundaryRect.right &&
            position.top + tooltipRect.height <= boundaryRect.bottom
        );
    }

    getFallbackOrder(preferredPosition) {
        const orders = {
            top: ['bottom', 'right', 'left'],
            bottom: ['top', 'right', 'left'],
            left: ['right', 'top', 'bottom'],
            right: ['left', 'top', 'bottom']
        };
        
        return orders[preferredPosition] || ['top', 'bottom', 'right', 'left'];
    }

    adjustPositionToBoundary(position, tooltipRect, boundaryRect) {
        const adjusted = { ...position };
        
        // Adjust horizontal position
        if (adjusted.left < boundaryRect.left) {
            adjusted.left = boundaryRect.left + 5;
        } else if (adjusted.left + tooltipRect.width > boundaryRect.right) {
            adjusted.left = boundaryRect.right - tooltipRect.width - 5;
        }
        
        // Adjust vertical position
        if (adjusted.top < boundaryRect.top) {
            adjusted.top = boundaryRect.top + 5;
        } else if (adjusted.top + tooltipRect.height > boundaryRect.bottom) {
            adjusted.top = boundaryRect.bottom - tooltipRect.height - 5;
        }
        
        return adjusted;
    }

    updateArrowPosition(position, elementRect, tooltipRect) {
        const arrowSize = 6;
        let arrowLeft, arrowTop;
        
        switch (position.placement) {
            case 'top':
            case 'bottom':
                arrowLeft = elementRect.left + (elementRect.width / 2) - position.left - arrowSize;
                arrowLeft = Math.max(arrowSize, Math.min(arrowLeft, tooltipRect.width - arrowSize * 2));
                this.arrowElement.style.left = `${arrowLeft}px`;
                this.arrowElement.style.top = '';
                break;
                
            case 'left':
            case 'right':
                arrowTop = elementRect.top + (elementRect.height / 2) - position.top - arrowSize;
                arrowTop = Math.max(arrowSize, Math.min(arrowTop, tooltipRect.height - arrowSize * 2));
                this.arrowElement.style.top = `${arrowTop}px`;
                this.arrowElement.style.left = '';
                break;
        }
    }

    updatePositionClass(placement) {
        // Remove existing position classes
        this.tooltipElement.classList.remove('tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right');
        
        // Add current position class
        this.tooltipElement.classList.add(`tooltip-${placement}`);
    }

    // Content management
    setContent(content) {
        if (this.options.html && typeof content === 'string') {
            this.contentElement = document.createElement('div');
            this.contentElement.innerHTML = content;
        } else if (content instanceof Element) {
            this.contentElement = content.cloneNode(true);
        } else {
            this.contentElement = document.createTextNode(String(content));
        }
        
        this.options.content = content;
    }

    updateContent() {
        const contentContainer = this.tooltipElement.querySelector('.tooltip-content');
        if (contentContainer && this.contentElement) {
            contentContainer.innerHTML = '';
            contentContainer.appendChild(this.contentElement.cloneNode(true));
        }
    }

    // Theme management
    applyTheme() {
        const themes = {
            dark: {
                background: 'rgba(26, 26, 46, 0.95)',
                color: 'var(--champagne)',
                border: '1px solid rgba(212, 175, 55, 0.2)'
            },
            light: {
                background: 'rgba(255, 255, 255, 0.95)',
                color: 'var(--midnight-blue)',
                border: '1px solid rgba(0, 0, 0, 0.1)'
            },
            gold: {
                background: 'linear-gradient(135deg, var(--royalust-gold), var(--bronze-light))',
                color: 'var(--midnight-blue)',
                border: '1px solid var(--bronze-dark)'
            },
            violet: {
                background: 'linear-gradient(135deg, var(--mystic-violet), var(--ethereal-purple))',
                color: 'var(--champagne)',
                border: '1px solid var(--deep-violet)'
            }
        };

        const theme = themes[this.options.theme] || themes.dark;
        
        Object.entries(theme).forEach(([property, value]) => {
            this.tooltipElement.style[property] = value;
        });
    }

    // Utility methods
    clearTimeouts() {
        this.clearShowTimeout();
        this.clearHideTimeout();
    }

    clearShowTimeout() {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
    }

    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    generateId() {
        return `tooltip-${Math.random().toString(36).substr(2, 9)}`;
    }

    isFocusable(element) {
        const focusableElements = [
            'a[href]', 'button', 'input', 'select', 'textarea',
            '[tabindex]:not([tabindex="-1"])', '[contenteditable]'
        ];
        
        return focusableElements.some(selector => element.matches(selector));
    }

    emitEvent(eventName) {
        const event = new CustomEvent(`tooltip${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`, {
            detail: { tooltip: this },
            bubbles: true
        });
        
        this.element.dispatchEvent(event);
    }

    announceToScreenReader() {
        // Create temporary announcement for screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        announcement.textContent = this.options.content;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // Public API
    getElement() {
        return this.tooltipElement;
    }

    isShown() {
        return this.isVisible;
    }

    setPosition(position) {
        this.options.position = position;
        if (this.isVisible) {
            this.updatePosition();
        }
    }

    setTheme(theme) {
        this.options.theme = theme;
        this.tooltipElement.className = this.buildClassName();
        if (this.isVisible) {
            this.applyTheme();
        }
    }

    enable() {
        this.element.removeAttribute('data-tooltip-disabled');
    }

    disable() {
        this.hide();
        this.element.setAttribute('data-tooltip-disabled', 'true');
    }

    destroy() {
        this.hide(false);
        this.clearTimeouts();
        
        // Remove event listeners
        // Note: In a real implementation, you'd want to store references to bound functions
        
        // Remove tooltip element
        if (this.tooltipElement && this.tooltipElement.parentNode) {
            this.tooltipElement.parentNode.removeChild(this.tooltipElement);
        }
        
        // Clean up element attributes
        this.element.removeAttribute('aria-describedby');
        
        this.tooltipElement = null;
        this.element = null;
    }
}

// Tooltip Manager for handling multiple tooltips
class TooltipManager {
    constructor() {
        this.tooltips = new Map();
        this.init();
    }

    init() {
        this.setupGlobalEventListeners();
        this.initializeAutoTooltips();
    }

    setupGlobalEventListeners() {
        // Handle escape key to hide all tooltips
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAll();
            }
        });
    }

    initializeAutoTooltips() {
        // Auto-initialize tooltips with data-tooltip attribute
        document.addEventListener('DOMContentLoaded', () => {
            this.scanForAutoTooltips();
        });
        
        // Watch for dynamically added tooltips
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.scanElementForTooltips(node);
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    scanForAutoTooltips() {
        const elements = document.querySelectorAll('[data-tooltip]');
        elements.forEach(element => this.createAutoTooltip(element));
    }

    scanElementForTooltips(element) {
        if (element.hasAttribute('data-tooltip')) {
            this.createAutoTooltip(element);
        }
        
        const childElements = element.querySelectorAll('[data-tooltip]');
        childElements.forEach(child => this.createAutoTooltip(child));
    }

    createAutoTooltip(element) {
        const content = element.getAttribute('data-tooltip');
        const position = element.getAttribute('data-tooltip-position') || 'top';
        const theme = element.getAttribute('data-tooltip-theme') || 'dark';
        const trigger = element.getAttribute('data-tooltip-trigger') || 'hover';
        
        const tooltip = new Tooltip({
            element: element,
            content: content,
            position: position,
            theme: theme,
            trigger: trigger
        });
        
        this.register(element, tooltip);
    }

    register(element, tooltip) {
        this.tooltips.set(element, tooltip);
    }

    get(element) {
        return this.tooltips.get(element);
    }

    remove(element) {
        const tooltip = this.tooltips.get(element);
        if (tooltip) {
            tooltip.destroy();
            this.tooltips.delete(element);
        }
    }

    hideAll() {
        this.tooltips.forEach(tooltip => tooltip.hide());
    }

    destroyAll() {
        this.tooltips.forEach(tooltip => tooltip.destroy());
        this.tooltips.clear();
    }
}

// Create global tooltip manager
const tooltipManager = new TooltipManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Tooltip, TooltipManager, tooltipManager };
}