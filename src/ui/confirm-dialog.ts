/**
 * Custom confirmation dialog to replace native confirm()
 */

export class ConfirmDialog {
  /**
   * Show a confirmation dialog
   * @param message - Message to display
   * @param title - Dialog title (optional)
   * @returns Promise that resolves to true if confirmed, false if cancelled
   */
  static show(message: string, title?: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Create overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999998;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 200ms ease-out;
      `;

      // Create dialog
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: calc(100vw - 40px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideIn 200ms ease-out;
      `;

      // Create title if provided
      if (title) {
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        titleElement.style.cssText = `
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        `;
        dialog.appendChild(titleElement);
      }

      // Create message
      const messageElement = document.createElement('p');
      messageElement.textContent = message;
      messageElement.style.cssText = `
        margin: 0 0 24px 0;
        font-size: 14px;
        line-height: 1.5;
        color: #666;
        white-space: pre-wrap;
      `;
      dialog.appendChild(messageElement);

      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      `;

      // Create cancel button
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancel';
      cancelButton.style.cssText = `
        padding: 10px 20px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: white;
        color: #333;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 200ms;
        min-width: 80px;
      `;
      cancelButton.onmouseover = () => {
        cancelButton.style.background = '#f5f5f5';
      };
      cancelButton.onmouseout = () => {
        cancelButton.style.background = 'white';
      };
      cancelButton.onclick = () => {
        cleanup();
        resolve(false);
      };

      // Create confirm button
      const confirmButton = document.createElement('button');
      confirmButton.textContent = 'Delete';
      confirmButton.style.cssText = `
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        background: #ff3b30;
        color: white;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 200ms;
        min-width: 80px;
      `;
      confirmButton.onmouseover = () => {
        confirmButton.style.background = '#e6342a';
      };
      confirmButton.onmouseout = () => {
        confirmButton.style.background = '#ff3b30';
      };
      confirmButton.onclick = () => {
        cleanup();
        resolve(true);
      };

      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(confirmButton);
      dialog.appendChild(buttonContainer);

      overlay.appendChild(dialog);

      // Add animations
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);

      // Add to DOM
      document.body.appendChild(overlay);

      // Focus confirm button
      confirmButton.focus();

      // Handle ESC key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleEscape);

      // Cleanup function
      function cleanup() {
        document.removeEventListener('keydown', handleEscape);
        overlay.remove();
        style.remove();
      }

      // Click overlay to cancel
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      };
    });
  }
}
