/**
 * DeviceForm component - form for adding/editing Bark devices
 * Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 13.1, 13.2, 13.3
 */

import { t } from '../i18n';
import { StorageManager } from '../storage/storage-manager';
import { BarkClient } from '../api/bark-client';
import { validateDeviceForm } from '../utils/validation';
import type { BarkDevice, DeviceFormData } from '../types';

export class DeviceForm {
  private storage: StorageManager;
  private apiClient: BarkClient;
  private editingDevice: BarkDevice | null = null;
  private onBack?: () => void;
  private onSave?: () => void;
  private errors: Record<string, string> = {};
  private testState: 'idle' | 'testing' | 'success' | 'failed' = 'idle';
  private container: HTMLElement | null = null;

  constructor(storage: StorageManager, apiClient: BarkClient) {
    this.storage = storage;
    this.apiClient = apiClient;
  }

  /**
   * Set the device to edit (null for add mode)
   * Requirement 13.1: Pre-populate form for edit mode
   */
  setEditingDevice(device: BarkDevice | null): void {
    this.editingDevice = device;
    this.errors = {};
    this.testState = 'idle';
  }

  /**
   * Set callback for back/cancel button
   */
  setOnBack(callback: () => void): void {
    this.onBack = callback;
  }

  /**
   * Set callback for successful save
   */
  setOnSave(callback: () => void): void {
    this.onSave = callback;
  }

  /**
   * Render the device form
   * Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9
   */
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'device-form';
    
    // Store reference to container for querying later
    this.container = container;

    // Form header
    const header = document.createElement('div');
    header.className = 'form-header';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-secondary back-button';
    backButton.textContent = '← ' + t('common.back');
    backButton.type = 'button';
    backButton.onclick = (e) => {
      e.preventDefault();
      this.handleBack();
    };
    header.appendChild(backButton);

    const title = document.createElement('h3');
    title.textContent = this.editingDevice ? t('settings.editDevice') : t('settings.addDevice');
    header.appendChild(title);

    container.appendChild(header);

    // Form fields
    const form = document.createElement('form');
    form.className = 'device-form-fields';
    form.onsubmit = (e) => {
      e.preventDefault();
      this.handleSave();
    };

    // Device name field (optional)
    // Requirement 12.3: Device name field (optional)
    const nameField = this.renderTextField(
      'name',
      t('settings.deviceName'),
      t('settings.deviceNamePlaceholder'),
      this.editingDevice?.name || ''
    );
    form.appendChild(nameField);

    // Server URL field (required)
    // Requirement 12.4: Server URL field (required)
    const urlField = this.renderTextField(
      'serverUrl',
      t('settings.serverUrl'),
      t('settings.serverUrlPlaceholder'),
      this.editingDevice?.serverUrl || ''
    );
    form.appendChild(urlField);

    // Device key field (required)
    // Requirement 12.5: Device key field (required)
    const keyField = this.renderTextField(
      'deviceKey',
      t('settings.deviceKey'),
      t('settings.deviceKeyPlaceholder'),
      this.editingDevice?.deviceKey || ''
    );
    form.appendChild(keyField);

    // Custom headers field (optional, multi-line)
    // Requirement 12.6: Custom headers field (optional, multi-line)
    const headersField = this.renderTextareaField(
      'customHeaders',
      t('settings.customHeaders'),
      t('settings.customHeadersPlaceholder'),
      this.editingDevice?.customHeaders || ''
    );
    form.appendChild(headersField);

    container.appendChild(form);

    // Action buttons
    // Requirements: 12.7, 12.8
    const actions = document.createElement('div');
    actions.className = 'form-actions';

    // Test Connection button
    const testButton = document.createElement('button');
    testButton.type = 'button';
    testButton.className = 'btn btn-secondary test-button';
    testButton.disabled = this.testState === 'testing';
    
    if (this.testState === 'testing') {
      testButton.textContent = t('settings.testing');
    } else if (this.testState === 'success') {
      testButton.textContent = t('settings.testSuccess');
      testButton.className = 'btn btn-secondary test-button test-success';
    } else if (this.testState === 'failed') {
      testButton.textContent = t('settings.testFailed');
      testButton.className = 'btn btn-secondary test-button test-failed';
    } else {
      testButton.textContent = t('settings.testConnection');
    }
    
