/**
 * Bark Push Userscript - Main Entry Point
 * 
 * This is the main entry point for the Bark Push Userscript.
 * It initializes the i18n system, creates the modal controller,
 * and registers the Tampermonkey menu item.
 * 
 * Requirements: 1.1, 17.2, 20.1
 */

import { i18n } from './i18n';
import { ModalController } from './ui/modal';
import { StorageManager } from './storage/storage-manager';

// Global instances
let modalController: ModalController | null = null;
let storage: StorageManager | null = null;

/**
 * Initialize the userscript
 * Requirements: 17.2, 20.1
 */
async function init(): Promise<void> {
  try {
    // Initialize i18n system (Requirement 17.2)
    await i18n.init();
    
    // Create storage manager instance
    storage = new StorageManager();
    
    // Create modal controller instance (lazy initialization)
    // Modal will be injected on demand when user clicks menu item
    modalController = new ModalController(storage);
    
    console.log('[Bark Push] Userscript initialized successfully');
  } catch (error) {
    console.error('[Bark Push] Failed to initialize userscript:', error);
  }
}

/**
 * Show the modal
 * Requirements: 1.1, 20.1
 */
function showModal(): void {
  if (!modalController) {
    console.error('[Bark Push] Modal controller not initialized');
    return;
  }
  
  // Open modal (will inject into page on demand)
  modalController.open();
}

/**
 * Register Tampermonkey menu item
 * Requirement 1.1
 */
function registerMenuCommand(): void {
  try {
    if (typeof GM_registerMenuCommand !== 'undefined') {
      GM_registerMenuCommand('📱 Send to Bark', showModal);
      console.log('[Bark Push] Menu command registered');
    } else {
      console.warn('[Bark Push] GM_registerMenuCommand not available');
    }
  } catch (error) {
    console.error('[Bark Push] Failed to register menu command:', error);
  }
}

/**
 * Main execution
 * Initialize on page load
 */
(async () => {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await init();
      registerMenuCommand();
    });
  } else {
    // DOM already loaded
    await init();
    registerMenuCommand();
  }
})();
