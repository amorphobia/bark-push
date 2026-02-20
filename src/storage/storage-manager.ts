/**
 * StorageManager - Type-safe wrapper for Tampermonkey GM_Storage
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7
 */

import type { BarkDevice, TabType, ThemeType, PushHistoryItem } from '../types';
import { STORAGE_KEYS } from '../types';

/**
 * StorageManager provides type-safe access to Tampermonkey storage
 * Handles device CRUD operations and user preferences
 */
export class StorageManager {
  /**
   * Get all configured devices
   * Requirement 18.1: Store device configurations as an array
   */
  getDevices(): BarkDevice[] {
    try {
      const devices = GM_getValue(STORAGE_KEYS.DEVICES, []);
      return Array.isArray(devices) ? devices : [];
    } catch (error) {
      console.error('Failed to get devices from storage:', error);
      return [];
    }
  }

  /**
   * Save a new device to storage
   * Requirement 18.1: Store device configurations
   * Requirement 15.2: Enforce single default device constraint
   * Auto-sets first device as default
   */
  saveDevice(device: BarkDevice): void {
    try {
      const devices = this.getDevices();
      
      // Auto-set first device as default
      if (devices.length === 0) {
        device.isDefault = true;
      }
      
      // If this device is being set as default, clear other defaults
      if (device.isDefault) {
        devices.forEach(d => {
          d.isDefault = false;
        });
      }
      
      devices.push(device);
      GM_setValue(STORAGE_KEYS.DEVICES, devices);
      
      // Update default device ID if this is the default
      if (device.isDefault) {
        this.setDefaultDeviceId(device.id);
      }
    } catch (error) {
      console.error('Failed to save device:', error);
      throw new Error('Failed to save device. Storage may be unavailable.');
    }
  }

  /**
   * Update an existing device
   * Requirement 18.1: Store device configurations
   * Requirement 15.2: Enforce single default device constraint
   */
  updateDevice(deviceId: string, updates: Partial<BarkDevice>): void {
    try {
      const devices = this.getDevices();
      const index = devices.findIndex(d => d.id === deviceId);
      
      if (index === -1) {
        throw new Error(`Device with id ${deviceId} not found`);
      }
      
      // If setting this device as default, clear other defaults
      if (updates.isDefault === true) {
        devices.forEach(d => {
          d.isDefault = false;
        });
      }
      
      // Apply updates while preserving immutable fields
      devices[index] = {
        ...devices[index],
        ...updates,
        id: devices[index].id, // ID is immutable
        createdAt: devices[index].createdAt, // createdAt is immutable
      };
      
      GM_setValue(STORAGE_KEYS.DEVICES, devices);
      
      // Update default device ID if needed
      if (updates.isDefault === true) {
        this.setDefaultDeviceId(deviceId);
      } else if (updates.isDefault === false && this.getDefaultDeviceId() === deviceId) {
        this.setDefaultDeviceId(null);
      }
    } catch (error) {
      console.error('Failed to update device:', error);
      throw new Error('Failed to update device. Storage may be unavailable.');
    }
  }

