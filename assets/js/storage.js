/**
 * Storage Module
 * localStorage integration and data persistence for the Royalust Compliance application
 */

import { CONFIG, ENV } from './config.js';
import logger from './logger.js';
import { emit } from './events.js';

class StorageManager {
  constructor() {
    this.prefix = CONFIG.STORAGE.PREFIX;
    this.keys = CONFIG.STORAGE.KEYS;
    this.expiryDays = CONFIG.STORAGE.EXPIRY_DAYS;
    this.isSupported = ENV.SUPPORTS_LOCAL_STORAGE;
    
    if (!this.isSupported) {
      logger.warn('localStorage not supported, using memory storage', null, 'storage');
      this.memoryStorage = new Map();
    }
    
    logger.info('StorageManager initialized', { 
      supported: this.isSupported,
      prefix: this.prefix 
    }, 'storage');
  }

  /**
   * Generate storage key with prefix
   * @param {string} key - Base key name
   */
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Create storage item with metadata
   * @param {*} data - Data to store
   * @param {number} expiryDays - Days until expiry (optional)
   */
  createStorageItem(data, expiryDays = this.expiryDays) {
    const now = Date.now();
    return {
      data,
      timestamp: now,
      expiry: expiryDays ? now + (expiryDays * 24 * 60 * 60 * 1000) : null,
      version: CONFIG.APP.VERSION
    };
  }

  /**
   * Check if storage item is expired
   * @param {Object} item - Storage item
   */
  isExpired(item) {
    if (!item || !item.expiry) return false;
    return Date.now() > item.expiry;
  }

  /**
   * Set item in storage
   * @param {string} key - Storage key
   * @param {*} data - Data to store
   * @param {number} expiryDays - Days until expiry
   */
  setItem(key, data, expiryDays = this.expiryDays) {
    try {
      const storageKey = this.getKey(key);
      const item = this.createStorageItem(data, expiryDays);
      const serialized = JSON.stringify(item);

      if (this.isSupported) {
        localStorage.setItem(storageKey, serialized);
      } else {
        this.memoryStorage.set(storageKey, serialized);
      }

      logger.debug(`Storage item set: ${key}`, { 
        size: serialized.length,
        expiry: item.expiry ? new Date(item.expiry).toISOString() : 'never'
      }, 'storage');

      emit(CONFIG.EVENTS.STATE_SAVED, { key, data });
      return true;

    } catch (error) {
      logger.error(`Failed to set storage item: ${key}`, error, 'storage');
      emit(CONFIG.EVENTS.STORAGE_ERROR, { operation: 'set', key, error });
      return false;
    }
  }

  /**
   * Get item from storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if not found
   */
  getItem(key, defaultValue = null) {
    try {
      const storageKey = this.getKey(key);
      let serialized;

      if (this.isSupported) {
        serialized = localStorage.getItem(storageKey);
      } else {
        serialized = this.memoryStorage.get(storageKey);
      }

      if (!serialized) {
        logger.debug(`Storage item not found: ${key}`, null, 'storage');
        return defaultValue;
      }

      const item = JSON.parse(serialized);

      // Check if item is expired
      if (this.isExpired(item)) {
        logger.debug(`Storage item expired: ${key}`, { 
          expiry: new Date(item.expiry).toISOString() 
        }, 'storage');
        this.removeItem(key);
        return defaultValue;
      }

      // Check version compatibility
      if (item.version && item.version !== CONFIG.APP.VERSION) {
        logger.warn(`Storage item version mismatch: ${key}`, {
          stored: item.version,
          current: CONFIG.APP.VERSION
        }, 'storage');
        // Could implement migration logic here
      }

      logger.debug(`Storage item retrieved: ${key}`, { 
        timestamp: new Date(item.timestamp).toISOString() 
      }, 'storage');

      emit(CONFIG.EVENTS.STATE_LOADED, { key, data: item.data });
      return item.data;

    } catch (error) {
      logger.error(`Failed to get storage item: ${key}`, error, 'storage');
      emit(CONFIG.EVENTS.STORAGE_ERROR, { operation: 'get', key, error });
      return defaultValue;
    }
  }

  /**
   * Remove item from storage
   * @param {string} key - Storage key
   */
  removeItem(key) {
    try {
      const storageKey = this.getKey(key);

      if (this.isSupported) {
        localStorage.removeItem(storageKey);
      } else {
        this.memoryStorage.delete(storageKey);
      }

      logger.debug(`Storage item removed: ${key}`, null, 'storage');
      return true;

    } catch (error) {
      logger.error(`Failed to remove storage item: ${key}`, error, 'storage');
      emit(CONFIG.EVENTS.STORAGE_ERROR, { operation: 'remove', key, error });
      return false;
    }
  }

  /**
   * Check if item exists in storage
   * @param {string} key - Storage key
   */
  hasItem(key) {
    const storageKey = this.getKey(key);
    
    if (this.isSupported) {
      return localStorage.getItem(storageKey) !== null;
    } else {
      return this.memoryStorage.has(storageKey);
    }
  }

