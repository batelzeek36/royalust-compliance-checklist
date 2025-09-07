/**
 * Progress Bar Module - Advanced progress visualization component
 * Supports multiple styles, animations, and accessibility features
 */

class ProgressBar {
    constructor(options = {}) {
        this.options = {
            container: null,
            value: 0,
            min: 0,
            max: 100,
            animated: true,
            showPercentage: true,
            showLabel: false,
            label: '',
            theme: 'default',
            size: 'medium',
            orientation: 'horizontal',
            animationDuration: 800,
            animationEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            gradient: true,
            glow: false,
            striped: false,
            ...options
        };

        this.element = null;
        this.fillElement = null;
        this.labelElement = null;
        this.glowElement = null;
        this.currentValue = this.options.value;
        this.animationId = null;

        this.init();
    }

    init() {
        this.createElement();
        this.setupAccessibility();
        this.setValue(this.options.value, false);
        this.applyTheme();
    }

    createElement() {
        // Create main container
        this.element = document.createElement('div');
        this.element.className = this.buildClassName();
        
        // Create track
        const track = document.createElement('div');
        track.className = 'progress-track';
        
        // Create fill
        this.fillElement = document.createElement('div');
        this.fillElement.className = 'progress-fill';
        
        // Create glow effect if enabled
        if (this.options.glow) {
            this.glowElement = document.createElement('div');
            this.glowElement.className = 'progress-glow';
            this.fillElement.appendChild(this.glowElement);
        }

        // Create stripes if enabled
        if (this.options.striped) {
            const stripes = document.createElement('div');
            stripes.className = 'progress-stripes';
            this.fillElement.appendChild(stripes);
        }

        track.appendChild(this.fillElement);
        this.element.appendChild(track);

        // Create label if needed
        if (this.options.showPercentage || this.options.showLabel) {
            this.labelElement = document.createElement('div');
            this.labelElement.className = 'progress-label';
            this.updateLabel();
            this.element.appendChild(this.labelElement);
        }

        // Append to container
        if (this.options.container) {
            this.options.container.appendChild(this.element);
        }
    }

    buildClassName() {
        const classes = ['progress-bar'];
        
        classes.push(`progress-${this.options.orientation}`);
        classes.push(`progress-${this.options.size}`);
        classes.push(`progress-theme-${this.options.theme}`);
        
        if (this.options.animated) classes.push('progress-animated');
        if (this.options.gradient) classes.push('progress-gradient');
        if (this.options.glow) classes.push('progress-glow-enabled');
        if (this.options.striped) classes.push('progress-striped');
        
        return classes.join(' ');
    }

    setupAccessibility() {
        this.element.setAttribute('role', 'progressbar');
        this.element.setAttribute('aria-valuemin', this.options.min);
        this.element.setAttribute('aria-valuemax', this.options.max);
        this.element.setAttribute('aria-valuenow', this.currentValue);
        
        if (this.options.label) {
            this.element.setAttribute('aria-label', this.options.label);
        }
    }

    setValue(value, animate = true) {
        // Clamp value to valid range
        const clampedValue = Math.max(this.options.min, Math.min(this.options.max, value));
        const percentage = this.valueToPercentage(clampedValue);
        
        if (animate && this.options.animated) {
            this.animateToValue(clampedValue, percentage);
        } else {
            this.setValueImmediate(clampedValue, percentage);
        }
    }

    setValueImmediate(value, percentage) {
        this.currentValue = value;
        
        // Update visual representation
        if (this.options.orientation === 'horizontal') {
            this.fillElement.style.width = `${percentage}%`;
            this.fillElement.style.height = '100%';
        } else {
            this.fillElement.style.height = `${percentage}%`;
            this.fillElement.style.width = '100%';
        }

        // Update accessibility attributes
        this.element.setAttribute('aria-valuenow', value);
        
        // Update label
        this.updateLabel();
        
        // Update theme based on value
        this.updateThemeByValue(percentage);
        
        // Emit change event
        this.emitChangeEvent(value, percentage);
    }

