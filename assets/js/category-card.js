/**
 * CategoryCard Module - Comprehensive category card component system
 * Handles rendering, state management, and interactions for compliance category cards
 */

class CategoryCard {
    constructor(categoryData, options = {}) {
        this.data = categoryData;
        this.options = {
            expandable: true,
            showProgress: true,
            showBadges: true,
            animationDuration: 300,
            ...options
        };
        
        this.element = null;
        this.isExpanded = false;
        this.progressBar = null;
        this.badges = [];
        this.tooltips = [];
        
        this.init();
    }

    init() {
        this.createElement();
        this.setupEventListeners();
        this.updateProgress();
        this.applyTheme();
    }

    createElement() {
        const template = document.getElementById('category-card-template');
        if (!template) {
            console.error('Category card template not found');
            return;
        }

        this.element = template.content.cloneNode(true).firstElementChild;
        this.element.setAttribute('data-category-id', this.data.id);
        this.element.classList.add('category-card');
        
        this.populateContent();
        this.createProgressBar();
        this.createBadges();
    }

    populateContent() {
        const titleElement = this.element.querySelector('.card-title');
        const descriptionElement = this.element.querySelector('.card-description');
        const iconElement = this.element.querySelector('.card-icon');
        const itemCountElement = this.element.querySelector('.item-count');

        if (titleElement) titleElement.textContent = this.data.title;
        if (descriptionElement) descriptionElement.textContent = this.data.description;
        if (iconElement) iconElement.textContent = this.data.icon || '📋';
        if (itemCountElement) {
            const completedItems = this.getCompletedItemsCount();
            const totalItems = this.data.items.length;
            itemCountElement.textContent = `${completedItems}/${totalItems} items`;
        }
    }

    createProgressBar() {
        if (!this.options.showProgress) return;

        const progressContainer = this.element.querySelector('.progress-container');
        if (!progressContainer) return;

        this.progressBar = new ProgressBar({
            container: progressContainer,
            value: this.calculateProgress(),
            animated: true,
            showPercentage: true,
            theme: this.getProgressTheme()
        });
    }

    createBadges() {
        if (!this.options.showBadges) return;

        const badgeContainer = this.element.querySelector('.badge-container');
        if (!badgeContainer) return;

        // Priority badge
        if (this.data.priority) {
            const priorityBadge = new Badge({
                type: 'priority',
                value: this.data.priority,
                container: badgeContainer
            });
            this.badges.push(priorityBadge);
        }

        // Risk level badge
        if (this.data.riskLevel) {
            const riskBadge = new Badge({
                type: 'risk',
                value: this.data.riskLevel,
                container: badgeContainer
            });
            this.badges.push(riskBadge);
        }

        // Completion status badge
        const completionBadge = new Badge({
            type: 'completion',
            value: this.getCompletionStatus(),
            container: badgeContainer
        });
        this.badges.push(completionBadge);
    }

