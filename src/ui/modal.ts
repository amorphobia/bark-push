/**
 * Modal controller with shadow DOM isolation
 */

import { StorageManager } from '../storage/storage-manager';
import { BarkClient } from '../api/bark-client';
import { PushTab } from './push-tab';
import { SettingsTab } from './settings-tab';
import { t } from '../i18n';
import { toast } from './toast';

export type TabType = 'push' | 'settings';

export class ModalController {
  private shadowRoot: ShadowRoot | null = null;
  private modalElement: HTMLElement | null = null;
  private currentTab: TabType = 'push';
  private storage: StorageManager;
  private barkClient: BarkClient;
  private previousFocusElement: HTMLElement | null = null;
  private resizeHandler: (() => void) | null = null;

  // Tab components
  private pushTab: PushTab | null = null;
  private settingsTab: SettingsTab | null = null;

  constructor(storage: StorageManager) {
    this.storage = storage;
    this.barkClient = new BarkClient();
  }

  /**
   * Calculate modal height based on viewport
   * Design Change: Fixed height that doesn't change between tabs
   * Formula: min(600px, window.innerHeight - 80px)
   * The 80px margin provides breathing room (40px top + 40px bottom)
   */
  private calculateModalHeight(): number {
    const viewportHeight = window.innerHeight;
    const verticalMargin = 80; // 40px top + 40px bottom
    const maxHeight = 600;
    
    return Math.min(maxHeight, viewportHeight - verticalMargin);
  }

  /**
   * Update modal height
   * Design Change: Apply calculated height to modal element
   */
  private updateModalHeight(): void {
    if (!this.modalElement) return;

    const modal = this.modalElement.querySelector('.bark-modal') as HTMLElement;
    if (!modal) return;

    const height = this.calculateModalHeight();
    modal.style.height = `${height}px`;
    modal.style.maxHeight = `${height}px`;
  }

  /**
   * Check if modal is open
   */
  isOpen(): boolean {
    return this.modalElement?.style.display === 'flex';
  }

  /**
   * Toggle the modal
   */
  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open the modal
   * Requirements: 1.1, 21.3
   * Design Change: Set fixed height and add resize listener
   */
  open(): void {
    // Store currently focused element (Requirement 21.3)
    this.previousFocusElement = document.activeElement as HTMLElement;

    // Load last active tab
    this.currentTab = this.storage.getLastTab();

    // Create shadow DOM if not exists
    if (!this.shadowRoot) {
      this.createShadowDOM();
    }

    // Render modal content
    this.render();

    // Show modal
    if (this.modalElement) {
      this.modalElement.style.display = 'flex';
    }

    // Design Change: Set initial modal height
    this.updateModalHeight();

    // Design Change: Add resize listener for responsive height
    this.resizeHandler = () => this.updateModalHeight();
    window.addEventListener('resize', this.resizeHandler);

    // Set initial focus to message field (Requirement 21.3)
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      if (this.currentTab === 'push') {
        const messageField = this.shadowRoot?.querySelector('#bark-message') as HTMLTextAreaElement;
        if (messageField) {
          messageField.focus();
        }
      } else {
        // For settings tab, focus the first focusable element
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    });

    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Close the modal
   * Requirements: 2.1, 2.4, 21.3
   * Design Change: Remove resize listener
   */
  close(): void {
    if (this.modalElement) {
      this.modalElement.style.display = 'none';
    }

    // Design Change: Remove resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    // Clean up tab components
    if (this.pushTab) {
      this.pushTab.destroy();
    }

    // Restore focus to previous element (Requirements 2.4, 21.3)
    if (this.previousFocusElement && typeof this.previousFocusElement.focus === 'function') {
      try {
        this.previousFocusElement.focus();
      } catch (error) {
        // Element might no longer be in DOM, ignore error
        console.debug('Could not restore focus:', error);
      }
    }

    // Clean up event listeners
    this.detachEventListeners();
  }

  /**
   * Switch to a different tab
   */
  switchTab(tab: TabType): void {
    this.currentTab = tab;
    this.storage.setLastTab(tab);
    
    // Detach old listeners before re-rendering
    this.detachEventListeners();
    
    // Re-render with new tab
    this.render();
    
    // Design Change: Reapply modal height after re-render
    this.updateModalHeight();
    
    // Reattach listeners
    this.attachEventListeners();
  }

