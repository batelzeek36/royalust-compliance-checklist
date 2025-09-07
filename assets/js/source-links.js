/**
 * Source Links Module
 * Manages external reference integration, link validation, and tracking
 * Part of the Royalust Compliance Dashboard modular architecture
 */

class SourceLinksManager {
    constructor(options = {}) {
        this.options = {
            validateLinks: true,
            trackClicks: true,
            cacheValidation: true,
            validationTimeout: 5000,
            retryAttempts: 2,
            ...options
        };
        
        this.linkCache = new Map();
        this.validationCache = new Map();
        this.clickTracking = new Map();
        this.linkTypes = new Map();
        this.eventListeners = new Map();
        
        this.init();
    }

    init() {
        this.registerLinkTypes();
        this.bindEvents();
        this.loadCachedData();
    }

    // Link Type Registration
    registerLinkTypes() {
        // Government and regulatory sources
        this.linkTypes.set('hawaii-county', {
            name: 'Hawaii County',
            baseUrl: 'https://www.hawaiicounty.gov',
            icon: '🏛️',
            category: 'government',
            validation: {
                required: true,
                timeout: 10000
            }
        });
        
        this.linkTypes.set('hawaii-state', {
            name: 'State of Hawaii',
            baseUrl: 'https://www.hawaii.gov',
            icon: '🌺',
            category: 'government',
            validation: {
                required: true,
                timeout: 10000
            }
        });
        
        this.linkTypes.set('doh', {
            name: 'Department of Health',
            baseUrl: 'https://health.hawaii.gov',
            icon: '🏥',
            category: 'health',
            validation: {
                required: true,
                timeout: 8000
            }
        });
        
        this.linkTypes.set('planning', {
            name: 'Planning Department',
            baseUrl: 'https://www.hawaiicounty.gov/departments/planning',
            icon: '📋',
            category: 'planning',
            validation: {
                required: true,
                timeout: 8000
            }
        });
        
        this.linkTypes.set('tax', {
            name: 'Tax Office',
            baseUrl: 'https://www.hawaiicounty.gov/departments/finance',
            icon: '💰',
            category: 'finance',
            validation: {
                required: true,
                timeout: 8000
            }
        });
        
        // Legal and regulatory codes
        this.linkTypes.set('hcc', {
            name: 'Hawaii County Code',
            baseUrl: 'https://www.hawaiicounty.gov/i-want-to/read/county-code',
            icon: '📖',
            category: 'legal',
            validation: {
                required: true,
                timeout: 8000
            }
        });
        
        this.linkTypes.set('hrs', {
            name: 'Hawaii Revised Statutes',
            baseUrl: 'https://www.capitol.hawaii.gov/hrscurrent',
            icon: '⚖️',
            category: 'legal',
            validation: {
                required: true,
                timeout: 8000
            }
        });
        
        // External resources
        this.linkTypes.set('external', {
            name: 'External Resource',
            baseUrl: null,
            icon: '🔗',
            category: 'external',
            validation: {
                required: false,
                timeout: 5000
            }
        });
    }

    // Link Management
    registerLink(linkId, linkData) {
        if (!linkId || !linkData || !linkData.url) {
            throw new Error('Link ID and URL are required');
        }
        
        const processedLink = {
            id: linkId,
            url: linkData.url,
            title: linkData.title || 'Untitled Link',
            description: linkData.description || '',
            type: this.detectLinkType(linkData.url),
            category: linkData.category || 'external',
            priority: linkData.priority || 'medium',
            lastValidated: null,
            isValid: null,
            clickCount: 0,
            lastClicked: null,
            metadata: linkData.metadata || {},
            ...linkData
        };
        
        this.linkCache.set(linkId, processedLink);
        
        // Validate link if enabled
        if (this.options.validateLinks) {
            this.validateLink(linkId);
        }
        
        this.dispatchEvent('link-registered', { linkId, linkData: processedLink });
        return processedLink;
    }

