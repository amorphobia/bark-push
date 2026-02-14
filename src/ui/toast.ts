/**
 * Toast notification system for displaying temporary messages
 */

export type ToastType = 'success' | 'error' | 'info';

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
}

// Export singleton instance
export const toast = new ToastManager();
