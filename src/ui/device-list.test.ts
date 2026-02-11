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
          
          // Each card should display name, URL, and key
          let allDetailsPresent = true;
          deviceCards.forEach((card, index) => {
            const device = devices[index];
            const cardText = card.textContent || '';
            
            // Check if URL is present
            if (!cardText.includes(device.serverUrl)) {
              allDetailsPresent = false;
            }
            
            // Check if truncated key is present (first 6 chars)
            const keyPrefix = device.deviceKey.substring(0, 6);
            if (!cardText.includes(keyPrefix)) {
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
          
          // Should have star icon
          const hasStarIcon = defaultCard?.querySelector('.default-icon') !== null;
          const starText = defaultCard?.textContent || '';
          const hasStarEmoji = starText.includes('⭐');
          
          return hasStarIcon && hasStarEmoji;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 31: Custom headers visual indicator
  // Feature: bark-push-userscript, Property 31: Custom headers visual indicator
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
          
          // Should have lock icon
          const hasLockIcon = deviceCard?.querySelector('.lock-icon') !== null;
          const cardText = deviceCard?.textContent || '';
          const hasLockEmoji = cardText.includes('🔒');
          
          return hasLockIcon && hasLockEmoji;
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
          
          // Should always have Edit and Delete buttons
          const hasEditButton = actions?.textContent?.includes('Edit') || false;
          const hasDeleteButton = actions?.textContent?.includes('Delete') || false;
          
          // Should have Set Default button only if not default
          const hasSetDefaultButton = actions?.textContent?.includes('Set Default') || false;
          const setDefaultCorrect = isDefault ? !hasSetDefaultButton : hasSetDefaultButton;
          
          return hasEditButton && hasDeleteButton && setDefaultCorrect;
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

    test('device card rendering', () => {
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
      expect(deviceCard?.textContent).toContain('https://api.day.app');
      expect(deviceCard?.textContent).toContain('abcdef...stuv'); // Truncated key
    });

    test('star icon display for default device', () => {
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
      
      const starIcon = container.querySelector('.default-icon');
      expect(starIcon).toBeTruthy();
      expect(starIcon?.textContent).toBe('⭐');
    });

    test('lock icon display for custom headers', () => {
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
      
      const lockIcon = container.querySelector('.lock-icon');
      expect(lockIcon).toBeTruthy();
      expect(lockIcon?.textContent).toBe('🔒');
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
      
      const lockIcon = container.querySelector('.lock-icon');
      expect(lockIcon).toBeNull();
    });

    test('button rendering - non-default device', () => {
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
      
      const actions = container.querySelector('.device-actions');
      expect(actions?.textContent).toContain('Set Default');
      expect(actions?.textContent).toContain('Edit');
      expect(actions?.textContent).toContain('Delete');
    });

    test('button rendering - default device', () => {
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
      
      const actions = container.querySelector('.device-actions');
      expect(actions?.textContent).not.toContain('Set Default');
      expect(actions?.textContent).toContain('Edit');
      expect(actions?.textContent).toContain('Delete');
    });

    test('add device button present', () => {
      const container = deviceList.render();
      
      const addButton = container.querySelector('.add-device-btn');
      expect(addButton).toBeTruthy();
      expect(addButton?.textContent).toBe('Add Device');
    });

    test('callbacks are invoked', () => {
      const device = createTestDevice({ isDefault: false }); // Not default so Set Default button appears
      
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
      
      // Click set default button (first secondary button)
      const setDefaultButton = container.querySelector('.btn-secondary') as HTMLButtonElement;
      setDefaultButton.click();
      expect(onSetDefault).toHaveBeenCalledWith(device);
      
      // Click edit button (second secondary button)
      const buttons = container.querySelectorAll('.btn-secondary');
      const editButton = buttons[1] as HTMLButtonElement;
      editButton.click();
      expect(onEditDevice).toHaveBeenCalledWith(device);
      
      // Click delete button
      const deleteButton = container.querySelector('.btn-danger') as HTMLButtonElement;
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
