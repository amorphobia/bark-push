/**
 * Modal controller with shadow DOM isolation
 */

import { StorageManager } from '../storage/storage-manager';

export type TabType = 'push' | 'settings';

export class ModalController {
  private shadowRoot: ShadowRoot | null = null;
  private modalElement: HTMLElement | null = null;
  private currentTab: TabType = 'push';
  private storage: StorageManager;
  private previousFocusElement: HTMLElement | null = null;

  constructor(storage: StorageManager) {
    this.storage = storage;
  }

  /**
   * Open the modal
   */
  open(): void {
    // Store currently focused element
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

    // Set initial focus to message field (will be implemented in push tab)
    requestAnimationFrame(() => {
      const messageField = this.shadowRoot?.querySelector('#bark-message') as HTMLTextAreaElement;
      if (messageField && this.currentTab === 'push') {
        messageField.focus();
      }
    });

    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Close the modal
   */
  close(): void {
    if (this.modalElement) {
      this.modalElement.style.display = 'none';
    }

    // Restore focus to previous element
    if (this.previousFocusElement) {
      this.previousFocusElement.focus();
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
      }

      .bark-modal {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        width: 450px;
        max-width: calc(100vw - 20px);
        max-height: 600px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      @media (max-width: 470px) {
        .bark-modal {
          width: calc(100vw - 20px);
        }
      }

      .bark-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #e5e5e5;
      }

      .bark-tabs {
        display: flex;
        gap: 8px;
      }

      .bark-tab {
        padding: 8px 16px;
        border: none;
        background: transparent;
        color: #666;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border-radius: 6px;
        transition: background-color 200ms, color 200ms;
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

      .bark-close-btn {
        width: 32px;
        height: 32px;
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

      .bark-modal-body {
        padding: 16px;
        overflow-y: auto;
        flex: 1;
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
              Push
            </button>
            <button class="bark-tab ${this.currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
              Settings
            </button>
          </div>
          <button class="bark-close-btn" aria-label="Close">✕</button>
        </div>
        <div class="bark-modal-body">
          ${this.renderTabContent()}
        </div>
      </div>
    `;
  }

  /**
   * Render content for the current tab
   */
  private renderTabContent(): string {
    if (this.currentTab === 'push') {
      return '<div id="bark-push-tab">Push tab content (to be implemented)</div>';
    } else {
      return '<div id="bark-settings-tab">Settings tab content (to be implemented)</div>';
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
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.close();
    }
  };
}
