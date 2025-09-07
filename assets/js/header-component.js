/**
 * Header Component Module - Modular Header with Brand Typography and Progress
 * Royalust Compliance Dashboard
 * 
 * Self-contained header component matching reference design exactly:
 * - ROYALUST typography in Cinzel font with gold/bronze styling
 * - Tagline in Cormorant Garamond italic font
 * - Progress ring visualization with holographic effects
 * - Responsive layout maintaining brand aesthetic
 * - Crystalline shimmer effects and animations
 */

class HeaderComponent {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    
    if (!this.container) {
      throw new Error('HeaderComponent: Container element not found');
    }
    
    // Configuration with defaults
    this.config = {
      templatePath: options.templatePath || null, // Use inline template by default
      animated: options.animated !== false,
      progressRing: options.progressRing !== false,
      shimmerEffect: options.shimmerEffect !== false,
      responsive: options.responsive !== false,
      autoUpdate: options.autoUpdate !== false,
      updateInterval: options.updateInterval || 5000,
      ...options
    };
    
    // State management
    this.state = {
      progress: 0,
      completedItems: 0,
      totalItems: 0,
      isLoaded: false,
      isMobile: false
    };
    
    // Component references
    this.elements = {};
    this.progressRing = null;
    this.updateTimer = null;
    
    // Event handlers (bound to maintain context)
    this.handleResize = this.handleResize.bind(this);
    this.handleProgressUpdate = this.handleProgressUpdate.bind(this);
    