    testButton.onclick = () => this.handleTestConnection();
    actions.appendChild(testButton);

    // Save button
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'btn btn-primary';
    saveButton.textContent = t('common.save');
    saveButton.onclick = (e) => {
      e.preventDefault();
      this.handleSave();
    };
    actions.appendChild(saveButton);

    container.appendChild(actions);

    return container;
  }

  /**
   * Render a text input field with label and error display
   * Requirement 12.11: Display field-specific error messages
   */
  private renderTextField(
    name: string,
    label: string,
    placeholder: string,
    value: string
  ): HTMLElement {
    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'form-field';

    const labelElement = document.createElement('label');
    labelElement.htmlFor = `device-${name}`;
    labelElement.textContent = label;
    fieldContainer.appendChild(labelElement);

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `device-${name}`;
    input.name = name;
    input.placeholder = placeholder;
    input.value = value;
    input.className = this.errors[name] ? 'error' : '';

    // Clear error on input
    // Requirement 22.7: Clear error when user corrects input
    input.oninput = () => {
      if (this.errors[name]) {
        delete this.errors[name];
        input.className = '';
        const errorElement = fieldContainer.querySelector('.field-error');
        if (errorElement) {
          errorElement.remove();
        }
      }
    };

    fieldContainer.appendChild(input);

    // Show error if exists
    if (this.errors[name]) {
      const errorElement = document.createElement('div');
      errorElement.className = 'field-error';
      errorElement.textContent = this.errors[name];
      fieldContainer.appendChild(errorElement);
    }

    return fieldContainer;
  }

  /**
   * Render a textarea field with label and error display
   * Requirement 12.6: Multi-line custom headers field
   */
  private renderTextareaField(
    name: string,
    label: string,
    placeholder: string,
    value: string
  ): HTMLElement {
    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'form-field';

    const labelElement = document.createElement('label');
    labelElement.htmlFor = `device-${name}`;
    labelElement.textContent = label;
    fieldContainer.appendChild(labelElement);

    const textarea = document.createElement('textarea');
    textarea.id = `device-${name}`;
    textarea.name = name;
    textarea.placeholder = placeholder;
    textarea.value = value;
    textarea.rows = 4;
    textarea.className = this.errors[name] ? 'error' : '';

    // Clear error on input
    textarea.oninput = () => {
      if (this.errors[name]) {
        delete this.errors[name];
        textarea.className = '';
        const errorElement = fieldContainer.querySelector('.field-error');
        if (errorElement) {
          errorElement.remove();
        }
      }
    };

    fieldContainer.appendChild(textarea);

    // Show error if exists
    if (this.errors[name]) {
      const errorElement = document.createElement('div');
      errorElement.className = 'field-error';
      errorElement.textContent = this.errors[name];
      fieldContainer.appendChild(errorElement);
    }

    return fieldContainer;
  }

  /**
   * Get form data from DOM
   */
  private getFormData(): DeviceFormData {
    if (!this.container) {
      throw new Error('Form container not initialized');
    }
    
    const form = this.container.querySelector('.device-form-fields') as HTMLFormElement;
    if (!form) {
      throw new Error('Form not found');
    }

    const formData = new FormData(form);
    const deviceKey = (formData.get('deviceKey') as string)?.trim() || '';
    const serverUrl = (formData.get('serverUrl') as string)?.trim() || '';
    
    return {
      id: this.editingDevice?.id,
      name: (formData.get('name') as string)?.trim() || undefined,
      serverUrl: serverUrl.replace(/\/+$/, ''), // Remove trailing slashes
      deviceKey: deviceKey,
      customHeaders: (formData.get('customHeaders') as string)?.trim() || undefined,
    };
  }

  /**
   * Handle test connection button click
   * Requirements: 16.1, 16.3, 16.4, 16.5
   */
  private async handleTestConnection(): Promise<void> {
    // Get current form data
    const formData = this.getFormData();

    // Validate required fields for test
    // Requirement 16.1: Validate before testing
    const validation = validateDeviceForm(formData);
    if (!validation.valid) {
      this.errors = validation.errors;
      this.updateErrorDisplay();
      return;
    }

    // Set testing state
    this.testState = 'testing';
    this.updateTestButtonState();

    try {
      // Test connection
      // Requirements: 16.3, 16.4, 16.5
      const success = await this.apiClient.testConnection(
        formData.serverUrl,
        formData.deviceKey,
        formData.customHeaders
      );

      this.testState = success ? 'success' : 'failed';
      this.updateTestButtonState();

      // Reset test state after 3 seconds
      setTimeout(() => {
        this.testState = 'idle';
        this.updateTestButtonState();
      }, 3000);
    } catch (error) {
      console.error('Test connection error:', error);
      this.testState = 'failed';
      this.updateTestButtonState();

      // Reset test state after 3 seconds
      setTimeout(() => {
        this.testState = 'idle';
        this.updateTestButtonState();
      }, 3000);
    }
  }

  /**
   * Handle save button click
   * Requirements: 12.10, 12.12, 13.2
   */
  private handleSave(): void {
    // Get form data
    const formData = this.getFormData();

    // Validate form
    // Requirement 12.11: Display validation errors
    const validation = validateDeviceForm(formData);
    if (!validation.valid) {
      this.errors = validation.errors;
      this.updateErrorDisplay();
      return;
    }

    try {
      if (this.editingDevice) {
        // Update existing device
        // Requirement 13.2: Update device in storage
        this.storage.updateDevice(this.editingDevice.id, {
          name: formData.name,
          serverUrl: formData.serverUrl,
          deviceKey: formData.deviceKey,
          customHeaders: formData.customHeaders,
          // Requirement 13.4: Preserve immutable fields (createdAt, isDefault)
          // These are preserved by updateDevice method
        });
      } else {
        // Save new device
        // Requirement 12.10: Save device to storage
        const newDevice: BarkDevice = {
          id: this.generateDeviceId(),
          name: formData.name,
          serverUrl: formData.serverUrl,
          deviceKey: formData.deviceKey,
          customHeaders: formData.customHeaders,
          isDefault: false, // Will be auto-set by StorageManager if first device
          createdAt: new Date().toISOString(),
        };
        this.storage.saveDevice(newDevice);
      }

      // Requirement 12.12: Return to device list after save
      if (this.onSave) {
        this.onSave();
      }
    } catch (error) {
      console.error('Save device error:', error);
      this.errors = { _general: t('errors.storageError') };
      this.updateErrorDisplay();
    }
  }

  /**
   * Handle back/cancel button click
   * Requirement 13.3: Return to device list without saving
   */
  private handleBack(): void {
    if (this.onBack) {
      this.onBack();
    }
  }

  /**
   * Generate a unique device ID
   */
  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Update test button state without full rerender
   */
  private updateTestButtonState(): void {
    if (!this.container) return;
    
    const testButton = this.container.querySelector('.test-button') as HTMLButtonElement;
    if (!testButton) return;

    testButton.disabled = this.testState === 'testing';
    
    if (this.testState === 'testing') {
      testButton.textContent = t('settings.testing');
      testButton.className = 'btn btn-secondary test-button';
    } else if (this.testState === 'success') {
      testButton.textContent = t('settings.testSuccess');
      testButton.className = 'btn btn-secondary test-button test-success';
    } else if (this.testState === 'failed') {
      testButton.textContent = t('settings.testFailed');
      testButton.className = 'btn btn-secondary test-button test-failed';
    } else {
      testButton.textContent = t('settings.testConnection');
      testButton.className = 'btn btn-secondary test-button';
    }
  }

  /**
   * Update error display without full rerender
   */
  private updateErrorDisplay(): void {
    if (!this.container) return;
    
    // Clear all existing errors
    const existingErrors = this.container.querySelectorAll('.field-error');
    existingErrors.forEach(el => el.remove());

    // Remove error class from all inputs
    const inputs = this.container.querySelectorAll('.device-form input, .device-form textarea');
    inputs.forEach(input => input.classList.remove('error'));

    // Add new errors
    Object.entries(this.errors).forEach(([fieldName, errorMessage]) => {
      if (fieldName === '_general') return;

      const input = this.container!.querySelector(`[name="${fieldName}"]`) as HTMLInputElement | HTMLTextAreaElement;
      if (!input) return;

      input.classList.add('error');

      const fieldContainer = input.closest('.form-field');
      if (!fieldContainer) return;

      const errorElement = document.createElement('div');
      errorElement.className = 'field-error';
      errorElement.textContent = errorMessage;
      fieldContainer.appendChild(errorElement);
    });
  }
}
