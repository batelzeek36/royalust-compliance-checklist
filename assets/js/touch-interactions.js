/**
 * Touch Interactions Module - Touch-Friendly Gestures
 * Royalust Compliance Dashboard
 * 
 * Handles touch gestures, swipe interactions, and mobile-specific behaviors
 * Provides smooth touch experience while maintaining desktop compatibility
 */

class TouchInteractions {
  constructor() {
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.minSwipeDistance = 50;
    this.maxSwipeTime = 300;
    this.touchStartTime = 0;
    this.activeElement = null;
    this.longPressTimer = null;
    this.longPressDelay = 500;
    this.isScrolling = false;
    this.scrollThreshold = 10;
    
    this.init();
  }

  init() {
    this.setupTouchEvents();
    this.setupScrollHandling();
    this.setupHoverFallbacks();
    this.setupFocusManagement();
    this.setupOrientationHandling();
  }

  /**
   * Set up touch event listeners for various interactions
   */
  setupTouchEvents() {
    // Swipe gestures for cards and modals
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    
    // Long press for context menus
    document.addEventListener('touchstart', this.handleLongPressStart.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleLongPressEnd.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleLongPressCancel.bind(this), { passive: true });
    
    // Prevent default behaviors on specific elements
    this.preventDefaultBehaviors();
  }

  /**
   * Handle touch start events
   */
  handleTouchStart(event) {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.activeElement = event.target.closest('.swipeable, .card, .modal');
    this.isScrolling = false;
    
    // Add touch feedback
    this.addTouchFeedback(event.target);
  }

  /**
   * Handle touch move events
   */
  handleTouchMove(event) {
    if (!this.activeElement) return;
    
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    const deltaY = Math.abs(touch.clientY - this.touchStartY);
    
    // Determine if user is scrolling
    if (deltaY > this.scrollThreshold && deltaY > deltaX) {
      this.isScrolling = true;
      this.removeTouchFeedback();
      return;
    }
    
    // Handle horizontal swipe preview
    if (deltaX > this.scrollThreshold && !this.isScrolling) {
      this.handleSwipePreview(touch.clientX - this.touchStartX);
      event.preventDefault();
    }
  }

  /**
   * Handle touch end events
   */
  handleTouchEnd(event) {
    if (!this.activeElement || this.isScrolling) {
      this.removeTouchFeedback();
      this.resetSwipePreview();
      return;
    }
    
    const touch = event.changedTouches[0];
    this.touchEndX = touch.clientX;
    this.touchEndY = touch.clientY;
    
    const swipeDistance = this.touchEndX - this.touchStartX;
    const swipeTime = Date.now() - this.touchStartTime;
    
    // Process swipe gesture
    if (Math.abs(swipeDistance) >= this.minSwipeDistance && swipeTime <= this.maxSwipeTime) {
      this.handleSwipeGesture(swipeDistance);
    } else {
      this.handleTap(event);
    }
    
    this.removeTouchFeedback();
    this.resetSwipePreview();
    this.activeElement = null;
  }

  /**
   * Handle swipe gestures
   */
  handleSwipeGesture(distance) {
    const direction = distance > 0 ? 'right' : 'left';
    const element = this.activeElement;
    
    if (element.classList.contains('card')) {
      this.handleCardSwipe(element, direction);
    } else if (element.classList.contains('modal')) {
      this.handleModalSwipe(element, direction);
    } else if (element.classList.contains('swipeable')) {
      this.handleCustomSwipe(element, direction);
    }
  }

  /**
   * Handle card swipe actions
   */
  handleCardSwipe(card, direction) {
    if (direction === 'right') {
      // Expand card or show details
      this.expandCard(card);
    } else if (direction === 'left') {
      // Collapse card or show actions
      this.showCardActions(card);
    }
  }

  /**
   * Handle modal swipe actions
   */
  handleModalSwipe(modal, direction) {
    if (direction === 'down' || direction === 'right') {
      // Close modal
      this.closeModal(modal);
    }
  }

  /**
   * Handle custom swipe actions
   */
  handleCustomSwipe(element, direction) {
    const swipeEvent = new CustomEvent('swipe', {
      detail: { direction, element },
      bubbles: true
    });
    element.dispatchEvent(swipeEvent);
  }

  /**
   * Handle tap interactions
   */
  handleTap(event) {
    const element = event.target;
    
    // Enhanced tap feedback for buttons and interactive elements
    if (element.matches('button, .btn, .interactive, .checkbox, .toggle')) {
      this.provideTapFeedback(element);
    }
    
    // Handle checkbox toggles
    if (element.closest('.mobile-checkbox')) {
      this.handleCheckboxTap(element.closest('.mobile-checkbox'));
    }
    
    // Handle card expansion
    if (element.closest('.card-header')) {
      this.handleCardHeaderTap(element.closest('.card'));
    }
  }

  /**
   * Handle long press interactions
   */
  handleLongPressStart(event) {
    this.longPressTimer = setTimeout(() => {
      this.handleLongPress(event.target);
    }, this.longPressDelay);
  }