    // Initialize component
    this.init();
  }
  
  /**
   * Initialize the header component
   */
  async init() {
    try {
      console.log('Starting header component initialization...');
      
      await this.loadTemplate();
      console.log('Template loaded');
      
      this.setupElements();
      console.log('Elements set up');
      
      this.initializeProgressRing();
      console.log('Progress ring initialized');
      
      this.setupEventListeners();
      console.log('Event listeners set up');
      
      this.setupResponsive();
      console.log('Responsive setup complete');
      
      this.setupAnimations();
      console.log('Animations set up');
      
      this.state.isLoaded = true;
      this.dispatchEvent('headerLoaded');
      
      console.log('Header component initialization complete');
      
      // Auto-update if enabled
      if (this.config.autoUpdate) {
        this.startAutoUpdate();
      }
      
    } catch (error) {
      console.error('HeaderComponent initialization failed:', error);
      this.handleError(error);
    }
  }
  
  /**
   * Load HTML template
   */
  async loadTemplate() {
    try {
      // Check if template is already in DOM
      const existingHeader = this.container.querySelector('.dashboard-header');
      if (existingHeader) {
        return; // Template already loaded
      }
      
      // Use inline template by default for reliability
      let templateHTML = this.getInlineTemplate();
      
      // Only try to load external template if explicitly requested
      if (this.config.templatePath) {
        try {
          const response = await fetch(this.config.templatePath);
          if (response.ok) {
            templateHTML = await response.text();
            console.log('External template loaded successfully');
          } else {
            console.warn('Failed to load external template, using inline fallback');
          }
        } catch (fetchError) {
          console.warn('Failed to load external template, using inline fallback');
        }
      }
      
      // Insert template into container
      this.container.innerHTML = templateHTML;
      
    } catch (error) {
      console.error('Template loading failed:', error);
      // Use minimal fallback template
      this.container.innerHTML = this.getFallbackTemplate();
    }
  }
  
  /**
   * Get inline template as fallback
   */
  getInlineTemplate() {
    return `
      <header class="dashboard-header" id="dashboard-header">
        <div class="header-shimmer-overlay"></div>
        <div class="header-content">
          <div class="header-branding">
            <h1 class="royalust-heading" id="royalust-title">
              <span class="royalust-text">ROYALUST</span>
            </h1>
            <p class="header-tagline" id="header-tagline">
              Big Island Retreat Compliance Dashboard
            </p>
          </div>
          <div class="header-progress-overview" id="progress-overview">
            <div class="progress-ring-container">
              <div id="progress-ring-mount"></div>
              <div class="progress-text-overlay">
                <span class="progress-percentage" id="progress-percentage">0%</span>
                <span class="progress-label">Complete</span>
              </div>
            </div>
            <div class="progress-details">
              <div class="progress-stat">
                <span class="stat-value" id="completed-items">0</span>
                <span class="stat-label">Completed</span>
              </div>
              <div class="progress-stat">
                <span class="stat-value" id="total-items">0</span>
                <span class="stat-label">Total Items</span>
              </div>
            </div>
          </div>
        </div>
        <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Toggle mobile menu">
          <span class="menu-icon"></span>
          <span class="menu-icon"></span>
          <span class="menu-icon"></span>
        </button>
      </header>
    `;
  }
  
  /**
   * Get minimal fallback template
   */
  getFallbackTemplate() {
    return `
      <header class="dashboard-header">
        <div class="header-content">
          <h1 class="royalust-heading">ROYALUST</h1>
          <p class="header-tagline">Big Island Retreat Compliance Dashboard</p>
        </div>
      </header>
    `;
  }
  
  /**
   * Setup element references
   */
  setupElements() {
    this.elements = {
      header: this.container.querySelector('.dashboard-header'),
      shimmerOverlay: this.container.querySelector('.header-shimmer-overlay'),
      branding: this.container.querySelector('.header-branding'),
      title: this.container.querySelector('#royalust-title'),
      tagline: this.container.querySelector('#header-tagline'),
      progressOverview: this.container.querySelector('#progress-overview'),
      progressRingMount: this.container.querySelector('#progress-ring-mount'),
      progressPercentage: this.container.querySelector('#progress-percentage'),
      completedItems: this.container.querySelector('#completed-items'),
      totalItems: this.container.querySelector('#total-items'),
      mobileToggle: this.container.querySelector('#mobile-menu-toggle')
    };
    
    // Validate critical elements
    if (!this.elements.header) {
      throw new Error('Header element not found in template');
    }
  }
  
  /**
   * Initialize progress ring component
   */
  initializeProgressRing() {
    if (!this.config.progressRing || !this.elements.progressRingMount) {
      console.log('Progress ring disabled or mount point not found');
      return;
    }
    
    try {
      // Check if ProgressRing class is available
      if (typeof ProgressRing === 'undefined') {
        console.warn('ProgressRing class not available, skipping progress ring initialization');
        return;
      }
      
      console.log('Initializing progress ring...');
      
      this.progressRing = new ProgressRing(this.elements.progressRingMount, {
        size: 100,
        strokeWidth: 8,
        animated: this.config.animated,
        holographic: true,
        glowEffect: true,
        duration: 1000
      });
      
      // Listen for progress updates
      this.elements.progressRingMount.addEventListener('progressUpdate', this.handleProgressUpdate);
      
      console.log('Progress ring initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize progress ring:', error);
      // Don't let progress ring failure break the header
    }
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Window resize for responsive behavior
    if (this.config.responsive) {
      window.addEventListener('resize', this.handleResize);
      this.handleResize(); // Initial check
    }
    
    // Mobile menu toggle
    if (this.elements.mobileToggle) {
      this.elements.mobileToggle.addEventListener('click', () => {
        this.toggleMobileMenu();
      });
    }
    
    // Shimmer effect on hover
    if (this.config.shimmerEffect && this.elements.header) {
      this.elements.header.addEventListener('mouseenter', () => {
        this.triggerShimmerEffect();
      });
    }
    
    // Typography animation on load
    if (this.config.animated && this.elements.title) {
      this.animateTypography();
    }
  }
  
  /**
   * Setup responsive behavior
   */
  setupResponsive() {
    if (!this.config.responsive) return;
    
    // Add responsive classes based on screen size
    this.updateResponsiveClasses();
  }
  
  /**
   * Setup animations
   */
  setupAnimations() {
    if (!this.config.animated) return;
    
    // Entrance animation
    if (this.elements.header) {
      this.elements.header.classList.add('animate-entrance');
    }
    
    // Stagger animation for child elements
    const animatedElements = [
      this.elements.branding,
      this.elements.progressOverview
    ].filter(Boolean);
    
    animatedElements.forEach((element, index) => {
      if (element) {
        element.style.animationDelay = `${index * 0.2}s`;
        element.classList.add('animate-fade-in-up');
      }
    });
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    const isMobile = window.innerWidth < 768;
    
    if (isMobile !== this.state.isMobile) {
      this.state.isMobile = isMobile;
      this.updateResponsiveClasses();
      this.dispatchEvent('responsiveChange', { isMobile });
    }
  }
  
  /**
   * Update responsive classes
   */
  updateResponsiveClasses() {
    if (!this.elements.header) return;
    
    this.elements.header.classList.toggle('mobile', this.state.isMobile);
    this.elements.header.classList.toggle('desktop', !this.state.isMobile);
  }
  
  /**
   * Handle progress ring updates
   */
  handleProgressUpdate(event) {
    const { progress } = event.detail;
    this.updateProgressText(progress);
  }
  
  /**
   * Update progress display
   */
  updateProgress(progressData) {
    const { progress = 0, completedItems = 0, totalItems = 0 } = progressData;
    
    // Update state
    this.state.progress = progress;
    this.state.completedItems = completedItems;
    this.state.totalItems = totalItems;
    
    // Update progress ring
    if (this.progressRing) {
      this.progressRing.setProgress(progress);
    }
    
    // Update text displays
    this.updateProgressText(progress);
    this.updateItemCounts(completedItems, totalItems);
    
    // Dispatch update event
    this.dispatchEvent('progressUpdated', progressData);
  }
  
  /**
   * Update progress percentage text
   */
  updateProgressText(progress) {
    if (this.elements.progressPercentage) {
      this.elements.progressPercentage.textContent = `${Math.round(progress)}%`;
    }
  }
  
  /**
   * Update item count displays
   */
  updateItemCounts(completed, total) {
    if (this.elements.completedItems) {
      this.elements.completedItems.textContent = completed.toString();
    }
    
    if (this.elements.totalItems) {
      this.elements.totalItems.textContent = total.toString();
    }
  }
  
  /**
   * Trigger shimmer effect
   */
  triggerShimmerEffect() {
    if (!this.elements.shimmerOverlay) return;
    
    this.elements.shimmerOverlay.classList.remove('shimmer-active');
    // Force reflow
    this.elements.shimmerOverlay.offsetHeight;
    this.elements.shimmerOverlay.classList.add('shimmer-active');
  }
  
  /**
   * Animate typography on load
   */
  animateTypography() {
    if (!this.elements.title) return;
    
    const text = this.elements.title.textContent;
    const letters = text.split('');
    
    this.elements.title.innerHTML = letters
      .map((letter, index) => 
        `<span class="letter" style="animation-delay: ${index * 0.1}s">${letter}</span>`
      )
      .join('');
    
    this.elements.title.classList.add('animate-letters');
  }
  
  /**
   * Toggle mobile menu
   */
  toggleMobileMenu() {
    if (!this.elements.mobileToggle) return;
    
    const isOpen = this.elements.mobileToggle.classList.contains('active');
    this.elements.mobileToggle.classList.toggle('active', !isOpen);
    
    this.dispatchEvent('mobileMenuToggle', { isOpen: !isOpen });
  }
  
  /**
   * Start auto-update timer
   */
  startAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    this.updateTimer = setInterval(() => {
      this.dispatchEvent('autoUpdateTick');
    }, this.config.updateInterval);
  }
  
  /**
   * Stop auto-update timer
   */
  stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
  
  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }
  
  /**
   * Handle errors gracefully
   */
  handleError(error) {
    console.error('HeaderComponent error:', error);
    
    // Add error class for styling
    if (this.elements.header) {
      this.elements.header.classList.add('error-state');
    }
    
    this.dispatchEvent('error', { error });
  }
  
  /**
   * Dispatch custom events
   */
  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(`header:${eventName}`, {
      detail: { ...detail, component: this }
    });
    
    this.container.dispatchEvent(event);
  }
  
  /**
   * Destroy component and cleanup
   */
  destroy() {
    // Stop auto-update
    this.stopAutoUpdate();
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    
    if (this.elements.progressRingMount) {
      this.elements.progressRingMount.removeEventListener('progressUpdate', this.handleProgressUpdate);
    }
    
    // Destroy progress ring
    if (this.progressRing) {
      this.progressRing.destroy();
      this.progressRing = null;
    }
    
    // Clear container
    this.container.innerHTML = '';
    
    // Reset state
    this.state.isLoaded = false;
    
    this.dispatchEvent('headerDestroyed');
  }
}

// Static methods for utility
HeaderComponent.createInstance = function(container, options = {}) {
  return new HeaderComponent(container, options);
};

HeaderComponent.version = '1.0.0';

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HeaderComponent;
}

// Global registration for direct script inclusion
if (typeof window !== 'undefined') {
  window.HeaderComponent = HeaderComponent;
}