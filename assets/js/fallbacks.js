/**
 * Graceful Degradation and Fallback System
 * Provides fallback mechanisms for when features fail or are unavailable
 */

class FallbackSystem {
    constructor() {
        this.fallbackStrategies = new Map();
        this.featureSupport = new Map();
        this.fallbackData = new Map();
        this.isInitialized = false;
        
        // Feature detection results
        this.features = {
            localStorage: false,
            sessionStorage: false,
            css3Animations: false,
            css3Transforms: false,
            webGL: false,
            canvas: false,
            svg: false,
            fetch: false,
            promises: false,
            modules: false
        };
        
        this.init();
    }
    
    /**
     * Initialize fallback system with feature detection
     */
    init() {
        if (this.isInitialized) return;
        
        this.detectFeatures();
        this.setupDefaultFallbacks();
        this.setupDefaultData();
        
        this.isInitialized = true;
    }
    
    /**
     * Detect browser feature support
     */
    detectFeatures() {
        // Storage support
        this.features.localStorage = this.testLocalStorage();
        this.features.sessionStorage = this.testSessionStorage();
        
        // CSS feature support
        this.features.css3Animations = this.testCSS3Animations();
        this.features.css3Transforms = this.testCSS3Transforms();
        
        // Graphics support
        this.features.webGL = this.testWebGL();
        this.features.canvas = this.testCanvas();
        this.features.svg = this.testSVG();
        
        // JavaScript features
        this.features.fetch = typeof fetch !== 'undefined';
        this.features.promises = typeof Promise !== 'undefined';
        this.features.modules = this.testModuleSupport();
        
        // Store results
        Object.entries(this.features).forEach(([feature, supported]) => {
            this.featureSupport.set(feature, supported);
        });
    }
    
