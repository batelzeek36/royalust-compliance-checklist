/**
 * State Manager Module
 * Centralized state management for progress tracking and UI state
 */

import { CONFIG } from './config.js';
import logger from './logger.js';
import { emit, on } from './events.js';
import { saveProgress, loadProgress, saveUIState, loadUIState } from './storage.js';
import { calculateProgress, getRiskLevel, debounce } from './utils.js';

class StateManager {
  constructor() {
    this.state = {
      // Progress tracking
      progress: {
        overall: 0,
        categories: {},
        completedItems: 0,
        totalItems: 0,
        lastUpdated: null
      },
      
      // UI state
      ui: {
        expandedCategories: [],
        currentView: 'dashboard',
        theme: CONFIG.THEME.DEFAULT,
        loading: false,
        error: null
      },
      
      // Compliance data
      data: {
        categories: [],
        metadata: {},
        loaded: false
      }
    };

    this.subscribers = new Map();
    this.history = [];
    this.maxHistorySize = 50;
    
    // Debounced save functions
    this.debouncedSaveProgress = debounce(() => this.saveProgressToStorage(), 500);
    this.debouncedSaveUIState = debounce(() => this.saveUIStateToStorage(), 300);
    
    this.initialize();
    
    logger.info('StateManager initialized', null, 'state');
  }

  /**
   * Initialize state manager
   */
  initialize() {
    // Load saved state
    this.loadState();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Auto-save on page unload
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for data events
    on(CONFIG.EVENTS.DATA_LOADED, (data) => {
      this.setComplianceData(data);
    });

    on(CONFIG.EVENTS.ITEM_TOGGLED, (data) => {
      this.toggleItem(data.categoryId, data.itemId, data.completed);
    });

    // Listen for UI events
    on(CONFIG.EVENTS.CATEGORY_EXPANDED, (data) => {
      this.expandCategory(data.categoryId);
    });

    on(CONFIG.EVENTS.CATEGORY_COLLAPSED, (data) => {
      this.collapseCategory(data.categoryId);
    });

    on(CONFIG.EVENTS.THEME_CHANGED, (data) => {
      this.setTheme(data.theme);
    });
  }

