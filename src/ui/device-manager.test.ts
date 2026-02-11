/**
 * Property-based and unit tests for DeviceManager
 * Feature: bark-push-userscript
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { DeviceManager } from './device-manager';
import { StorageManager } from '../storage/storage-manager';
import { createDevice } from '../utils/device-factory';
import { i18n } from '../i18n';
import type { BarkDevice } from '../types';
import type { ToastManager } from './toast';
import { ConfirmDialog } from './confirm-dialog';

describe('DeviceManager', () => {
  let storage: StorageManager;
  let deviceManager: DeviceManager;
  let mockToast: ToastManager;

  beforeEach(async () => {
    localStorage.clear();
    await i18n.init();
    storage = new StorageManager();
    
    // Create mock toast
    mockToast = {
      show: vi.fn(),
      hide: vi.fn(),
      clear: vi.fn(),
    } as unknown as ToastManager;
    
    deviceManager = new DeviceManager(storage, mockToast);
    
    // Mock ConfirmDialog.show to return true by default
    vi.spyOn(ConfirmDialog, 'show').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 41: Device deletion operation', () => {
    test('deleting device removes it from storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2).map(s => s.trim()),
          }),
          async (deviceData) => {
            localStorage.clear();
            storage = new StorageManager();
            mockToast = {
              show: vi.fn(),
              hide: vi.fn(),
              clear: vi.fn(),
            } as unknown as ToastManager;
            deviceManager = new DeviceManager(storage, mockToast);

            const device = createDevice({
              serverUrl: deviceData.serverUrl,
              deviceKey: deviceData.deviceKey,
            });
            storage.saveDevice(device);

            // Mock confirm to always return true
            vi.spyOn(ConfirmDialog, 'show').mockResolvedValue(true);

            let completed = false;
            await deviceManager.handleDeleteDevice(device, () => {
              completed = true;
            });

            const devices = storage.getDevices();
            const deviceExists = devices.some(d => d.id === device.id);

            // Restore confirm
            vi.restoreAllMocks();

            return completed && !deviceExists;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 42: Default device cleared on deletion', () => {
    test('deleting default device clears default device ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2).map(s => s.trim()),
          }),
          async (deviceData) => {
            localStorage.clear();
            storage = new StorageManager();
            mockToast = { show: vi.fn(), hide: vi.fn(), clear: vi.fn() } as unknown as ToastManager; deviceManager = new DeviceManager(storage, mockToast);

            const device = createDevice({
              serverUrl: deviceData.serverUrl,
              deviceKey: deviceData.deviceKey,
            });
            storage.saveDevice(device);
            storage.setDefaultDeviceId(device.id);

            // Verify device is default
            const defaultIdBefore = storage.getDefaultDeviceId();
            if (defaultIdBefore !== device.id) {
              return false;
            }

            // Mock confirm to always return true
            vi.spyOn(ConfirmDialog, 'show').mockResolvedValue(true);

            await deviceManager.handleDeleteDevice(device, () => {});

            const defaultIdAfter = storage.getDefaultDeviceId();

            // Restore confirm
            vi.restoreAllMocks();

            return defaultIdAfter === null;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 43: Set default operation', () => {
    test('setting device as default updates storage', () => {
      fc.assert(
        fc.property(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2).map(s => s.trim()),
          }),
          (deviceData) => {
            localStorage.clear();
            storage = new StorageManager();
            mockToast = { show: vi.fn(), hide: vi.fn(), clear: vi.fn() } as unknown as ToastManager; deviceManager = new DeviceManager(storage, mockToast);

            const device = createDevice({
              serverUrl: deviceData.serverUrl,
              deviceKey: deviceData.deviceKey,
            });
            storage.saveDevice(device);

            let completed = false;
            deviceManager.handleSetDefault(device, () => {
              completed = true;
            });

            const defaultId = storage.getDefaultDeviceId();
            const devices = storage.getDevices();
            const defaultDevice = devices.find(d => d.id === device.id);

            return completed && 
                   defaultId === device.id && 
                   defaultDevice !== undefined && 
                   defaultDevice.isDefault === true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 45: Default device ID persistence', () => {
    test('default device ID persists across storage instances', () => {
      fc.assert(
        fc.property(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2).map(s => s.trim()),
          }),
          (deviceData) => {
            localStorage.clear();
            storage = new StorageManager();
            mockToast = { show: vi.fn(), hide: vi.fn(), clear: vi.fn() } as unknown as ToastManager; deviceManager = new DeviceManager(storage, mockToast);

            const device = createDevice({
              serverUrl: deviceData.serverUrl,
              deviceKey: deviceData.deviceKey,
            });
            storage.saveDevice(device);
            deviceManager.handleSetDefault(device, () => {});

            // Create new storage instance
            const newStorage = new StorageManager();
            const defaultId = newStorage.getDefaultDeviceId();

            return defaultId === device.id;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Unit Tests', () => {
    test('handleAddDevice calls navigation callback with null', () => {
      let navigatedDevice: BarkDevice | null | undefined;
      
      deviceManager.handleAddDevice((device) => {
        navigatedDevice = device;
      });

      expect(navigatedDevice).toBe(null);
    });

    test('handleEditDevice calls navigation callback with device', () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });

      let navigatedDevice: BarkDevice | null | undefined;
      
      deviceManager.handleEditDevice(device, (d) => {
        navigatedDevice = d;
      });

      expect(navigatedDevice).toBe(device);
    });

    test('handleDeleteDevice shows confirmation dialog', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      storage.saveDevice(device);

      vi.spyOn(ConfirmDialog, 'show').mockResolvedValue(false);

      await deviceManager.handleDeleteDevice(device, () => {});

      expect(ConfirmDialog.show).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    test('handleDeleteDevice does not delete if user cancels', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      storage.saveDevice(device);

      vi.spyOn(ConfirmDialog, 'show').mockResolvedValue(false);

      await deviceManager.handleDeleteDevice(device, () => {});

      const devices = storage.getDevices();
      expect(devices.some(d => d.id === device.id)).toBe(true);

      vi.restoreAllMocks();
    });

    test('handleDeleteDevice deletes device if user confirms', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      storage.saveDevice(device);

      vi.spyOn(ConfirmDialog, 'show').mockResolvedValue(true);

      let completed = false;
      await deviceManager.handleDeleteDevice(device, () => {
        completed = true;
      });

      const devices = storage.getDevices();
      expect(devices.some(d => d.id === device.id)).toBe(false);
      expect(completed).toBe(true);

      vi.restoreAllMocks();
    });

    test('handleSetDefault sets device as default', () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      storage.saveDevice(device);

      let completed = false;
      deviceManager.handleSetDefault(device, () => {
        completed = true;
      });

      const defaultId = storage.getDefaultDeviceId();
      expect(defaultId).toBe(device.id);
      expect(completed).toBe(true);
    });

    test('handleSetDefault clears previous default device', () => {
      const device1 = createDevice({
        serverUrl: 'https://api1.day.app',
        deviceKey: 'test-key-1',
      });
      const device2 = createDevice({
        serverUrl: 'https://api2.day.app',
        deviceKey: 'test-key-2',
      });
      
      storage.saveDevice(device1);
      storage.saveDevice(device2);
      storage.setDefaultDeviceId(device1.id);

      deviceManager.handleSetDefault(device2, () => {});

      const devices = storage.getDevices();
      const dev1 = devices.find(d => d.id === device1.id);
      const dev2 = devices.find(d => d.id === device2.id);

      expect(dev1?.isDefault).toBe(false);
      expect(dev2?.isDefault).toBe(true);
    });
  });
});


