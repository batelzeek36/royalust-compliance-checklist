/**
 * Responsive Configuration Module
 * Royalust Compliance Dashboard
 * 
 * Centralized configuration for responsive breakpoints and settings
 * Allows easy adjustment of responsive behavior across the application
 */

class ResponsiveConfig {
  constructor() {
    // Breakpoint configuration - easily adjustable
    this.breakpoints = {
      xs: 475,    // Extra small devices (phones)
      sm: 640,    // Small devices (large phones)
      md: 768,    // Medium devices (tablets)
      lg: 1024,   // Large devices (desktops)
      xl: 1280,   // Extra large devices (large desktops)
      '2xl': 1536 // 2X large devices (very large desktops)
    };
    
    // Touch interaction settings
    this.touch = {
      minSwipeDistance: 50,
      maxSwipeTime: 300,
      longPressDelay: 500,
      scrollThreshold: 10,
      tapFeedbackDuration: 150
    };
    
    // Animation settings for different screen sizes
    this.animations = {
      mobile: {
        duration: 200,
        easing: 'ease-out',
        reducedMotion: true
      },
      tablet: {
        duration: 250,
        easing: 'ease-in-out',
        reducedMotion: false
      },
      desktop: {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        reducedMotion: false
      }
    };
    
    // Layout settings
    this.layout = {
      containerMaxWidths: {
        xs: this.breakpoints.xs - 32,
        sm: this.breakpoints.sm - 32,
        md: this.breakpoints.md - 32,
        lg: this.breakpoints.lg - 32,
        xl: this.breakpoints.xl - 32,
        '2xl': this.breakpoints['2xl'] - 32
      },
      gridGaps: {
        mobile: 16,
        tablet: 24,
        desktop: 32
      },
      cardPadding: {
        mobile: 16,
        tablet: 24,
        desktop: 32
      }
    };
    
    // Typography scaling
    this.typography = {
      scaleRatios: {
        mobile: 1.125,
        tablet: 1.2,
        desktop: 1.25
      },
      baseFontSizes: {
        mobile: 14,
        tablet: 16,
        desktop: 16
      }
    };
    
    this.init();
  }

  /**
   * Initialize responsive configuration
   */
  init() {
    this.updateCSSCustomProperties();
    this.setupBreakpointListeners();
    this.detectCurrentBreakpoint();
  }

  /**
   * Update CSS custom properties with current configuration
   */
  updateCSSCustomProperties() {
    const root = document.documentElement;
    
    // Update breakpoint values
    Object.entries(this.breakpoints).forEach(([key, value]) => {
      root.style.setProperty(`--bp-${key}`, `${value}px`);
    });
    
    // Update container max widths
    Object.entries(this.layout.containerMaxWidths).forEach(([key, value]) => {
      root.style.setProperty(`--container-${key}`, `${value}px`);
    });
    
    // Update animation durations based on current breakpoint
    const currentBreakpoint = this.getCurrentBreakpoint();
    const animationSettings = this.getAnimationSettings(currentBreakpoint);
    
    root.style.setProperty('--animation-duration', `${animationSettings.duration}ms`);
    root.style.setProperty('--animation-easing', animationSettings.easing);
  }

  /**
   * Get current breakpoint based on window width
   */
  getCurrentBreakpoint() {
    const width = window.innerWidth;
    
    if (width < this.breakpoints.xs) return 'xs';
    if (width < this.breakpoints.sm) return 'sm';
    if (width < this.breakpoints.md) return 'md';
    if (width < this.breakpoints.lg) return 'lg';
    if (width < this.breakpoints.xl) return 'xl';
    return '2xl';
  }

  /**
   * Get device category based on current breakpoint
   */
  getDeviceCategory() {
    const breakpoint = this.getCurrentBreakpoint();
    
    if (['xs', 'sm'].includes(breakpoint)) return 'mobile';
    if (breakpoint === 'md') return 'tablet';
    return 'desktop';
  }

  /**
   * Get animation settings for current device category
   */
  getAnimationSettings(breakpoint = null) {
    const deviceCategory = breakpoint ? 
      (['xs', 'sm'].includes(breakpoint) ? 'mobile' : 
       breakpoint === 'md' ? 'tablet' : 'desktop') :
      this.getDeviceCategory();
    
    return this.animations[deviceCategory];
  }

  /**
   * Check if current device is mobile
   */
  isMobile() {
    return this.getDeviceCategory() === 'mobile';
  }

  /**
   * Check if current device is tablet
   */
  isTablet() {
    return this.getDeviceCategory() === 'tablet';
  }

  /**
   * Check if current device is desktop
   */
  isDesktop() {
    return this.getDeviceCategory() === 'desktop';
  }

