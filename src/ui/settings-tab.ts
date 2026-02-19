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
import { ThemeSelector } from './theme-selector';
import { t } from '../i18n';
import type { BarkDevice } from '../types';
import type { ToastManager } from './toast';
import { setRecordingShortcut } from '../main';

type ViewState = 'list' | 'form';

export class SettingsTab {
  private container: HTMLElement | null = null;
  private currentView: ViewState = 'list';
  private editingDevice: BarkDevice | null = null;
  private isRecordingShortcut: boolean = false;
  private onLanguageChangeCallback?: () => void;
  private onThemeChangeCallback?: () => void;
  private onViewChangeCallback?: (view: ViewState) => void;

  // Components
  private deviceList: DeviceList;
  private deviceForm: DeviceForm;
  private deviceManager: DeviceManager;
  private languageSelector: LanguageSelector;
  private themeSelector: ThemeSelector;
  private storage: StorageManager;
  private toast: ToastManager;

  constructor(storage: StorageManager, apiClient: BarkClient, toast: ToastManager) {
    this.storage = storage;
    this.toast = toast;

    // Initialize components
    this.deviceList = new DeviceList(storage);
    this.deviceForm = new DeviceForm(storage, apiClient);
    this.deviceManager = new DeviceManager(storage, toast);
    this.languageSelector = new LanguageSelector(storage, toast);
    this.themeSelector = new ThemeSelector(storage, toast);

    // Set up language change callback
    this.languageSelector.setOnLanguageChange(() => {
      if (this.onLanguageChangeCallback) {
        this.onLanguageChangeCallback();
      }
    });

    // Set up theme change callback
    this.themeSelector.setOnThemeChange(() => {
      if (this.onThemeChangeCallback) {
        this.onThemeChangeCallback();
      }
    });
  }

  /**
   * Set callback for when language changes
   * This allows the modal controller to refresh the entire UI
   */
  setOnLanguageChange(callback: () => void): void {
    this.onLanguageChangeCallback = callback;
  }

  /**
   * Set callback for when theme changes
   * This allows the modal controller to refresh the entire UI
   */
  setOnThemeChange(callback: () => void): void {
    this.onThemeChangeCallback = callback;
  }

  /**
   * Set callback for when view state changes
   * This allows the modal controller to show/hide back button
   */
  setOnViewChange(callback: (view: ViewState) => void): void {
    this.onViewChangeCallback = callback;
  }

  /**
   * Render the settings tab
   * Requirement 11.1: Display device management interface
   */
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'bark-settings-tab';
    container.style.cssText = `
      padding: 12px;
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
      border-top: 1px solid var(--bark-border);
    `;
    languageSelectorWrapper.appendChild(this.languageSelector.render());
    view.appendChild(languageSelectorWrapper);

    // Add theme selector
    const themeSelectorWrapper = document.createElement('div');
    themeSelectorWrapper.style.cssText = `
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--bark-border);
    `;
    themeSelectorWrapper.appendChild(this.themeSelector.render());
    view.appendChild(themeSelectorWrapper);

    // Add keyboard shortcut settings
    const keyboardShortcutWrapper = document.createElement('div');
    keyboardShortcutWrapper.style.cssText = `
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--bark-border);
    `;
    keyboardShortcutWrapper.appendChild(this.renderKeyboardShortcut());
    view.appendChild(keyboardShortcutWrapper);

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
      this.onViewChangeCallback?.('form');
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
      this.onViewChangeCallback?.('form');
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
    this.onViewChangeCallback?.('list');
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

  /**
   * Go back to list view (public method for external control)
   */
  goBackToList(): void {
    this.handleBackToList();
  }

