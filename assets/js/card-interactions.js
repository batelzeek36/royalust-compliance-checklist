/**
 * Card Interactions Module - Handles expand/collapse and interactive behaviors
 * Provides smooth animations and state management for category card interactions
 */

class CardInteractions {
    constructor() {
        this.activeCards = new Map();
        this.animationQueue = [];
        this.isAnimating = false;
        this.settings = {
            animationDuration: 300,
            staggerDelay: 50,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            maxConcurrentAnimations: 3
        };
        
        this.init();
    }

    init() {
        this.setupGlobalEventListeners();
        this.setupKeyboardNavigation();
        this.setupAccessibilityFeatures();
    }

    setupGlobalEventListeners() {
        // Handle clicks outside cards to close expanded cards
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.category-card')) {
                this.collapseAllCards();
            }
        });

        // Handle escape key to close expanded cards
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.collapseAllCards();
            }
        });

        // Handle window resize to adjust card layouts
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            const focusedCard = e.target.closest('.category-card');
            if (!focusedCard) return;

            switch (e.key) {
                case 'Enter':
                case ' ':
                    if (e.target.classList.contains('card-header') || 
                        e.target.classList.contains('expand-button')) {
                        e.preventDefault();
                        this.toggleCard(focusedCard);
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.focusNextCard(focusedCard);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.focusPreviousCard(focusedCard);
                    break;
            }
        });
    }

    setupAccessibilityFeatures() {
        // Announce state changes to screen readers
        this.setupAriaLiveRegion();
        
        // Enhanced focus management
        this.setupFocusTrapping();
    }

    setupAriaLiveRegion() {
        if (!document.getElementById('card-announcements')) {
            const announcements = document.createElement('div');
            announcements.id = 'card-announcements';
            announcements.setAttribute('aria-live', 'polite');
            announcements.setAttribute('aria-atomic', 'true');
            announcements.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            document.body.appendChild(announcements);
        }
    }

    setupFocusTrapping() {
        // Ensure focus stays within expanded cards when navigating with Tab
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const expandedCard = document.querySelector('.category-card.expanded');
                if (expandedCard) {
                    this.trapFocus(e, expandedCard);
                }
            }
        });
    }

    registerCard(cardElement, cardInstance) {
        const cardId = cardElement.getAttribute('data-category-id');
        this.activeCards.set(cardId, {
            element: cardElement,
            instance: cardInstance,
            isExpanded: false,
            animationState: 'idle'
        });

        this.setupCardEventListeners(cardElement, cardInstance);
    }

    setupCardEventListeners(cardElement, cardInstance) {
        const header = cardElement.querySelector('.card-header');
        const expandButton = cardElement.querySelector('.expand-button');
        
        if (header) {
            header.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleCard(cardElement);
            });

            header.addEventListener('mouseenter', () => {
                this.handleCardHover(cardElement, true);
            });

            header.addEventListener('mouseleave', () => {
                this.handleCardHover(cardElement, false);
            });
        }

        if (expandButton) {
            expandButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCard(cardElement);
            });
        }

        // Setup checklist item interactions
        this.setupChecklistInteractions(cardElement);
    }

    setupChecklistInteractions(cardElement) {
        const checklistContainer = cardElement.querySelector('.checklist-container');
        if (!checklistContainer) return;

        // Use event delegation for dynamic checklist items
        checklistContainer.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this.handleCheckboxToggle(e.target, cardElement);
            }
        });

        checklistContainer.addEventListener('click', (e) => {
            const actionButton = e.target.closest('[data-action]');
            if (actionButton) {
                this.handleItemAction(actionButton, cardElement);
            }
        });
    }

    toggleCard(cardElement) {
        const cardData = this.getCardData(cardElement);
        if (!cardData) return;

        if (cardData.isExpanded) {
            this.collapseCard(cardElement);
        } else {
            this.expandCard(cardElement);
        }
    }

    expandCard(cardElement, options = {}) {
        const cardData = this.getCardData(cardElement);
        if (!cardData || cardData.isExpanded || cardData.animationState !== 'idle') {
            return Promise.resolve();
        }

        // Collapse other cards if single-expand mode
        if (options.singleExpand !== false) {
            this.collapseOtherCards(cardElement);
        }

        cardData.animationState = 'expanding';
        cardData.isExpanded = true;

        return this.queueAnimation(() => {
            return this.performExpandAnimation(cardElement, cardData);
        });
    }

    collapseCard(cardElement) {
        const cardData = this.getCardData(cardElement);
        if (!cardData || !cardData.isExpanded || cardData.animationState !== 'idle') {
            return Promise.resolve();
        }

        cardData.animationState = 'collapsing';
        cardData.isExpanded = false;

        return this.queueAnimation(() => {
            return this.performCollapseAnimation(cardElement, cardData);
        });
    }

    performExpandAnimation(cardElement, cardData) {
        return new Promise((resolve) => {
            const content = cardElement.querySelector('.card-content');
            const header = cardElement.querySelector('.card-header');
            
            // Set initial states
            cardElement.classList.add('expanding');
            content.style.display = 'block';
            content.setAttribute('aria-hidden', 'false');
            
            // Update ARIA attributes
            header.setAttribute('aria-expanded', 'true');
            const expandButton = cardElement.querySelector('.expand-button');
            if (expandButton) {
                expandButton.setAttribute('aria-expanded', 'true');
                const icon = expandButton.querySelector('.expand-icon');
                if (icon) icon.textContent = '▲';
            }

            // Measure content height
            const contentHeight = content.scrollHeight;
            content.style.height = '0px';
            content.style.overflow = 'hidden';

            // Force reflow
            content.offsetHeight;

            // Animate expansion
            content.style.transition = `height ${this.settings.animationDuration}ms ${this.settings.easing}`;
            content.style.height = `${contentHeight}px`;

            // Add expanded class with delay for CSS transitions
            requestAnimationFrame(() => {
                cardElement.classList.add('expanded');
                cardElement.classList.remove('expanding');
            });

            setTimeout(() => {
                content.style.height = 'auto';
                content.style.overflow = 'visible';
                content.style.transition = '';
                cardData.animationState = 'idle';
                
                // Announce to screen readers
                this.announceStateChange(cardElement, 'expanded');
                
                // Focus management
                this.manageFocusOnExpand(cardElement);
                
                resolve();
            }, this.settings.animationDuration);
        });
    }

    performCollapseAnimation(cardElement, cardData) {
        return new Promise((resolve) => {
            const content = cardElement.querySelector('.card-content');
            const header = cardElement.querySelector('.card-header');
            
            // Set initial state
            cardElement.classList.add('collapsing');
            const contentHeight = content.scrollHeight;
            content.style.height = `${contentHeight}px`;
            content.style.overflow = 'hidden';

            // Update ARIA attributes
            header.setAttribute('aria-expanded', 'false');
            const expandButton = cardElement.querySelector('.expand-button');
            if (expandButton) {
                expandButton.setAttribute('aria-expanded', 'false');
                const icon = expandButton.querySelector('.expand-icon');
                if (icon) icon.textContent = '▼';
            }

            // Force reflow
            content.offsetHeight;

            // Animate collapse
            content.style.transition = `height ${this.settings.animationDuration}ms ${this.settings.easing}`;
            content.style.height = '0px';

            setTimeout(() => {
                cardElement.classList.remove('expanded', 'collapsing');
                content.style.display = 'none';
                content.setAttribute('aria-hidden', 'true');
                content.style.height = '';
                content.style.overflow = '';
                content.style.transition = '';
                cardData.animationState = 'idle';
                
                // Announce to screen readers
                this.announceStateChange(cardElement, 'collapsed');
                
                resolve();
            }, this.settings.animationDuration);
        });
    }

    collapseAllCards() {
        const promises = [];
        this.activeCards.forEach((cardData) => {
            if (cardData.isExpanded) {
                promises.push(this.collapseCard(cardData.element));
            }
        });
        return Promise.all(promises);
    }

    collapseOtherCards(excludeCard) {
        const promises = [];
        this.activeCards.forEach((cardData) => {
            if (cardData.element !== excludeCard && cardData.isExpanded) {
                promises.push(this.collapseCard(cardData.element));
            }
        });
        return Promise.all(promises);
    }

    handleCardHover(cardElement, isHovering) {
        const cardData = this.getCardData(cardElement);
        if (!cardData) return;

        if (isHovering) {
            cardElement.classList.add('hovered');
            // Preload content if not expanded
            if (!cardData.isExpanded) {
                this.preloadCardContent(cardElement);
            }
        } else {
            cardElement.classList.remove('hovered');
        }
    }

    handleCheckboxToggle(checkbox, cardElement) {
        const itemId = checkbox.getAttribute('data-item-id');
        const isChecked = checkbox.checked;
        
        // Add visual feedback
        const checklistItem = checkbox.closest('.checklist-item');
        if (checklistItem) {
            checklistItem.classList.toggle('completed', isChecked);
            
            // Animate checkbox change
            this.animateCheckboxChange(checkbox, isChecked);
        }

        // Update card progress
        this.updateCardProgress(cardElement);
        
        // Emit custom event
        cardElement.dispatchEvent(new CustomEvent('itemToggle', {
            detail: { itemId, completed: isChecked },
            bubbles: true
        }));
    }

    handleItemAction(actionButton, cardElement) {
        const action = actionButton.getAttribute('data-action');
        const itemElement = actionButton.closest('.checklist-item');
        
        switch (action) {
            case 'view-details':
                this.showItemDetails(itemElement, cardElement);
                break;
            case 'add-note':
                this.showNoteDialog(itemElement, cardElement);
                break;
            case 'export-category':
                this.exportCategory(cardElement);
                break;
            case 'mark-all-complete':
                this.markAllComplete(cardElement);
                break;
            case 'reset-category':
                this.resetCategory(cardElement);
                break;
        }
    }

    animateCheckboxChange(checkbox, isChecked) {
        const checkmark = checkbox.parentElement.querySelector('.checkbox-checkmark');
        if (!checkmark) return;

        if (isChecked) {
            checkmark.style.transform = 'scale(0)';
            checkmark.style.opacity = '0';
            
            requestAnimationFrame(() => {
                checkmark.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
                checkmark.style.transform = 'scale(1)';
                checkmark.style.opacity = '1';
            });
        } else {
            checkmark.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
            checkmark.style.transform = 'scale(0)';
            checkmark.style.opacity = '0';
        }
    }

    queueAnimation(animationFunction) {
        return new Promise((resolve) => {
            this.animationQueue.push({ function: animationFunction, resolve });
            this.processAnimationQueue();
        });
    }

    processAnimationQueue() {
        if (this.isAnimating || this.animationQueue.length === 0) return;

        this.isAnimating = true;
        const { function: animationFunction, resolve } = this.animationQueue.shift();

        animationFunction().then(() => {
            resolve();
            this.isAnimating = false;
            
            // Process next animation after a brief delay
            setTimeout(() => {
                this.processAnimationQueue();
            }, this.settings.staggerDelay);
        });
    }

    // Utility methods
    getCardData(cardElement) {
        const cardId = cardElement.getAttribute('data-category-id');
        return this.activeCards.get(cardId);
    }

    announceStateChange(cardElement, state) {
        const announcements = document.getElementById('card-announcements');
        if (announcements) {
            const title = cardElement.querySelector('.card-title')?.textContent || 'Category';
            announcements.textContent = `${title} ${state}`;
        }
    }

    manageFocusOnExpand(cardElement) {
        // Focus first interactive element in expanded content
        const firstFocusable = cardElement.querySelector('.card-content input, .card-content button, .card-content a');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }
    }

    trapFocus(event, container) {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
            if (document.activeElement === firstFocusable) {
                event.preventDefault();
                lastFocusable.focus();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                event.preventDefault();
                firstFocusable.focus();
            }
        }
    }

    focusNextCard(currentCard) {
        const cards = Array.from(document.querySelectorAll('.category-card'));
        const currentIndex = cards.indexOf(currentCard);
        const nextCard = cards[currentIndex + 1] || cards[0];
        
        const header = nextCard.querySelector('.card-header');
        if (header) header.focus();
    }

    focusPreviousCard(currentCard) {
        const cards = Array.from(document.querySelectorAll('.category-card'));
        const currentIndex = cards.indexOf(currentCard);
        const previousCard = cards[currentIndex - 1] || cards[cards.length - 1];
        
        const header = previousCard.querySelector('.card-header');
        if (header) header.focus();
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    handleResize() {
        // Recalculate expanded card heights
        this.activeCards.forEach((cardData) => {
            if (cardData.isExpanded) {
                const content = cardData.element.querySelector('.card-content');
                if (content && content.style.height !== 'auto') {
                    content.style.height = 'auto';
                }
            }
        });
    }

    // Public API methods
    expandAll() {
        const promises = [];
        this.activeCards.forEach((cardData) => {
            if (!cardData.isExpanded) {
                promises.push(this.expandCard(cardData.element, { singleExpand: false }));
            }
        });
        return Promise.all(promises);
    }

    getExpandedCards() {
        const expanded = [];
        this.activeCards.forEach((cardData) => {
            if (cardData.isExpanded) {
                expanded.push(cardData.element);
            }
        });
        return expanded;
    }

    destroy() {
        this.activeCards.clear();
        this.animationQueue = [];
        this.isAnimating = false;
    }
}

// Create global instance
const cardInteractions = new CardInteractions();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardInteractions;
}