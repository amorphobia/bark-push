/**
 * Property-based and unit tests for DeviceForm
 * Feature: bark-push-userscript
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { fc } from '@fast-check/vitest';
import { DeviceForm } from './device-form';
import { StorageManager } from '../storage/storage-manager';
import { BarkClient } from '../api/bark-client';
import { createDevice } from '../utils/device-factory';
import { i18n } from '../i18n';

describe('DeviceForm', () => {
  let storage: StorageManager;
  let apiClient: BarkClient;
  let deviceForm: DeviceForm;

  beforeEach(async () => {
    localStorage.clear();
    await i18n.init();
    storage = new StorageManager();
    apiClient = new BarkClient();
    deviceForm = new DeviceForm(storage, apiClient);
  });

  describe('Property 36: Device save operation', () => {
    test('saving valid device form data persists to storage', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0).map(s => s.trim()), { nil: undefined }),
            serverUrl: fc.webUrl(),
            deviceKey: fc.stringMatching(/^[a-zA-Z0-9_-]{10,50}$/),
            customHeaders: fc.option(
              fc.tuple(
                fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9-]{0,19}$/),
                fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
              ).map(([name, value]) => `${name}: ${value.trim()}`),
              { nil: undefined }
            ),
          }),
          (formData) => {
            localStorage.clear();
            storage = new StorageManager();
            deviceForm = new DeviceForm(storage, apiClient);
            
            deviceForm.setEditingDevice(null);
            
            let saved = false;
            deviceForm.setOnSave(() => { saved = true; });
            
            const formElement = deviceForm.render();
            document.body.appendChild(formElement);

            const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
            const urlInput = document.querySelector('input[name="serverUrl"]') as HTMLInputElement;
            const keyInput = document.querySelector('input[name="deviceKey"]') as HTMLInputElement;
            const headersInput = document.querySelector('textarea[name="customHeaders"]') as HTMLTextAreaElement;

            if (nameInput) nameInput.value = formData.name || '';
            if (urlInput) urlInput.value = formData.serverUrl;
            if (keyInput) keyInput.value = formData.deviceKey;
            if (headersInput) headersInput.value = formData.customHeaders || '';

            const saveButton = document.querySelector('.btn-primary') as HTMLButtonElement;
            saveButton.click();

            const devices = storage.getDevices();
            const trimmedUrl = formData.serverUrl.replace(/\/+$/, '');
            const savedDevice = devices.find(d => 
              d.serverUrl === trimmedUrl && 
              d.deviceKey === formData.deviceKey
            );

            document.body.removeChild(formElement);

            return saved && savedDevice !== undefined &&
              savedDevice.serverUrl === trimmedUrl &&
              savedDevice.deviceKey === formData.deviceKey &&
              (formData.name ? savedDevice.name === formData.name : true) &&
              (formData.customHeaders ? savedDevice.customHeaders === formData.customHeaders : true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 37: Validation error display', () => {
    test('invalid form fields display inline error messages', () => {
      fc.assert(
        fc.property(
          fc.record({
            serverUrl: fc.oneof(
              fc.constant(''),
              fc.constant('not-a-url'),
              fc.constant('ftp://invalid.com')
            ),
            deviceKey: fc.constant(''),
            customHeaders: fc.constant('InvalidHeaderNoColon'),
          }),
          (invalidData) => {
            deviceForm.setEditingDevice(null);
            const formElement = deviceForm.render();
            document.body.appendChild(formElement);

            const urlInput = document.querySelector('input[name="serverUrl"]') as HTMLInputElement;
            const keyInput = document.querySelector('input[name="deviceKey"]') as HTMLInputElement;
            const headersInput = document.querySelector('textarea[name="customHeaders"]') as HTMLTextAreaElement;

            if (urlInput) urlInput.value = invalidData.serverUrl;
            if (keyInput) keyInput.value = invalidData.deviceKey;
            if (headersInput) headersInput.value = invalidData.customHeaders;

            const saveButton = document.querySelector('.btn-primary') as HTMLButtonElement;
            saveButton.click();

            const errorElements = document.querySelectorAll('.field-error');
            const hasErrors = errorElements.length > 0;

            document.body.removeChild(formElement);

            return hasErrors;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 38: Edit form pre-population', () => {
    test('editing device pre-fills form with existing values', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            customHeaders: fc.option(
              fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.includes(':')),
              { nil: undefined }
            ),
          }),
          (deviceData) => {
            const device = createDevice({
              name: deviceData.name,
              serverUrl: deviceData.serverUrl,
              deviceKey: deviceData.deviceKey,
              customHeaders: deviceData.customHeaders,
            });

            deviceForm.setEditingDevice(device);
            const formElement = deviceForm.render();
            document.body.appendChild(formElement);

            const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
            const urlInput = document.querySelector('input[name="serverUrl"]') as HTMLInputElement;
            const keyInput = document.querySelector('input[name="deviceKey"]') as HTMLInputElement;
            const headersInput = document.querySelector('textarea[name="customHeaders"]') as HTMLTextAreaElement;

            const nameMatch = nameInput.value === (device.name || '');
            const urlMatch = urlInput.value === device.serverUrl;
            const keyMatch = keyInput.value === device.deviceKey;
            const headersMatch = headersInput.value === (device.customHeaders || '');

            document.body.removeChild(formElement);

            return nameMatch && urlMatch && keyMatch && headersMatch;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 39: Device update operation', () => {
    test('updating device modifies existing device in storage', () => {
      fc.assert(
        fc.property(
          fc.record({
            originalUrl: fc.webUrl(),
            originalKey: fc.stringMatching(/^[a-zA-Z0-9_-]{10,50}$/),
            newUrl: fc.webUrl(),
            newKey: fc.stringMatching(/^[a-zA-Z0-9_-]{10,50}$/),
          }),
          (data) => {
            localStorage.clear();
            storage = new StorageManager();
            deviceForm = new DeviceForm(storage, apiClient);
            
            const originalDevice = createDevice({
              serverUrl: data.originalUrl,
              deviceKey: data.originalKey,
            });
            storage.saveDevice(originalDevice);

            deviceForm.setEditingDevice(originalDevice);
            
            let saved = false;
            deviceForm.setOnSave(() => { saved = true; });
            
            const formElement = deviceForm.render();
            document.body.appendChild(formElement);

            const urlInput = document.querySelector('input[name="serverUrl"]') as HTMLInputElement;
            const keyInput = document.querySelector('input[name="deviceKey"]') as HTMLInputElement;

            urlInput.value = data.newUrl;
            keyInput.value = data.newKey;

            const saveButton = document.querySelector('.btn-primary') as HTMLButtonElement;
            saveButton.click();

            const devices = storage.getDevices();
            const updatedDevice = devices.find(d => d.id === originalDevice.id);
            const trimmedNewUrl = data.newUrl.replace(/\/+$/, '');

            document.body.removeChild(formElement);

            return saved && updatedDevice !== undefined &&
              updatedDevice.serverUrl === trimmedNewUrl &&
              updatedDevice.deviceKey === data.newKey &&
              updatedDevice.id === originalDevice.id;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 40: Edit preserves immutable fields', () => {
    test('editing device preserves createdAt timestamp', () => {
      fc.assert(
        fc.property(
          fc.record({
            originalUrl: fc.webUrl(),
            newUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          }),
          (data) => {
            const originalDevice = createDevice({
              serverUrl: data.originalUrl,
              deviceKey: data.deviceKey,
            });
            const originalTimestamp = originalDevice.createdAt;
            storage.saveDevice(originalDevice);

            deviceForm.setEditingDevice(originalDevice);
            const formElement = deviceForm.render();
            document.body.appendChild(formElement);

            const urlInput = document.querySelector('input[name="serverUrl"]') as HTMLInputElement;
            urlInput.value = data.newUrl;

            const saveButton = document.querySelector('.btn-primary') as HTMLButtonElement;
            saveButton.click();

            const devices = storage.getDevices();
            const updatedDevice = devices.find(d => d.id === originalDevice.id);

            document.body.removeChild(formElement);

            return updatedDevice !== undefined &&
              updatedDevice.createdAt === originalTimestamp;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 61: Error clearing on correction', () => {
    test('correcting invalid input clears error message', () => {
      fc.assert(
        fc.property(
          fc.record({
            invalidUrl: fc.constant('not-a-url'),
            validUrl: fc.webUrl(),
          }),
          (data) => {
            deviceForm.setEditingDevice(null);
            const formElement = deviceForm.render();
            document.body.appendChild(formElement);

            const urlInput = document.querySelector('input[name="serverUrl"]') as HTMLInputElement;
            const keyInput = document.querySelector('input[name="deviceKey"]') as HTMLInputElement;
            
            urlInput.value = data.invalidUrl;
            keyInput.value = 'test-key';

            const saveButton = document.querySelector('.btn-primary') as HTMLButtonElement;
            saveButton.click();

            const formAfterError = document.querySelector('.device-form');
            if (!formAfterError) {
              document.body.removeChild(formElement);
              return false;
            }

            let errorElement = formAfterError.querySelector('.field-error');
            const errorShown = errorElement !== null;

            const urlInputAfter = formAfterError.querySelector('input[name="serverUrl"]') as HTMLInputElement;
            urlInputAfter.value = data.validUrl;
            urlInputAfter.dispatchEvent(new Event('input'));

            errorElement = formAfterError.querySelector('.field-error');
            const errorCleared = errorElement === null;

            const formToRemove = document.querySelector('.device-form');
            if (formToRemove) {
              document.body.removeChild(formToRemove);
            }

            return errorShown && errorCleared;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests', () => {
    test('renders form in add mode', () => {
      deviceForm.setEditingDevice(null);
      const formElement = deviceForm.render();
      document.body.appendChild(formElement);

      const title = document.querySelector('.form-header h3');
      expect(title?.textContent).toBe(i18n.t('settings.addDevice'));

      const nameInput = document.querySelector('input[name="name"]');
      const urlInput = document.querySelector('input[name="serverUrl"]');
      const keyInput = document.querySelector('input[name="deviceKey"]');
      const headersInput = document.querySelector('textarea[name="customHeaders"]');

      expect(nameInput).toBeTruthy();
      expect(urlInput).toBeTruthy();
      expect(keyInput).toBeTruthy();
      expect(headersInput).toBeTruthy();

      document.body.removeChild(formElement);
    });

    test('renders form in edit mode with device data', () => {
      const device = createDevice({
        name: 'Test Device',
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
        customHeaders: 'Authorization: Bearer token',
      });

      deviceForm.setEditingDevice(device);
      const formElement = deviceForm.render();
      document.body.appendChild(formElement);

      const title = document.querySelector('.form-header h3');
      expect(title?.textContent).toBe(i18n.t('settings.editDevice'));

      const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
      const urlInput = document.querySelector('input[name="serverUrl"]') as HTMLInputElement;
      const keyInput = document.querySelector('input[name="deviceKey"]') as HTMLInputElement;
      const headersInput = document.querySelector('textarea[name="customHeaders"]') as HTMLTextAreaElement;

      expect(nameInput.value).toBe('Test Device');
      expect(urlInput.value).toBe('https://api.day.app');
      expect(keyInput.value).toBe('test-key-123');
      expect(headersInput.value).toBe('Authorization: Bearer token');

      document.body.removeChild(formElement);
    });

    test('displays validation errors on invalid save', () => {
      deviceForm.setEditingDevice(null);
      const formElement = deviceForm.render();
      document.body.appendChild(formElement);

      const saveButton = document.querySelector('.btn-primary') as HTMLButtonElement;
      saveButton.click();

      const formAfterError = document.querySelector('.device-form');
      const errorElements = formAfterError?.querySelectorAll('.field-error');
      expect(errorElements && errorElements.length > 0).toBe(true);

      if (formAfterError) {
        document.body.removeChild(formAfterError);
      }
    });

    test('test connection button shows loading state', async () => {
      deviceForm.setEditingDevice(null);
      const formElement = deviceForm.render();
      document.body.appendChild(formElement);

      const urlInput = document.querySelector('input[name="serverUrl"]') as HTMLInputElement;
      const keyInput = document.querySelector('input[name="deviceKey"]') as HTMLInputElement;
      
      urlInput.value = 'https://api.day.app';
      keyInput.value = 'test-key';

      // Mock testConnection to be slow enough to catch the loading state
      let resolveTest: (value: boolean) => void;
      const testPromise = new Promise<boolean>((resolve) => {
        resolveTest = resolve;
      });
      vi.spyOn(apiClient, 'testConnection').mockReturnValue(testPromise);

      const testButton = document.querySelector('.test-button') as HTMLButtonElement;
      testButton.click();

      // Check loading state immediately
      await new Promise(resolve => setTimeout(resolve, 0));

      const formAfterClick = document.querySelector('.device-form');
      const testButtonAfter = formAfterClick?.querySelector('.test-button') as HTMLButtonElement;

      expect(testButtonAfter.textContent).toBe(i18n.t('settings.testing'));
      expect(testButtonAfter.disabled).toBe(true);

      // Resolve the promise
      resolveTest!(true);
      await testPromise;

      if (formAfterClick) {
        document.body.removeChild(formAfterClick);
      }
    });

    test('back button triggers onBack callback', () => {
      deviceForm.setEditingDevice(null);
      
      let backCalled = false;
      deviceForm.setOnBack(() => { backCalled = true; });
      
      const formElement = deviceForm.render();
      document.body.appendChild(formElement);

      const backButton = document.querySelector('.back-button') as HTMLButtonElement;
      backButton.click();

      expect(backCalled).toBe(true);

      const formToRemove = document.querySelector('.device-form');
      if (formToRemove) {
        document.body.removeChild(formToRemove);
      }
    });

    test('save button triggers onSave callback on valid data', () => {
      deviceForm.setEditingDevice(null);
      
      let saveCalled = false;
      deviceForm.setOnSave(() => { saveCalled = true; });
      
      const formElement = deviceForm.render();
      document.body.appendChild(formElement);

      const urlInput = document.querySelector('input[name="serverUrl"]') as HTMLInputElement;
      const keyInput = document.querySelector('input[name="deviceKey"]') as HTMLInputElement;
      
      urlInput.value = 'https://api.day.app';
      keyInput.value = 'test-key';

      const saveButton = document.querySelector('.btn-primary') as HTMLButtonElement;
      saveButton.click();

      expect(saveCalled).toBe(true);

      const formToRemove = document.querySelector('.device-form');
      if (formToRemove) {
        document.body.removeChild(formToRemove);
      }
    });

    test('trims trailing slashes from server URL when saving', () => {
      deviceForm.setEditingDevice(null);
      
      let savedDevice: any = null;
      deviceForm.setOnSave(() => {
        const devices = storage.getDevices();
        savedDevice = devices[devices.length - 1];
      });
      
      const formElement = deviceForm.render();
      document.body.appendChild(formElement);

      const urlInput = document.querySelector('input[name="serverUrl"]') as HTMLInputElement;
      const keyInput = document.querySelector('input[name="deviceKey"]') as HTMLInputElement;
      
      // Test with single trailing slash
      urlInput.value = 'https://api.day.app/';
      keyInput.value = 'a'.repeat(22);

      const saveButton = document.querySelector('.btn-primary') as HTMLButtonElement;
      saveButton.click();

      expect(savedDevice).toBeTruthy();
      expect(savedDevice.serverUrl).toBe('https://api.day.app');

      // Test with multiple trailing slashes
      storage.deleteDevice(savedDevice.id);
      urlInput.value = 'https://api.day.app///';
      saveButton.click();

      const devices = storage.getDevices();
      const lastDevice = devices[devices.length - 1];
      expect(lastDevice.serverUrl).toBe('https://api.day.app');

      const formToRemove = document.querySelector('.device-form');
      if (formToRemove) {
        document.body.removeChild(formToRemove);
      }
    });
  });
});