  /**
   * Render keyboard shortcut settings
   */
  private renderKeyboardShortcut(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'bark-keyboard-shortcut';

    const currentShortcut = this.storage.getKeyboardShortcut();

    container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--bark-text-primary);">
          ${t('settings.keyboardShortcut')}
        </label>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input
            type="text"
            id="bark-shortcut-input"
            value="${currentShortcut || ''}"
            readonly
            placeholder="${t('settings.keyboardShortcutPlaceholder')}"
            style="flex: 1; padding: 8px 12px; border: 1px solid var(--bark-border); border-radius: 6px; font-size: 14px; background: var(--bark-bg-secondary); color: var(--bark-text-primary); cursor: pointer;"
          />
          <button
            id="bark-shortcut-record"
            class="btn-secondary"
            style="white-space: nowrap;"
          >
            ${t('settings.keyboardShortcutRecord')}
          </button>
          <button
            id="bark-shortcut-clear"
            class="btn-secondary"
            style="white-space: nowrap;"
          >
            ${t('settings.keyboardShortcutClear')}
          </button>
        </div>
        <span style="display: block; margin-top: 4px; font-size: 12px; color: var(--bark-text-secondary);">
          ${t('settings.keyboardShortcutHint')}
        </span>
      </div>
    `;

    // Attach event listeners
    const input = container.querySelector('#bark-shortcut-input') as HTMLInputElement;
    const recordBtn = container.querySelector('#bark-shortcut-record') as HTMLButtonElement;
    const clearBtn = container.querySelector('#bark-shortcut-clear') as HTMLButtonElement;

    // Record shortcut
    recordBtn.addEventListener('click', () => {
      this.startRecordingShortcut(input, recordBtn);
    });

    // Clear shortcut
    clearBtn.addEventListener('click', () => {
      this.storage.setKeyboardShortcut('');
      input.value = '';
      this.toast.show(t('settings.keyboardShortcutCleared'), 'success');
      // Notify main.ts to re-register (page reload required)
      this.toast.show(t('settings.keyboardShortcutReloadRequired'), 'info');
    });

    return container;
  }

  /**
   * Start recording keyboard shortcut
   */
  private startRecordingShortcut(input: HTMLInputElement, recordBtn: HTMLButtonElement): void {
    if (this.isRecordingShortcut) return;

    this.isRecordingShortcut = true;
    setRecordingShortcut(true); // Notify main.ts to disable global shortcut listener
    recordBtn.textContent = t('settings.keyboardShortcutRecording');
    recordBtn.disabled = true;
    input.value = t('settings.keyboardShortcutPressKeys');
    input.style.borderColor = '#007aff';

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Build shortcut string
      const parts: string[] = [];
      if (event.ctrlKey) parts.push('Ctrl');
      if (event.altKey) parts.push('Alt');
      if (event.shiftKey) parts.push('Shift');
      if (event.metaKey) parts.push('Meta');

      // Get main key (ignore modifier keys)
      const key = event.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        parts.push(key.toUpperCase());
      }

      // Validate: must have at least one modifier
      const hasModifier = event.ctrlKey || event.altKey || event.shiftKey || event.metaKey;
      const hasMainKey = parts.length > 0 && !['Control', 'Alt', 'Shift', 'Meta'].includes(parts[parts.length - 1]);

      if (hasModifier && hasMainKey) {
        const shortcut = parts.join('+');
        input.value = shortcut;

        // Save shortcut
        try {
          this.storage.setKeyboardShortcut(shortcut);
          this.toast.show(t('settings.keyboardShortcutSaved'), 'success');
          // Notify that page reload is required
          this.toast.show(t('settings.keyboardShortcutReloadRequired'), 'info');
        } catch (error) {
          this.toast.show(t('errors.storageError'), 'error');
        }

        // Stop recording
        this.stopRecordingShortcut(input, recordBtn, handleKeyDown);
      } else if (!hasModifier && hasMainKey) {
        // Show error: must have modifier
        this.toast.show(t('settings.keyboardShortcutInvalid'), 'error');
      }
    };

    // Listen for keydown
    document.addEventListener('keydown', handleKeyDown, true);

    // Store handler for cleanup
    (input as any)._keydownHandler = handleKeyDown;
  }

  /**
   * Stop recording keyboard shortcut
   */
  private stopRecordingShortcut(input: HTMLInputElement, recordBtn: HTMLButtonElement, handler: (event: KeyboardEvent) => void): void {
    this.isRecordingShortcut = false;
    setRecordingShortcut(false); // Notify main.ts to re-enable global shortcut listener
    recordBtn.textContent = t('settings.keyboardShortcutRecord');
    recordBtn.disabled = false;
    input.style.borderColor = 'var(--bark-border)';

    // Remove event listener
    document.removeEventListener('keydown', handler, true);
  }
}