  /**
   * Subscribe to state changes
   * @param {string} path - State path to watch (e.g., 'progress.overall')
   * @param {Function} callback - Callback function
   */
  subscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }
    
    const subscribers = this.subscribers.get(path);
    subscribers.push(callback);
    
    const unsubscribe = () => {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
    
    logger.debug(`State subscription added: ${path}`, null, 'state');
    return unsubscribe;
  }

  /**
   * Get state value by path
   * @param {string} path - State path (e.g., 'progress.overall')
   */
  getState(path = null) {
    if (!path) return this.state;
    
    return path.split('.').reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : undefined;
    }, this.state);
  }

  /**
   * Set state value and notify subscribers
   * @param {string} path - State path
   * @param {*} value - New value
   * @param {boolean} silent - Skip notifications
   */
  setState(path, value, silent = false) {
    const oldValue = this.getState(path);
    
    // Set the value
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.state);
    
    target[lastKey] = value;
    
    // Add to history
    this.addToHistory(path, oldValue, value);
    
    if (!silent) {
      // Notify subscribers
      this.notifySubscribers(path, value, oldValue);
      
      // Emit state change event
      emit('state:changed', { path, value, oldValue });
      
      logger.debug(`State updated: ${path}`, { oldValue, newValue: value }, 'state');
    }
  }

  /**
   * Notify subscribers of state changes
   */
  notifySubscribers(path, newValue, oldValue) {
    // Notify exact path subscribers
    if (this.subscribers.has(path)) {
      this.subscribers.get(path).forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          logger.error(`Error in state subscriber: ${path}`, error, 'state');
        }
      });
    }
    
    // Notify parent path subscribers
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      if (this.subscribers.has(parentPath)) {
        const parentValue = this.getState(parentPath);
        this.subscribers.get(parentPath).forEach(callback => {
          try {
            callback(parentValue, parentValue, parentPath);
          } catch (error) {
            logger.error(`Error in parent state subscriber: ${parentPath}`, error, 'state');
          }
        });
      }
    }
  }

  /**
   * Add state change to history
   */
  addToHistory(path, oldValue, newValue) {
    this.history.push({
      timestamp: Date.now(),
      path,
      oldValue,
      newValue
    });
    
    // Maintain history size limit
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Set compliance data
   * @param {Object} data - Compliance data
   */
  setComplianceData(data) {
    this.setState('data.categories', data.categories || []);
    this.setState('data.metadata', data.metadata || {});
    this.setState('data.loaded', true);
    
    // Initialize progress tracking for categories
    this.initializeProgress();
    
    logger.info('Compliance data set', { 
      categories: data.categories?.length || 0,
      metadata: data.metadata 
    }, 'state');
  }

  /**
   * Initialize progress tracking
   */
  initializeProgress() {
    const categories = this.getState('data.categories') || [];
    const currentProgress = this.getState('progress') || {};
    
    let totalItems = 0;
    const categoryProgress = {};
    
    categories.forEach(category => {
      const categoryId = category.id;
      const items = category.items || [];
      totalItems += items.length;
      
      // Initialize category progress if not exists
      if (!currentProgress.categories || !currentProgress.categories[categoryId]) {
        categoryProgress[categoryId] = {
          completed: 0,
          total: items.length,
          percentage: 0,
          items: {}
        };
        
        // Initialize item completion status
        items.forEach(item => {
          categoryProgress[categoryId].items[item.id] = false;
        });
      } else {
        categoryProgress[categoryId] = currentProgress.categories[categoryId];
      }
    });
    
    this.setState('progress.categories', categoryProgress);
    this.setState('progress.totalItems', totalItems);
    
    // Recalculate overall progress
    this.recalculateProgress();
  }

  /**
   * Toggle item completion status
   * @param {string} categoryId - Category ID
   * @param {string} itemId - Item ID
   * @param {boolean} completed - Completion status
   */
  toggleItem(categoryId, itemId, completed) {
    const categoryProgress = this.getState(`progress.categories.${categoryId}`);
    if (!categoryProgress) {
      logger.warn(`Category not found: ${categoryId}`, null, 'state');
      return;
    }
    
    const wasCompleted = categoryProgress.items[itemId] || false;
    
    // Update item status
    this.setState(`progress.categories.${categoryId}.items.${itemId}`, completed);
    
    // Update category completed count
    let completedCount = categoryProgress.completed;
    if (completed && !wasCompleted) {
      completedCount++;
    } else if (!completed && wasCompleted) {
      completedCount--;
    }
    
    this.setState(`progress.categories.${categoryId}.completed`, completedCount);
    
    // Update category percentage
    const percentage = calculateProgress(completedCount, categoryProgress.total);
    this.setState(`progress.categories.${categoryId}.percentage`, percentage);
    
    // Update last updated timestamp
    this.setState('progress.lastUpdated', Date.now());
    
    // Recalculate overall progress
    this.recalculateProgress();
    
    // Save progress
    this.debouncedSaveProgress();
    
    // Emit events
    emit(CONFIG.EVENTS.PROGRESS_UPDATED, {
      categoryId,
      itemId,
      completed,
      categoryProgress: this.getState(`progress.categories.${categoryId}`)
    });
    
    emit(CONFIG.EVENTS.CATEGORY_PROGRESS_CHANGED, {
      categoryId,
      progress: this.getState(`progress.categories.${categoryId}`)
    });
    
    logger.debug(`Item toggled: ${categoryId}/${itemId}`, { completed }, 'state');
  }

  /**
   * Recalculate overall progress
   */
  recalculateProgress() {
    const categories = this.getState('progress.categories') || {};
    const totalItems = this.getState('progress.totalItems') || 0;
    
    let totalCompleted = 0;
    
    Object.values(categories).forEach(category => {
      totalCompleted += category.completed || 0;
    });
    
    const overallPercentage = calculateProgress(totalCompleted, totalItems);
    
    this.setState('progress.completedItems', totalCompleted);
    this.setState('progress.overall', overallPercentage);
    
    logger.debug('Progress recalculated', {
      completed: totalCompleted,
      total: totalItems,
      percentage: overallPercentage
    }, 'state');
  }

  /**
   * Get category progress
   * @param {string} categoryId - Category ID
   */
  getCategoryProgress(categoryId) {
    return this.getState(`progress.categories.${categoryId}`);
  }

  /**
   * Get overall progress
   */
  getOverallProgress() {
    return this.getState('progress');
  }

  /**
   * Get risk assessment
   */
  getRiskAssessment() {
    const overallProgress = this.getState('progress.overall') || 0;
    const riskLevel = getRiskLevel(overallProgress);
    
    return {
      level: riskLevel,
      percentage: overallProgress,
      message: this.getRiskMessage(riskLevel)
    };
  }

  /**
   * Get risk message based on level
   */
  getRiskMessage(riskLevel) {
    const messages = {
      low: 'Excellent compliance status. Continue maintaining current standards.',
      medium: 'Good progress. Focus on completing remaining high-priority items.',
      high: 'Attention needed. Several compliance items require immediate action.',
      critical: 'Critical status. Urgent action required to address compliance gaps.'
    };
    return messages[riskLevel] || messages.critical;
  }

  /**
   * Expand category
   * @param {string} categoryId - Category ID
   */
  expandCategory(categoryId) {
    const expanded = this.getState('ui.expandedCategories') || [];
    if (!expanded.includes(categoryId)) {
      this.setState('ui.expandedCategories', [...expanded, categoryId]);
      this.debouncedSaveUIState();
    }
  }

  /**
   * Collapse category
   * @param {string} categoryId - Category ID
   */
  collapseCategory(categoryId) {
    const expanded = this.getState('ui.expandedCategories') || [];
    const filtered = expanded.filter(id => id !== categoryId);
    this.setState('ui.expandedCategories', filtered);
    this.debouncedSaveUIState();
  }

  /**
   * Set theme
   * @param {string} theme - Theme name
   */
  setTheme(theme) {
    if (CONFIG.THEME.AVAILABLE.includes(theme)) {
      this.setState('ui.theme', theme);
      this.debouncedSaveUIState();
      
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  /**
   * Set loading state
   * @param {boolean} loading - Loading state
   */
  setLoading(loading) {
    this.setState('ui.loading', loading);
  }

  /**
   * Set error state
   * @param {string|null} error - Error message
   */
  setError(error) {
    this.setState('ui.error', error);
    if (error) {
      logger.error('Application error set', { error }, 'state');
    }
  }

  /**
   * Load state from storage
   */
  loadState() {
    try {
      // Load progress data
      const savedProgress = loadProgress();
      if (savedProgress) {
        this.setState('progress', savedProgress, true);
      }
      
      // Load UI state
      const savedUIState = loadUIState();
      if (savedUIState) {
        this.setState('ui', { ...this.getState('ui'), ...savedUIState }, true);
      }
      
      logger.info('State loaded from storage', null, 'state');
    } catch (error) {
      logger.error('Failed to load state from storage', error, 'state');
    }
  }

  /**
   * Save state to storage
   */
  saveState() {
    this.saveProgressToStorage();
    this.saveUIStateToStorage();
  }

  /**
   * Save progress to storage
   */
  saveProgressToStorage() {
    try {
      const progress = this.getState('progress');
      saveProgress(progress);
      logger.debug('Progress saved to storage', null, 'state');
    } catch (error) {
      logger.error('Failed to save progress to storage', error, 'state');
    }
  }

  /**
   * Save UI state to storage
   */
  saveUIStateToStorage() {
    try {
      const uiState = this.getState('ui');
      saveUIState(uiState);
      logger.debug('UI state saved to storage', null, 'state');
    } catch (error) {
      logger.error('Failed to save UI state to storage', error, 'state');
    }
  }

  /**
   * Reset all state
   */
  reset() {
    this.state = {
      progress: {
        overall: 0,
        categories: {},
        completedItems: 0,
        totalItems: 0,
        lastUpdated: null
      },
      ui: {
        expandedCategories: [],
        currentView: 'dashboard',
        theme: CONFIG.THEME.DEFAULT,
        loading: false,
        error: null
      },
      data: {
        categories: [],
        metadata: {},
        loaded: false
      }
    };
    
    this.history = [];
    this.saveState();
    
    logger.info('State reset', null, 'state');
  }

  /**
   * Get state history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Export state data
   */
  exportState() {
    return {
      state: this.state,
      history: this.history,
      timestamp: Date.now(),
      version: CONFIG.APP.VERSION
    };
  }
}

// Create singleton instance
const stateManager = new StateManager();

// Export singleton and convenience functions
export default stateManager;
export const {
  subscribe,
  getState,
  setState,
  setComplianceData,
  toggleItem,
  getCategoryProgress,
  getOverallProgress,
  getRiskAssessment,
  expandCategory,
  collapseCategory,
  setTheme,
  setLoading,
  setError,
  reset,
  exportState
} = stateManager;