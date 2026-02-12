/**
 * Tests for DeviceSelector component
 * Feature: bark-push-userscript
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { DeviceSelector } from './device-selector';
import { StorageManager } from '../storage/storage-manager';
import { t } from '../i18n';
import type { BarkDevice } from '../types';

// Mock GM_getValue and GM_setValue
global.GM_getValue = vi.fn((_key: string, defaultValue: any) => defaultValue);
global.GM_setValue = vi.fn();

describe('DeviceSelector', () => {
  let storage: StorageManager;
  let selector: DeviceSelector;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new StorageManager();
    selector = new DeviceSelector(storage);
  });

  // Helper to create test devices
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

  // Property 10: Device selector shows all devices
  // Feature: bark-push-userscript, Property 10: Device selector shows all devices
  test('Property 10: Device selector shows all devices', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 22, maxLength: 22 }),
            isDefault: fc.boolean(),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (deviceInputs) => {
          const devices: BarkDevice[] = deviceInputs.map(input => ({
            id: crypto.randomUUID(),
            name: input.name ?? undefined,
            serverUrl: input.serverUrl,
            deviceKey: input.deviceKey,
            isDefault: input.isDefault,
            createdAt: new Date().toISOString(),
          }));

          const testSelector = new DeviceSelector(storage);
          testSelector.setDevices(devices);
          const container = testSelector.render();

          // Open the dropdown to render device list
          testSelector.toggle();

          const dropdown = container.querySelector('.device-selector-dropdown') as HTMLElement;
          expect(dropdown).toBeTruthy();

          if (devices.length === 0) {
            // Should show empty message
            const emptyMessage = dropdown.querySelector('.device-selector-empty');
            expect(emptyMessage).toBeTruthy();
            return true;
          } else {
            // Should show exactly as many checkboxes as devices
            const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
            return checkboxes.length === devices.length;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 11: Device selection count display
  // Feature: bark-push-userscript, Property 11: Device selection count display
  test('Property 11: Device selection count display', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 22, maxLength: 22 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 10 }),
        (deviceInputs, selectCount) => {
          const devices: BarkDevice[] = deviceInputs.map(input => ({
            id: crypto.randomUUID(),
            serverUrl: input.serverUrl,
            deviceKey: input.deviceKey,
            isDefault: false,
            createdAt: new Date().toISOString(),
          }));

          const testSelector = new DeviceSelector(storage);
          testSelector.setDevices(devices);
          const container = testSelector.render();

          // Select N devices (capped at actual device count)
          const actualSelectCount = Math.min(selectCount, devices.length);
          for (let i = 0; i < actualSelectCount; i++) {
            testSelector.selectDevice(devices[i].id);
          }

          const button = container.querySelector('.device-selector-toggle') as HTMLButtonElement;
          expect(button).toBeTruthy();

          if (actualSelectCount === 0) {
            // Should show "Select device(s)"
            return button.textContent === t('push.selectDevicePlaceholder');
          } else {
            // Should show "N device(s) selected"
            const expectedText = t('push.deviceSelected').replace('{count}', actualSelectCount.toString());
            return button.textContent === expectedText;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 12: Default device auto-selection
  // Feature: bark-push-userscript, Property 12: Default device auto-selection
  test('Property 12: Default device auto-selection', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 22, maxLength: 22 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 9 }),
        (deviceInputs, defaultIndex) => {
          const devices: BarkDevice[] = deviceInputs.map((input, idx) => ({
            id: crypto.randomUUID(),
            serverUrl: input.serverUrl,
            deviceKey: input.deviceKey,
            isDefault: idx === (defaultIndex % deviceInputs.length),
            createdAt: new Date().toISOString(),
          }));

          // Create new selector with no prior selection
          const testSelector = new DeviceSelector(storage);
          testSelector.setDevices(devices);

          const selectedIds = testSelector.getSelectedIds();
          const defaultDevice = devices.find(d => d.isDefault);

          if (defaultDevice) {
            // Default device should be auto-selected
            return selectedIds.includes(defaultDevice.id);
          } else {
            // No default device, selection should be empty
            return selectedIds.length === 0;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 15: Device selection persistence
  // Feature: bark-push-userscript, Property 15: Device selection persistence
  test('Property 15: Device selection persistence', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 22, maxLength: 22 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 5 }), // At least 1 selection
        (deviceInputs, selectedIndices) => {
          const devices: BarkDevice[] = deviceInputs.map(input => ({
            id: crypto.randomUUID(),
            serverUrl: input.serverUrl,
            deviceKey: input.deviceKey,
            isDefault: false, // No default device to avoid auto-selection
            createdAt: new Date().toISOString(),
          }));

          // Clear any previous mock calls
          vi.clearAllMocks();

          // Select some devices
          const testSelector1 = new DeviceSelector(storage);
          testSelector1.setDevices(devices);
          
          const uniqueIndices = [...new Set(selectedIndices)];
          const selectedDeviceIds = uniqueIndices
            .filter(idx => idx < devices.length)
            .map(idx => devices[idx].id);

          // Only proceed if we have devices to select
          if (selectedDeviceIds.length === 0) {
            return true;
          }

          selectedDeviceIds.forEach(id => testSelector1.selectDevice(id));

          // Get what was saved to storage
          const savedIds = (GM_setValue as any).mock.calls
            .filter((call: any[]) => call[0] === 'bark_selected_device_ids')
            .pop()?.[1] || [];

          // Create new selector and load from storage
          (GM_getValue as any).mockImplementation((key: string, defaultValue: any) => {
            if (key === 'bark_selected_device_ids') {
              return savedIds;
            }
            return defaultValue;
          });

          const testSelector2 = new DeviceSelector(new StorageManager());
          testSelector2.loadSelection();
          testSelector2.setDevices(devices);

          const loadedIds = testSelector2.getSelectedIds();

          // Loaded selection should match saved selection
          return (
            loadedIds.length === savedIds.length &&
            loadedIds.every((id: string) => savedIds.includes(id)) &&
            savedIds.every((id: string) => loadedIds.includes(id))
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Unit Tests
  describe('Unit Tests', () => {
    test('dropdown opens and closes on toggle', () => {
      const device = createTestDevice();
      selector.setDevices([device]);
      const container = selector.render();

      expect(selector.isDropdownOpen()).toBe(false);

      selector.toggle();
      expect(selector.isDropdownOpen()).toBe(true);

      const dropdown = container.querySelector('.device-selector-dropdown') as HTMLElement;
      expect(dropdown.style.display).toBe('block');

      selector.toggle();
      expect(selector.isDropdownOpen()).toBe(false);
      expect(dropdown.style.display).toBe('none');
    });

    test('device selection and deselection', () => {
      const device1 = createTestDevice({ id: 'device-1' });
      const device2 = createTestDevice({ id: 'device-2' });
      selector.setDevices([device1, device2]);

      expect(selector.getSelectedIds()).toEqual([]);

      selector.selectDevice('device-1');
      expect(selector.getSelectedIds()).toEqual(['device-1']);

      selector.selectDevice('device-2');
      expect(selector.getSelectedIds()).toEqual(['device-1', 'device-2']);

      selector.deselectDevice('device-1');
      expect(selector.getSelectedIds()).toEqual(['device-2']);

      selector.deselectDevice('device-2');
      expect(selector.getSelectedIds()).toEqual([]);
    });

    test('display with no devices', () => {
      selector.setDevices([]);
      const container = selector.render();

      const buttonText = container.querySelector('.device-selector-text') as HTMLElement;
      expect(buttonText.textContent).toBe(t('push.noDevices'));
      
      const button = container.querySelector('.device-selector-toggle') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    test('display text updates with selection', () => {
      const device1 = createTestDevice({ id: 'device-1' });
      const device2 = createTestDevice({ id: 'device-2' });
      const device3 = createTestDevice({ id: 'device-3' });
      selector.setDevices([device1, device2, device3]);
      const container = selector.render();

      const buttonText = container.querySelector('.device-selector-text') as HTMLElement;

      // No selection
      expect(buttonText.textContent).toBe(t('push.selectDevicePlaceholder'));

      // Select one device
      selector.selectDevice('device-1');
      expect(buttonText.textContent).toBe(t('push.deviceSelected').replace('{count}', '1'));

      // Select two devices
      selector.selectDevice('device-2');
      expect(buttonText.textContent).toBe(t('push.deviceSelected').replace('{count}', '2'));

      // Select three devices
      selector.selectDevice('device-3');
      expect(buttonText.textContent).toBe(t('push.deviceSelected').replace('{count}', '3'));

      // Deselect one
      selector.deselectDevice('device-2');
      expect(buttonText.textContent).toBe(t('push.deviceSelected').replace('{count}', '2'));
    });

    test('dropdown shows empty message when no devices', () => {
      selector.setDevices([]);
      const container = selector.render();

      selector.toggle();

      const dropdown = container.querySelector('.device-selector-dropdown') as HTMLElement;
      const emptyMessage = dropdown.querySelector('.device-selector-empty');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage?.textContent).toBe(t('push.noDevices'));
    });

    test('dropdown shows all devices with checkboxes', () => {
      const device1 = createTestDevice({ id: 'device-1', name: 'iPhone' });
      const device2 = createTestDevice({ id: 'device-2', name: 'iPad' });
      selector.setDevices([device1, device2]);
      const container = selector.render();

      selector.toggle();

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(2);

      const labels = container.querySelectorAll('.device-selector-item span');
      expect(labels[0].textContent).toBe('iPhone');
      expect(labels[1].textContent).toBe('iPad');
    });

    test('checkbox state reflects selection', () => {
      const device1 = createTestDevice({ id: 'device-1' });
      const device2 = createTestDevice({ id: 'device-2' });
      selector.setDevices([device1, device2]);
      const container = selector.render();

      selector.selectDevice('device-1');
      selector.toggle();

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
      expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
    });

    test('default device shows star icon', () => {
      const device1 = createTestDevice({ id: 'device-1', name: 'iPhone', isDefault: true });
      const device2 = createTestDevice({ id: 'device-2', name: 'iPad', isDefault: false });
      selector.setDevices([device1, device2]);
      const container = selector.render();

      selector.toggle();

      const labels = container.querySelectorAll('.device-selector-item span');
      expect(labels[0].textContent).toContain('⭐');
      expect(labels[0].textContent).toContain('iPhone');
      expect(labels[1].textContent).not.toContain('⭐');
    });

    test('selection change callback is called', () => {
      const device = createTestDevice({ id: 'device-1' });
      selector.setDevices([device]);
      
      const callback = vi.fn();
      selector.setOnSelectionChange(callback);

      selector.selectDevice('device-1');
      expect(callback).toHaveBeenCalledWith(['device-1']);

      selector.deselectDevice('device-1');
      expect(callback).toHaveBeenCalledWith([]);
    });

    test('getSelectedDevices returns correct devices', () => {
      const device1 = createTestDevice({ id: 'device-1', name: 'iPhone' });
      const device2 = createTestDevice({ id: 'device-2', name: 'iPad' });
      const device3 = createTestDevice({ id: 'device-3', name: 'Mac' });
      selector.setDevices([device1, device2, device3]);

      selector.selectDevice('device-1');
      selector.selectDevice('device-3');

      const selected = selector.getSelectedDevices();
      expect(selected.length).toBe(2);
      expect(selected[0].id).toBe('device-1');
      expect(selected[1].id).toBe('device-3');
    });

    test('close method closes dropdown', () => {
      const device = createTestDevice();
      selector.setDevices([device]);
      selector.render();

      selector.toggle();
      expect(selector.isDropdownOpen()).toBe(true);

      selector.close();
      expect(selector.isDropdownOpen()).toBe(false);
    });

    test('selecting already selected device does nothing', () => {
      const device = createTestDevice({ id: 'device-1' });
      selector.setDevices([device]);

      selector.selectDevice('device-1');
      expect(selector.getSelectedIds()).toEqual(['device-1']);

      selector.selectDevice('device-1');
      expect(selector.getSelectedIds()).toEqual(['device-1']);
    });

    test('deselecting non-selected device does nothing', () => {
      const device = createTestDevice({ id: 'device-1' });
      selector.setDevices([device]);

      selector.deselectDevice('device-1');
      expect(selector.getSelectedIds()).toEqual([]);
    });

    test('setDevices removes invalid selected IDs', () => {
      const device1 = createTestDevice({ id: 'device-1' });
      const device2 = createTestDevice({ id: 'device-2' });
      selector.setDevices([device1, device2]);

      selector.selectDevice('device-1');
      selector.selectDevice('device-2');
      expect(selector.getSelectedIds()).toEqual(['device-1', 'device-2']);

      // Set new devices without device-2
      selector.setDevices([device1]);
      expect(selector.getSelectedIds()).toEqual(['device-1']);
    });
  });
});
