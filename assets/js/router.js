/**
 * Router Module
 * Simple client-side routing for navigation (if needed for future expansion)
 */

import { CONFIG } from './config.js';
import logger from './logger.js';
import { emit, on } from './events.js';
import stateManager from './state-manager.js';

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.basePath = '';
    this.hashMode = true; // Use hash-based routing for simplicity
    
    this.initialize();
    
    logger.info('Router initialized', { hashMode: this.hashMode }, 'router');
  }

  /**
   * Initialize router
   */
  initialize() {
    // Set up default routes
    this.setupDefaultRoutes();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Handle initial route
    this.handleInitialRoute();
  }

  /**
   * Set up default routes for the compliance dashboard
   */
  setupDefaultRoutes() {
    // Main dashboard view
    this.addRoute('/', {
      name: 'dashboard',
      title: 'Compliance Dashboard',
      handler: () => this.showDashboard()
    });

    // Category detail view
    this.addRoute('/category/:id', {
      name: 'category',
      title: 'Category Details',
      handler: (params) => this.showCategory(params.id)
    });

    // Export view
    this.addRoute('/export', {
      name: 'export',
      title: 'Export Reports',
      handler: () => this.showExport()
    });

    // Settings view (for future use)
    this.addRoute('/settings', {
      name: 'settings',
      title: 'Settings',
      handler: () => this.showSettings()
    });

    logger.debug('Default routes configured', { routeCount: this.routes.size }, 'router');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    if (this.hashMode) {
      window.addEventListener('hashchange', () => {
        this.handleRouteChange();
      });
    } else {
      window.addEventListener('popstate', (event) => {
        this.handleRouteChange(event.state);
      });
    }

    // Listen for programmatic navigation
    on('router:navigate', (data) => {
      this.navigate(data.path, data.options);
    });
  }

  /**
   * Add a route
   * @param {string} path - Route path with optional parameters (:id)
   * @param {Object} config - Route configuration
   */
  addRoute(path, config) {
    const route = {
      path,
      pattern: this.pathToRegex(path),
      ...config
    };
    
    this.routes.set(path, route);
    
    logger.debug(`Route added: ${path}`, config, 'router');
  }

  /**
   * Convert path to regex pattern
   * @param {string} path - Route path
   */
  pathToRegex(path) {
    // Convert :param to named capture groups
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:([^\/]+)/g, '(?<$1>[^\/]+)');
    
    return new RegExp(`^${pattern}$`);
  }

  /**
   * Navigate to a route
   * @param {string} path - Target path
   * @param {Object} options - Navigation options
   */
  navigate(path, options = {}) {
    try {
      const { replace = false, state = null } = options;
      
      logger.debug(`Navigating to: ${path}`, { replace, state }, 'router');

      if (this.hashMode) {
        if (replace) {
          window.location.replace(`#${path}`);
        } else {
          window.location.hash = path;
        }
      } else {
        if (replace) {
          window.history.replaceState(state, '', `${this.basePath}${path}`);
        } else {
          window.history.pushState(state, '', `${this.basePath}${path}`);
        }
        this.handleRouteChange(state);
      }

    } catch (error) {
      logger.error(`Navigation failed: ${path}`, error, 'router');
    }
  }

  /**
   * Handle initial route on page load
   */
  handleInitialRoute() {
    const path = this.getCurrentPath();
    this.handleRoute(path);
  }

  /**
   * Handle route changes
   * @param {*} state - History state
   */
  handleRouteChange(state = null) {
    const path = this.getCurrentPath();
    this.handleRoute(path, state);
  }

  /**
   * Get current path
   */
  getCurrentPath() {
    if (this.hashMode) {
      return window.location.hash.slice(1) || '/';
    } else {
      return window.location.pathname.replace(this.basePath, '') || '/';
    }
  }

  /**
   * Handle route matching and execution
   * @param {string} path - Current path
   * @param {*} state - History state
   */
  handleRoute(path, state = null) {
    try {
      logger.debug(`Handling route: ${path}`, { state }, 'router');

      // Find matching route
      const matchedRoute = this.findMatchingRoute(path);
      
      if (!matchedRoute) {
        logger.warn(`No route found for: ${path}`, null, 'router');
        this.handle404(path);
        return;
      }

      // Extract parameters
      const params = this.extractParams(path, matchedRoute);
      
      // Update current route
      this.currentRoute = {
        ...matchedRoute,
        path,
        params,
        state
      };

      // Update page title
      if (matchedRoute.title) {
        document.title = `${matchedRoute.title} - ${CONFIG.APP.NAME}`;
      }

      // Update state manager
      stateManager.setState('ui.currentView', matchedRoute.name);

      // Execute route handler
      if (matchedRoute.handler) {
        matchedRoute.handler(params, state);
      }

      // Emit route change event
      emit(CONFIG.EVENTS.VIEW_CHANGED, {
        route: matchedRoute.name,
        path,
        params,
        state
      });

      logger.info(`Route handled: ${matchedRoute.name}`, { path, params }, 'router');

    } catch (error) {
      logger.error(`Route handling failed: ${path}`, error, 'router');
      this.handleRouteError(path, error);
    }
  }

  /**
   * Find matching route for path
   * @param {string} path - Path to match
   */
  findMatchingRoute(path) {
    for (const route of this.routes.values()) {
      if (route.pattern.test(path)) {
        return route;
      }
    }
    return null;
  }

  /**
   * Extract parameters from path
   * @param {string} path - Current path
   * @param {Object} route - Matched route
   */
  extractParams(path, route) {
    const match = path.match(route.pattern);
    return match ? match.groups || {} : {};
  }

  /**
   * Handle 404 errors
   * @param {string} path - Requested path
   */
  handle404(path) {
    logger.warn(`404 - Route not found: ${path}`, null, 'router');
    
    // Redirect to dashboard
    this.navigate('/', { replace: true });
    
    // Show notification
    emit('notification:show', {
      message: 'Page not found. Redirected to dashboard.',
      type: 'warning'
    });
  }

  /**
   * Handle route errors
   * @param {string} path - Current path
   * @param {Error} error - Route error
   */
  handleRouteError(path, error) {
    logger.error(`Route error: ${path}`, error, 'router');
    
    // Redirect to dashboard
    this.navigate('/', { replace: true });
    
    // Show error notification
    emit('notification:show', {
      message: 'An error occurred while loading the page.',
      type: 'error'
    });
  }

  /**
   * Route handlers
   */
  showDashboard() {
    logger.debug('Showing dashboard view', null, 'router');
    
    // Show main dashboard components
    this.showView('dashboard');
  }

  showCategory(categoryId) {
    logger.debug(`Showing category view: ${categoryId}`, null, 'router');
    
    // Expand specific category
    emit(CONFIG.EVENTS.CATEGORY_EXPANDED, { categoryId });
    
    // Show category view
    this.showView('category', { categoryId });
  }

  showExport() {
    logger.debug('Showing export view', null, 'router');
    
    // Show export interface
    this.showView('export');
  }

  showSettings() {
    logger.debug('Showing settings view', null, 'router');
    
    // Show settings interface
    this.showView('settings');
  }

  /**
   * Show specific view
   * @param {string} viewName - View name
   * @param {Object} data - View data
   */
  showView(viewName, data = {}) {
    // Hide all views
    document.querySelectorAll('[data-view]').forEach(view => {
      view.style.display = 'none';
    });

    // Show target view
    const targetView = document.querySelector(`[data-view="${viewName}"]`);
    if (targetView) {
      targetView.style.display = 'block';
    }

    // Emit view change event
    emit('view:changed', { viewName, data });
  }

  /**
   * Get current route information
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Check if current route matches
   * @param {string} routeName - Route name to check
   */
  isCurrentRoute(routeName) {
    return this.currentRoute && this.currentRoute.name === routeName;
  }

  /**
   * Get route by name
   * @param {string} name - Route name
   */
  getRouteByName(name) {
    for (const route of this.routes.values()) {
      if (route.name === name) {
        return route;
      }
    }
    return null;
  }

  /**
   * Generate URL for route
   * @param {string} routeName - Route name
   * @param {Object} params - Route parameters
   */
  generateUrl(routeName, params = {}) {
    const route = this.getRouteByName(routeName);
    if (!route) {
      logger.warn(`Route not found: ${routeName}`, null, 'router');
      return '/';
    }

    let path = route.path;
    
    // Replace parameters
    Object.keys(params).forEach(key => {
      path = path.replace(`:${key}`, params[key]);
    });

    return path;
  }

  /**
   * Set base path for non-hash routing
   * @param {string} basePath - Base path
   */
  setBasePath(basePath) {
    this.basePath = basePath;
    logger.debug(`Base path set: ${basePath}`, null, 'router');
  }

  /**
   * Enable or disable hash mode
   * @param {boolean} enabled - Hash mode enabled
   */
  setHashMode(enabled) {
    this.hashMode = enabled;
    logger.debug(`Hash mode: ${enabled}`, null, 'router');
  }
}

// Create singleton instance
const router = new Router();

// Export convenience functions
export const navigate = (path, options) => router.navigate(path, options);
export const addRoute = (path, config) => router.addRoute(path, config);
export const getCurrentRoute = () => router.getCurrentRoute();
export const isCurrentRoute = (routeName) => router.isCurrentRoute(routeName);
export const generateUrl = (routeName, params) => router.generateUrl(routeName, params);

// Export router instance
export default router;