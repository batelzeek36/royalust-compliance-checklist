/**
 * Progress Ring Module - Interactive Progress Visualization
 * Royalust Compliance Dashboard
 * 
 * Creates animated SVG progress rings with holographic effects
 * matching the reference design aesthetic
 */

class ProgressRing {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    
    if (!this.container) {
      throw new Error('ProgressRing: Container element not found');
    }
    
    // Configuration with defaults
    this.config = {
      size: options.size || 100,
      strokeWidth: options.strokeWidth || 8,
      progress: options.progress || 0,
      animated: options.animated !== false,
      holographic: options.holographic !== false,
      glowEffect: options.glowEffect !== false,
      duration: options.duration || 1000,
      easing: options.easing || 'cubic-bezier(0.4, 0, 0.2, 1)',
      ...options
    };
    
    // Calculate dimensions
    this.radius = (this.config.size - this.config.strokeWidth) / 2;
    this.circumference = 2 * Math.PI * this.radius;
    
    // State
    this.currentProgress = 0;
    this.animationId = null;
    this.isAnimating = false;
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the progress ring
   */
  init() {
    this.createSVG();
    this.createGradients();
    this.createElements();
    this.setupEventListeners();
    
    // Set initial progress
    if (this.config.progress > 0) {
      this.setProgress(this.config.progress, false);
    }
  }
  
  /**
   * Create the main SVG element
   */
  createSVG() {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'progress-ring-svg');
    this.svg.setAttribute('width', this.config.size);
    this.svg.setAttribute('height', this.config.size);
    this.svg.setAttribute('viewBox', `0 0 ${this.config.size} ${this.config.size}`);
    
    // Add CSS classes for styling
    this.svg.classList.add('progress-ring');
    if (this.config.holographic) {
      this.svg.classList.add('holographic');
    }
    if (this.config.glowEffect) {
      this.svg.classList.add('glow-effect');
    }
    