    setupEventListeners() {
        if (!this.element) return;

        const header = this.element.querySelector('.card-header');
        const expandButton = this.element.querySelector('.expand-button');
        
        if (header && this.options.expandable) {
            header.addEventListener('click', (e) => this.handleHeaderClick(e));
        }

        if (expandButton) {
            expandButton.addEventListener('click', (e) => this.handleExpandClick(e));
        }

        // Checklist item interactions
        const checklistItems = this.element.querySelectorAll('.checklist-item');
        checklistItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => this.handleItemToggle(e));
            }
        });

        // Tooltip setup
        this.setupTooltips();
    }

    setupTooltips() {
        const tooltipElements = this.element.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            const tooltip = new Tooltip({
                element: element,
                content: element.getAttribute('data-tooltip'),
                position: element.getAttribute('data-tooltip-position') || 'top'
            });
            this.tooltips.push(tooltip);
        });
    }

    handleHeaderClick(event) {
        event.preventDefault();
        this.toggle();
    }

    handleExpandClick(event) {
        event.stopPropagation();
        this.toggle();
    }

    handleItemToggle(event) {
        const checkbox = event.target;
        const itemId = checkbox.getAttribute('data-item-id');
        const isCompleted = checkbox.checked;

        this.updateItemStatus(itemId, isCompleted);
        this.updateProgress();
        this.updateBadges();
        
        // Emit custom event for external listeners
        this.element.dispatchEvent(new CustomEvent('itemToggle', {
            detail: {
                categoryId: this.data.id,
                itemId: itemId,
                completed: isCompleted
            },
            bubbles: true
        }));
    }

    toggle() {
        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    }

    expand() {
        if (this.isExpanded) return;

        this.isExpanded = true;
        this.element.classList.add('expanded');
        
        const content = this.element.querySelector('.card-content');
        if (content) {
            CardAnimations.expandCard(content, this.options.animationDuration);
        }

        this.updateExpandButton();
        this.loadChecklistItems();
    }

    collapse() {
        if (!this.isExpanded) return;

        this.isExpanded = false;
        this.element.classList.remove('expanded');
        
        const content = this.element.querySelector('.card-content');
        if (content) {
            CardAnimations.collapseCard(content, this.options.animationDuration);
        }

        this.updateExpandButton();
    }

    updateExpandButton() {
        const expandButton = this.element.querySelector('.expand-button');
        if (!expandButton) return;

        const icon = expandButton.querySelector('.expand-icon');
        if (icon) {
            icon.textContent = this.isExpanded ? '▲' : '▼';
        }

        expandButton.setAttribute('aria-expanded', this.isExpanded.toString());
    }

    loadChecklistItems() {
        const checklistContainer = this.element.querySelector('.checklist-container');
        if (!checklistContainer || !this.data.items) return;

        checklistContainer.innerHTML = '';

        this.data.items.forEach(item => {
            const itemElement = this.createChecklistItem(item);
            checklistContainer.appendChild(itemElement);
        });
    }

    createChecklistItem(item) {
        const itemElement = document.createElement('div');
        itemElement.className = 'checklist-item';
        itemElement.setAttribute('data-item-id', item.id);

        itemElement.innerHTML = `
            <div class="item-checkbox-container">
                <input type="checkbox" 
                       id="item-${item.id}" 
                       data-item-id="${item.id}"
                       ${item.completed ? 'checked' : ''}>
                <label for="item-${item.id}" class="checkbox-label"></label>
            </div>
            <div class="item-content">
                <div class="item-title">${item.title}</div>
                <div class="item-description">${item.description || ''}</div>
                ${this.createSourceLinks(item.sources)}
            </div>
        `;

        return itemElement;
    }

    createSourceLinks(sources) {
        if (!sources || sources.length === 0) return '';

        const linksHtml = sources.map(source => 
            `<a href="${source.url}" target="_blank" class="source-link" 
               data-tooltip="View official documentation">
                ${source.title}
            </a>`
        ).join('');

        return `<div class="source-links">${linksHtml}</div>`;
    }

    updateItemStatus(itemId, completed) {
        const item = this.data.items.find(item => item.id === itemId);
        if (item) {
            item.completed = completed;
        }
    }

    calculateProgress() {
        if (!this.data.items || this.data.items.length === 0) return 0;
        
        const completedItems = this.getCompletedItemsCount();
        return Math.round((completedItems / this.data.items.length) * 100);
    }

    getCompletedItemsCount() {
        return this.data.items.filter(item => item.completed).length;
    }

    getCompletionStatus() {
        const progress = this.calculateProgress();
        if (progress === 100) return 'complete';
        if (progress >= 50) return 'in-progress';
        return 'not-started';
    }

    getProgressTheme() {
        const progress = this.calculateProgress();
        if (progress >= 80) return 'success';
        if (progress >= 50) return 'warning';
        return 'danger';
    }

    updateProgress() {
        if (this.progressBar) {
            const progress = this.calculateProgress();
            this.progressBar.setValue(progress);
            this.progressBar.setTheme(this.getProgressTheme());
        }

        // Update item count
        const itemCountElement = this.element.querySelector('.item-count');
        if (itemCountElement) {
            const completedItems = this.getCompletedItemsCount();
            const totalItems = this.data.items.length;
            itemCountElement.textContent = `${completedItems}/${totalItems} items`;
        }
    }

    updateBadges() {
        this.badges.forEach(badge => {
            if (badge.type === 'completion') {
                badge.setValue(this.getCompletionStatus());
            }
        });
    }

    applyTheme() {
        if (!this.element) return;

        const theme = CardThemes.getTheme(this.data.priority, this.data.riskLevel);
        this.element.classList.add(`theme-${theme.name}`);
        
        // Apply custom CSS properties
        Object.entries(theme.cssProperties).forEach(([property, value]) => {
            this.element.style.setProperty(property, value);
        });
    }

    refresh() {
        this.updateProgress();
        this.updateBadges();
        this.populateContent();
    }

    destroy() {
        // Clean up tooltips
        this.tooltips.forEach(tooltip => tooltip.destroy());
        this.tooltips = [];

        // Clean up badges
        this.badges.forEach(badge => badge.destroy());
        this.badges = [];

        // Clean up progress bar
        if (this.progressBar) {
            this.progressBar.destroy();
            this.progressBar = null;
        }

        // Remove event listeners
        if (this.element) {
            this.element.remove();
        }
    }

    // Getter methods
    getId() {
        return this.data.id;
    }

    getTitle() {
        return this.data.title;
    }

    getProgress() {
        return this.calculateProgress();
    }

    isComplete() {
        return this.calculateProgress() === 100;
    }

    getElement() {
        return this.element;
    }

    getData() {
        return this.data;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryCard;
}