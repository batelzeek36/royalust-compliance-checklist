/**
 * Main Application Module
 * ComplianceApp class and application initialization for Royalust Compliance Checklist
 */

import { CONFIG, ENV, FEATURES } from './config.js';
import logger from './logger.js';
import { on, emit } from './events.js';
import stateManager from './state-manager.js';
import storage from './storage.js';
import utils from './utils.js';

class ComplianceApp {
  constructor() {
    this.initialized = false;
    this.components = new Map();
    this.modules = new Map();
    this.startTime = performance.now();
    
    logger.info('ComplianceApp constructor called', {
      version: CONFIG.APP.VERSION,
      environment: ENV.IS_DEVELOPMENT ? 'development' : 'production'
    }, 'app');
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      logger.info('Initializing Royalust Compliance Application', {
        version: CONFIG.APP.VERSION,
        features: FEATURES
      }, 'app');

      // Set loading state
      stateManager.setLoading(true);
      stateManager.setError(null);

      // Initialize core systems
      await this.initializeCore();
      
      // Load compliance data
      await this.loadComplianceData();
      
      // Initialize UI components
      await this.initializeUI();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Apply saved theme
      this.applyTheme();
      
      // Mark as initialized
      this.initialized = true;
      stateManager.setLoading(false);
      
      const initTime = performance.now() - this.startTime;
      logger.info('Application initialized successfully', {
        initTime: `${initTime.toFixed(2)}ms`,
        components: this.components.size,
        modules: this.modules.size
      }, 'app');

      // Emit initialization complete event
      emit(CONFIG.EVENTS.APP_INITIALIZED, {
        initTime,
        version: CONFIG.APP.VERSION
      });

      return true;

    } catch (error) {
      logger.error('Application initialization failed', error, 'app');
      stateManager.setError('Failed to initialize application. Please refresh the page.');
      stateManager.setLoading(false);
      return false;
    }
  }

  /**
   * Initialize core application systems
   */
  async initializeCore() {
    logger.debug('Initializing core systems', null, 'app');

    // Initialize storage cleanup
    storage.cleanup();

    // Set up global error handlers
    this.setupErrorHandlers();

    // Initialize performance monitoring
    this.initializePerformanceMonitoring();

    // Set up auto-save
    this.setupAutoSave();

    logger.debug('Core systems initialized', null, 'app');
  }

  /**
   * Load compliance data from JSON file
   */
  async loadComplianceData() {
    try {
      logger.debug('Loading compliance data', null, 'app');

      const response = await fetch('/data/compliance.json');
      if (!response.ok) {
        throw new Error(`Failed to load compliance data: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate data structure
      this.validateComplianceData(data);
      
      // Set data in state manager
      stateManager.setComplianceData(data);
      
      emit(CONFIG.EVENTS.DATA_LOADED, data);
      
      logger.info('Compliance data loaded successfully', {
        categories: data.categories?.length || 0,
        totalItems: this.calculateTotalItems(data.categories || [])
      }, 'app');

    } catch (error) {
      logger.error('Failed to load compliance data', error, 'app');
      
      // Try to load fallback data or create empty structure
      const fallbackData = this.createFallbackData();
      stateManager.setComplianceData(fallbackData);
      
      throw error;
    }
  }

  /**
   * Validate compliance data structure
   */
  validateComplianceData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }

    if (!Array.isArray(data.categories)) {
      throw new Error('Categories must be an array');
    }

    if (data.categories.length !== CONFIG.VALIDATION.REQUIRED_CATEGORIES) {
      logger.warn(`Expected ${CONFIG.VALIDATION.REQUIRED_CATEGORIES} categories, got ${data.categories.length}`, null, 'app');
    }

    // Validate each category
    data.categories.forEach((category, index) => {
      if (!category.id || !category.title) {
        throw new Error(`Category ${index} missing required fields`);
      }

      if (!Array.isArray(category.items)) {
        throw new Error(`Category ${category.id} items must be an array`);
      }

      if (category.items.length < CONFIG.VALIDATION.MIN_ITEMS_PER_CATEGORY) {
        logger.warn(`Category ${category.id} has fewer than minimum items`, null, 'app');
      }
    });

    logger.debug('Compliance data validation passed', null, 'app');
  }

  /**
   * Calculate total items across all categories
   */
  calculateTotalItems(categories) {
    return categories.reduce((total, category) => {
      return total + (category.items ? category.items.length : 0);
    }, 0);
  }

  /**
   * Create fallback data structure
   */
  createFallbackData() {
    return {
      categories: [],
      metadata: {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        totalCategories: 0,
        totalItems: 0,
        fallback: true
      }
    };
  }

  /**
   * Initialize UI components
   */
  async initializeUI() {
    logger.debug('Initializing UI components', null, 'app');

    try {
      // Initialize header component
      await this.initializeComponent('header', 'HeaderComponent');
      
      // Initialize progress component
      await this.initializeComponent('progress', 'ProgressComponent');
      
      // Initialize category components
      await this.initializeComponent('categories', 'CategoryManager');
      
      // Initialize export component
      await this.initializeComponent('export', 'ExportManager');

      // Apply responsive design
      this.setupResponsiveDesign();

      logger.debug('UI components initialized', null, 'app');

    } catch (error) {
      logger.error('Failed to initialize UI components', error, 'app');
      throw error;
    }
  }

  /**
   * Initialize individual component
   */
  async initializeComponent(name, className) {
    try {
      // This would dynamically import and initialize components
      // For now, we'll register placeholder components
      const component = {
        name,
        className,
        initialized: true,
        element: document.querySelector(`[data-component="${name}"]`)
      };

      this.components.set(name, component);
      
      logger.debug(`Component initialized: ${name}`, null, 'app');

    } catch (error) {
      logger.error(`Failed to initialize component: ${name}`, error, 'app');
      throw error;
    }
  }

  /**
   * Set up application event listeners
   */
  setupEventListeners() {
    logger.debug('Setting up event listeners', null, 'app');

    // Progress update events
    on(CONFIG.EVENTS.PROGRESS_UPDATED, (data) => {
      this.handleProgressUpdate(data);
    });

    // UI interaction events
    on(CONFIG.EVENTS.CATEGORY_EXPANDED, (data) => {
      this.handleCategoryExpansion(data);
    });

    on(CONFIG.EVENTS.CATEGORY_COLLAPSED, (data) => {
      this.handleCategoryCollapse(data);
    });

    // Storage events
    on(CONFIG.EVENTS.STORAGE_ERROR, (data) => {
      this.handleStorageError(data);
    });

    // Window events
    window.addEventListener('resize', utils.debounce(() => {
      this.handleWindowResize();
    }, CONFIG.PERFORMANCE.DEBOUNCE_RESIZE));

    window.addEventListener('beforeunload', () => {
      this.handleBeforeUnload();
    });

    // Visibility change for performance optimization
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    logger.debug('Event listeners set up', null, 'app');
  }

  /**
   * Handle progress updates
   */
  handleProgressUpdate(data) {
    logger.debug('Handling progress update', data, 'app');
    
    // Update progress visualizations
    this.updateProgressVisuals(data);
    
    // Check for milestones
    this.checkProgressMilestones(data);
  }

  /**
   * Handle category expansion
   */
  handleCategoryExpansion(data) {
    logger.debug('Handling category expansion', data, 'app');
    
    // Animate expansion if supported
    if (FEATURES.ANIMATIONS) {
      this.animateCategoryExpansion(data.categoryId);
    }
  }

  /**
   * Handle category collapse
   */
  handleCategoryCollapse(data) {
    logger.debug('Handling category collapse', data, 'app');
    
    // Animate collapse if supported
    if (FEATURES.ANIMATIONS) {
      this.animateCategoryCollapse(data.categoryId);
    }
  }

  /**
   * Handle storage errors
   */
  handleStorageError(data) {
    logger.warn('Storage error occurred', data, 'app');
    
    // Show user-friendly message
    this.showNotification('Settings could not be saved. Changes will be lost on page refresh.', 'warning');
  }

  /**
   * Handle window resize
   */
  handleWindowResize() {
    logger.debug('Handling window resize', {
      width: window.innerWidth,
      height: window.innerHeight
    }, 'app');

    // Update responsive breakpoints
    this.updateResponsiveState();
    
    // Recalculate component layouts
    this.recalculateLayouts();
  }

  /**
   * Handle before unload
   */
  handleBeforeUnload() {
    logger.debug('Handling before unload', null, 'app');
    
    // Save current state
    stateManager.saveState();
    
    // Log session end
    logger.info('Application session ended', {
      sessionDuration: performance.now() - this.startTime
    }, 'app');
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      logger.debug('Application hidden', null, 'app');
      // Pause animations, reduce activity
      this.pauseNonEssentialOperations();
    } else {
      logger.debug('Application visible', null, 'app');
      // Resume normal operations
      this.resumeOperations();
    }
  }

  /**
   * Set up error handlers
   */
  setupErrorHandlers() {
    // Global error handler is already set up in logger.js
    // Add application-specific error handling here
    
    on('error', (error) => {
      this.handleApplicationError(error);
    });
  }

  /**
   * Handle application errors
   */
  handleApplicationError(error) {
    logger.error('Application error', error, 'app');
    
    // Show user-friendly error message
    stateManager.setError('An unexpected error occurred. Please try refreshing the page.');
    
    // Attempt recovery
    this.attemptErrorRecovery(error);
  }

  /**
   * Attempt error recovery
   */
  attemptErrorRecovery(error) {
    // Implement recovery strategies based on error type
    logger.info('Attempting error recovery', { error: error.message }, 'app');
  }

  /**
   * Initialize performance monitoring
   */
  initializePerformanceMonitoring() {
    if (ENV.IS_DEVELOPMENT) {
      // Set up performance observers
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            logger.logPerformance(entry.name, entry.duration);
          });
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      }
    }
  }

  /**
   * Set up auto-save functionality
   */
  setupAutoSave() {
    // Auto-save every 30 seconds
    setInterval(() => {
      if (this.initialized) {
        stateManager.saveState();
        logger.debug('Auto-save completed', null, 'app');
      }
    }, 30000);
  }

  /**
   * Apply theme
   */
  applyTheme() {
    const theme = stateManager.getState('ui.theme') || CONFIG.THEME.DEFAULT;
    document.documentElement.setAttribute('data-theme', theme);
    logger.debug(`Theme applied: ${theme}`, null, 'app');
  }

  /**
   * Set up responsive design
   */
  setupResponsiveDesign() {
    this.updateResponsiveState();
    
    // Set up media query listeners
    const mobileQuery = window.matchMedia(`(max-width: ${CONFIG.UI.MOBILE_BREAKPOINT}px)`);
    const tabletQuery = window.matchMedia(`(max-width: ${CONFIG.UI.TABLET_BREAKPOINT}px)`);
    
    mobileQuery.addListener(() => this.updateResponsiveState());
    tabletQuery.addListener(() => this.updateResponsiveState());
  }

  /**
   * Update responsive state
   */
  updateResponsiveState() {
    const isMobile = window.innerWidth <= CONFIG.UI.MOBILE_BREAKPOINT;
    const isTablet = window.innerWidth <= CONFIG.UI.TABLET_BREAKPOINT;
    
    document.documentElement.classList.toggle('mobile', isMobile);
    document.documentElement.classList.toggle('tablet', isTablet && !isMobile);
    document.documentElement.classList.toggle('desktop', !isTablet);
  }

  /**
   * Update progress visuals
   */
  updateProgressVisuals(data) {
    // This would update progress bars, rings, etc.
    // Implementation depends on specific UI components
    logger.debug('Updating progress visuals', data, 'app');
  }

  /**
   * Check progress milestones
   */
  checkProgressMilestones(data) {
    const overallProgress = stateManager.getState('progress.overall');
    
    // Check for milestone achievements
    const milestones = [25, 50, 75, 90, 100];
    milestones.forEach(milestone => {
      if (overallProgress >= milestone && !this.hasReachedMilestone(milestone)) {
        this.celebrateMilestone(milestone);
        this.markMilestoneReached(milestone);
      }
    });
  }

  /**
   * Check if milestone has been reached
   */
  hasReachedMilestone(milestone) {
    // This would check against stored milestone data
    return false; // Placeholder
  }

  /**
   * Celebrate milestone achievement
   */
  celebrateMilestone(milestone) {
    logger.info(`Milestone reached: ${milestone}%`, null, 'app');
    this.showNotification(`Congratulations! ${milestone}% compliance achieved!`, 'success');
  }

  /**
   * Mark milestone as reached
   */
  markMilestoneReached(milestone) {
    // Store milestone achievement
    logger.debug(`Milestone marked: ${milestone}%`, null, 'app');
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = 'info') {
    // This would show a toast notification or similar
    logger.info(`Notification: ${message}`, { type }, 'app');
  }

  /**
   * Animate category expansion
   */
  animateCategoryExpansion(categoryId) {
    // Implementation would depend on animation system
    logger.debug(`Animating expansion: ${categoryId}`, null, 'app');
  }

  /**
   * Animate category collapse
   */
  animateCategoryCollapse(categoryId) {
    // Implementation would depend on animation system
    logger.debug(`Animating collapse: ${categoryId}`, null, 'app');
  }

  /**
   * Recalculate component layouts
   */
  recalculateLayouts() {
    // Recalculate layouts for responsive design
    logger.debug('Recalculating layouts', null, 'app');
  }

  /**
   * Pause non-essential operations
   */
  pauseNonEssentialOperations() {
    // Pause animations, reduce polling, etc.
    logger.debug('Pausing non-essential operations', null, 'app');
  }

  /**
   * Resume normal operations
   */
  resumeOperations() {
    // Resume animations, polling, etc.
    logger.debug('Resuming operations', null, 'app');
  }

  /**
   * Get application statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      uptime: performance.now() - this.startTime,
      components: this.components.size,
      modules: this.modules.size,
      version: CONFIG.APP.VERSION,
      state: stateManager.exportState(),
      storage: storage.getStats()
    };
  }

  /**
   * Destroy application instance
   */
  destroy() {
    logger.info('Destroying application instance', null, 'app');
    
    // Save final state
    stateManager.saveState();
    
    // Clean up event listeners
    // Clean up components
    // Clear intervals/timeouts
    
    this.initialized = false;
  }
}

// Initialize application when DOM is ready
let app = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    app = new ComplianceApp();
    const success = await app.init();
    
    if (success) {
      // Make app globally available for debugging
      if (ENV.IS_DEVELOPMENT) {
        window.complianceApp = app;
      }
    }
  } catch (error) {
    logger.error('Failed to start application', error, 'app');
  }
});

// Export for module usage
export default ComplianceApp;
export { app };