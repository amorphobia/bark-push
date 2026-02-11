/**
 * Property-based and unit tests for StorageManager
 * Feature: bark-push-userscript
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { StorageManager } from './storage-manager';
import { createDevice, generateDeviceId } from '../utils/device-factory';
import type { BarkDevice } from '../types';

describe('StorageManager', () => {
  let storage: StorageManager;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    storage = new StorageManager();
  });

  // ============================================================================
  // PROPERTY-BASED TESTS
  // ============================================================================

  describe('Property 49: Storage round-trip consistency', () => {
    test('language preference round-trip', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('en'),
            fc.constant('zh-CN'),
            fc.constant('zh-TW'),
            fc.constant('ja'),
            fc.constant('ko')
          ),
          (language) => {
            storage.setLanguage(language);
            const retrieved = storage.getLanguage();
            return retrieved === language;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('selected device IDs round-trip', () => {
      fc.assert(
        fc.property(
          fc.array(fc.uuid(), { maxLength: 10 }),
          (deviceIds) => {
            storage.setSelectedDeviceIds(deviceIds);
            const retrieved = storage.getSelectedDeviceIds();
            return (
              retrieved.length === deviceIds.length &&
              retrieved.every((id, i) => id === deviceIds[i])
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    test('markdown enabled state round-trip', () => {
      fc.assert(
        fc.property(fc.boolean(), (enabled) => {
          storage.setMarkdownEnabled(enabled);
          const retrieved = storage.getMarkdownEnabled();
          return retrieved === enabled;
        }),
        { numRuns: 100 }
      );
    });

    test('advanced expanded state round-trip', () => {
      fc.assert(
        fc.property(fc.boolean(), (expanded) => {
          storage.setAdvancedExpanded(expanded);
          const retrieved = storage.getAdvancedExpanded();
          return retrieved === expanded;
        }),
        { numRuns: 100 }
      );
    });

    test('last tab state round-trip', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('push'), fc.constant('settings')),
          (tab) => {
            storage.setLastTab(tab);
            const retrieved = storage.getLastTab();
            return retrieved === tab;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('default device ID round-trip', () => {
      fc.assert(
        fc.property(
          fc.option(fc.uuid(), { nil: null }),
          (deviceId) => {
            storage.setDefaultDeviceId(deviceId);
            const retrieved = storage.getDefaultDeviceId();
            return retrieved === deviceId;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 52: Device ID uniqueness', () => {
    test('all created devices have unique IDs', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.option(fc.string()),
              serverUrl: fc.webUrl(),
              deviceKey: fc.string({ minLength: 1 }),
              customHeaders: fc.option(fc.string()),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (deviceInputs) => {
            const devices = deviceInputs.map(input => createDevice(input));
            const ids = devices.map(d => d.id);
            const uniqueIds = new Set(ids);
            return ids.length === uniqueIds.size;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('saved devices maintain unique IDs', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.option(fc.string()),
              serverUrl: fc.webUrl(),
              deviceKey: fc.string({ minLength: 1 }),
              customHeaders: fc.option(fc.string()),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (deviceInputs) => {
            // Create new storage instance for this test
            const testStorage = new StorageManager();
            testStorage.clearAll();
            
            // Create and save devices
            const devices = deviceInputs.map(input => createDevice(input));
            devices.forEach(device => testStorage.saveDevice(device));
            
            // Retrieve and check uniqueness
            const retrieved = testStorage.getDevices();
            const ids = retrieved.map(d => d.id);
            const uniqueIds = new Set(ids);
            return ids.length === uniqueIds.size;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 44: Single default device constraint', () => {
    test('at most one device has isDefault=true', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.option(fc.string()),
              serverUrl: fc.webUrl(),
              deviceKey: fc.string({ minLength: 1 }),
              customHeaders: fc.option(fc.string()),
              isDefault: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (deviceInputs) => {
            const testStorage = new StorageManager();
            testStorage.clearAll();
            
            // Create and save devices
            const devices = deviceInputs.map(input => createDevice(input));
            devices.forEach(device => testStorage.saveDevice(device));
            
            // Retrieve and check default constraint
            const retrieved = testStorage.getDevices();
            const defaultDevices = retrieved.filter(d => d.isDefault);
            return defaultDevices.length <= 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('setting a device as default clears other defaults', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.option(fc.string()),
              serverUrl: fc.webUrl(),
              deviceKey: fc.string({ minLength: 1 }),
              customHeaders: fc.option(fc.string()),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          fc.integer({ min: 0, max: 4 }),
          (deviceInputs, defaultIndex) => {
            if (defaultIndex >= deviceInputs.length) return true;
            
            const testStorage = new StorageManager();
            testStorage.clearAll();
            
            // Create and save devices
            const devices = deviceInputs.map(input => createDevice(input));
            devices.forEach(device => testStorage.saveDevice(device));
            
            // Set one device as default
            const deviceToSetDefault = testStorage.getDevices()[defaultIndex];
            testStorage.setDefaultDeviceId(deviceToSetDefault.id);
            
            // Check that only one device is default
            const retrieved = testStorage.getDevices();
            const defaultDevices = retrieved.filter(d => d.isDefault);
            return (
              defaultDevices.length === 1 &&
              defaultDevices[0].id === deviceToSetDefault.id
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // ============================================================================
  // UNIT TESTS
  // ============================================================================

  describe('Device CRUD Operations', () => {
    test('saves and retrieves devices', () => {
      const device = createDevice({
        name: 'Test Device',
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });

      storage.saveDevice(device);
      const devices = storage.getDevices();

      expect(devices).toHaveLength(1);
      expect(devices[0]).toEqual(device);
    });

    test('updates existing device', () => {
      const device = createDevice({
        name: 'Original Name',
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });

      storage.saveDevice(device);
      storage.updateDevice(device.id, { name: 'Updated Name' });

      const devices = storage.getDevices();
      expect(devices[0].name).toBe('Updated Name');
      expect(devices[0].id).toBe(device.id); // ID should not change
      expect(devices[0].createdAt).toBe(device.createdAt); // createdAt should not change
    });

    test('deletes device', () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });

      storage.saveDevice(device);
      expect(storage.getDevices()).toHaveLength(1);

      storage.deleteDevice(device.id);
      expect(storage.getDevices()).toHaveLength(0);
    });

    test('throws error when updating non-existent device', () => {
      expect(() => {
        storage.updateDevice('non-existent-id', { name: 'Test' });
      }).toThrow('Failed to update device');
    });
  });

  describe('Default Device Management', () => {
    test('sets and retrieves default device', () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });

      storage.saveDevice(device);
      storage.setDefaultDeviceId(device.id);

      expect(storage.getDefaultDeviceId()).toBe(device.id);
      expect(storage.getDevices()[0].isDefault).toBe(true);
    });

    test('clears default device when deleted', () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
        isDefault: true,
      });

      storage.saveDevice(device);
      expect(storage.getDefaultDeviceId()).toBe(device.id);

      storage.deleteDevice(device.id);
      expect(storage.getDefaultDeviceId()).toBeNull();
    });

    test('only one device can be default', () => {
      const device1 = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-1',
        isDefault: true,
      });
      const device2 = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-2',
        isDefault: true,
      });

      storage.saveDevice(device1);
      storage.saveDevice(device2);

      const devices = storage.getDevices();
      const defaultDevices = devices.filter(d => d.isDefault);
      expect(defaultDevices).toHaveLength(1);
      expect(defaultDevices[0].id).toBe(device2.id);
    });

    test('setting new default clears previous default', () => {
      const device1 = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-1',
      });
      const device2 = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-2',
      });

      storage.saveDevice(device1);
      storage.saveDevice(device2);
      storage.setDefaultDeviceId(device1.id);

      expect(storage.getDevices().find(d => d.id === device1.id)?.isDefault).toBe(true);
      expect(storage.getDevices().find(d => d.id === device2.id)?.isDefault).toBe(false);

      storage.setDefaultDeviceId(device2.id);

      expect(storage.getDevices().find(d => d.id === device1.id)?.isDefault).toBe(false);
      expect(storage.getDevices().find(d => d.id === device2.id)?.isDefault).toBe(true);
    });

    test('first device is automatically set as default', () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
        isDefault: false, // Explicitly set to false
      });

      storage.saveDevice(device);

      const savedDevices = storage.getDevices();
      expect(savedDevices).toHaveLength(1);
      expect(savedDevices[0].isDefault).toBe(true);
      expect(storage.getDefaultDeviceId()).toBe(device.id);
    });

    test('second device is not set as default when default exists', () => {
      const device1 = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-1',
        isDefault: false,
      });
      const device2 = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-2',
        isDefault: false,
      });

      storage.saveDevice(device1);
      storage.saveDevice(device2);

      const devices = storage.getDevices();
      expect(devices).toHaveLength(2);
      expect(devices[0].isDefault).toBe(true); // First device
      expect(devices[1].isDefault).toBe(false); // Second device
      expect(storage.getDefaultDeviceId()).toBe(device1.id);
    });

    test('deleting default device sets oldest remaining device as default', () => {
      // Create devices with different timestamps manually
      const device1: BarkDevice = {
        id: generateDeviceId(),
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-1',
        isDefault: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      const device2: BarkDevice = {
        id: generateDeviceId(),
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-2',
        isDefault: false,
        createdAt: '2024-01-02T00:00:00.000Z',
      };
      const device3: BarkDevice = {
        id: generateDeviceId(),
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-3',
        isDefault: false,
        createdAt: '2024-01-03T00:00:00.000Z',
      };

      storage.saveDevice(device1);
      storage.saveDevice(device2);
      storage.saveDevice(device3);

      // Set device2 as default
      storage.setDefaultDeviceId(device2.id);
      expect(storage.getDefaultDeviceId()).toBe(device2.id);

      // Delete the default device
      storage.deleteDevice(device2.id);

      // Oldest remaining device (device1) should become default
      expect(storage.getDefaultDeviceId()).toBe(device1.id);
      expect(storage.getDevices().find(d => d.id === device1.id)?.isDefault).toBe(true);
      expect(storage.getDevices().find(d => d.id === device3.id)?.isDefault).toBe(false);
    });

    test('deleting non-default device does not change default', () => {
      const device1 = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-1',
      });
      const device2 = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-2',
      });

      storage.saveDevice(device1);
      storage.saveDevice(device2);

      // device1 is auto-set as default
      expect(storage.getDefaultDeviceId()).toBe(device1.id);

      // Delete non-default device
      storage.deleteDevice(device2.id);

      // Default should remain unchanged
      expect(storage.getDefaultDeviceId()).toBe(device1.id);
      expect(storage.getDevices()[0].isDefault).toBe(true);
    });

    test('deleting last device clears default', () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key',
      });

      storage.saveDevice(device);
      expect(storage.getDefaultDeviceId()).toBe(device.id);

      storage.deleteDevice(device.id);

      expect(storage.getDefaultDeviceId()).toBeNull();
      expect(storage.getDevices()).toHaveLength(0);
    });
  });

  describe('Storage Error Handling', () => {
    test('returns empty array when devices storage is corrupted', () => {
      // Simulate corrupted storage
      localStorage.setItem('bark_devices', 'invalid json');
      
      const devices = storage.getDevices();
      expect(devices).toEqual([]);
    });

    test('returns default values when preferences are missing', () => {
      storage.clearAll();
      localStorage.clear();

      expect(storage.getLanguage()).toBe('en');
      expect(storage.getSelectedDeviceIds()).toEqual([]);
      expect(storage.getMarkdownEnabled()).toBe(false);
      expect(storage.getAdvancedExpanded()).toBe(false);
      expect(storage.getLastTab()).toBe('push');
      expect(storage.getDefaultDeviceId()).toBeNull();
    });
  });

  describe('Selected Devices Management', () => {
    test('removes deleted device from selected devices', () => {
      const device1 = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-1',
      });
      const device2 = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'key-2',
      });

      storage.saveDevice(device1);
      storage.saveDevice(device2);
      storage.setSelectedDeviceIds([device1.id, device2.id]);

      expect(storage.getSelectedDeviceIds()).toEqual([device1.id, device2.id]);

      storage.deleteDevice(device1.id);

      expect(storage.getSelectedDeviceIds()).toEqual([device2.id]);
    });
  });
});
