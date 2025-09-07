/**
 * Checklist Item Component Module
 * Handles individual checklist item rendering, interactions, and state management
 * Part of the Royalust Compliance Dashboard modular architecture
 */

class ChecklistItem {
    constructor(itemData, categoryId, options = {}) {
        this.itemData = itemData;
        this.categoryId = categoryId;
        this.options = {
            enableAnimation: true,
            showSourceLinks: true,
            enableTooltips: true,
            trackHistory: true,
            ...options
        };
        
        this.element = null;
        this.isExpanded = false;
        this.isCompleted = itemData.completed || false;
        this.completionHistory = [];
        this.validationErrors = [];
        
        this.init();
    }

    init() {
        this.createElement();
        this.bindEvents();
        this.loadHistory();
        this.validateItem();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'checklist-item';
        this.element.setAttribute('data-item-id', this.itemData.id);
        this.element.setAttribute('data-category-id', this.categoryId);
        this.element.setAttribute('role', 'listitem');
        this.element.setAttribute('tabindex', '0');
        
        if (this.isCompleted) {
            this.element.classList.add('completed');
        }
        
        this.render();
    }

    render() {
        const priorityClass = this.getPriorityClass();
        const riskClass = this.getRiskClass();
        const completionIcon = this.isCompleted ? '✓' : '○';
        
        this.element.innerHTML = `
            <div class="checklist-item-header ${priorityClass} ${riskClass}">
                <button class="completion-toggle" 
                        aria-label="${this.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}"
                        data-action="toggle-completion">
                    <span class="completion-icon">${completionIcon}</span>
                </button>
                
                <div class="item-content">
                    <h4 class="item-title">${this.escapeHtml(this.itemData.title)}</h4>
                    <p class="item-description">${this.escapeHtml(this.itemData.description || '')}</p>
                </div>
                
                <div class="item-actions">
                    ${this.renderPriorityBadge()}
                    ${this.renderRiskIndicator()}
                    <button class="expand-toggle" 
                            aria-label="${this.isExpanded ? 'Collapse details' : 'Expand details'}"
                            data-action="toggle-expand">
                        <span class="expand-icon">${this.isExpanded ? '▼' : '▶'}</span>
                    </button>
                </div>
            </div>
            
            <div class="checklist-item-details ${this.isExpanded ? 'expanded' : 'collapsed'}">
                ${this.renderItemDetails()}
            </div>
            
            ${this.renderValidationErrors()}
        `;
        
        this.updateAccessibility();
    }

    renderItemDetails() {
        return `
            <div class="item-details-content">
                ${this.renderSourceLinks()}
                ${this.renderComplianceNotes()}
                ${this.renderCompletionHistory()}
                ${this.renderAdditionalInfo()}
            </div>
        `;
    }

    renderSourceLinks() {
        if (!this.options.showSourceLinks || !this.itemData.sources || this.itemData.sources.length === 0) {
            return '';
        }
        
        const links = this.itemData.sources.map(source => `
            <a href="${this.escapeHtml(source.url)}" 
               target="_blank" 
               rel="noopener noreferrer"
               class="source-link"
               data-source-type="${source.type || 'external'}">
                <span class="source-icon">🔗</span>
                <span class="source-title">${this.escapeHtml(source.title)}</span>
                <span class="external-indicator">↗</span>
            </a>
        `).join('');
        
        return `
            <div class="source-links-section">
                <h5 class="section-title">Reference Sources</h5>
                <div class="source-links-list">
                    ${links}
                </div>
            </div>
        `;
    }

    renderComplianceNotes() {
        if (!this.itemData.notes || this.itemData.notes.length === 0) {
            return '';
        }
        
        const notes = this.itemData.notes.map(note => `
            <div class="compliance-note">
                <span class="note-icon">📋</span>
                <span class="note-text">${this.escapeHtml(note)}</span>
            </div>
        `).join('');
        
        return `
            <div class="compliance-notes-section">
                <h5 class="section-title">Compliance Notes</h5>
                <div class="notes-list">
                    ${notes}
                </div>
            </div>
        `;
    }