    animateToValue(targetValue, targetPercentage) {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        const startValue = this.currentValue;
        const startPercentage = this.valueToPercentage(startValue);
        const valueChange = targetValue - startValue;
        const percentageChange = targetPercentage - startPercentage;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / this.options.animationDuration, 1);
            
            // Apply easing function
            const easedProgress = this.easeInOutCubic(progress);
            
            const currentValue = startValue + (valueChange * easedProgress);
            const currentPercentage = startPercentage + (percentageChange * easedProgress);
            
            this.setValueImmediate(currentValue, currentPercentage);
            
            if (progress < 1) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.animationId = null;
                this.onAnimationComplete();
            }
        };

        this.animationId = requestAnimationFrame(animate);
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    valueToPercentage(value) {
        const range = this.options.max - this.options.min;
        return ((value - this.options.min) / range) * 100;
    }

    updateLabel() {
        if (!this.labelElement) return;

        let labelText = '';
        
        if (this.options.showPercentage) {
            const percentage = Math.round(this.valueToPercentage(this.currentValue));
            labelText += `${percentage}%`;
        }
        
        if (this.options.showLabel && this.options.label) {
            if (labelText) labelText += ' - ';
            labelText += this.options.label;
        }
        
        this.labelElement.textContent = labelText;
    }

    updateThemeByValue(percentage) {
        // Auto-update theme based on progress value
        if (this.options.theme === 'auto') {
            let newTheme;
            if (percentage >= 80) newTheme = 'success';
            else if (percentage >= 60) newTheme = 'warning';
            else if (percentage >= 40) newTheme = 'info';
            else newTheme = 'danger';
            
            this.setTheme(newTheme);
        }
    }

    setTheme(theme) {
        if (this.options.theme === theme) return;
        
        // Remove old theme class
        this.element.classList.remove(`progress-theme-${this.options.theme}`);
        
        // Add new theme class
        this.options.theme = theme;
        this.element.classList.add(`progress-theme-${theme}`);
        
        this.applyTheme();
    }

    applyTheme() {
        // Apply theme-specific styles
        const themes = {
            default: {
                fillColor: 'var(--royalust-gold)',
                trackColor: 'var(--glass-white)',
                glowColor: 'var(--royalust-gold)'
            },
            success: {
                fillColor: 'var(--success-green)',
                trackColor: 'var(--glass-white)',
                glowColor: 'var(--success-green)'
            },
            warning: {
                fillColor: 'var(--warning-amber)',
                trackColor: 'var(--glass-white)',
                glowColor: 'var(--warning-amber)'
            },
            danger: {
                fillColor: 'var(--error-red)',
                trackColor: 'var(--glass-white)',
                glowColor: 'var(--error-red)'
            },
            info: {
                fillColor: 'var(--info-blue)',
                trackColor: 'var(--glass-white)',
                glowColor: 'var(--info-blue)'
            },
            violet: {
                fillColor: 'var(--mystic-violet)',
                trackColor: 'var(--glass-violet)',
                glowColor: 'var(--ethereal-purple)'
            }
        };

        const theme = themes[this.options.theme] || themes.default;
        
        if (this.fillElement) {
            this.fillElement.style.setProperty('--fill-color', theme.fillColor);
        }
        
        if (this.glowElement) {
            this.glowElement.style.setProperty('--glow-color', theme.glowColor);
        }
        
        const track = this.element.querySelector('.progress-track');
        if (track) {
            track.style.setProperty('--track-color', theme.trackColor);
        }
    }

    // Animation effects
    pulse() {
        this.element.classList.add('progress-pulse');
        setTimeout(() => {
            this.element.classList.remove('progress-pulse');
        }, 1000);
    }

    flash() {
        this.element.classList.add('progress-flash');
        setTimeout(() => {
            this.element.classList.remove('progress-flash');
        }, 600);
    }

    shake() {
        this.element.classList.add('progress-shake');
        setTimeout(() => {
            this.element.classList.remove('progress-shake');
        }, 500);
    }

    // Event handling
    emitChangeEvent(value, percentage) {
        const event = new CustomEvent('progressChange', {
            detail: {
                value: value,
                percentage: percentage,
                min: this.options.min,
                max: this.options.max
            }
        });
        
        this.element.dispatchEvent(event);
    }

    onAnimationComplete() {
        const event = new CustomEvent('progressAnimationComplete', {
            detail: {
                value: this.currentValue,
                percentage: this.valueToPercentage(this.currentValue)
            }
        });
        
        this.element.dispatchEvent(event);
    }

    // Public API methods
    getValue() {
        return this.currentValue;
    }

    getPercentage() {
        return this.valueToPercentage(this.currentValue);
    }

    increment(amount = 1) {
        this.setValue(this.currentValue + amount);
    }

    decrement(amount = 1) {
        this.setValue(this.currentValue - amount);
    }

    reset() {
        this.setValue(this.options.min);
    }

    complete() {
        this.setValue(this.options.max);
    }

    setLabel(label) {
        this.options.label = label;
        this.updateLabel();
    }

    setSize(size) {
        this.element.classList.remove(`progress-${this.options.size}`);
        this.options.size = size;
        this.element.classList.add(`progress-${size}`);
    }

    setOrientation(orientation) {
        this.element.classList.remove(`progress-${this.options.orientation}`);
        this.options.orientation = orientation;
        this.element.classList.add(`progress-${orientation}`);
        
        // Reapply current value with new orientation
        const percentage = this.valueToPercentage(this.currentValue);
        this.setValueImmediate(this.currentValue, percentage);
    }

    enable() {
        this.element.classList.remove('progress-disabled');
        this.element.removeAttribute('aria-disabled');
    }

    disable() {
        this.element.classList.add('progress-disabled');
        this.element.setAttribute('aria-disabled', 'true');
    }

    show() {
        this.element.style.display = '';
        this.element.setAttribute('aria-hidden', 'false');
    }

    hide() {
        this.element.style.display = 'none';
        this.element.setAttribute('aria-hidden', 'true');
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        this.element = null;
        this.fillElement = null;
        this.labelElement = null;
        this.glowElement = null;
    }
}