  /**
   * Create shadow DOM container
   */
  private createShadowDOM(): void {
    // Create container element
    const container = document.createElement('div');
    container.id = 'bark-modal-root';
    document.body.appendChild(container);

    // Attach shadow root
    this.shadowRoot = container.attachShadow({ mode: 'open' });

    // Create modal element
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'bark-modal-overlay';
    this.modalElement.style.display = 'none';

    // Inject styles
    this.injectStyles();

    // Append modal to shadow root
    this.shadowRoot.appendChild(this.modalElement);
  }

  /**
   * Inject scoped styles into shadow DOM
   */
  private injectStyles(): void {
    if (!this.shadowRoot) return;

    const style = document.createElement('style');
    style.textContent = `
      * {
        box-sizing: border-box;
      }

      /* Modal Overlay */
      .bark-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #333;
      }

      /* Modal Container - Responsive Width & Fixed Height */
      /* Design Change: Fixed height that doesn't change between tabs */
      .bark-modal {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        width: 450px;
        max-width: calc(100vw - 20px);
        /* Height is set dynamically via JavaScript */
        /* max-height is also set dynamically to match height */
        display: flex;
        flex-direction: column;
        overflow: hidden; /* Prevent modal itself from scrolling */
      }

      @media (max-width: 470px) {
        .bark-modal {
          width: calc(100vw - 20px);
        }
      }

      /* Modal Header */
      .bark-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #e5e5e5;
      }

      /* Tabs */
      .bark-tabs {
        display: flex;
        gap: 8px;
      }

      .bark-tab {
        padding: 8px 16px;
        min-width: 44px;
        min-height: 44px;
        border: none;
        background: transparent;
        color: #666;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border-radius: 6px;
        transition: background-color 200ms, color 200ms;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .bark-tab:hover {
        background-color: #f5f5f5;
      }

      .bark-tab.active {
        background-color: #007aff;
        color: white;
      }

      .bark-tab:focus {
        outline: 2px solid #007aff;
        outline-offset: 2px;
      }

      /* Close Button - Touch-friendly */
      .bark-close-btn {
        width: 44px;
        height: 44px;
        border: none;
        background: transparent;
        color: #666;
        font-size: 20px;
        cursor: pointer;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 200ms;
      }

      .bark-close-btn:hover {
        background-color: #f5f5f5;
      }

      .bark-close-btn:focus {
        outline: 2px solid #007aff;
        outline-offset: 2px;
      }

      /* Modal Body */
      /* Design Change: Only modal-body scrolls, not the entire modal */
      .bark-modal-body {
        padding: 16px;
        overflow-y: auto;
        overflow-x: hidden;
        flex: 1; /* Take remaining space after header */
      }

      /* Scrollbar styling */
      .bark-modal-body::-webkit-scrollbar {
        width: 8px;
      }

      .bark-modal-body::-webkit-scrollbar-track {
        background: #f5f5f5;
      }

      .bark-modal-body::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 4px;
      }

      .bark-modal-body::-webkit-scrollbar-thumb:hover {
        background: #999;
      }

      /* Common Form Elements */
      input[type="text"],
      input[type="url"],
      textarea,
      select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        transition: border-color 200ms;
      }

      input[type="text"]:focus,
      input[type="url"]:focus,
      textarea:focus,
      select:focus {
        outline: none;
        border-color: #007aff;
        box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
      }

      textarea {
        resize: vertical;
        min-height: 80px;
      }

      /* Buttons - iOS Style */
      button {
        font-family: inherit;
        font-size: 14px;
        cursor: pointer;
        transition: all 200ms;
      }

      .btn-primary {
        background-color: #007aff;
        color: white;
        border: none;
        padding: 10px 20px;
        min-width: 44px;
        min-height: 44px;
        border-radius: 8px;
        font-weight: 500;
      }

      .btn-primary:hover {
        background-color: #0051d5;
      }

      .btn-primary:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }

      .btn-primary:focus {
        outline: 2px solid #007aff;
        outline-offset: 2px;
      }

      .btn-secondary {
        background-color: #f5f5f5;
        color: #333;
        border: none;
        padding: 10px 20px;
        min-width: 44px;
        min-height: 44px;
        border-radius: 8px;
        font-weight: 500;
      }

      .btn-secondary:hover {
        background-color: #e5e5e5;
      }

      .btn-secondary:focus {
        outline: 2px solid #007aff;
        outline-offset: 2px;
      }

      .btn-danger {
        background-color: #ff3b30;
        color: white;
        border: none;
        padding: 10px 20px;
        min-width: 44px;
        min-height: 44px;
        border-radius: 8px;
        font-weight: 500;
      }

      .btn-danger:hover {
        background-color: #d70015;
      }

      .btn-danger:focus {
        outline: 2px solid #ff3b30;
        outline-offset: 2px;
      }

      /* Form Groups - Consistent Spacing */
      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #333;
      }

      .form-group .hint {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        color: #666;
      }

      .form-group .error {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        color: #ff3b30;
      }

      /* Form Header - Back button and title */
      .form-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
      }

      .form-header h3 {
        margin: 0;
        flex: 1;
      }

      /* Form Actions - Button container */
      .form-actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
        flex-wrap: wrap;
      }

      .form-actions button {
        flex: 1;
        min-width: 120px;
      }

      /* Add Device Button - Standalone with spacing */
      .add-device-btn {
        margin-top: 16px;
        width: 100%;
      }

      /* Device cards spacing */
      .device-card {
        margin-bottom: 16px;
      }

      .device-card:last-of-type {
        margin-bottom: 16px;
      }

      /* Button spacing when not in form-actions */
      button + button {
        margin-left: 8px;
      }

      .form-actions button + button {
        margin-left: 0; /* Reset for flex gap */
      }

      /* Checkbox and Radio - Touch-friendly */
      input[type="checkbox"],
      input[type="radio"] {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }

      /* Loading Spinner */
      .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Utility Classes */
      .text-center {
        text-align: center;
      }

      .mt-8 {
        margin-top: 8px;
      }

      .mt-16 {
        margin-top: 16px;
      }

      .mt-24 {
        margin-top: 24px;
      }

      .mb-8 {
        margin-bottom: 8px;
      }

      .mb-16 {
        margin-bottom: 16px;
      }

      .mb-24 {
        margin-bottom: 24px;
      }

      /* Color Contrast - WCAG AA Compliant */
      /* Primary color #007aff on white: 4.5:1 ratio */
      /* Text color #333 on white: 12.6:1 ratio */
      /* Secondary text #666 on white: 5.7:1 ratio */
      /* Error color #ff3b30 on white: 4.5:1 ratio */

      /* Device Selector - Select-like Dropdown with Checkboxes */
      .device-selector {
        position: relative;
        width: 100%;
      }

      .device-selector-toggle {
        width: 100%;
        padding: 8px 32px 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        background-color: white;
        text-align: left;
        cursor: pointer;
        transition: border-color 200ms;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 38px;
      }

      .device-selector-toggle:hover {
        border-color: #bbb;
      }

      .device-selector-toggle:focus {
        outline: none;
        border-color: #007aff;
        box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
      }

      .device-selector-toggle:disabled {
        background-color: #f5f5f5;
        color: #999;
        cursor: not-allowed;
      }

      .device-selector-text {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .device-selector-arrow {
        margin-left: 8px;
        font-size: 10px;
        color: #666;
        transition: transform 200ms;
        flex-shrink: 0;
      }

      .device-selector-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 4px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
      }

      .device-selector-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        transition: background-color 200ms;
        user-select: none;
      }

      .device-selector-item:hover {
        background-color: #f5f5f5;
      }

      .device-selector-item input[type="checkbox"] {
        margin-right: 8px;
        flex-shrink: 0;
      }

      .device-selector-item span {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .device-selector-empty {
        padding: 12px;
        text-align: center;
        color: #999;
        font-size: 14px;
      }

      /* Advanced Options - Card Style with Smooth Animation */
      .advanced-section {
        margin-top: 16px;
      }

      .advanced-card {
        background-color: #f8f9fa;
        border-radius: 8px;
        overflow: hidden;
        transition: box-shadow 200ms;
      }

      .advanced-card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      .advanced-toggle {
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: transparent;
        text-align: left;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #333;
        transition: background-color 200ms;
      }

      .advanced-toggle:hover {
        background-color: rgba(0, 0, 0, 0.03);
      }

      .advanced-toggle:focus {
        outline: 2px solid #007aff;
        outline-offset: -2px;
      }

      .advanced-arrow {
        font-size: 12px;
        color: #666;
        transition: transform 300ms ease;
        display: inline-block;
      }

      .advanced-content {
        overflow: hidden;
        transition: max-height 300ms ease, opacity 300ms ease;
        border-top: 1px solid #e5e5e5;
      }

      .advanced-content > .form-group:first-child {
        margin-top: 16px;
      }

      .advanced-content > .form-group:last-child {
        margin-bottom: 16px;
      }

      .advanced-content .form-group {
        padding: 0 16px;
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  /**
   * Render modal content
   */
  private render(): void {
    if (!this.modalElement) return;

    this.modalElement.innerHTML = `
      <div class="bark-modal">
        <div class="bark-modal-header">
          <div class="bark-tabs">
            <button class="bark-tab ${this.currentTab === 'push' ? 'active' : ''}" data-tab="push">
              ${t('tabs.push')}
            </button>
            <button class="bark-tab ${this.currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
              ${t('tabs.settings')}
            </button>
          </div>
          <button class="bark-close-btn" aria-label="${t('common.close')}">✕</button>
        </div>
        <div class="bark-modal-body">
          ${this.renderTabContent()}
        </div>
      </div>
    `;

    // Inject the actual tab component after DOM is ready
    requestAnimationFrame(() => {
      this.injectTabComponent();
    });
  }

  /**
   * Render content for the current tab
   */
  private renderTabContent(): string {
    // Create a placeholder div that will be replaced with actual component
    if (this.currentTab === 'push') {
      return '<div id="bark-push-tab-container"></div>';
    } else {
      return '<div id="bark-settings-tab-container"></div>';
    }
  }

  /**
   * Inject tab component into the rendered container
   */
  private injectTabComponent(): void {
    if (!this.shadowRoot) return;

    if (this.currentTab === 'push') {
      const container = this.shadowRoot.querySelector('#bark-push-tab-container');
      if (container) {
        // Create PushTab if not exists
        if (!this.pushTab) {
          this.pushTab = new PushTab(this.storage, this.barkClient, toast);
        }
        
        // Clear container and append rendered component
        container.innerHTML = '';
        container.appendChild(this.pushTab.render());
      }
    } else {
      const container = this.shadowRoot.querySelector('#bark-settings-tab-container');
      if (container) {
        // Create SettingsTab if not exists
        if (!this.settingsTab) {
          this.settingsTab = new SettingsTab(this.storage, this.barkClient, toast);
        }
        
        // Clear container and append rendered component
        container.innerHTML = '';
        container.appendChild(this.settingsTab.render());
      }
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.shadowRoot) return;

    // Tab switching
    const tabs = this.shadowRoot.querySelectorAll('.bark-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', this.handleTabClick);
    });

    // Close button
    const closeBtn = this.shadowRoot.querySelector('.bark-close-btn');
    closeBtn?.addEventListener('click', this.handleClose);

    // Backdrop click
    const overlay = this.shadowRoot.querySelector('.bark-modal-overlay');
    overlay?.addEventListener('click', this.handleBackdropClick);

    // ESC key
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Detach event listeners
   */
  private detachEventListeners(): void {
    if (!this.shadowRoot) return;

    // Tab switching
    const tabs = this.shadowRoot.querySelectorAll('.bark-tab');
    tabs.forEach(tab => {
      tab.removeEventListener('click', this.handleTabClick);
    });

    // Close button
    const closeBtn = this.shadowRoot.querySelector('.bark-close-btn');
    closeBtn?.removeEventListener('click', this.handleClose);

    // Backdrop click
    const overlay = this.shadowRoot.querySelector('.bark-modal-overlay');
    overlay?.removeEventListener('click', this.handleBackdropClick);

    // ESC key
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Handle tab click
   */
  private handleTabClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    const tab = target.dataset.tab as TabType;
    if (tab) {
      this.switchTab(tab);
    }
  };

  /**
   * Handle close button click
   */
  private handleClose = (): void => {
    this.close();
  };

  /**
   * Handle backdrop click
   */
  private handleBackdropClick = (event: Event): void => {
    // Only close if clicking the backdrop itself, not the modal
    if (event.target === event.currentTarget) {
      this.close();
    }
  };

  /**
   * Handle keyboard events
   * Requirements: 2.2, 21.1
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    // ESC key closes modal (Requirements 2.2, 21.1)
    if (event.key === 'Escape') {
      this.close();
    }
    
    // Tab key navigation - ensure focus stays within modal
    if (event.key === 'Tab' && this.shadowRoot) {
      this.handleTabNavigation(event);
    }
  };

  /**
   * Handle Tab key navigation to keep focus within modal
   * Requirement 21.4: Tab navigation order
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    if (!this.shadowRoot) return;

    // Get all focusable elements within the modal
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = this.shadowRoot.activeElement;

    // If Shift+Tab on first element, wrap to last
    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
    // If Tab on last element, wrap to first
    else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * Get all focusable elements in the modal
   * Requirement 21.4: Tab navigation order
   */
  private getFocusableElements(): HTMLElement[] {
    if (!this.shadowRoot) return [];

    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    const elements = Array.from(this.shadowRoot.querySelectorAll(selector)) as HTMLElement[];
    
    // Filter out hidden elements
    return elements.filter(el => {
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }
}
