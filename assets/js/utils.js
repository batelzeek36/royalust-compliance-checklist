/**
 * Utils Module
 * Common utility functions for the Royalust Compliance application
 */

import { CONFIG } from './config.js';
import logger from './logger.js';

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 */
export function debounce(func, wait = CONFIG.UI.DEBOUNCE_DELAY, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 */
export function throttle(func, limit = CONFIG.UI.DEBOUNCE_DELAY) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
}

/**
 * Deep merge objects
 * @param {Object} target - Target object
 * @param {...Object} sources - Source objects to merge
 */
export function deepMerge(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * Check if value is an object
 * @param {*} item - Item to check
 */
export function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Generate unique ID
 * @param {string} prefix - Optional prefix
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format percentage with specified decimal places
 * @param {number} value - Value to format
 * @param {number} total - Total value
 * @param {number} decimals - Decimal places
 */
export function formatPercentage(value, total, decimals = CONFIG.PROGRESS.DECIMAL_PLACES) {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Calculate progress percentage
 * @param {number} completed - Completed items
 * @param {number} total - Total items
 */
export function calculateProgress(completed, total) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100 * Math.pow(10, CONFIG.PROGRESS.DECIMAL_PLACES)) / Math.pow(10, CONFIG.PROGRESS.DECIMAL_PLACES);
}

/**
 * Determine risk level based on progress
 * @param {number} progress - Progress percentage
 */
export function getRiskLevel(progress) {
  const thresholds = CONFIG.PROGRESS.RISK_THRESHOLDS;
  if (progress >= thresholds.LOW) return 'low';
  if (progress >= thresholds.MEDIUM) return 'medium';
  if (progress >= thresholds.HIGH) return 'high';
  return 'critical';
}

/**
 * Get risk level color
 * @param {string} riskLevel - Risk level
 */
export function getRiskColor(riskLevel) {
  const colors = {
    low: 'var(--success-green)',
    medium: 'var(--warning-amber)',
    high: 'var(--error-red)',
    critical: 'var(--error-red)'
  };
  return colors[riskLevel] || colors.critical;
}

/**
 * Sanitize HTML string
 * @param {string} str - String to sanitize
 */
export function sanitizeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Escape regex special characters
 * @param {string} str - String to escape
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 */
export function formatDate(date, options = {}) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Get relative time string
 * @param {Date|string} date - Date to compare
 */
export function getRelativeTime(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDate(dateObj, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get element position relative to viewport
 * @param {Element} element - DOM element
 */
export function getElementPosition(element) {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Check if element is in viewport
 * @param {Element} element - DOM element
 * @param {number} threshold - Visibility threshold (0-1)
 */
export function isInViewport(element, threshold = 0.1) {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;
  
  const vertInView = (rect.top <= windowHeight) && ((rect.top + rect.height) >= 0);
  const horInView = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0);
  
  return vertInView && horInView;
}

/**
 * Smooth scroll to element
 * @param {Element|string} target - Element or selector
 * @param {Object} options - Scroll options
 */
export function scrollToElement(target, options = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) {
    logger.warn('Scroll target not found', { target }, 'utils');
    return;
  }

  const defaultOptions = {
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest'
  };

  element.scrollIntoView({ ...defaultOptions, ...options });
}

/**
 * Create and download file
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
  
  logger.info('File downloaded', { filename, size: blob.size }, 'utils');
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
    logger.info('Text copied to clipboard', { length: text.length }, 'utils');
    return true;
  } catch (error) {
    logger.error('Failed to copy to clipboard', error, 'utils');
    return false;
  }
}

/**
 * Wait for specified time
 * @param {number} ms - Milliseconds to wait
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 */
export async function retry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms`, {
        error: error.message
      }, 'utils');
      
      await sleep(delay);
    }
  }
}

/**
 * Create a cancelable promise
 * @param {Promise} promise - Promise to make cancelable
 */
export function makeCancelable(promise) {
  let isCanceled = false;
  
  const wrappedPromise = new Promise((resolve, reject) => {
    promise
      .then(value => isCanceled ? reject(new Error('Canceled')) : resolve(value))
      .catch(error => isCanceled ? reject(new Error('Canceled')) : reject(error));
  });
  
  return {
    promise: wrappedPromise,
    cancel: () => { isCanceled = true; }
  };
}

// Export all utilities as default object
export default {
  debounce,
  throttle,
  deepClone,
  deepMerge,
  isObject,
  generateId,
  formatPercentage,
  calculateProgress,
  getRiskLevel,
  getRiskColor,
  sanitizeHtml,
  escapeRegex,
  formatDate,
  getRelativeTime,
  isValidEmail,
  isValidUrl,
  getElementPosition,
  isInViewport,
  scrollToElement,
  downloadFile,
  copyToClipboard,
  sleep,
  retry,
  makeCancelable
};