  /**
   * Check if device supports touch
   */
  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Get appropriate grid columns for current breakpoint
   */
  getGridColumns(maxColumns = 4) {
    const breakpoint = this.getCurrentBreakpoint();
    
    switch (breakpoint) {
      case 'xs': return 1;
      case 'sm': return Math.min(2, maxColumns);
      case 'md': return Math.min(2, maxColumns);
      case 'lg': return Math.min(3, maxColumns);
      case 'xl': return Math.min(4, maxColumns);
      case '2xl': return maxColumns;
      default: return 1;
    }
  }

  /**
   * Get appropriate spacing for current device category
   */
  getSpacing(size = 'medium') {
    const deviceCategory = this.getDeviceCategory();
    const baseSpacing = {
      small: { mobile: 8, tablet: 12, desktop: 16 },
      medium: { mobile: 16, tablet: 24, desktop: 32 },
      large: { mobile: 24, tablet: 32, desktop: 48 }
    };
    
    return baseSpacing[size][deviceCategory];
  }

  /**
   * Setup breakpoint change listeners
   */
  setupBreakpointListeners() {
    let currentBreakpoint = this.getCurrentBreakpoint();
    
    const checkBreakpoint = () => {
      const newBreakpoint = this.getCurrentBreakpoint();
      
      if (newBreakpoint !== currentBreakpoint) {
        const oldBreakpoint = currentBreakpoint;
        currentBreakpoint = newBreakpoint;
        
        // Update CSS properties
        this.updateCSSCustomProperties();
        
        // Dispatch breakpoint change event
        const event = new CustomEvent('breakpointChange', {
          detail: {
            from: oldBreakpoint,
            to: newBreakpoint,
            deviceCategory: this.getDeviceCategory(),
            isMobile: this.isMobile(),
            isTablet: this.isTablet(),
            isDesktop: this.isDesktop()
          }
        });
        
        window.dispatchEvent(event);
      }
    };
    
    // Use ResizeObserver for better performance
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(checkBreakpoint);
      resizeObserver.observe(document.documentElement);
    } else {
      // Fallback to resize event
      window.addEventListener('resize', this.debounce(checkBreakpoint, 100));
    }
    
    // Also listen for orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(checkBreakpoint, 100);
    });
  }

  /**
   * Detect current breakpoint and set initial state
   */
  detectCurrentBreakpoint() {
    const breakpoint = this.getCurrentBreakpoint();
    const deviceCategory = this.getDeviceCategory();
    
    // Add classes to document element
    document.documentElement.classList.add(`bp-${breakpoint}`);
    document.documentElement.classList.add(`device-${deviceCategory}`);
    
    if (this.isTouchDevice()) {
      document.documentElement.classList.add('touch-device');
    }
    
    // Set initial CSS custom properties
    document.documentElement.style.setProperty('--current-breakpoint', breakpoint);
    document.documentElement.style.setProperty('--device-category', deviceCategory);
  }

  /**
   * Update breakpoint configuration
   */
  updateBreakpoints(newBreakpoints) {
    this.breakpoints = { ...this.breakpoints, ...newBreakpoints };
    this.updateCSSCustomProperties();
    
    // Recalculate container max widths
    Object.keys(newBreakpoints).forEach(key => {
      this.layout.containerMaxWidths[key] = newBreakpoints[key] - 32;
    });
  }

  /**
   * Get media query string for breakpoint
   */
  getMediaQuery(breakpoint, type = 'min') {
    const value = this.breakpoints[breakpoint];
    if (!value) return '';
    
    return type === 'min' ? 
      `(min-width: ${value}px)` : 
      `(max-width: ${value - 1}px)`;
  }

  /**
   * Create media query listener
   */
  createMediaQueryListener(breakpoint, type = 'min', callback) {
    const query = this.getMediaQuery(breakpoint, type);
    if (!query) return null;
    
    const mediaQuery = window.matchMedia(query);
    mediaQuery.addListener(callback);
    
    // Call immediately with current state
    callback(mediaQuery);
    
    return mediaQuery;
  }

  /**
   * Debounce utility function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Get configuration for external modules
   */
  getConfig() {
    return {
      breakpoints: this.breakpoints,
      touch: this.touch,
      animations: this.animations,
      layout: this.layout,
      typography: this.typography,
      currentBreakpoint: this.getCurrentBreakpoint(),
      deviceCategory: this.getDeviceCategory(),
      isMobile: this.isMobile(),
      isTablet: this.isTablet(),
      isDesktop: this.isDesktop(),
      isTouchDevice: this.isTouchDevice()
    };
  }

  /**
   * Static method to get global instance
   */
  static getInstance() {
    if (!ResponsiveConfig.instance) {
      ResponsiveConfig.instance = new ResponsiveConfig();
    }
    return ResponsiveConfig.instance;
  }
}

// Auto-initialize and make globally available
const responsiveConfig = ResponsiveConfig.getInstance();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResponsiveConfig;
}

// Global access
window.ResponsiveConfig = ResponsiveConfig;
window.responsiveConfig = responsiveConfig;