  handleLongPressEnd() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  handleLongPressCancel() {
    this.handleLongPressEnd();
  }

  handleLongPress(element) {
    // Show context menu or additional options
    if (element.closest('.checklist-item')) {
      this.showItemContextMenu(element.closest('.checklist-item'));
    } else if (element.closest('.card')) {
      this.showCardContextMenu(element.closest('.card'));
    }
    
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  /**
   * Add visual touch feedback
   */
  addTouchFeedback(element) {
    const target = element.closest('button, .btn, .card, .interactive, .checkbox');
    if (target) {
      target.classList.add('touch-active');
    }
  }

  /**
   * Remove visual touch feedback
   */
  removeTouchFeedback() {
    document.querySelectorAll('.touch-active').forEach(element => {
      element.classList.remove('touch-active');
    });
  }

  /**
   * Provide haptic and visual tap feedback
   */
  provideTapFeedback(element) {
    // Visual feedback
    element.classList.add('tap-feedback');
    setTimeout(() => {
      element.classList.remove('tap-feedback');
    }, 150);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  /**
   * Handle swipe preview animations
   */
  handleSwipePreview(distance) {
    if (!this.activeElement) return;
    
    const maxDistance = 100;
    const clampedDistance = Math.max(-maxDistance, Math.min(maxDistance, distance));
    const opacity = 1 - Math.abs(clampedDistance) / maxDistance * 0.3;
    
    this.activeElement.style.transform = `translateX(${clampedDistance * 0.3}px)`;
    this.activeElement.style.opacity = opacity;
    
    // Show action hints
    if (Math.abs(clampedDistance) > 30) {
      this.showSwipeHint(clampedDistance > 0 ? 'right' : 'left');
    }
  }

  /**
   * Reset swipe preview
   */
  resetSwipePreview() {
    if (this.activeElement) {
      this.activeElement.style.transform = '';
      this.activeElement.style.opacity = '';
    }
    this.hideSwipeHints();
  }

  /**
   * Show swipe action hints
   */
  showSwipeHint(direction) {
    const hint = document.querySelector('.swipe-hint');
    if (hint) {
      hint.textContent = direction === 'right' ? 'Expand' : 'Actions';
      hint.classList.add('visible');
    }
  }

  /**
   * Hide swipe action hints
   */
  hideSwipeHints() {
    const hint = document.querySelector('.swipe-hint');
    if (hint) {
      hint.classList.remove('visible');
    }
  }

  /**
   * Expand card with animation
   */
  expandCard(card) {
    const content = card.querySelector('.card-content');
    if (content) {
      content.classList.toggle('expanded');
      
      // Trigger expand event
      const expandEvent = new CustomEvent('cardExpand', {
        detail: { card },
        bubbles: true
      });
      card.dispatchEvent(expandEvent);
    }
  }

  /**
   * Show card action menu
   */
  showCardActions(card) {
    const actions = card.querySelector('.card-actions');
    if (actions) {
      actions.classList.add('visible');
      
      // Auto-hide after delay
      setTimeout(() => {
        actions.classList.remove('visible');
      }, 3000);
    }
  }

  /**
   * Handle checkbox tap with animation
   */
  handleCheckboxTap(checkbox) {
    checkbox.classList.add('tap-animation');
    
    setTimeout(() => {
      checkbox.classList.remove('tap-animation');
    }, 200);
    
    // Trigger change event
    const changeEvent = new CustomEvent('checkboxChange', {
      detail: { checkbox, checked: checkbox.classList.contains('checked') },
      bubbles: true
    });
    checkbox.dispatchEvent(changeEvent);
  }

  /**
   * Handle card header tap
   */
  handleCardHeaderTap(card) {
    const isExpanded = card.classList.contains('expanded');
    
    if (isExpanded) {
      card.classList.remove('expanded');
    } else {
      card.classList.add('expanded');
    }
    
    // Smooth scroll to card if expanding
    if (!isExpanded) {
      setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }

  /**
   * Show context menu for items
   */
  showItemContextMenu(item) {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
      <div class="context-menu-item" data-action="edit">Edit</div>
      <div class="context-menu-item" data-action="share">Share</div>
      <div class="context-menu-item" data-action="info">More Info</div>
    `;
    
    // Position menu
    const rect = item.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.top}px`;
    menu.style.left = `${rect.right - 150}px`;
    menu.style.zIndex = '1000';
    
    document.body.appendChild(menu);
    
    // Handle menu actions
    menu.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleContextAction(item, action);
      }
      menu.remove();
    });
    
    // Auto-remove menu
    setTimeout(() => {
      if (menu.parentNode) {
        menu.remove();
      }
    }, 5000);
  }

  /**
   * Handle context menu actions
   */
  handleContextAction(item, action) {
    const actionEvent = new CustomEvent('contextAction', {
      detail: { item, action },
      bubbles: true
    });
    item.dispatchEvent(actionEvent);
  }

  /**
   * Close modal with animation
   */
  closeModal(modal) {
    modal.classList.add('closing');
    
    setTimeout(() => {
      modal.remove();
    }, 300);
  }

