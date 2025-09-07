/**
 * Checklist Search Module
 * Provides filtering and searching capabilities for checklist items
 * Part of the Royalust Compliance Dashboard modular architecture
 */

class ChecklistSearch {
    constructor(options = {}) {
        this.options = {
            caseSensitive: false,
            fuzzySearch: true,
            highlightMatches: true,
            searchDelay: 300,
            maxResults: 100,
            enableFilters: true,
            enableSorting: true,
            ...options
        };
        
        this.searchIndex = new Map();
        this.filters = new Map();
        this.sortOptions = new Map();
        this.searchHistory = [];
        this.currentQuery = '';
        this.currentFilters = {};
        this.currentSort = { field: 'title', direction: 'asc' };
        this.searchTimeout = null;
        this.eventListeners = new Map();
        
        this.init();
    }

    init() {
        this.setupDefaultFilters();
        this.setupDefaultSortOptions();
        this.bindEvents();
    }

    // Search Index Management
    buildSearchIndex(items) {
        this.searchIndex.clear();
        
        items.forEach(item => {
            const indexEntry = this.createIndexEntry(item);
            this.searchIndex.set(item.id, indexEntry);
        });
        
        this.dispatchEvent('index-built', {
            totalItems: items.length,
            indexSize: this.searchIndex.size
        });
    }

    createIndexEntry(item) {
        const searchableText = this.extractSearchableText(item);
        const keywords = this.extractKeywords(searchableText);
        
        return {
            id: item.id,
            categoryId: item.categoryId,
            title: item.title || '',
            description: item.description || '',
            searchableText,
            keywords,
            priority: item.priority || 'medium',
            riskLevel: item.riskLevel || 'medium',
            completed: item.completed || false,
            tags: item.tags || [],
            sources: item.sources || [],
            dependencies: item.dependencies || [],
            lastModified: item.lastModified || new Date().toISOString(),
            originalItem: item
        };
    }

    extractSearchableText(item) {
        const textParts = [
            item.title || '',
            item.description || '',
            ...(item.tags || []),
            ...(item.sources || []).map(source => source.title || ''),
            item.priority || '',
            item.riskLevel || ''
        ];
        
        return textParts.join(' ').toLowerCase();
    }