  /**
   * Clear all application storage
   */
  clear() {
    try {
      if (this.isSupported) {
        // Remove only items with our prefix
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } else {
        // Clear memory storage
        const keysToRemove = [];
        for (const key of this.memoryStorage.keys()) {
          if (key.startsWith(this.prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => this.memoryStorage.delete(key));
      }

      logger.info('Storage cleared', null, 'storage');
      return true;

    } catch (error) {
      logger.error('Failed to clear storage', error, 'storage');
      emit(CONFIG.EVENTS.STORAGE_ERROR, { operation: 'clear', error });
      return false;
    }
  }

  /**
   * Get storage usage statistics
   */
  getStats() {
    try {
      let totalSize = 0;
      let itemCount = 0;
      const items = [];

      if (this.isSupported) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            const value = localStorage.getItem(key);
            const size = new Blob([value]).size;
            totalSize += size;
            itemCount++;
            items.push({
              key: key.replace(this.prefix, ''),
              size,
              timestamp: this.getItemTimestamp(key.replace(this.prefix, ''))
            });
          }
        }
      } else {
        for (const [key, value] of this.memoryStorage.entries()) {
          if (key.startsWith(this.prefix)) {
            const size = new Blob([value]).size;
            totalSize += size;
            itemCount++;
            items.push({
              key: key.replace(this.prefix, ''),
              size,
              timestamp: this.getItemTimestamp(key.replace(this.prefix, ''))
            });
          }
        }
      }

      return {
        totalSize,
        itemCount,
        items,
        storageType: this.isSupported ? 'localStorage' : 'memory'
      };

    } catch (error) {
      logger.error('Failed to get storage stats', error, 'storage');
      return null;
    }
  }

  /**
   * Get timestamp of stored item
   * @param {string} key - Storage key
   */
  getItemTimestamp(key) {
    try {
      const item = this.getItem(key);
      return item && item.timestamp ? new Date(item.timestamp) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clean up expired items
   */
  cleanup() {
    try {
      let cleanedCount = 0;
      const keysToCheck = [];

      if (this.isSupported) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.prefix)) {
            keysToCheck.push(key.replace(this.prefix, ''));
          }
        }
      } else {
        for (const key of this.memoryStorage.keys()) {
          if (key.startsWith(this.prefix)) {
            keysToCheck.push(key.replace(this.prefix, ''));
          }
        }
      }

      keysToCheck.forEach(key => {
        const item = this.getItem(key);
        if (item === null) { // Will be null if expired and auto-removed
          cleanedCount++;
        }
      });

      logger.info(`Storage cleanup completed`, { cleanedCount }, 'storage');
      return cleanedCount;

    } catch (error) {
      logger.error('Storage cleanup failed', error, 'storage');
      return 0;
    }
  }

  /**
   * Export all storage data
   */
  exportData() {
    try {
      const data = {};
      const stats = this.getStats();
      
      if (stats && stats.items) {
        stats.items.forEach(item => {
          const itemData = this.getItem(item.key);
          if (itemData !== null) {
            data[item.key] = itemData;
          }
        });
      }

      return {
        data,
        metadata: {
          exportDate: new Date().toISOString(),
          version: CONFIG.APP.VERSION,
          itemCount: Object.keys(data).length
        }
      };

    } catch (error) {
      logger.error('Failed to export storage data', error, 'storage');
      return null;
    }
  }

  /**
   * Import storage data
   * @param {Object} exportedData - Previously exported data
   */
  importData(exportedData) {
    try {
      if (!exportedData || !exportedData.data) {
        throw new Error('Invalid export data format');
      }

      let importedCount = 0;
      const { data } = exportedData;

      Object.keys(data).forEach(key => {
        if (this.setItem(key, data[key])) {
          importedCount++;
        }
      });

      logger.info(`Storage data imported`, { importedCount }, 'storage');
      return importedCount;

    } catch (error) {
      logger.error('Failed to import storage data', error, 'storage');
      return 0;
    }
  }
}

// Create singleton instance
const storage = new StorageManager();

// Convenience functions for common storage operations
export const saveProgress = (progressData) => {
  return storage.setItem(CONFIG.STORAGE.KEYS.PROGRESS, progressData);
};

export const loadProgress = () => {
  return storage.getItem(CONFIG.STORAGE.KEYS.PROGRESS, {
    overall: 0,
    categories: {},
    completedItems: 0,
    totalItems: 0,
    lastUpdated: null
  });
};

export const saveUIState = (uiState) => {
  return storage.setItem(CONFIG.STORAGE.KEYS.UI_STATE, uiState);
};

export const loadUIState = () => {
  return storage.getItem(CONFIG.STORAGE.KEYS.UI_STATE, {
    expandedCategories: [],
    currentView: 'dashboard',
    theme: CONFIG.THEME.DEFAULT
  });
};

export const saveUserPreferences = (preferences) => {
  return storage.setItem(CONFIG.STORAGE.KEYS.USER_PREFERENCES, preferences);
};

export const loadUserPreferences = () => {
  return storage.getItem(CONFIG.STORAGE.KEYS.USER_PREFERENCES, {
    animations: true,
    notifications: true,
    autoSave: true
  });
};

// Auto-cleanup on page load
document.addEventListener('DOMContentLoaded', () => {
  storage.cleanup();
});

// Export storage manager and convenience functions
export { storage as default };
export const {
  setItem,
  getItem,
  removeItem,
  hasItem,
  clear,
  getStats,
  cleanup,
  exportData,
  importData
} = storage;