  /**
   * Set up scroll handling for better touch experience
   */
  setupScrollHandling() {
    let isScrolling = false;
    
    document.addEventListener('scroll', () => {
      isScrolling = true;
      
      // Hide floating elements during scroll
      document.querySelectorAll('.floating-element').forEach(el => {
        el.classList.add('scroll-hidden');
      });
      
      clearTimeout(this.scrollTimer);
      this.scrollTimer = setTimeout(() => {
        isScrolling = false;
        
        // Show floating elements after scroll
        document.querySelectorAll('.floating-element').forEach(el => {
          el.classList.remove('scroll-hidden');
        });
      }, 150);
    }, { passive: true });
  }

  /**
   * Set up hover fallbacks for touch devices
   */
  setupHoverFallbacks() {
    // Convert hover states to touch states
    document.addEventListener('touchstart', (e) => {
      const hoverElement = e.target.closest('[data-hover]');
      if (hoverElement) {
        hoverElement.classList.add('touch-hover');
      }
    });
    
    document.addEventListener('touchend', (e) => {
      // Remove hover states after delay
      setTimeout(() => {
        document.querySelectorAll('.touch-hover').forEach(el => {
          el.classList.remove('touch-hover');
        });
      }, 300);
    });
  }

  /**
   * Set up focus management for accessibility
   */
  setupFocusManagement() {
    // Ensure proper focus handling on touch
    document.addEventListener('touchend', (e) => {
      const focusable = e.target.closest('button, input, select, textarea, [tabindex]');
      if (focusable && !focusable.disabled) {
        focusable.focus();
      }
    });
    
    // Handle focus trapping in modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.modal.active');
        if (modal) {
          this.trapFocus(e, modal);
        }
      }
    });
  }

  /**
   * Trap focus within modal
   */
  trapFocus(event, modal) {
    const focusableElements = modal.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * Handle orientation changes
   */
  setupOrientationHandling() {
    window.addEventListener('orientationchange', () => {
      // Delay to allow for orientation change completion
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100);
    });
  }

  /**
   * Handle orientation change adjustments
   */
  handleOrientationChange() {
    // Recalculate layouts
    const cards = document.querySelectorAll('.card.expanded');
    cards.forEach(card => {
      // Temporarily collapse and re-expand to recalculate heights
      card.classList.remove('expanded');
      setTimeout(() => {
        card.classList.add('expanded');
      }, 50);
    });
    
    // Adjust modal positions
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
      this.adjustModalPosition(modal);
    });
  }

  /**
   * Adjust modal position for orientation
   */
  adjustModalPosition(modal) {
    const content = modal.querySelector('.modal-content');
    if (content) {
      const vh = window.innerHeight;
      const maxHeight = vh * 0.9;
      content.style.maxHeight = `${maxHeight}px`;
    }
  }

  /**
   * Prevent default behaviors on specific elements
   */
  preventDefaultBehaviors() {
    // Prevent pull-to-refresh on certain elements
    document.addEventListener('touchstart', (e) => {
      if (e.target.closest('.no-pull-refresh, .modal, .fixed-header')) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // Prevent zoom on double-tap for buttons
    document.addEventListener('touchend', (e) => {
      if (e.target.closest('button, .btn, .interactive')) {
        e.preventDefault();
      }
    });
  }

  /**
   * Add touch interaction styles
   */
  addTouchStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .touch-active {
        transform: scale(0.98);
        opacity: 0.8;
        transition: all 0.1s ease;
      }
      
      .tap-feedback {
        transform: scale(0.95);
        transition: transform 0.1s ease;
      }
      
      .tap-animation {
        animation: tapPulse 0.2s ease;
      }
      
      @keyframes tapPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      
      .context-menu {
        background: var(--deep-navy);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-lg);
        padding: var(--space-2);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(20px);
      }
      
      .context-menu-item {
        padding: var(--space-3);
        color: var(--champagne);
        cursor: pointer;
        border-radius: var(--radius-md);
        transition: all var(--transition-base);
      }
      
      .context-menu-item:hover {
        background: var(--glass-gold);
        color: var(--royalust-gold);
      }
      
      .swipe-hint {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--glass-violet);
        color: var(--champagne);
        padding: var(--space-2) var(--space-4);
        border-radius: var(--radius-full);
        font-size: var(--font-size-sm);
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
        z-index: 1000;
      }
      
      .swipe-hint.visible {
        opacity: 1;
      }
      
      .scroll-hidden {
        opacity: 0.5;
        transform: translateY(10px);
        transition: all 0.2s ease;
      }
      
      .touch-hover {
        background: var(--glass-gold) !important;
        color: var(--royalust-gold) !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Initialize touch interactions
   */
  static init() {
    const touchInteractions = new TouchInteractions();
    touchInteractions.addTouchStyles();
    return touchInteractions;
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TouchInteractions.init());
} else {
  TouchInteractions.init();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TouchInteractions;
}

// Global access
window.TouchInteractions = TouchInteractions;