    this.container.appendChild(this.svg);
  }
  
  /**
   * Create gradient definitions for holographic effect
   */
  createGradients() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Holographic gradient for progress fill
    const holographicGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    holographicGradient.setAttribute('id', `holographic-gradient-${this.generateId()}`);
    holographicGradient.setAttribute('x1', '0%');
    holographicGradient.setAttribute('y1', '0%');
    holographicGradient.setAttribute('x2', '100%');
    holographicGradient.setAttribute('y2', '0%');
    
    // Animated color stops
    const stops = [
      { offset: '0%', color: 'var(--royalust-gold)', animation: 'var(--royalust-gold);var(--bronze-light);var(--champagne);var(--royalust-gold)' },
      { offset: '50%', color: 'var(--bronze-light)', animation: 'var(--bronze-light);var(--champagne);var(--royalust-gold);var(--bronze-light)' },
      { offset: '100%', color: 'var(--champagne)', animation: 'var(--champagne);var(--royalust-gold);var(--bronze-light);var(--champagne)' }
    ];
    
    stops.forEach(stop => {
      const stopElement = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopElement.setAttribute('offset', stop.offset);
      stopElement.setAttribute('stop-color', stop.color);
      stopElement.setAttribute('stop-opacity', '1');
      
      if (this.config.animated && this.config.holographic) {
        const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animate.setAttribute('attributeName', 'stop-color');
        animate.setAttribute('values', stop.animation);
        animate.setAttribute('dur', '3s');
        animate.setAttribute('repeatCount', 'indefinite');
        stopElement.appendChild(animate);
      }
      
      holographicGradient.appendChild(stopElement);
    });
    
    // Track gradient (subtle background)
    const trackGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    trackGradient.setAttribute('id', `track-gradient-${this.generateId()}`);
    trackGradient.setAttribute('x1', '0%');
    trackGradient.setAttribute('y1', '0%');
    trackGradient.setAttribute('x2', '100%');
    trackGradient.setAttribute('y2', '0%');
    
    const trackStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    trackStop1.setAttribute('offset', '0%');
    trackStop1.setAttribute('stop-color', 'var(--glass-gold)');
    trackStop1.setAttribute('stop-opacity', '0.2');
    
    const trackStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    trackStop2.setAttribute('offset', '100%');
    trackStop2.setAttribute('stop-color', 'var(--glass-violet)');
    trackStop2.setAttribute('stop-opacity', '0.1');
    
    trackGradient.appendChild(trackStop1);
    trackGradient.appendChild(trackStop2);
    
    // Glow filter
    if (this.config.glowEffect) {
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', `glow-filter-${this.generateId()}`);
      filter.setAttribute('x', '-50%');
      filter.setAttribute('y', '-50%');
      filter.setAttribute('width', '200%');
      filter.setAttribute('height', '200%');
      
      const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
      feGaussianBlur.setAttribute('stdDeviation', '3');
      feGaussianBlur.setAttribute('result', 'coloredBlur');
      
      const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
      const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
      feMergeNode1.setAttribute('in', 'coloredBlur');
      const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
      feMergeNode2.setAttribute('in', 'SourceGraphic');
      
      feMerge.appendChild(feMergeNode1);
      feMerge.appendChild(feMergeNode2);
      filter.appendChild(feGaussianBlur);
      filter.appendChild(feMerge);
      
      defs.appendChild(filter);
      this.glowFilterId = filter.getAttribute('id');
    }
    
    defs.appendChild(holographicGradient);
    defs.appendChild(trackGradient);
    this.svg.appendChild(defs);
    
    this.holographicGradientId = holographicGradient.getAttribute('id');
    this.trackGradientId = trackGradient.getAttribute('id');
  }
  
  /**
   * Create circle elements
   */
  createElements() {
    const centerX = this.config.size / 2;
    const centerY = this.config.size / 2;
    
    // Background track
    this.trackCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.trackCircle.setAttribute('class', 'progress-track');
    this.trackCircle.setAttribute('cx', centerX);
    this.trackCircle.setAttribute('cy', centerY);
    this.trackCircle.setAttribute('r', this.radius);
    this.trackCircle.setAttribute('fill', 'none');
    this.trackCircle.setAttribute('stroke', `url(#${this.trackGradientId})`);
    this.trackCircle.setAttribute('stroke-width', this.config.strokeWidth);
    
    // Progress fill
    this.progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.progressCircle.setAttribute('class', 'progress-fill');
    this.progressCircle.setAttribute('cx', centerX);
    this.progressCircle.setAttribute('cy', centerY);
    this.progressCircle.setAttribute('r', this.radius);
    this.progressCircle.setAttribute('fill', 'none');
    this.progressCircle.setAttribute('stroke', `url(#${this.holographicGradientId})`);
    this.progressCircle.setAttribute('stroke-width', this.config.strokeWidth);
    this.progressCircle.setAttribute('stroke-linecap', 'round');
    this.progressCircle.setAttribute('stroke-dasharray', this.circumference);
    this.progressCircle.setAttribute('stroke-dashoffset', this.circumference);
    this.progressCircle.setAttribute('transform', `rotate(-90 ${centerX} ${centerY})`);
    
    if (this.config.glowEffect && this.glowFilterId) {
      this.progressCircle.setAttribute('filter', `url(#${this.glowFilterId})`);
    }
    
    this.svg.appendChild(this.trackCircle);
    this.svg.appendChild(this.progressCircle);
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Pulse animation on hover
    if (this.config.animated) {
      this.svg.addEventListener('mouseenter', () => {
        this.svg.classList.add('pulse');
      });
      
      this.svg.addEventListener('mouseleave', () => {
        this.svg.classList.remove('pulse');
      });
    }
    
    // Handle reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.handleReducedMotion(mediaQuery);
    mediaQuery.addListener(this.handleReducedMotion.bind(this));
  }
  
  /**
   * Handle reduced motion preference
   */
  handleReducedMotion(mediaQuery) {
    if (mediaQuery.matches) {
      this.config.animated = false;
      this.svg.classList.add('reduced-motion');
    } else {
      this.config.animated = true;
      this.svg.classList.remove('reduced-motion');
    }
  }
  
  /**
   * Set progress value with optional animation
   */
  setProgress(progress, animate = true) {
    // Clamp progress between 0 and 100
    progress = Math.max(0, Math.min(100, progress));
    
    if (animate && this.config.animated) {
      this.animateProgress(progress);
    } else {
      this.updateProgress(progress);
    }
  }
  
  /**
   * Animate progress change
   */
  animateProgress(targetProgress) {
    if (this.isAnimating) {
      cancelAnimationFrame(this.animationId);
    }
    
    this.isAnimating = true;
    const startProgress = this.currentProgress;
    const progressDiff = targetProgress - startProgress;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.config.duration, 1);
      
      // Apply easing
      const easedProgress = this.easeInOutCubic(progress);
      const currentValue = startProgress + (progressDiff * easedProgress);
      
      this.updateProgress(currentValue);
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.updateProgress(targetProgress);
      }
    };
    
    this.animationId = requestAnimationFrame(animate);
  }
  
  /**
   * Update progress without animation
   */
  updateProgress(progress) {
    this.currentProgress = progress;
    const offset = this.circumference - (progress / 100) * this.circumference;
    this.progressCircle.setAttribute('stroke-dashoffset', offset);
    
    // Dispatch progress update event
    this.container.dispatchEvent(new CustomEvent('progressUpdate', {
      detail: { progress: progress }
    }));
  }
  
  /**
   * Get current progress
   */
  getProgress() {
    return this.currentProgress;
  }
  
  /**
   * Destroy the progress ring
   */
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
  }
  
  /**
   * Easing function for smooth animations
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }
  
  /**
   * Generate unique ID for gradients
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressRing;
}

// Global registration for direct script inclusion
if (typeof window !== 'undefined') {
  window.ProgressRing = ProgressRing;
}