/**
 * Toast notification system for displaying temporary messages
 */

export type ToastType = 'success' | 'error' | 'info';

/**
 * Action button for toast with callback
 */
export interface ToastAction {
  /** Label for the action button */
  label: string;
  /** SVG markup for the icon */
  svg: string;
  /** Callback when action is clicked. Optional toastId param to allow dismissing. */
  callback: (toastId?: string) => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  timeoutId?: number;
}

export class ToastManager {
  private container: HTMLElement | null = null;
  private toasts: Map<string, Toast> = new Map();
  private nextId = 0;

  /**
   * Show a toast notification
   * @param message - Message to display
   * @param type - Toast type (success, error, info)
   * @param duration - Duration in milliseconds (default: 3000, 0 = no auto-dismiss)
   * @returns Toast ID for manual dismissal
   */
  show(message: string, type: ToastType = 'info', duration: number = 3000): string {
    const id = `toast-${this.nextId++}`;
    
    // Create container if it doesn't exist
    if (!this.container) {
      this.createContainer();
    }

    // Create toast element
    const toastElement = this.createToastElement(id, message, type);
    this.container!.appendChild(toastElement);

    // Store toast data
    const toast: Toast = { id, message, type };
    this.toasts.set(id, toast);

    // Auto-dismiss after duration
    if (duration > 0) {
      const timeoutId = window.setTimeout(() => {
        this.hide(id);
      }, duration);
      toast.timeoutId = timeoutId;
    }

    // Trigger animation
    requestAnimationFrame(() => {
      toastElement.classList.add('show');
    });

    return id;
  }

  /**
   * Show a toast with action buttons
   * @param message - Message to display
   * @param actions - Array of action buttons
   * @param type - Toast type (success, error, info)
   * @param duration - Duration in milliseconds (default: 0 = no auto-dismiss)
   * @returns Toast ID for manual dismissal
   */
  showWithActions(
    message: string,
    actions: ToastAction[],
    type: ToastType = 'info',
    duration: number = 0
  ): string {
    const id = `toast-${this.nextId++}`;

    // Create container if it doesn't exist
    if (!this.container) {
      this.createContainer();
    }

    // Create toast element with actions
    const toastElement = this.createToastElementWithActions(id, message, type, actions);
    this.container!.appendChild(toastElement);

    // Store toast data
    const toast: Toast = { id, message, type };
    this.toasts.set(id, toast);

    // Auto-dismiss after duration (default: no auto-dismiss)
    if (duration > 0) {
      const timeoutId = window.setTimeout(() => {
        this.hide(id);
      }, duration);
      toast.timeoutId = timeoutId;
    }

    // Trigger animation
    requestAnimationFrame(() => {
      toastElement.classList.add('show');
    });

    return id;
  }

  /**
   * Hide a specific toast
   * @param toastId - ID of the toast to hide
   */
  hide(toastId: string): void {
    const toast = this.toasts.get(toastId);
    if (!toast) return;

    // Clear timeout if exists
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }

    // Find and remove element
    const element = this.container?.querySelector(`[data-toast-id="${toastId}"]`);
    if (element) {
      element.classList.remove('show');
      
      // Remove from DOM after animation
      setTimeout(() => {
        element.remove();
        
        // Remove container if no more toasts
        if (this.container && this.container.children.length === 0) {
          this.container.remove();
          this.container = null;
        }
      }, 200); // Match CSS transition duration
    }

    this.toasts.delete(toastId);
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    // Clear all timeouts
    this.toasts.forEach(toast => {
      if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
      }
    });

    // Remove container
    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.toasts.clear();
  }

  /**
   * Create the toast container element
   */
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = 'bark-toast-container';
    this.container.innerHTML = `
      <style>
        .bark-toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 999999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }

        .bark-toast {
          min-width: 250px;
          max-width: 400px;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px var(--bark-shadow, rgba(0, 0, 0, 0.15));
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #fff;
          pointer-events: auto;
          opacity: 0;
          transform: translateX(100%);
          transition: opacity 200ms ease-out, transform 200ms ease-out;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .bark-toast.show {
          opacity: 1;
          transform: translateX(0);
        }

        .bark-toast.success {
          background-color: var(--bark-success, #34c759);
        }

        .bark-toast.error {
          background-color: var(--bark-danger, #ff3b30);
        }

        .bark-toast.info {
          background-color: var(--bark-primary, #007aff);
        }

        .bark-toast-message {
          flex: 1;
        }

        .bark-toast-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .bark-toast-action {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 4px;
          width: 28px;
          height: 28px;
          padding: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 200ms;
        }

        .bark-toast-action:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .bark-toast-action svg {
          width: 16px;
          height: 16px;
          fill: white;
        }

        @media (max-width: 470px) {
          .bark-toast-container {
            left: 10px;
            right: 10px;
            top: 10px;
          }

          .bark-toast {
            max-width: none;
          }
        }
      </style>
    `;
    document.body.appendChild(this.container);
  }

  /**
   * Create a toast element
   */
  private createToastElement(id: string, message: string, type: ToastType): HTMLElement {
    const toast = document.createElement('div');
    toast.className = `bark-toast ${type}`;
    toast.setAttribute('data-toast-id', id);
    toast.textContent = message;

    // Add click to dismiss
    toast.addEventListener('click', () => {
      this.hide(id);
    });

    return toast;
  }

  /**
   * Create a toast element with action buttons
   */
  private createToastElementWithActions(
    id: string,
    message: string,
    type: ToastType,
    actions: ToastAction[]
  ): HTMLElement {
    const toast = document.createElement('div');
    toast.className = `bark-toast ${type}`;
    toast.setAttribute('data-toast-id', id);

    // Message element
    const messageEl = document.createElement('span');
    messageEl.className = 'bark-toast-message';
    messageEl.textContent = message;
    toast.appendChild(messageEl);

    // Actions container
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'bark-toast-actions';

    actions.forEach((action) => {
      const button = document.createElement('button');
      button.className = 'bark-toast-action';
      button.innerHTML = action.svg;
      button.title = action.label;
      button.setAttribute('aria-label', action.label);

      // Prevent toast from closing when clicking action button
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        action.callback(id);
      });

      actionsContainer.appendChild(button);
    });

    toast.appendChild(actionsContainer);

    // Don't auto-dismiss on click when there are actions
    toast.addEventListener('click', (e) => {
      // Only dismiss if clicking the message area, not actions
      if ((e.target as HTMLElement).classList.contains('bark-toast-message')) {
        this.hide(id);
      }
    });

    return toast;
  }
}

// Export singleton instance
export const toast = new ToastManager();