// Circular Progress Bar variant
class CircularProgressBar extends ProgressBar {
    constructor(options = {}) {
        super({
            ...options,
            orientation: 'circular'
        });
    }

    createElement() {
        // Create SVG-based circular progress
        this.element = document.createElement('div');
        this.element.className = this.buildClassName();
        
        const size = this.getSizeValue();
        const strokeWidth = Math.max(2, size * 0.1);
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        
        this.element.innerHTML = `
            <svg width="${size}" height="${size}" class="circular-progress-svg">
                <circle
                    class="progress-track-circle"
                    cx="${size / 2}"
                    cy="${size / 2}"
                    r="${radius}"
                    stroke-width="${strokeWidth}"
                    fill="none"
                />
                <circle
                    class="progress-fill-circle"
                    cx="${size / 2}"
                    cy="${size / 2}"
                    r="${radius}"
                    stroke-width="${strokeWidth}"
                    fill="none"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${circumference}"
                    transform="rotate(-90 ${size / 2} ${size / 2})"
                />
            </svg>
        `;
        
        this.fillElement = this.element.querySelector('.progress-fill-circle');
        this.circumference = circumference;
        
        // Create label
        if (this.options.showPercentage || this.options.showLabel) {
            this.labelElement = document.createElement('div');
            this.labelElement.className = 'circular-progress-label';
            this.element.appendChild(this.labelElement);
        }
        
        if (this.options.container) {
            this.options.container.appendChild(this.element);
        }
    }

    getSizeValue() {
        const sizes = {
            small: 40,
            medium: 60,
            large: 80,
            xlarge: 120
        };
        return sizes[this.options.size] || sizes.medium;
    }

    setValueImmediate(value, percentage) {
        this.currentValue = value;
        
        // Update circular progress
        const offset = this.circumference - (percentage / 100) * this.circumference;
        this.fillElement.style.strokeDashoffset = offset;
        
        // Update accessibility attributes
        this.element.setAttribute('aria-valuenow', value);
        
        // Update label
        this.updateLabel();
        
        // Update theme
        this.updateThemeByValue(percentage);
        
        // Emit change event
        this.emitChangeEvent(value, percentage);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProgressBar, CircularProgressBar };
}