    detectLinkType(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            // Check against registered link types
            for (const [typeId, typeData] of this.linkTypes) {
                if (typeData.baseUrl) {
                    const baseUrlObj = new URL(typeData.baseUrl);
                    if (hostname === baseUrlObj.hostname || hostname.endsWith('.' + baseUrlObj.hostname)) {
                        return typeId;
                    }
                }
            }
            
            // Special cases for Hawaii government sites
            if (hostname.includes('hawaii') && hostname.includes('gov')) {
                if (hostname.includes('county')) return 'hawaii-county';
                if (hostname.includes('health')) return 'doh';
                return 'hawaii-state';
            }
            
            return 'external';
        } catch (e) {
            return 'external';
        }
    }

    // Link Validation
    async validateLink(linkId, force = false) {
        const link = this.linkCache.get(linkId);
        if (!link) {
            throw new Error(`Link not found: ${linkId}`);
        }
        
        // Check cache if not forcing validation
        if (!force && this.validationCache.has(linkId)) {
            const cached = this.validationCache.get(linkId);
            const cacheAge = Date.now() - cached.timestamp;
            
            // Use cached result if less than 1 hour old
            if (cacheAge < 3600000) {
                return cached.result;
            }
        }
        
        const linkType = this.linkTypes.get(link.type);
        const timeout = linkType ? linkType.validation.timeout : this.options.validationTimeout;
        
        try {
            const result = await this.performLinkValidation(link.url, timeout);
            
            // Update link data
            link.isValid = result.isValid;
            link.lastValidated = new Date().toISOString();
            link.validationError = result.error;
            link.responseTime = result.responseTime;
            link.statusCode = result.statusCode;
            
            // Cache result
            if (this.options.cacheValidation) {
                this.validationCache.set(linkId, {
                    result,
                    timestamp: Date.now()
                });
            }
            
            this.dispatchEvent('link-validated', {
                linkId,
                isValid: result.isValid,
                error: result.error,
                responseTime: result.responseTime
            });
            
            return result;
        } catch (error) {
            link.isValid = false;
            link.lastValidated = new Date().toISOString();
            link.validationError = error.message;
            
            this.dispatchEvent('link-validation-failed', {
                linkId,
                error: error.message
            });
            
            throw error;
        }
    }

    async performLinkValidation(url, timeout) {
        const startTime = Date.now();
        
        try {
            // Use fetch with timeout for validation
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, {
                method: 'HEAD', // Use HEAD to avoid downloading content
                signal: controller.signal,
                mode: 'no-cors' // Handle CORS issues
            });
            
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            
            return {
                isValid: true,
                statusCode: response.status,
                responseTime,
                error: null
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            // Handle different error types
            if (error.name === 'AbortError') {
                return {
                    isValid: false,
                    statusCode: null,
                    responseTime,
                    error: 'Request timeout'
                };
            }
            
            // For no-cors mode, we can't access the response status
            // So we'll consider it valid if no network error occurred
            if (error.message.includes('CORS') || error.message.includes('opaque')) {
                return {
                    isValid: true,
                    statusCode: null,
                    responseTime,
                    error: null
                };
            }
            
            return {
                isValid: false,
                statusCode: null,
                responseTime,
                error: error.message
            };
        }
    }

    async validateAllLinks(categoryFilter = null) {
        const results = [];
        const links = Array.from(this.linkCache.values());
        
        // Filter by category if specified
        const linksToValidate = categoryFilter 
            ? links.filter(link => link.category === categoryFilter)
            : links;
        
        // Validate links in batches to avoid overwhelming the network
        const batchSize = 5;
        for (let i = 0; i < linksToValidate.length; i += batchSize) {
            const batch = linksToValidate.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (link) => {
                try {
                    const result = await this.validateLink(link.id);
                    return { linkId: link.id, success: true, result };
                } catch (error) {
                    return { linkId: link.id, success: false, error: error.message };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches
            if (i + batchSize < linksToValidate.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        this.dispatchEvent('bulk-validation-complete', {
            totalLinks: linksToValidate.length,
            results
        });
        
        return results;
    }

    // Click Tracking
    trackLinkClick(linkId, context = {}) {
        if (!this.options.trackClicks) return;
        
        const link = this.linkCache.get(linkId);
        if (!link) return;
        
        const clickData = {
            linkId,
            url: link.url,
            title: link.title,
            timestamp: new Date().toISOString(),
            context: {
                userAgent: navigator.userAgent,
                referrer: document.referrer,
                ...context
            }
        };
        
        // Update link statistics
        link.clickCount++;
        link.lastClicked = clickData.timestamp;
        
        // Store click data
        if (!this.clickTracking.has(linkId)) {
            this.clickTracking.set(linkId, []);
        }
        
        const clicks = this.clickTracking.get(linkId);
        clicks.push(clickData);
        
        // Keep only last 50 clicks per link
        if (clicks.length > 50) {
            clicks.splice(0, clicks.length - 50);
        }
        
        this.dispatchEvent('link-clicked', clickData);
        
        // Save to localStorage
        this.saveLinkStatistics(linkId);
    }

    // Link Rendering
    renderLink(linkId, options = {}) {
        const link = this.linkCache.get(linkId);
        if (!link) return null;
        
        const {
            showIcon = true,
            showValidation = true,
            showClickCount = false,
            className = 'source-link',
            target = '_blank'
        } = options;
        
        const linkType = this.linkTypes.get(link.type);
        const icon = showIcon && linkType ? linkType.icon : '';
        const validationClass = this.getValidationClass(link);
        const clickHandler = `handleSourceLinkClick('${linkId}', event)`;
        
        return `
            <a href="${this.escapeHtml(link.url)}" 
               target="${target}" 
               rel="noopener noreferrer"
               class="${className} ${validationClass} link-type-${link.type}"
               data-link-id="${linkId}"
               data-link-type="${link.type}"
               onclick="${clickHandler}"
               title="${this.escapeHtml(link.description || link.title)}">
                ${icon ? `<span class="link-icon">${icon}</span>` : ''}
                <span class="link-title">${this.escapeHtml(link.title)}</span>
                ${showValidation ? this.renderValidationIndicator(link) : ''}
                ${showClickCount ? `<span class="click-count">(${link.clickCount})</span>` : ''}
                <span class="external-indicator">↗</span>
            </a>
        `;
    }

    renderValidationIndicator(link) {
        if (link.isValid === null) {
            return '<span class="validation-indicator unknown" title="Not validated">?</span>';
        } else if (link.isValid) {
            return '<span class="validation-indicator valid" title="Link verified">✓</span>';
        } else {
            return '<span class="validation-indicator invalid" title="Link may be broken">⚠</span>';
        }
    }

    renderLinksList(linkIds, options = {}) {
        const {
            groupByType = false,
            showValidation = true,
            showStatistics = false,
            className = 'source-links-list'
        } = options;
        
        if (!linkIds || linkIds.length === 0) {
            return '<div class="no-links">No reference sources available</div>';
        }
        
        const links = linkIds.map(id => this.linkCache.get(id)).filter(Boolean);
        
        if (groupByType) {
            return this.renderGroupedLinks(links, options);
        }
        
        const linksHtml = links.map(link => 
            this.renderLink(link.id, options)
        ).join('');
        
        return `
            <div class="${className}">
                ${linksHtml}
            </div>
        `;
    }

    renderGroupedLinks(links, options = {}) {
        const groups = new Map();
        
        // Group links by type
        links.forEach(link => {
            const type = link.type;
            if (!groups.has(type)) {
                groups.set(type, []);
            }
            groups.get(type).push(link);
        });
        
        const groupsHtml = Array.from(groups.entries()).map(([type, typeLinks]) => {
            const linkType = this.linkTypes.get(type);
            const typeName = linkType ? linkType.name : 'Other';
            const typeIcon = linkType ? linkType.icon : '🔗';
            
            const linksHtml = typeLinks.map(link => 
                this.renderLink(link.id, options)
            ).join('');
            
            return `
                <div class="link-group link-group-${type}">
                    <h6 class="link-group-title">
                        <span class="group-icon">${typeIcon}</span>
                        ${this.escapeHtml(typeName)}
                    </h6>
                    <div class="link-group-items">
                        ${linksHtml}
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="source-links-grouped">
                ${groupsHtml}
            </div>
        `;
    }

    // Statistics and Analytics
    getLinkStatistics(linkId) {
        const link = this.linkCache.get(linkId);
        if (!link) return null;
        
        const clicks = this.clickTracking.get(linkId) || [];
        
        return {
            linkId,
            title: link.title,
            url: link.url,
            type: link.type,
            isValid: link.isValid,
            lastValidated: link.lastValidated,
            clickCount: link.clickCount,
            lastClicked: link.lastClicked,
            recentClicks: clicks.slice(-10),
            validationHistory: this.getValidationHistory(linkId)
        };
    }

    getValidationHistory(linkId) {
        // This would be enhanced to track validation history over time
        const link = this.linkCache.get(linkId);
        if (!link) return [];
        
        return [{
            timestamp: link.lastValidated,
            isValid: link.isValid,
            error: link.validationError,
            responseTime: link.responseTime
        }].filter(entry => entry.timestamp);
    }

    getAllStatistics() {
        const stats = {
            totalLinks: this.linkCache.size,
            validLinks: 0,
            invalidLinks: 0,
            unvalidatedLinks: 0,
            totalClicks: 0,
            linksByType: {},
            linksByCategory: {}
        };
        
        this.linkCache.forEach(link => {
            // Validation stats
            if (link.isValid === true) stats.validLinks++;
            else if (link.isValid === false) stats.invalidLinks++;
            else stats.unvalidatedLinks++;
            
            // Click stats
            stats.totalClicks += link.clickCount;
            
            // Type stats
            if (!stats.linksByType[link.type]) {
                stats.linksByType[link.type] = 0;
            }
            stats.linksByType[link.type]++;
            
            // Category stats
            if (!stats.linksByCategory[link.category]) {
                stats.linksByCategory[link.category] = 0;
            }
            stats.linksByCategory[link.category]++;
        });
        
        return stats;
    }

    // Event Handling
    bindEvents() {
        // Global click handler for source links
        document.addEventListener('click', (event) => {
            const linkElement = event.target.closest('[data-link-id]');
            if (linkElement) {
                const linkId = linkElement.dataset.linkId;
                this.trackLinkClick(linkId, {
                    elementId: linkElement.id,
                    elementClass: linkElement.className
                });
            }
        });
    }

    addEventListener(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }

    dispatchEvent(eventName, detail) {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(detail);
                } catch (e) {
                    console.error(`Error in source links event listener for ${eventName}:`, e);
                }
            });
        }
        
        // Also dispatch as DOM event
        const event = new CustomEvent(`source-links:${eventName}`, {
            detail,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Utility Methods
    getValidationClass(link) {
        if (link.isValid === null) return 'validation-unknown';
        return link.isValid ? 'validation-valid' : 'validation-invalid';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Data Persistence
    saveLinkStatistics(linkId) {
        const link = this.linkCache.get(linkId);
        const clicks = this.clickTracking.get(linkId);
        
        if (link) {
            const data = {
                clickCount: link.clickCount,
                lastClicked: link.lastClicked,
                recentClicks: clicks ? clicks.slice(-10) : []
            };
            
            localStorage.setItem(`source-link-stats-${linkId}`, JSON.stringify(data));
        }
    }

    loadCachedData() {
        // Load cached validation results and statistics
        // This would be called during initialization
    }

    // Public API
    getLink(linkId) {
        return this.linkCache.get(linkId);
    }

    getAllLinks() {
        return Array.from(this.linkCache.values());
    }

    getLinksByType(type) {
        return Array.from(this.linkCache.values()).filter(link => link.type === type);
    }

    getLinksByCategory(category) {
        return Array.from(this.linkCache.values()).filter(link => link.category === category);
    }

    searchLinks(query, options = {}) {
        const { caseSensitive = false, searchFields = ['title', 'description', 'url'] } = options;
        const searchTerm = caseSensitive ? query : query.toLowerCase();
        
        return Array.from(this.linkCache.values()).filter(link => {
            return searchFields.some(field => {
                const value = link[field];
                if (!value) return false;
                const searchValue = caseSensitive ? value : value.toLowerCase();
                return searchValue.includes(searchTerm);
            });
        });
    }
}

// Global click handler function for inline onclick attributes
function handleSourceLinkClick(linkId, event) {
    if (window.sourceLinksManager) {
        window.sourceLinksManager.trackLinkClick(linkId, {
            clickType: 'inline',
            elementTag: event.target.tagName
        });
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SourceLinksManager;
}

// Global registration for direct script inclusion
if (typeof window !== 'undefined') {
    window.SourceLinksManager = SourceLinksManager;
    window.handleSourceLinkClick = handleSourceLinkClick;
}