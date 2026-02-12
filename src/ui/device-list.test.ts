/**
 * Tests for DeviceList component
 * Feature: bark-push-userscript
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { DeviceList } from './device-list';
import { StorageManager } from '../storage/storage-manager';
import type { BarkDevice } from '../types';

// Mock i18n
vi.mock('../i18n', () => {
  const translations = {
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'settings.noDevices': 'No devices yet',
    'settings.noDevicesHint': 'Add your first device below',
    'settings.addDevice': 'Add Device',
    'settings.setDefault': 'Set Default',
    'settings.setAsDefault': 'Set as default',
    'settings.defaultDevice': '⭐ Default',
    'settings.hasCustomHeaders': '🔒 Custom Headers',
    'settings.deviceName': 'Device Name',
    'settings.serverUrl': 'Server URL',
    'settings.deviceKey': 'Device Key',
  };
  
  return {
    t: (key: string) => translations[key as keyof typeof translations] || key,
  };
});

// Mock GM functions
global.GM_getValue = vi.fn((_key: string, defaultValue: any) => defaultValue);
global.GM_setValue = vi.fn();

describe('DeviceList', () => {
  let storage: StorageManager;
  let deviceList: DeviceList;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new StorageManager();
    deviceList = new DeviceList(storage);
  });

  // Helper to create test device
  function createTestDevice(overrides: Partial<BarkDevice> = {}): BarkDevice {
    return {
      id: crypto.randomUUID(),
      name: 'Test Device',
      serverUrl: 'https://api.day.app',
      deviceKey: 'a'.repeat(22),
      isDefault: false,
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  // Property 29: Device list display completeness
  // Feature: bark-push-userscript, Property 29: Device list display completeness
  // UPDATED: Check for URL/key format instead of truncated key
  test('Property 29: Device list display completeness', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 22, maxLength: 22 }),
            isDefault: fc.boolean(),
            customHeaders: fc.option(fc.string(), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (deviceData) => {
          vi.clearAllMocks();
          
          const testStorage = new StorageManager();
          const devices = deviceData.map(data => createTestDevice(data));
          devices.forEach(d => testStorage.saveDevice(d));
          
          vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
            if (key === 'bark_devices') {
              return devices;
            }
            return defaultValue;
          });
          
          const testDeviceList = new DeviceList(testStorage);
          const container = testDeviceList.render();
          
          // Each device should have a card
          const deviceCards = container.querySelectorAll('.device-card');
          const hasAllDevices = deviceCards.length === devices.length;
          
          // Each card should display name, URL/key in format {url}/{key}
          let allDetailsPresent = true;
          deviceCards.forEach((card, index) => {
            const device = devices[index];
            const cardText = card.textContent || '';
            
            // Check if URL/key format is present: {serverUrl}/{deviceKey}
            const expectedFormat = `${device.serverUrl}/${device.deviceKey}`;
            if (!cardText.includes(expectedFormat)) {
              allDetailsPresent = false;
            }
          });
          
          return hasAllDevices && allDetailsPresent;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 30: Default device visual indicator
  // Feature: bark-push-userscript, Property 30: Default device visual indicator
  // UPDATED: Check for radio button checked state instead of star emoji
  test('Property 30: Default device visual indicator', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (deviceCount) => {
          fc.pre(deviceCount >= 1); // Ensure at least one device
          
          vi.clearAllMocks();
          
          const defaultIndex = Math.floor(Math.random() * deviceCount);
          
          const testStorage = new StorageManager();
          const devices = Array.from({ length: deviceCount }, (_, i) => 
            createTestDevice({ 
              isDefault: i === defaultIndex,
              name: `Device ${i}`
            })
          );
          devices.forEach(d => testStorage.saveDevice(d));
          
          vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
            if (key === 'bark_devices') {
              return devices;
            }
            return defaultValue;
          });
          
          const testDeviceList = new DeviceList(testStorage);
          const container = testDeviceList.render();
          
          // Find the default device card
          const deviceCards = container.querySelectorAll('.device-card');
          const defaultCard = Array.from(deviceCards)[defaultIndex];
          
          // DESIGN CHANGE: Should have checked radio button instead of star emoji
          const radioButton = defaultCard?.querySelector('.device-radio') as HTMLInputElement;
          const hasRadioButton = radioButton !== null;
          const isRadioChecked = radioButton?.checked === true;
          
          return hasRadioButton && isRadioChecked;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 31: Custom headers visual indicator
  // Feature: bark-push-userscript, Property 31: Custom headers visual indicator
  // UPDATED: Check for Font Awesome lock icon instead of emoji
  test('Property 31: Custom headers visual indicator', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (customHeaders) => {
          vi.clearAllMocks();
          
          const testStorage = new StorageManager();
          const device = createTestDevice({ customHeaders });
          testStorage.saveDevice(device);
          
          vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
            if (key === 'bark_devices') {
              return [device];
            }
            return defaultValue;
          });
          
          const testDeviceList = new DeviceList(testStorage);
          const container = testDeviceList.render();
          
          const deviceCard = container.querySelector('.device-card');
          
          // DESIGN CHANGE: Should have Font Awesome lock icon instead of emoji
          const hasLockIcon = deviceCard?.querySelector('.fa-lock') !== null;
          
          return hasLockIcon;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 32: Device list ordering
  // Feature: bark-push-userscript, Property 32: Device list ordering
  test('Property 32: Device list ordering', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 1000000 }),
          { minLength: 2, maxLength: 5 }
        ),
        (timestamps) => {
          vi.clearAllMocks();
          
          const testStorage = new StorageManager();
          const devices = timestamps.map((ts, i) => 
            createTestDevice({
              name: `Device ${i}`,
              createdAt: new Date(ts).toISOString()
            })
          );
          devices.forEach(d => testStorage.saveDevice(d));
          
          vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
            if (key === 'bark_devices') {
              return devices;
            }
            return defaultValue;
          });
          
          const testDeviceList = new DeviceList(testStorage);
          const container = testDeviceList.render();
          
          const deviceCards = container.querySelectorAll('.device-card');
          
          // Extract device IDs from cards
          const cardOrder = Array.from(deviceCards).map(card => 
            (card as HTMLElement).dataset.deviceId
          );
          
          // Expected order: sorted by createdAt ascending
          const expectedOrder = [...devices]
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map(d => d.id);
          
          // Check if order matches
          return JSON.stringify(cardOrder) === JSON.stringify(expectedOrder);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 33: Device action buttons presence
  // Feature: bark-push-userscript, Property 33: Device action buttons presence
  // UPDATED: Check for Font Awesome icon buttons instead of text buttons
  test('Property 33: Device action buttons presence', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isDefault) => {
          vi.clearAllMocks();
          
          const testStorage = new StorageManager();
          const device = createTestDevice({ isDefault });
          testStorage.saveDevice(device);
          
          vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
            if (key === 'bark_devices') {
              return [device];
            }
            return defaultValue;
          });
          
          const testDeviceList = new DeviceList(testStorage);
          const container = testDeviceList.render();
          
          const deviceCard = container.querySelector('.device-card');
          const actions = deviceCard?.querySelector('.device-actions');
          
          // DESIGN CHANGE: Should have Font Awesome icon buttons
          const hasEditIcon = actions?.querySelector('.fa-pencil') !== null;
          const hasDeleteIcon = actions?.querySelector('.fa-trash') !== null;
          
          // DESIGN CHANGE: Radio button replaces "Set Default" button
          const hasRadioButton = deviceCard?.querySelector('.device-radio') !== null;
          
          return hasEditIcon && hasDeleteIcon && hasRadioButton;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Unit Tests
  describe('Unit Tests', () => {
    test('empty state display', () => {
      vi.clearAllMocks();
      vi.mocked(GM_getValue).mockImplementation((_key: string, defaultValue: any) => defaultValue);
      
      const testStorage = new StorageManager();
      const testDeviceList = new DeviceList(testStorage);
      const container = testDeviceList.render();
      
      expect(container.querySelector('.empty-state')).toBeTruthy();
      expect(container.textContent).toContain('No devices yet');
      expect(container.textContent).toContain('Add your first device below');
    });

    test('device card rendering with new compact layout', () => {
      const device = createTestDevice({
        name: 'My iPhone',
        serverUrl: 'https://api.day.app',
        deviceKey: 'abcdefghijklmnopqrstuv',
      });
      
      storage.saveDevice(device);
      
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        return defaultValue;
      });
      
      const testDeviceList = new DeviceList(storage);
      const container = testDeviceList.render();
      
      const deviceCard = container.querySelector('.device-card');
      expect(deviceCard).toBeTruthy();
      expect(deviceCard?.textContent).toContain('My iPhone');
      
      // DESIGN CHANGE: Check for URL/key format instead of truncated key
      const expectedFormat = 'https://api.day.app/abcdefghijklmnopqrstuv';
      expect(deviceCard?.textContent).toContain(expectedFormat);
    });

    test('radio button checked for default device', () => {
      const device = createTestDevice({ isDefault: true });
      
      storage.saveDevice(device);
      
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        return defaultValue;
      });
      
      const testDeviceList = new DeviceList(storage);
      const container = testDeviceList.render();
      
      // DESIGN CHANGE: Check for checked radio button instead of star icon
      const radioButton = container.querySelector('.device-radio') as HTMLInputElement;
      expect(radioButton).toBeTruthy();
      expect(radioButton?.checked).toBe(true);
    });

    test('Font Awesome lock icon display for custom headers', () => {
      const device = createTestDevice({ 
        customHeaders: 'Authorization: Bearer token123' 
      });
      
      storage.saveDevice(device);
      
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        return defaultValue;
      });
      
      const testDeviceList = new DeviceList(storage);
      const container = testDeviceList.render();
      
      // DESIGN CHANGE: Check for Font Awesome lock icon instead of emoji
      const lockIcon = container.querySelector('.fa-lock');
      expect(lockIcon).toBeTruthy();
    });

    test('no lock icon when no custom headers', () => {
      const device = createTestDevice({ customHeaders: undefined });
      
      storage.saveDevice(device);
      
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        return defaultValue;
      });
      
      const testDeviceList = new DeviceList(storage);
      const container = testDeviceList.render();
      
      const lockIcon = container.querySelector('.fa-lock');
      expect(lockIcon).toBeNull();
    });

    test('Font Awesome icon buttons rendering', () => {
      const device = createTestDevice({ isDefault: false });
      
      storage.saveDevice(device);
      
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        return defaultValue;
      });
      
      const testDeviceList = new DeviceList(storage);
      const container = testDeviceList.render();
      
      // DESIGN CHANGE: Check for Font Awesome icon buttons
      const actions = container.querySelector('.device-actions');
      const editIcon = actions?.querySelector('.fa-pencil');
      const deleteIcon = actions?.querySelector('.fa-trash');
      
      expect(editIcon).toBeTruthy();
      expect(deleteIcon).toBeTruthy();
    });

    test('radio button present for all devices', () => {
      const device = createTestDevice({ isDefault: true });
      
      storage.saveDevice(device);
      
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        return defaultValue;
      });
      
      const testDeviceList = new DeviceList(storage);
      const container = testDeviceList.render();
      
      // DESIGN CHANGE: Radio button replaces "Set Default" button
      const radioButton = container.querySelector('.device-radio');
      expect(radioButton).toBeTruthy();
    });

    test('add device button present', () => {
      const container = deviceList.render();
      
      const addButton = container.querySelector('.add-device-btn');
      expect(addButton).toBeTruthy();
      expect(addButton?.textContent).toBe('Add Device');
    });

    test('callbacks are invoked', () => {
      const device = createTestDevice({ isDefault: false });
      
      vi.clearAllMocks();
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        return defaultValue;
      });
      
      const testStorage = new StorageManager();
      testStorage.saveDevice(device);
      const testDeviceList = new DeviceList(testStorage);
      
      const onAddDevice = vi.fn();
      const onEditDevice = vi.fn();
      const onDeleteDevice = vi.fn();
      const onSetDefault = vi.fn();
      
      testDeviceList.setOnAddDevice(onAddDevice);
      testDeviceList.setOnEditDevice(onEditDevice);
      testDeviceList.setOnDeleteDevice(onDeleteDevice);
      testDeviceList.setOnSetDefault(onSetDefault);
      
      const container = testDeviceList.render();
      
      // Click add button
      const addButton = container.querySelector('.add-device-btn') as HTMLButtonElement;
      addButton.click();
      expect(onAddDevice).toHaveBeenCalled();
      
      // DESIGN CHANGE: Click radio button instead of "Set Default" button
      const radioButton = container.querySelector('.device-radio') as HTMLInputElement;
      radioButton.click();
      expect(onSetDefault).toHaveBeenCalledWith(device);
      
      // DESIGN CHANGE: Click edit icon button
      const editButton = container.querySelector('.device-action-btn.edit') as HTMLButtonElement;
      editButton.click();
      expect(onEditDevice).toHaveBeenCalledWith(device);
      
      // DESIGN CHANGE: Click delete icon button
      const deleteButton = container.querySelector('.device-action-btn.delete') as HTMLButtonElement;
      deleteButton.click();
      expect(onDeleteDevice).toHaveBeenCalledWith(device);
    });

    test('refresh updates device list', () => {
      vi.clearAllMocks();
      vi.mocked(GM_getValue).mockImplementation((_key: string, defaultValue: any) => defaultValue);
      
      // Initially no devices
      const testStorage = new StorageManager();
      const testDeviceList = new DeviceList(testStorage);
      const container = testDeviceList.render();
      expect(container.querySelector('.empty-state')).toBeTruthy();
      
      // Add a device
      const device = createTestDevice();
      testStorage.saveDevice(device);
      
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        return defaultValue;
      });
      
      // Refresh
      testDeviceList.refresh();
      const newContainer = testDeviceList.render();
      
      // Should now show device card
      expect(newContainer.querySelector('.device-card')).toBeTruthy();
      expect(newContainer.querySelector('.empty-state')).toBeNull();
    });
  });
});