    renderCompletionHistory() {
        if (!this.options.trackHistory || this.completionHistory.length === 0) {
            return '';
        }
        
        const historyItems = this.completionHistory.slice(-5).map(entry => `
            <div class="history-entry">
                <span class="history-action ${entry.action}">${entry.action === 'completed' ? '✓' : '○'}</span>
                <span class="history-date">${this.formatDate(entry.timestamp)}</span>
                <span class="history-user">${this.escapeHtml(entry.user || 'System')}</span>
            </div>
        `).join('');
        
        return `
            <div class="completion-history-section">
                <h5 class="section-title">Recent Activity</h5>
                <div class="history-list">
                    ${historyItems}
                </div>
            </div>
        `;
    }

    renderAdditionalInfo() {
        const additionalFields = [];
        
        if (this.itemData.deadline) {
            additionalFields.push(`
                <div class="info-field">
                    <span class="field-label">Deadline:</span>
                    <span class="field-value deadline ${this.isDeadlineApproaching() ? 'approaching' : ''}">${this.formatDate(this.itemData.deadline)}</span>
                </div>
            `);
        }
        
        if (this.itemData.estimatedEffort) {
            additionalFields.push(`
                <div class="info-field">
                    <span class="field-label">Estimated Effort:</span>
                    <span class="field-value">${this.escapeHtml(this.itemData.estimatedEffort)}</span>
                </div>
            `);
        }
        
        if (this.itemData.dependencies && this.itemData.dependencies.length > 0) {
            const deps = this.itemData.dependencies.map(dep => `
                <span class="dependency-item" data-dependency-id="${dep}">${this.escapeHtml(dep)}</span>
            `).join('');
            
            additionalFields.push(`
                <div class="info-field">
                    <span class="field-label">Dependencies:</span>
                    <div class="field-value dependencies">${deps}</div>
                </div>
            `);
        }
        
        if (additionalFields.length === 0) {
            return '';
        }
        
        return `
            <div class="additional-info-section">
                <h5 class="section-title">Additional Information</h5>
                <div class="info-fields">
                    ${additionalFields.join('')}
                </div>
            </div>
        `;
    }

    renderPriorityBadge() {
        if (!this.itemData.priority) return '';
        
        const priorityIcons = {
            high: '🔴',
            medium: '🟡',
            low: '🟢'
        };
        
        return `
            <span class="priority-badge priority-${this.itemData.priority}" 
                  title="Priority: ${this.itemData.priority}">
                ${priorityIcons[this.itemData.priority] || '⚪'}
            </span>
        `;
    }

    renderRiskIndicator() {
        if (!this.itemData.riskLevel) return '';
        
        const riskIcons = {
            high: '⚠️',
            medium: '⚡',
            low: '✅'
        };
        
        return `
            <span class="risk-indicator risk-${this.itemData.riskLevel}" 
                  title="Risk Level: ${this.itemData.riskLevel}">
                ${riskIcons[this.itemData.riskLevel] || '❓'}
            </span>
        `;
    }

    renderValidationErrors() {
        if (this.validationErrors.length === 0) return '';
        
        const errors = this.validationErrors.map(error => `
            <div class="validation-error">
                <span class="error-icon">⚠️</span>
                <span class="error-message">${this.escapeHtml(error.message)}</span>
            </div>
        `).join('');
        
        return `
            <div class="validation-errors">
                ${errors}
            </div>
        `;
    }

