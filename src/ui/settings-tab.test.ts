/**
 * Unit tests for SettingsTab
 * Feature: bark-push-userscript
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { SettingsTab } from './settings-tab';
import { StorageManager } from '../storage/storage-manager';
import { BarkClient } from '../api/bark-client';
import { createDevice } from '../utils/device-factory';
import { i18n } from '../i18n';
import type { ToastManager } from './toast';

describe('SettingsTab', () => {
  let storage: StorageManager;
  let apiClient: BarkClient;
  let mockToast: ToastManager;
  let settingsTab: SettingsTab;

  beforeEach(async () => {
    localStorage.clear();
    await i18n.setLocale('en');
    await i18n.init();
    storage = new StorageManager();
    apiClient = new BarkClient();
    mockToast = { show: vi.fn(), hide: vi.fn(), clear: vi.fn() } as unknown as ToastManager;
    settingsTab = new SettingsTab(storage, apiClient, mockToast);
  });

  describe('Initial Rendering', () => {
    test('renders in list view by default', () => {
      const container = settingsTab.render();
      
      expect(container).toBeTruthy();
      expect(container.className).toBe('bark-settings-tab');
      expect(settingsTab.getCurrentView()).toBe('list');
    });

    test('renders device list in list view', () => {
      const container = settingsTab.render();
      const listView = container.querySelector('.bark-settings-list-view');
      
      expect(listView).toBeTruthy();
    });

    test('renders language selector in list view', () => {
      const container = settingsTab.render();
      const languageSelector = container.querySelector('.bark-language-selector');
      
      expect(languageSelector).toBeTruthy();
    });
  });

  describe('View Switching', () => {
    test('switches to form view when adding device', () => {
      const container = settingsTab.render();
      
      // Find and click add device button
      const addButton = container.querySelector('button') as HTMLButtonElement;
      expect(addButton).toBeTruthy();
      addButton.click();

      expect(settingsTab.getCurrentView()).toBe('form');
    });

    test('switches to form view when editing device', () => {
      // Add a device first
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      storage.saveDevice(device);

      const container = settingsTab.render();
      
      // Find edit button (should be second button after "Set Default")
      const buttons = container.querySelectorAll('button');
      const editButton = Array.from(buttons).find(btn => 
        btn.textContent?.includes('Edit')
      ) as HTMLButtonElement;
      
      expect(editButton).toBeTruthy();
      editButton.click();

      expect(settingsTab.getCurrentView()).toBe('form');
    });

    test('returns to list view after form cancel', () => {
      const container = settingsTab.render();
      
      // Click add device to go to form view
      const addButton = container.querySelector('button') as HTMLButtonElement;
      addButton.click();
      
      expect(settingsTab.getCurrentView()).toBe('form');

      // Find and click back/cancel button in form view
      const backButton = container.querySelector('button') as HTMLButtonElement;
      expect(backButton).toBeTruthy();
      backButton.click();

      expect(settingsTab.getCurrentView()).toBe('list');
    });
  });

  describe('Device Management Integration', () => {
    test('delete device refreshes list view', () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      storage.saveDevice(device);

      const container = settingsTab.render();

      // Mock confirm to return true
      const originalConfirm = global.confirm;
      global.confirm = vi.fn(() => true);

      // Find delete button
      const buttons = container.querySelectorAll('button');
      const deleteButton = Array.from(buttons).find(btn => 
        btn.textContent?.includes('Delete')
      ) as HTMLButtonElement;
      
      expect(deleteButton).toBeTruthy();
      deleteButton.click();

      // Verify device was deleted
      const devices = storage.getDevices();
      expect(devices.length).toBe(0);

      // Restore confirm
      global.confirm = originalConfirm;
    });

    test('set default device refreshes list view', () => {
      // Add two devices - first will be auto-set as default
      const device1 = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-1',
      });
      const device2 = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-2',
      });
      storage.saveDevice(device1);
      storage.saveDevice(device2);

      // device1 is auto-set as default
      expect(storage.getDefaultDeviceId()).toBe(device1.id);

      const container = settingsTab.render();

      // Find set default button for device2 (non-default device)
      const buttons = container.querySelectorAll('button');
      const setDefaultButton = Array.from(buttons).find(btn => 
        btn.textContent?.includes('Set Default')
      ) as HTMLButtonElement;
      
      expect(setDefaultButton).toBeTruthy();
      setDefaultButton.click();

      // Verify device2 was set as default
      const defaultId = storage.getDefaultDeviceId();
      expect(defaultId).toBe(device2.id);
    });
  });

  describe('Language Selector Integration', () => {
    test('language selector is present in list view', () => {
      const container = settingsTab.render();
      const select = container.querySelector('select');
      
      expect(select).toBeTruthy();
      expect(select?.id).toBe('bark-language-select');
    });

    test('language selector has all supported languages', () => {
      const container = settingsTab.render();
      const select = container.querySelector('select') as HTMLSelectElement;
      const options = Array.from(select.options);

      expect(options.length).toBe(5); // en, zh-CN, zh-TW, ja, ko
    });

    test('changing language triggers re-render', async () => {
      const container = settingsTab.render();
      const select = container.querySelector('select') as HTMLSelectElement;

      // Change language
      select.value = 'ja';
      select.dispatchEvent(new Event('change'));

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify language changed
      const currentLocale = i18n.getCurrentLocale();
      expect(currentLocale).toBe('ja');
    });
  });

  describe('Form View Rendering', () => {
    test('renders form view with device form', () => {
      const container = settingsTab.render();
      
      // Switch to form view
      const addButton = container.querySelector('button') as HTMLButtonElement;
      addButton.click();

      // Check for form elements
      const formView = container.querySelector('.bark-settings-form-view');
      expect(formView).toBeTruthy();
      
      const inputs = container.querySelectorAll('input, textarea');
      expect(inputs.length).toBeGreaterThan(0);
    });

    test('form view does not show language selector', () => {
      const container = settingsTab.render();
      
      // Switch to form view
      const addButton = container.querySelector('button') as HTMLButtonElement;
      addButton.click();

      // Language selector should not be present in form view
      const languageSelector = container.querySelector('.bark-language-selector');
      expect(languageSelector).toBeFalsy();
    });
  });

  describe('Navigation Flow', () => {
    test('complete add device workflow', () => {
      const container = settingsTab.render();
      
      // Start in list view
      expect(settingsTab.getCurrentView()).toBe('list');
      
      // Click add device
      const addButton = container.querySelector('button') as HTMLButtonElement;
      addButton.click();
      
      // Should be in form view
      expect(settingsTab.getCurrentView()).toBe('form');
      
      // Click back
      const backButton = container.querySelector('button') as HTMLButtonElement;
      backButton.click();
      
      // Should be back in list view
      expect(settingsTab.getCurrentView()).toBe('list');
    });

    test('complete edit device workflow', () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      storage.saveDevice(device);

      const container = settingsTab.render();
      
      // Start in list view
      expect(settingsTab.getCurrentView()).toBe('list');
      
      // Click edit device
      const buttons = container.querySelectorAll('button');
      const editButton = Array.from(buttons).find(btn => 
        btn.textContent?.includes('Edit')
      ) as HTMLButtonElement;
      editButton.click();
      
      // Should be in form view
      expect(settingsTab.getCurrentView()).toBe('form');
      
      // Click back
      const backButton = container.querySelector('button') as HTMLButtonElement;
      backButton.click();
      
      // Should be back in list view
      expect(settingsTab.getCurrentView()).toBe('list');
    });
  });
});