    /**
     * Test localStorage support
     * @returns {boolean} Whether localStorage is supported
     */
    testLocalStorage() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Test sessionStorage support
     * @returns {boolean} Whether sessionStorage is supported
     */
    testSessionStorage() {
        try {
            const test = '__sessionStorage_test__';
            sessionStorage.setItem(test, test);
            sessionStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Test CSS3 animations support
     * @returns {boolean} Whether CSS3 animations are supported
     */
    testCSS3Animations() {
        const element = document.createElement('div');
        return 'animationName' in element.style ||
               'webkitAnimationName' in element.style ||
               'mozAnimationName' in element.style;
    }
    
    /**
     * Test CSS3 transforms support
     * @returns {boolean} Whether CSS3 transforms are supported
     */
    testCSS3Transforms() {
        const element = document.createElement('div');
        return 'transform' in element.style ||
               'webkitTransform' in element.style ||
               'mozTransform' in element.style;
    }
    
    /**
     * Test WebGL support
     * @returns {boolean} Whether WebGL is supported
     */
    testWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch {
            return false;
        }
    }
    
    /**
     * Test Canvas support
     * @returns {boolean} Whether Canvas is supported
     */
    testCanvas() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext && canvas.getContext('2d'));
        } catch {
            return false;
        }
    }
    
    /**
     * Test SVG support
     * @returns {boolean} Whether SVG is supported
     */
    testSVG() {
        return !!(document.createElementNS && 
                 document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect);
    }
    
    /**
     * Test ES6 module support
     * @returns {boolean} Whether ES6 modules are supported
     */
    testModuleSupport() {
        try {
            return typeof Symbol !== 'undefined' && 
                   typeof Symbol.iterator !== 'undefined';
        } catch {
            return false;
        }
    }
    
    /**
     * Setup default fallback strategies
     */
    setupDefaultFallbacks() {
        // Storage fallbacks
        this.addFallback('localStorage', {
            test: () => this.features.localStorage,
            fallback: this.createMemoryStorage.bind(this),
            description: 'Use in-memory storage when localStorage is unavailable'
        });
        
        this.addFallback('sessionStorage', {
            test: () => this.features.sessionStorage,
            fallback: this.createMemoryStorage.bind(this),
            description: 'Use in-memory storage when sessionStorage is unavailable'
        });
        
        // Animation fallbacks
        this.addFallback('css3Animations', {
            test: () => this.features.css3Animations,
            fallback: this.disableAnimations.bind(this),
            description: 'Disable animations when CSS3 animations are not supported'
        });
        
        this.addFallback('css3Transforms', {
            test: () => this.features.css3Transforms,
            fallback: this.usePositionFallback.bind(this),
            description: 'Use position-based animations when transforms are not supported'
        });
        
        // Network fallbacks
        this.addFallback('fetch', {
            test: () => this.features.fetch,
            fallback: this.createXHRFetch.bind(this),
            description: 'Use XMLHttpRequest when fetch is not available'
        });
        
        // Graphics fallbacks
        this.addFallback('canvas', {
            test: () => this.features.canvas,
            fallback: this.useImageFallback.bind(this),
            description: 'Use static images when canvas is not supported'
        });
        
        this.addFallback('svg', {
            test: () => this.features.svg,
            fallback: this.usePNGFallback.bind(this),
            description: 'Use PNG images when SVG is not supported'
        });
    }
    
    /**
     * Setup default fallback data
     */
    setupDefaultData() {
        // Default compliance data structure
        this.fallbackData.set('complianceData', {
            categories: [
                {
                    id: 'safe-operating-mode',
                    title: 'Safe Operating Mode',
                    description: 'Basic compliance requirements',
                    items: [
                        {
                            id: 'basic-compliance',
                            title: 'Basic Compliance Check',
                            completed: false
                        }
                    ]
                }
            ],
            metadata: {
                version: '1.0.0',
                lastUpdated: new Date().toISOString(),
                totalCategories: 1,
                totalItems: 1
            }
        });
        
        // Default theme configuration
        this.fallbackData.set('themeConfig', {
            colors: {
                primary: '#d4af37',
                secondary: '#4a148c',
                background: '#0a0a1a',
                text: '#f7e7ce'
            },
            fonts: {
                heading: 'serif',
                body: 'sans-serif'
            },
            animations: {
                enabled: false,
                duration: 0
            }
        });
        
        // Default user preferences
        this.fallbackData.set('userPreferences', {
            theme: 'dark',
            animations: true,
            notifications: true,
            autoSave: true
        });
    }
    
    /**
     * Add a fallback strategy
     * @param {string} feature - Feature name
     * @param {Object} strategy - Fallback strategy configuration
     */
    addFallback(feature, strategy) {
        this.fallbackStrategies.set(feature, {
            test: strategy.test || (() => true),
            fallback: strategy.fallback || (() => {}),
            description: strategy.description || `Fallback for ${feature}`,
            enabled: strategy.enabled !== false
        });
    }
    
    /**
     * Check if a feature is supported and apply fallback if needed
     * @param {string} feature - Feature name
     * @returns {boolean} Whether feature is supported or fallback was applied
     */
    checkFeature(feature) {
        const strategy = this.fallbackStrategies.get(feature);
        if (!strategy || !strategy.enabled) {
            return this.featureSupport.get(feature) || false;
        }
        
        const isSupported = strategy.test();
        if (!isSupported) {
            try {
                strategy.fallback();
                return true; // Fallback applied successfully
            } catch (error) {
                console.warn(`Fallback failed for feature ${feature}:`, error);
                return false;
            }
        }
        
        return isSupported;
    }
    
    /**
     * Get fallback data for a specific key
     * @param {string} key - Data key
     * @param {*} defaultValue - Default value if no fallback exists
     * @returns {*} Fallback data or default value
     */
    getFallbackData(key, defaultValue = null) {
        return this.fallbackData.get(key) || defaultValue;
    }
    
    /**
     * Set fallback data for a specific key
     * @param {string} key - Data key
     * @param {*} data - Fallback data
     */
    setFallbackData(key, data) {
        this.fallbackData.set(key, data);
    }
    
    /**
     * Create in-memory storage fallback
     * @returns {Object} Memory storage implementation
     */
    createMemoryStorage() {
        const storage = new Map();
        
        return {
            getItem: (key) => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, String(value)),
            removeItem: (key) => storage.delete(key),
            clear: () => storage.clear(),
            get length() { return storage.size; },
            key: (index) => Array.from(storage.keys())[index] || null
        };
    }
    
    /**
     * Disable animations fallback
     */
    disableAnimations() {
        // Add CSS to disable all animations
        const style = document.createElement('style');
        style.textContent = `
            *, *::before, *::after {
                animation-duration: 0s !important;
                animation-delay: 0s !important;
                transition-duration: 0s !important;
                transition-delay: 0s !important;
            }
        `;
        document.head.appendChild(style);
        
        // Set global flag
        if (typeof window !== 'undefined') {
            window.ANIMATIONS_DISABLED = true;
        }
    }
    
    /**
     * Use position-based animation fallback
     */
    usePositionFallback() {
        // Create utility functions for position-based animations
        if (typeof window !== 'undefined') {
            window.animateWithPosition = function(element, from, to, duration = 300) {
                const startTime = Date.now();
                const startLeft = from.left || 0;
                const startTop = from.top || 0;
                const endLeft = to.left || 0;
                const endTop = to.top || 0;
                
                function animate() {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    const currentLeft = startLeft + (endLeft - startLeft) * progress;
                    const currentTop = startTop + (endTop - startTop) * progress;
                    
                    element.style.left = currentLeft + 'px';
                    element.style.top = currentTop + 'px';
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    }
                }
                
                animate();
            };
        }
    }
    
    /**
     * Create XMLHttpRequest-based fetch fallback
     * @returns {Function} Fetch-like function using XMLHttpRequest
     */
    createXHRFetch() {
        if (typeof window !== 'undefined') {
            window.fetch = function(url, options = {}) {
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    const method = options.method || 'GET';
                    
                    xhr.open(method, url);
                    
                    // Set headers
                    if (options.headers) {
                        Object.entries(options.headers).forEach(([key, value]) => {
                            xhr.setRequestHeader(key, value);
                        });
                    }
                    
                    xhr.onload = function() {
                        const response = {
                            ok: xhr.status >= 200 && xhr.status < 300,
                            status: xhr.status,
                            statusText: xhr.statusText,
                            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
                            text: () => Promise.resolve(xhr.responseText)
                        };
                        resolve(response);
                    };
                    
                    xhr.onerror = function() {
                        reject(new Error('Network error'));
                    };
                    
                    xhr.send(options.body || null);
                });
            };
        }
    }
    
    /**
     * Use image fallback for canvas
     */
    useImageFallback() {
        // Replace canvas elements with static images
        const canvasElements = document.querySelectorAll('canvas');
        canvasElements.forEach(canvas => {
            const img = document.createElement('img');
            img.src = canvas.dataset.fallbackSrc || '/assets/images/fallback-chart.png';
            img.alt = canvas.getAttribute('aria-label') || 'Chart visualization';
            img.className = canvas.className;
            canvas.parentNode.replaceChild(img, canvas);
        });
    }
    
    /**
     * Use PNG fallback for SVG
     */
    usePNGFallback() {
        // Replace SVG elements with PNG images
        const svgElements = document.querySelectorAll('svg');
        svgElements.forEach(svg => {
            const img = document.createElement('img');
            img.src = svg.dataset.fallbackSrc || '/assets/images/fallback-icon.png';
            img.alt = svg.getAttribute('aria-label') || 'Icon';
            img.className = svg.className;
            svg.parentNode.replaceChild(img, svg);
        });
    }
    
    /**
     * Apply all necessary fallbacks based on feature detection
     */
    applyFallbacks() {
        const results = {};
        
        this.fallbackStrategies.forEach((strategy, feature) => {
            results[feature] = this.checkFeature(feature);
        });
        
        return results;
    }
    
    /**
     * Get feature support report
     * @returns {Object} Feature support status
     */
    getFeatureReport() {
        const report = {
            supported: {},
            unsupported: {},
            fallbacksApplied: {}
        };
        
        this.featureSupport.forEach((supported, feature) => {
            if (supported) {
                report.supported[feature] = true;
            } else {
                report.unsupported[feature] = true;
                const strategy = this.fallbackStrategies.get(feature);
                if (strategy && strategy.enabled) {
                    report.fallbacksApplied[feature] = strategy.description;
                }
            }
        });
        
        return report;
    }
    
    /**
     * Enable or disable a specific fallback
     * @param {string} feature - Feature name
     * @param {boolean} enabled - Whether to enable the fallback
     */
    toggleFallback(feature, enabled) {
        const strategy = this.fallbackStrategies.get(feature);
        if (strategy) {
            strategy.enabled = enabled;
        }
    }
    
    /**
     * Reset all fallbacks to default state
     */
    reset() {
        this.fallbackStrategies.clear();
        this.featureSupport.clear();
        this.fallbackData.clear();
        this.isInitialized = false;
        this.init();
    }
}

// Create singleton instance
const fallbackSystem = new FallbackSystem();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FallbackSystem;
} else {
    window.FallbackSystem = FallbackSystem;
    window.fallbackSystem = fallbackSystem;
}