    bindEvents() {
        if (!this.element) return;
        
        // Completion toggle
        const completionToggle = this.element.querySelector('[data-action="toggle-completion"]');
        if (completionToggle) {
            completionToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleCompletion();
            });
        }
        
        // Expand/collapse toggle
        const expandToggle = this.element.querySelector('[data-action="toggle-expand"]');
        if (expandToggle) {
            expandToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleExpansion();
            });
        }
        
        // Keyboard navigation
        this.element.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        // Source link tracking
        const sourceLinks = this.element.querySelectorAll('.source-link');
        sourceLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.trackSourceLinkClick(e.target.closest('.source-link'));
            });
        });
        
        // Dependency navigation
        const dependencyItems = this.element.querySelectorAll('.dependency-item');
        dependencyItems.forEach(item => {
            item.addEventListener('click', (e) => {
                this.navigateToDependency(e.target.dataset.dependencyId);
            });
        });
    }

    toggleCompletion() {
        const previousState = this.isCompleted;
        this.isCompleted = !this.isCompleted;
        
        // Update visual state
        this.element.classList.toggle('completed', this.isCompleted);
        
        // Update completion icon
        const icon = this.element.querySelector('.completion-icon');
        if (icon) {
            icon.textContent = this.isCompleted ? '✓' : '○';
        }
        
        // Update accessibility
        const toggle = this.element.querySelector('.completion-toggle');
        if (toggle) {
            toggle.setAttribute('aria-label', 
                this.isCompleted ? 'Mark as incomplete' : 'Mark as complete'
            );
        }
        
        // Record history
        if (this.options.trackHistory) {
            this.addHistoryEntry(this.isCompleted ? 'completed' : 'uncompleted');
        }
        
        // Trigger events
        this.dispatchEvent('completion-changed', {
            itemId: this.itemData.id,
            categoryId: this.categoryId,
            completed: this.isCompleted,
            previousState
        });
        
        // Animate if enabled
        if (this.options.enableAnimation) {
            this.animateCompletion();
        }
        
        // Save state
        this.saveState();
    }

    toggleExpansion() {
        this.isExpanded = !this.isExpanded;
        
        const details = this.element.querySelector('.checklist-item-details');
        const expandIcon = this.element.querySelector('.expand-icon');
        const expandToggle = this.element.querySelector('.expand-toggle');
        
        if (details) {
            details.classList.toggle('expanded', this.isExpanded);
            details.classList.toggle('collapsed', !this.isExpanded);
        }
        
        if (expandIcon) {
            expandIcon.textContent = this.isExpanded ? '▼' : '▶';
        }
        
        if (expandToggle) {
            expandToggle.setAttribute('aria-label', 
                this.isExpanded ? 'Collapse details' : 'Expand details'
            );
        }
        
        // Animate expansion
        if (this.options.enableAnimation && details) {
            this.animateExpansion(details);
        }
        
        this.dispatchEvent('expansion-changed', {
            itemId: this.itemData.id,
            expanded: this.isExpanded
        });
    }

    handleKeydown(event) {
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (event.target.classList.contains('completion-toggle')) {
                    this.toggleCompletion();
                } else if (event.target.classList.contains('expand-toggle')) {
                    this.toggleExpansion();
                } else {
                    this.toggleExpansion();
                }
                break;
                
            case 'ArrowRight':
                if (!this.isExpanded) {
                    event.preventDefault();
                    this.toggleExpansion();
                }
                break;
                
            case 'ArrowLeft':
                if (this.isExpanded) {
                    event.preventDefault();
                    this.toggleExpansion();
                }
                break;
        }
    }

    animateCompletion() {
        const element = this.element;
        if (!element) return;
        
        element.style.transform = 'scale(1.02)';
        element.style.transition = 'transform 0.2s ease-out';
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
        
        // Add completion ripple effect
        if (this.isCompleted) {
            const ripple = document.createElement('div');
            ripple.className = 'completion-ripple';
            element.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        }
    }

    animateExpansion(detailsElement) {
        if (!detailsElement) return;
        
        if (this.isExpanded) {
            detailsElement.style.maxHeight = '0px';
            detailsElement.style.opacity = '0';
            
            requestAnimationFrame(() => {
                detailsElement.style.transition = 'max-height 0.3s ease-out, opacity 0.3s ease-out';
                detailsElement.style.maxHeight = detailsElement.scrollHeight + 'px';
                detailsElement.style.opacity = '1';
            });
        } else {
            detailsElement.style.transition = 'max-height 0.3s ease-out, opacity 0.3s ease-out';
            detailsElement.style.maxHeight = '0px';
            detailsElement.style.opacity = '0';
        }
    }

    validateItem() {
        this.validationErrors = [];
        
        // Required field validation
        if (!this.itemData.title || this.itemData.title.trim() === '') {
            this.validationErrors.push({
                field: 'title',
                message: 'Item title is required'
            });
        }
        
        // Source link validation
        if (this.itemData.sources) {
            this.itemData.sources.forEach((source, index) => {
                if (!source.url || !this.isValidUrl(source.url)) {
                    this.validationErrors.push({
                        field: `sources[${index}].url`,
                        message: `Invalid URL in source: ${source.title || 'Untitled'}`
                    });
                }
            });
        }
        
        // Deadline validation
        if (this.itemData.deadline && !this.isValidDate(this.itemData.deadline)) {
            this.validationErrors.push({
                field: 'deadline',
                message: 'Invalid deadline format'
            });
        }
        
        return this.validationErrors.length === 0;
    }

    // Utility methods
    getPriorityClass() {
        return this.itemData.priority ? `priority-${this.itemData.priority}` : '';
    }

    getRiskClass() {
        return this.itemData.riskLevel ? `risk-${this.itemData.riskLevel}` : '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    isValidDate(dateString) {
        return !isNaN(Date.parse(dateString));
    }

    isDeadlineApproaching() {
        if (!this.itemData.deadline) return false;
        const deadline = new Date(this.itemData.deadline);
        const now = new Date();
        const daysUntilDeadline = (deadline - now) / (1000 * 60 * 60 * 24);
        return daysUntilDeadline <= 7 && daysUntilDeadline >= 0;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    addHistoryEntry(action) {
        const entry = {
            action,
            timestamp: new Date().toISOString(),
            user: 'Current User' // This could be enhanced with actual user data
        };
        
        this.completionHistory.push(entry);
        
        // Keep only last 10 entries
        if (this.completionHistory.length > 10) {
            this.completionHistory = this.completionHistory.slice(-10);
        }
    }

    loadHistory() {
        const stored = localStorage.getItem(`checklist-item-history-${this.itemData.id}`);
        if (stored) {
            try {
                this.completionHistory = JSON.parse(stored);
            } catch (e) {
                console.warn('Failed to load item history:', e);
                this.completionHistory = [];
            }
        }
    }

    saveState() {
        // Save completion state
        const stateKey = `checklist-item-${this.categoryId}-${this.itemData.id}`;
        localStorage.setItem(stateKey, JSON.stringify({
            completed: this.isCompleted,
            lastModified: new Date().toISOString()
        }));
        
        // Save history
        if (this.options.trackHistory) {
            const historyKey = `checklist-item-history-${this.itemData.id}`;
            localStorage.setItem(historyKey, JSON.stringify(this.completionHistory));
        }
    }

    trackSourceLinkClick(linkElement) {
        const sourceTitle = linkElement.querySelector('.source-title')?.textContent;
        const sourceUrl = linkElement.href;
        
        this.dispatchEvent('source-link-clicked', {
            itemId: this.itemData.id,
            sourceTitle,
            sourceUrl,
            timestamp: new Date().toISOString()
        });
    }

    navigateToDependency(dependencyId) {
        this.dispatchEvent('dependency-navigation', {
            fromItemId: this.itemData.id,
            toDependencyId: dependencyId
        });
    }

    updateAccessibility() {
        if (!this.element) return;
        
        // Update ARIA attributes
        this.element.setAttribute('aria-expanded', this.isExpanded.toString());
        this.element.setAttribute('aria-checked', this.isCompleted.toString());
        
        // Update screen reader descriptions
        const description = `${this.itemData.title}. ${this.isCompleted ? 'Completed' : 'Not completed'}. ${this.isExpanded ? 'Details expanded' : 'Details collapsed'}.`;
        this.element.setAttribute('aria-label', description);
    }

    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(`checklist-item:${eventName}`, {
            detail,
            bubbles: true
        });
        
        if (this.element) {
            this.element.dispatchEvent(event);
        }
    }

    // Public API methods
    getElement() {
        return this.element;
    }

    getData() {
        return {
            ...this.itemData,
            completed: this.isCompleted,
            expanded: this.isExpanded
        };
    }

    setCompleted(completed, skipAnimation = false) {
        if (this.isCompleted === completed) return;
        
        const originalAnimation = this.options.enableAnimation;
        if (skipAnimation) {
            this.options.enableAnimation = false;
        }
        
        this.toggleCompletion();
        
        if (skipAnimation) {
            this.options.enableAnimation = originalAnimation;
        }
    }

    setExpanded(expanded, skipAnimation = false) {
        if (this.isExpanded === expanded) return;
        
        const originalAnimation = this.options.enableAnimation;
        if (skipAnimation) {
            this.options.enableAnimation = false;
        }
        
        this.toggleExpansion();
        
        if (skipAnimation) {
            this.options.enableAnimation = originalAnimation;
        }
    }

    updateData(newData) {
        this.itemData = { ...this.itemData, ...newData };
        this.validateItem();
        this.render();
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChecklistItem;
}

// Global registration for direct script inclusion
if (typeof window !== 'undefined') {
    window.ChecklistItem = ChecklistItem;
}