  /**
   * Delete a device from storage
   * Requirement 18.1: Store device configurations
   * Requirement 14.3: Clear default device if deleted device was default
   * Auto-sets oldest device as default when default device is deleted
   */
  deleteDevice(deviceId: string): void {
    try {
      const devices = this.getDevices();
      const wasDefault = this.getDefaultDeviceId() === deviceId;
      const filteredDevices = devices.filter(d => d.id !== deviceId);
      
      GM_setValue(STORAGE_KEYS.DEVICES, filteredDevices);
      
      // If deleted device was default, set oldest remaining device as default
      if (wasDefault && filteredDevices.length > 0) {
        const oldestDevice = filteredDevices.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0];
        this.setDefaultDeviceId(oldestDevice.id);
      } else if (wasDefault) {
        this.setDefaultDeviceId(null);
      }
      
      // Remove from selected devices if present
      const selectedIds = this.getSelectedDeviceIds();
      if (selectedIds.includes(deviceId)) {
        this.setSelectedDeviceIds(selectedIds.filter(id => id !== deviceId));
      }
    } catch (error) {
      console.error('Failed to delete device:', error);
      throw new Error('Failed to delete device. Storage may be unavailable.');
    }
  }

  /**
   * Get the default device ID
   * Requirement 18.2: Store the default device ID
   */
  getDefaultDeviceId(): string | null {
    try {
      return GM_getValue(STORAGE_KEYS.DEFAULT_DEVICE_ID, null);
    } catch (error) {
      console.error('Failed to get default device ID:', error);
      return null;
    }
  }

  /**
   * Set the default device ID
   * Requirement 18.2: Store the default device ID
   * Requirement 15.2: Enforce single default device constraint
   */
  setDefaultDeviceId(deviceId: string | null): void {
    try {
      GM_setValue(STORAGE_KEYS.DEFAULT_DEVICE_ID, deviceId);
      
      // Update isDefault flag on all devices
      const devices = this.getDevices();
      devices.forEach(d => {
        d.isDefault = d.id === deviceId;
      });
      GM_setValue(STORAGE_KEYS.DEVICES, devices);
    } catch (error) {
      console.error('Failed to set default device ID:', error);
      throw new Error('Failed to set default device. Storage may be unavailable.');
    }
  }

  /**
   * Get user's language preference
   * Requirement 18.4: Store the user's language preference
   */
  getLanguage(): string {
    try {
      return GM_getValue(STORAGE_KEYS.LANGUAGE, 'en');
    } catch (error) {
      console.error('Failed to get language preference:', error);
      return 'en';
    }
  }

  /**
   * Set user's language preference
   * Requirement 18.4: Store the user's language preference
   */
  setLanguage(locale: string): void {
    try {
      GM_setValue(STORAGE_KEYS.LANGUAGE, locale);
    } catch (error) {
      console.error('Failed to set language preference:', error);
      throw new Error('Failed to save language preference. Storage may be unavailable.');
    }
  }

  /**
   * Get last selected device IDs
   * Requirement 18.3: Store the last selected devices
   */
  getSelectedDeviceIds(): string[] {
    try {
      const ids = GM_getValue(STORAGE_KEYS.SELECTED_DEVICE_IDS, []);
      return Array.isArray(ids) ? ids : [];
    } catch (error) {
      console.error('Failed to get selected device IDs:', error);
      return [];
    }
  }

  /**
   * Set selected device IDs
   * Requirement 18.3: Store the last selected devices
   */
  setSelectedDeviceIds(ids: string[]): void {
    try {
      GM_setValue(STORAGE_KEYS.SELECTED_DEVICE_IDS, ids);
    } catch (error) {
      console.error('Failed to set selected device IDs:', error);
      throw new Error('Failed to save device selection. Storage may be unavailable.');
    }
  }

  /**
   * Get markdown toggle state
   * Requirement 18.5: Store the markdown toggle state
   */
  getMarkdownEnabled(): boolean {
    try {
      return GM_getValue(STORAGE_KEYS.MARKDOWN_ENABLED, false);
    } catch (error) {
      console.error('Failed to get markdown state:', error);
      return false;
    }
  }

  /**
   * Set markdown toggle state
   * Requirement 18.5: Store the markdown toggle state
   */
  setMarkdownEnabled(enabled: boolean): void {
    try {
      GM_setValue(STORAGE_KEYS.MARKDOWN_ENABLED, enabled);
    } catch (error) {
      console.error('Failed to set markdown state:', error);
      throw new Error('Failed to save markdown preference. Storage may be unavailable.');
    }
  }

  /**
   * Get advanced options expanded state
   * Requirement 18.6: Store the advanced options expanded state
   */
  getAdvancedExpanded(): boolean {
    try {
      return GM_getValue(STORAGE_KEYS.ADVANCED_EXPANDED, false);
    } catch (error) {
      console.error('Failed to get advanced options state:', error);
      return false;
    }
  }

  /**
   * Set advanced options expanded state
   * Requirement 18.6: Store the advanced options expanded state
   */
  setAdvancedExpanded(expanded: boolean): void {
    try {
      GM_setValue(STORAGE_KEYS.ADVANCED_EXPANDED, expanded);
    } catch (error) {
      console.error('Failed to set advanced options state:', error);
      throw new Error('Failed to save advanced options state. Storage may be unavailable.');
    }
  }

  /**
   * Get last active tab
   * Requirement 18.6: Store UI state preferences
   */
  getLastTab(): TabType {
    try {
      return GM_getValue(STORAGE_KEYS.LAST_TAB, 'push');
    } catch (error) {
      console.error('Failed to get last tab:', error);
      return 'push';
    }
  }

  /**
   * Set last active tab
   * Requirement 18.6: Store UI state preferences
   */
  setLastTab(tab: TabType): void {
    try {
      GM_setValue(STORAGE_KEYS.LAST_TAB, tab);
    } catch (error) {
      console.error('Failed to set last tab:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Get keyboard shortcut
   * Requirement 18.6: Store UI state preferences
   */
  getKeyboardShortcut(): string {
    try {
      return GM_getValue(STORAGE_KEYS.KEYBOARD_SHORTCUT, 'Alt+B');
    } catch (error) {
      console.error('Failed to get keyboard shortcut:', error);
      return 'Alt+B';
    }
  }

  /**
   * Set keyboard shortcut
   * Requirement 18.6: Store UI state preferences
   */
  setKeyboardShortcut(shortcut: string): void {
    try {
      GM_setValue(STORAGE_KEYS.KEYBOARD_SHORTCUT, shortcut);
    } catch (error) {
      console.error('Failed to set keyboard shortcut:', error);
      throw new Error('Failed to save keyboard shortcut. Storage may be unavailable.');
    }
  }

  /**
   * Get user's theme preference
   */
  getTheme(): ThemeType {
    try {
      return GM_getValue(STORAGE_KEYS.THEME, 'auto');
    } catch (error) {
      console.error('Failed to get theme preference:', error);
      return 'auto';
    }
  }

  /**
   * Set user's theme preference
   */
  setTheme(theme: ThemeType): void {
    try {
      GM_setValue(STORAGE_KEYS.THEME, theme);
    } catch (error) {
      console.error('Failed to set theme preference:', error);
      throw new Error('Failed to save theme preference. Storage may be unavailable.');
    }
  }

  /**
   * Maximum number of history items to store
   */
  private readonly MAX_HISTORY_SIZE = 500;

  /**
   * Get push history
   */
  getPushHistory(): PushHistoryItem[] {
    try {
      const history = GM_getValue(STORAGE_KEYS.PUSH_HISTORY, []);
      return Array.isArray(history) ? history : [];
    } catch (error) {
      console.error('Failed to get push history:', error);
      return [];
    }
  }

  /**
   * Add a push history item
   * Adds to front and trims to max size
   */
  addPushHistoryItem(item: PushHistoryItem): void {
    try {
      const history = this.getPushHistory();
      history.unshift(item);

      // Trim to max size
      if (history.length > this.MAX_HISTORY_SIZE) {
        history.length = this.MAX_HISTORY_SIZE;
      }

      GM_setValue(STORAGE_KEYS.PUSH_HISTORY, history);
    } catch (error) {
      console.error('Failed to add push history item:', error);
    }
  }

  /**
   * Update a push history item by ID
   */
  updatePushHistoryItem(id: string, updates: Partial<PushHistoryItem>): void {
    try {
      const history = this.getPushHistory();
      const index = history.findIndex((item) => item.id === id);

      if (index !== -1) {
        history[index] = { ...history[index], ...updates };
        GM_setValue(STORAGE_KEYS.PUSH_HISTORY, history);
      }
    } catch (error) {
      console.error('Failed to update push history item:', error);
    }
  }

  /**
   * Delete push history items by IDs
   */
  deletePushHistoryItems(ids: string[]): void {
    try {
      const history = this.getPushHistory();
      const idSet = new Set(ids);
      const filtered = history.filter((item) => !idSet.has(item.id));
      GM_setValue(STORAGE_KEYS.PUSH_HISTORY, filtered);
    } catch (error) {
      console.error('Failed to delete push history items:', error);
    }
  }

  /**
   * Clear all push history
   */
  clearPushHistory(): void {
    try {
      GM_setValue(STORAGE_KEYS.PUSH_HISTORY, []);
    } catch (error) {
      console.error('Failed to clear push history:', error);
    }
  }

  /**
   * Clear all storage (for testing purposes)
   * Requirement 18.7: Handle storage errors gracefully
   */
  clearAll(): void {
    try {
      // Clear devices
      GM_setValue(STORAGE_KEYS.DEVICES, []);
      GM_setValue(STORAGE_KEYS.DEFAULT_DEVICE_ID, null);
      GM_setValue(STORAGE_KEYS.LANGUAGE, 'en');
      GM_setValue(STORAGE_KEYS.SELECTED_DEVICE_IDS, []);
      GM_setValue(STORAGE_KEYS.MARKDOWN_ENABLED, false);
      GM_setValue(STORAGE_KEYS.ADVANCED_EXPANDED, false);
      GM_setValue(STORAGE_KEYS.LAST_TAB, 'push');
      GM_setValue(STORAGE_KEYS.KEYBOARD_SHORTCUT, 'Alt+B');
      GM_setValue(STORAGE_KEYS.THEME, 'auto');
      GM_setValue(STORAGE_KEYS.PUSH_HISTORY, []);
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw new Error('Failed to clear storage. Storage may be unavailable.');
    }
  }
}