    extractKeywords(text) {
        // Simple keyword extraction - split by spaces and remove common words
        const commonWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
        ]);
        
        return text
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 2 && !commonWords.has(word))
            .filter(word => /^[a-zA-Z0-9]+$/.test(word)); // Only alphanumeric
    }

    updateIndexEntry(item) {
        const indexEntry = this.createIndexEntry(item);
        this.searchIndex.set(item.id, indexEntry);
        
        this.dispatchEvent('index-updated', {
            itemId: item.id,
            categoryId: item.categoryId
        });
    }

    removeFromIndex(itemId) {
        const removed = this.searchIndex.delete(itemId);
        
        if (removed) {
            this.dispatchEvent('index-item-removed', { itemId });
        }
        
        return removed;
    }

    // Search Methods
    search(query, options = {}) {
        const searchOptions = {
            ...this.options,
            ...options
        };
        
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Debounce search
        return new Promise((resolve) => {
            this.searchTimeout = setTimeout(() => {
                const results = this.performSearch(query, searchOptions);
                this.currentQuery = query;
                
                // Add to search history
                this.addToSearchHistory(query);
                
                this.dispatchEvent('search-completed', {
                    query,
                    resultCount: results.length,
                    searchTime: Date.now()
                });
                
                resolve(results);
            }, searchOptions.searchDelay);
        });
    }

    performSearch(query, options) {
        if (!query || query.trim() === '') {
            return this.getAllItems();
        }
        
        const normalizedQuery = options.caseSensitive ? query : query.toLowerCase();
        const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 0);
        
        let results = [];
        
        if (options.fuzzySearch) {
            results = this.fuzzySearch(queryTerms, options);
        } else {
            results = this.exactSearch(queryTerms, options);
        }
        
        // Apply filters
        results = this.applyFilters(results, this.currentFilters);
        
        // Apply sorting
        results = this.applySorting(results, this.currentSort);
        
        // Limit results
        if (options.maxResults && results.length > options.maxResults) {
            results = results.slice(0, options.maxResults);
        }
        
        // Add search metadata
        results = results.map(result => ({
            ...result,
            searchScore: result.score || 0,
            matchedTerms: result.matchedTerms || [],
            highlightedTitle: options.highlightMatches ? 
                this.highlightMatches(result.title, queryTerms) : result.title,
            highlightedDescription: options.highlightMatches ? 
                this.highlightMatches(result.description, queryTerms) : result.description
        }));
        
        return results;
    }

    exactSearch(queryTerms, options) {
        const results = [];
        
        this.searchIndex.forEach((indexEntry) => {
            let score = 0;
            const matchedTerms = [];
            
            queryTerms.forEach(term => {
                // Title match (highest weight)
                if (indexEntry.title.toLowerCase().includes(term)) {
                    score += 10;
                    matchedTerms.push(term);
                }
                
                // Description match (medium weight)
                if (indexEntry.description.toLowerCase().includes(term)) {
                    score += 5;
                    matchedTerms.push(term);
                }
                
                // Keyword match (medium weight)
                if (indexEntry.keywords.includes(term)) {
                    score += 5;
                    matchedTerms.push(term);
                }
                
                // Full text match (low weight)
                if (indexEntry.searchableText.includes(term)) {
                    score += 1;
                    matchedTerms.push(term);
                }
            });
            
            if (score > 0) {
                results.push({
                    ...indexEntry,
                    score,
                    matchedTerms: [...new Set(matchedTerms)] // Remove duplicates
                });
            }
        });
        
        return results.sort((a, b) => b.score - a.score);
    }

    fuzzySearch(queryTerms, options) {
        const results = [];
        
        this.searchIndex.forEach((indexEntry) => {
            let score = 0;
            const matchedTerms = [];
            
            queryTerms.forEach(term => {
                // Exact matches
                if (indexEntry.title.toLowerCase().includes(term)) {
                    score += 10;
                    matchedTerms.push(term);
                } else if (indexEntry.description.toLowerCase().includes(term)) {
                    score += 5;
                    matchedTerms.push(term);
                } else {
                    // Fuzzy matching
                    const titleFuzzy = this.calculateFuzzyScore(term, indexEntry.title.toLowerCase());
                    const descFuzzy = this.calculateFuzzyScore(term, indexEntry.description.toLowerCase());
                    
                    if (titleFuzzy > 0.6) {
                        score += titleFuzzy * 8;
                        matchedTerms.push(term);
                    } else if (descFuzzy > 0.6) {
                        score += descFuzzy * 4;
                        matchedTerms.push(term);
                    }
                    
                    // Keyword fuzzy matching
                    indexEntry.keywords.forEach(keyword => {
                        const keywordFuzzy = this.calculateFuzzyScore(term, keyword);
                        if (keywordFuzzy > 0.7) {
                            score += keywordFuzzy * 3;
                            matchedTerms.push(term);
                        }
                    });
                }
            });
            
            if (score > 0) {
                results.push({
                    ...indexEntry,
                    score,
                    matchedTerms: [...new Set(matchedTerms)]
                });
            }
        });
        
        return results.sort((a, b) => b.score - a.score);
    }

    calculateFuzzyScore(term, target) {
        // Simple Levenshtein distance-based fuzzy matching
        const distance = this.levenshteinDistance(term, target);
        const maxLength = Math.max(term.length, target.length);
        
        if (maxLength === 0) return 1;
        
        return 1 - (distance / maxLength);
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    // Filtering System
    setupDefaultFilters() {
        // Completion status filter
        this.filters.set('completed', {
            name: 'Completion Status',
            type: 'boolean',
            options: [
                { value: true, label: 'Completed' },
                { value: false, label: 'Not Completed' },
                { value: null, label: 'All' }
            ],
            apply: (items, value) => {
                if (value === null) return items;
                return items.filter(item => item.completed === value);
            }
        });
        
        // Priority filter
        this.filters.set('priority', {
            name: 'Priority',
            type: 'select',
            options: [
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' }
            ],
            apply: (items, values) => {
                if (!values || values.length === 0) return items;
                return items.filter(item => values.includes(item.priority));
            }
        });
        
        // Risk level filter
        this.filters.set('riskLevel', {
            name: 'Risk Level',
            type: 'select',
            options: [
                { value: 'high', label: 'High Risk' },
                { value: 'medium', label: 'Medium Risk' },
                { value: 'low', label: 'Low Risk' }
            ],
            apply: (items, values) => {
                if (!values || values.length === 0) return items;
                return items.filter(item => values.includes(item.riskLevel));
            }
        });
        
        // Category filter
        this.filters.set('category', {
            name: 'Category',
            type: 'select',
            options: [], // Will be populated dynamically
            apply: (items, values) => {
                if (!values || values.length === 0) return items;
                return items.filter(item => values.includes(item.categoryId));
            }
        });
        
        // Date range filter
        this.filters.set('dateRange', {
            name: 'Date Range',
            type: 'dateRange',
            apply: (items, range) => {
                if (!range || (!range.start && !range.end)) return items;
                
                return items.filter(item => {
                    const itemDate = new Date(item.lastModified);
                    
                    if (range.start && itemDate < new Date(range.start)) return false;
                    if (range.end && itemDate > new Date(range.end)) return false;
                    
                    return true;
                });
            }
        });
        
        // Has sources filter
        this.filters.set('hasSources', {
            name: 'Has Reference Sources',
            type: 'boolean',
            apply: (items, value) => {
                if (value === null) return items;
                return items.filter(item => {
                    const hasSources = item.sources && item.sources.length > 0;
                    return value ? hasSources : !hasSources;
                });
            }
        });
    }

    applyFilters(items, filters) {
        let filteredItems = [...items];
        
        Object.entries(filters).forEach(([filterName, filterValue]) => {
            const filter = this.filters.get(filterName);
            if (filter && filterValue !== undefined && filterValue !== null) {
                filteredItems = filter.apply(filteredItems, filterValue);
            }
        });
        
        return filteredItems;
    }

    setFilter(filterName, value) {
        this.currentFilters[filterName] = value;
        
        this.dispatchEvent('filter-changed', {
            filterName,
            value,
            activeFilters: { ...this.currentFilters }
        });
    }

    removeFilter(filterName) {
        delete this.currentFilters[filterName];
        
        this.dispatchEvent('filter-removed', {
            filterName,
            activeFilters: { ...this.currentFilters }
        });
    }

    clearFilters() {
        this.currentFilters = {};
        
        this.dispatchEvent('filters-cleared', {
            activeFilters: {}
        });
    }

    // Sorting System
    setupDefaultSortOptions() {
        this.sortOptions.set('title', {
            name: 'Title',
            compare: (a, b) => a.title.localeCompare(b.title)
        });
        
        this.sortOptions.set('priority', {
            name: 'Priority',
            compare: (a, b) => {
                const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            }
        });
        
        this.sortOptions.set('riskLevel', {
            name: 'Risk Level',
            compare: (a, b) => {
                const riskOrder = { high: 3, medium: 2, low: 1 };
                return (riskOrder[b.riskLevel] || 0) - (riskOrder[a.riskLevel] || 0);
            }
        });
        
        this.sortOptions.set('completed', {
            name: 'Completion Status',
            compare: (a, b) => {
                if (a.completed === b.completed) return 0;
                return a.completed ? 1 : -1; // Incomplete items first
            }
        });
        
        this.sortOptions.set('lastModified', {
            name: 'Last Modified',
            compare: (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
        });
        
        this.sortOptions.set('relevance', {
            name: 'Relevance',
            compare: (a, b) => (b.score || 0) - (a.score || 0)
        });
    }

    applySorting(items, sortConfig) {
        if (!sortConfig || !sortConfig.field) {
            return items;
        }
        
        const sortOption = this.sortOptions.get(sortConfig.field);
        if (!sortOption) {
            return items;
        }
        
        const sorted = [...items].sort(sortOption.compare);
        
        return sortConfig.direction === 'desc' ? sorted.reverse() : sorted;
    }

    setSorting(field, direction = 'asc') {
        this.currentSort = { field, direction };
        
        this.dispatchEvent('sort-changed', {
            field,
            direction,
            sortConfig: this.currentSort
        });
    }

    // Highlighting
    highlightMatches(text, terms) {
        if (!text || !terms || terms.length === 0) {
            return text;
        }
        
        let highlightedText = text;
        
        terms.forEach(term => {
            const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
        });
        
        return highlightedText;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Search History
    addToSearchHistory(query) {
        if (!query || query.trim() === '') return;
        
        // Remove if already exists
        const existingIndex = this.searchHistory.indexOf(query);
        if (existingIndex > -1) {
            this.searchHistory.splice(existingIndex, 1);
        }
        
        // Add to beginning
        this.searchHistory.unshift(query);
        
        // Limit history size
        if (this.searchHistory.length > 20) {
            this.searchHistory = this.searchHistory.slice(0, 20);
        }
        
        // Save to localStorage
        this.saveSearchHistory();
    }

    getSearchHistory() {
        return [...this.searchHistory];
    }

    clearSearchHistory() {
        this.searchHistory = [];
        localStorage.removeItem('checklist-search-history');
        
        this.dispatchEvent('search-history-cleared');
    }

    saveSearchHistory() {
        localStorage.setItem('checklist-search-history', JSON.stringify(this.searchHistory));
    }

    loadSearchHistory() {
        const stored = localStorage.getItem('checklist-search-history');
        if (stored) {
            try {
                this.searchHistory = JSON.parse(stored);
            } catch (e) {
                console.warn('Failed to load search history:', e);
                this.searchHistory = [];
            }
        }
    }

    // Utility Methods
    getAllItems() {
        return Array.from(this.searchIndex.values());
    }

    getItemById(itemId) {
        return this.searchIndex.get(itemId);
    }

    getItemsByCategory(categoryId) {
        return Array.from(this.searchIndex.values())
            .filter(item => item.categoryId === categoryId);
    }

    getSearchSuggestions(query, limit = 5) {
        if (!query || query.length < 2) return [];
        
        const suggestions = new Set();
        const normalizedQuery = query.toLowerCase();
        
        // Add matching keywords
        this.searchIndex.forEach(item => {
            item.keywords.forEach(keyword => {
                if (keyword.startsWith(normalizedQuery) && keyword !== normalizedQuery) {
                    suggestions.add(keyword);
                }
            });
            
            // Add matching titles
            if (item.title.toLowerCase().includes(normalizedQuery)) {
                suggestions.add(item.title);
            }
        });
        
        // Add from search history
        this.searchHistory.forEach(historyQuery => {
            if (historyQuery.toLowerCase().includes(normalizedQuery) && 
                historyQuery.toLowerCase() !== normalizedQuery) {
                suggestions.add(historyQuery);
            }
        });
        
        return Array.from(suggestions).slice(0, limit);
    }

    // Event Management
    bindEvents() {
        this.loadSearchHistory();
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
                    console.error(`Error in search event listener for ${eventName}:`, e);
                }
            });
        }
        
        // Also dispatch as DOM event
        const event = new CustomEvent(`checklist-search:${eventName}`, {
            detail,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Public API
    performQuickSearch(query) {
        return this.search(query, { searchDelay: 0 });
    }

    getFilterOptions(filterName) {
        const filter = this.filters.get(filterName);
        return filter ? filter.options : [];
    }

    getSortOptions() {
        return Array.from(this.sortOptions.entries()).map(([key, option]) => ({
            value: key,
            label: option.name
        }));
    }

    getCurrentState() {
        return {
            query: this.currentQuery,
            filters: { ...this.currentFilters },
            sort: { ...this.currentSort },
            indexSize: this.searchIndex.size
        };
    }

    // Cleanup
    destroy() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.saveSearchHistory();
        this.searchIndex.clear();
        this.filters.clear();
        this.sortOptions.clear();
        this.eventListeners.clear();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChecklistSearch;
}

// Global registration for direct script inclusion
if (typeof window !== 'undefined') {
    window.ChecklistSearch = ChecklistSearch;
}