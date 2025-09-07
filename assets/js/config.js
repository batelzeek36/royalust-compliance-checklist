/**
 * Configuration Module
 * Central configuration and constants for the Royalust Compliance application
 */

export const CONFIG = {
  // Application metadata
  APP: {
    NAME: 'Royalust Compliance Checklist',
    VERSION: '1.0.0',
    DESCRIPTION: 'Interactive compliance dashboard for Big Island retreat operations'
  },

  // Storage configuration
  STORAGE: {
    PREFIX: 'royalust_compliance_',
    KEYS: {
      PROGRESS: 'progress_data',
      UI_STATE: 'ui_state',
      USER_PREFERENCES: 'user_preferences',
      LAST_UPDATED: 'last_updated'
    },
    EXPIRY_DAYS: 30
  },

  // UI configuration
  UI: {
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 250,
    PROGRESS_UPDATE_DELAY: 100,
    MOBILE_BREAKPOINT: 768,
    TABLET_BREAKPOINT: 1024
  },

  // Progress calculation settings
  PROGRESS: {
    DECIMAL_PLACES: 1,
    RISK_THRESHOLDS: {
      LOW: 80,
      MEDIUM: 60,
      HIGH: 40
    },
    CATEGORIES_COUNT: 9
  },

  // Event names for pub/sub system
  EVENTS: {
    // Data events
    DATA_LOADED: 'data:loaded',
    DATA_ERROR: 'data:error',
    
    // Progress events
    PROGRESS_UPDATED: 'progress:updated',
    ITEM_TOGGLED: 'item:toggled',
    CATEGORY_PROGRESS_CHANGED: 'category:progress:changed',
    
    // UI events
    CATEGORY_EXPANDED: 'ui:category:expanded',
    CATEGORY_COLLAPSED: 'ui:category:collapsed',
    THEME_CHANGED: 'ui:theme:changed',
    VIEW_CHANGED: 'ui:view:changed',
    
    // Storage events
    STATE_SAVED: 'storage:saved',
    STATE_LOADED: 'storage:loaded',
    STORAGE_ERROR: 'storage:error',
    
    // Export events
    EXPORT_STARTED: 'export:started',
    EXPORT_COMPLETED: 'export:completed',
    EXPORT_ERROR: 'export:error'
  },

  // API endpoints (if needed for future expansion)
  API: {
    BASE_URL: '',
    ENDPOINTS: {
      COMPLIANCE_DATA: '/data/compliance.json'
    }
  },

  // Logging configuration
  LOGGING: {
    ENABLED: true,
    LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
    MAX_ENTRIES: 100,
    CONSOLE_OUTPUT: true
  },

  // Theme configuration
  THEME: {
    DEFAULT: 'dark',
    AVAILABLE: ['dark', 'light'],
    CSS_VARIABLES: {
      PRIMARY: '--royalust-gold',
      SECONDARY: '--deep-violet',
      BACKGROUND: '--cosmic-void',
      TEXT: '--champagne'
    }
  },

  // Validation rules
  VALIDATION: {
    REQUIRED_CATEGORIES: 9,
    MIN_ITEMS_PER_CATEGORY: 1,
    MAX_TITLE_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500
  },

  // Performance settings
  PERFORMANCE: {
    LAZY_LOAD_THRESHOLD: 5,
    ANIMATION_FRAME_BUDGET: 16, // milliseconds
    DEBOUNCE_RESIZE: 150
  }
};

// Utility function to get nested config values
export function getConfig(path, defaultValue = null) {
  return path.split('.').reduce((obj, key) => {
    return obj && obj[key] !== undefined ? obj[key] : defaultValue;
  }, CONFIG);
}

// Environment detection
export const ENV = {
  IS_DEVELOPMENT: window.location.hostname === 'localhost',
  IS_MOBILE: window.innerWidth <= CONFIG.UI.MOBILE_BREAKPOINT,
  IS_TABLET: window.innerWidth <= CONFIG.UI.TABLET_BREAKPOINT,
  SUPPORTS_LOCAL_STORAGE: (() => {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  })(),
  SUPPORTS_ANIMATIONS: !window.matchMedia('(prefers-reduced-motion: reduce)').matches
};

// Feature flags for progressive enhancement
export const FEATURES = {
  ANIMATIONS: ENV.SUPPORTS_ANIMATIONS,
  LOCAL_STORAGE: ENV.SUPPORTS_LOCAL_STORAGE,
  EXPORT_PDF: true,
  SHARING: navigator.share !== undefined,
  OFFLINE_SUPPORT: 'serviceWorker' in navigator
};

export default CONFIG;