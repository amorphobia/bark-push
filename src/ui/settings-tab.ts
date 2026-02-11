/**
 * SettingsTab - integrates device management and language settings
 * Requirements: 11.1, 12.1, 12.2, 13.1, 17.5
 */

import { StorageManager } from '../storage/storage-manager';
import { BarkClient } from '../api/bark-client';
import { DeviceList } from './device-list';
import { DeviceForm } from './device-form';
import { DeviceManager } from './device-manager';
import { LanguageSelector } from './language-selector';
import type { BarkDevice } from '../types';
import type { ToastManager } from './toast';

type ViewState = 'list' | 'form';

export class SettingsTab {
  private container: HTMLElement | null = null;
  private currentView: ViewState = 'list';
  private editingDevice: BarkDevice | null = null;

  // Components
  private deviceList: DeviceList;
  private deviceForm: DeviceForm;
  private deviceManager: DeviceManager;
  private languageSelector: LanguageSelector;

  constructor(storage: StorageManager, apiClient: BarkClient, toast: ToastManager) {
    // Initialize components
    this.deviceList = new DeviceList(storage);
    this.deviceForm = new DeviceForm(storage, apiClient);
    this.deviceManager = new DeviceManager(storage, toast);
    this.languageSelector = new LanguageSelector(storage, toast);

    // Set up language change callback to re-render UI
    this.languageSelector.setOnLanguageChange(() => {
      this.render();
    });
  }

  /**
   * Render the settings tab
   * Requirement 11.1: Display device management interface
   */
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'bark-settings-tab';
    container.style.cssText = `
      padding: 16px;
    `;

    // Render based on current view state
    if (this.currentView === 'list') {
      container.appendChild(this.renderListView());
    } else {
      container.appendChild(this.renderFormView());
    }

    this.container = container;
    return container;
  }

  /**
   * Render the device list view
   */
  private renderListView(): HTMLElement {
    const view = document.createElement('div');
    view.className = 'bark-settings-list-view';

    // Set up device list callbacks before rendering
    this.deviceList.setOnAddDevice(() => this.handleAddDevice());
    this.deviceList.setOnEditDevice((device) => this.handleEditDevice(device));
    this.deviceList.setOnDeleteDevice((device) => this.handleDeleteDevice(device));
    this.deviceList.setOnSetDefault((device) => this.handleSetDefault(device));

    // Refresh device list to get latest data
    this.deviceList.refresh();

    // Render device list
    const deviceListElement = this.deviceList.render();
    view.appendChild(deviceListElement);

    // Add language selector at the bottom
    const languageSelectorWrapper = document.createElement('div');
    languageSelectorWrapper.style.cssText = `
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #eee;
    `;
    languageSelectorWrapper.appendChild(this.languageSelector.render());
    view.appendChild(languageSelectorWrapper);

    return view;
  }

  /**
   * Render the device form view
   */
  private renderFormView(): HTMLElement {
    const view = document.createElement('div');
    view.className = 'bark-settings-form-view';

    // Set up device form before rendering
    this.deviceForm.setEditingDevice(this.editingDevice);
    this.deviceForm.setOnBack(() => this.handleBackToList());
    this.deviceForm.setOnSave(() => this.handleBackToList());

    // Render device form
    const deviceFormElement = this.deviceForm.render();

    view.appendChild(deviceFormElement);

    return view;
  }

  /**
   * Handle add device action
   * Requirement 12.2: Navigate to device form in add mode
   */
  private handleAddDevice(): void {
    this.deviceManager.handleAddDevice((device) => {
      this.editingDevice = device;
      this.currentView = 'form';
      this.refreshView();
    });
  }

  /**
   * Handle edit device action
   * Requirement 13.1: Navigate to device form with device data
   */
  private handleEditDevice(device: BarkDevice): void {
    this.deviceManager.handleEditDevice(device, (editDevice) => {
      this.editingDevice = editDevice;
      this.currentView = 'form';
      this.refreshView();
    });
  }

  /**
   * Handle delete device action
   */
  private handleDeleteDevice(device: BarkDevice): void {
    this.deviceManager.handleDeleteDevice(device, () => {
      this.refreshView();
    });
  }

  /**
   * Handle set default device action
   */
  private handleSetDefault(device: BarkDevice): void {
    this.deviceManager.handleSetDefault(device, () => {
      this.refreshView();
    });
  }

  /**
   * Handle back to list navigation
   * Requirement 13.3: Return to device list after form actions
   */
  private handleBackToList(): void {
    this.editingDevice = null;
    this.currentView = 'list';
    this.refreshView();
  }

  /**
   * Refresh the current view
   * Re-renders the entire settings tab
   */
  private refreshView(): void {
    if (!this.container) return;

    // Clear current content
    this.container.innerHTML = '';

    // Render based on current view
    if (this.currentView === 'list') {
      this.container.appendChild(this.renderListView());
    } else {
      this.container.appendChild(this.renderFormView());
    }
  }

  /**
   * Get the current view state
   */
  getCurrentView(): ViewState {
    return this.currentView;
  }
}
