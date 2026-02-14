/**
 * Bark Push Userscript - Main Entry Point
 * 
 * This is the main entry point for the Bark Push Userscript.
 * It initializes the i18n system, creates the modal controller,
 * and registers the Tampermonkey menu item.
 * 
 * Requirements: 1.1, 17.2, 20.1
 */

import { i18n, t } from './i18n';
import { ModalController } from './ui/modal';
import { themeManager } from './ui/theme-manager';
import { StorageManager } from './storage/storage-manager';

// Global instances
let modalController: ModalController | null = null;
let storage: StorageManager | null = null;
let keyboardShortcutListener: ((event: KeyboardEvent) => void) | null = null;

// Flag to track if we're currently recording a keyboard shortcut
let isRecordingShortcut = false;

/**
 * Set the recording state (called by SettingsTab)
 */
export function setRecordingShortcut(recording: boolean): void {
  isRecordingShortcut = recording;
}

/**
 * Initialize the userscript
 * Requirements: 17.2, 20.1
 */
async function init(): Promise<void> {
  try {
    // Create storage manager instance first (needed for theme manager)
    storage = new StorageManager();

    // Initialize theme manager early to prevent flash of wrong theme
    // This applies CSS variables to document root before any UI renders
    themeManager.init(storage);

    // Initialize i18n system (Requirement 17.2)
    await i18n.init();

    // Create modal controller instance (lazy initialization)
    // Modal will be injected on demand when user clicks menu item
    modalController = new ModalController(storage);

    console.log('[Bark Push] Userscript initialized successfully');
  } catch (error) {
    console.error('[Bark Push] Failed to initialize userscript:', error);
  }
}

/**
 * Toggle the modal
 * Requirements: 1.1, 20.1
 */
function toggleModal(): void {
  if (!modalController) {
    console.error('[Bark Push] Modal controller not initialized');
    return;
  }
  
  // Toggle modal state
  modalController.toggle();
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
 * Parse keyboard shortcut string into modifier keys and main key
 * Example: "Ctrl+Shift+B" -> { ctrl: true, shift: true, key: "B" }
 */
function parseShortcut(shortcut: string): { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean; key: string } | null {
  if (!shortcut) return null;
  
  const parts = shortcut.split('+').map(p => p.trim());
  if (parts.length === 0) return null;
  
  const result = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    key: '',
  };
  
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'control') {
      result.ctrl = true;
    } else if (lower === 'alt') {
      result.alt = true;
    } else if (lower === 'shift') {
      result.shift = true;
    } else if (lower === 'meta' || lower === 'cmd' || lower === 'command') {
      result.meta = true;
    } else {
      result.key = part.toUpperCase();
    }
  }
  
  return result.key ? result : null;
}

/**
 * Check if keyboard event matches the configured shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut);
  if (!parsed) return false;
  
  return (
    event.ctrlKey === parsed.ctrl &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift &&
    event.metaKey === parsed.meta &&
    event.key.toUpperCase() === parsed.key
  );
}

/**
 * Register keyboard shortcut listener
 */
function registerKeyboardShortcut(): void {
  if (!storage) return;
  
  // Remove existing listener if any
  if (keyboardShortcutListener) {
    document.removeEventListener('keydown', keyboardShortcutListener);
  }
  
  // Get configured shortcut
  const shortcut = storage.getKeyboardShortcut();
  if (!shortcut) return;
  
  // Create new listener
  keyboardShortcutListener = (event: KeyboardEvent) => {
    // Don't trigger if we're currently recording a shortcut
    if (isRecordingShortcut) return;
    
    // Don't trigger if user is typing in an input field
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.isContentEditable;
    
    if (isInputField) return;
    
    // Check if event matches configured shortcut
    if (matchesShortcut(event, shortcut)) {
      event.preventDefault();
      event.stopPropagation();
      toggleModal();
    }
  };
  
  // Register listener
  document.addEventListener('keydown', keyboardShortcutListener, true);
  console.log('[Bark Push] Keyboard shortcut registered:', shortcut);
}

/**
 * Register Tampermonkey menu item
 * Requirement 1.1
 */
function registerMenuCommand(): void {
  try {
    if (typeof GM_registerMenuCommand !== 'undefined') {
      // Get configured shortcut and replace placeholder
      const shortcut = storage?.getKeyboardShortcut() || 'Alt+B';
      const menuText = t('menu.sendToBark').replace('{shortcut}', shortcut);
      GM_registerMenuCommand(menuText, showModal);
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
      registerKeyboardShortcut();
    });
  } else {
    // DOM already loaded
    await init();
    registerMenuCommand();
    registerKeyboardShortcut();
  }
})();
