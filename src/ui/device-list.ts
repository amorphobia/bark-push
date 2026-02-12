/**
 * DeviceList component - displays list of configured Bark devices
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 12.1
 */

import { t } from '../i18n';
import { StorageManager } from '../storage/storage-manager';
import type { BarkDevice } from '../types';

export class DeviceList {
  private storage: StorageManager;
  private devices: BarkDevice[] = [];
  private onAddDevice?: () => void;
  private onEditDevice?: (device: BarkDevice) => void;
  private onDeleteDevice?: (device: BarkDevice) => void;
  private onSetDefault?: (device: BarkDevice) => void;

  constructor(storage: StorageManager) {
    this.storage = storage;
    this.devices = this.storage.getDevices();
  }

  /**
   * Set callback for add device button
   */
  setOnAddDevice(callback: () => void): void {
    this.onAddDevice = callback;
  }

  /**
   * Set callback for edit device button
   */
  setOnEditDevice(callback: (device: BarkDevice) => void): void {
    this.onEditDevice = callback;
  }

  /**
   * Set callback for delete device button
   */
  setOnDeleteDevice(callback: (device: BarkDevice) => void): void {
    this.onDeleteDevice = callback;
  }

  /**
   * Set callback for set default button
   */
  setOnSetDefault(callback: (device: BarkDevice) => void): void {
    this.onSetDefault = callback;
  }

  /**
   * Render the device list
   * Requirement 11.1: Display list of all configured devices
   */
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'device-list';

    // Requirement 11.2: Show "no devices" message when empty
    if (this.devices.length === 0) {
      const emptyState = this.renderEmptyState();
      container.appendChild(emptyState);
    } else {
      // Requirement 11.6: Order devices by creation time (oldest first)
      const sortedDevices = [...this.devices].sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      sortedDevices.forEach(device => {
        const deviceCard = this.renderDeviceCard(device);
        container.appendChild(deviceCard);
      });
    }

    // Requirement 12.1: Display "Add Device" button
    const addButton = this.renderAddButton();
    container.appendChild(addButton);

    return container;
  }

  /**
   * Render empty state message
   * Requirement 11.2: Display message when no devices configured
   */
  private renderEmptyState(): HTMLElement {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const message = document.createElement('p');
    message.textContent = t('settings.noDevices');
    emptyState.appendChild(message);

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = t('settings.noDevicesHint');
    emptyState.appendChild(hint);

    return emptyState;
  }

  /**
   * Render a device card
   * DESIGN CHANGE: Compact layout with radio button for default selection
   * Requirement 11.3: Display device with name, URL/key
   * Requirement 11.4: Radio button indicates default device (replaces star emoji)
   * Requirement 11.5: Display Font Awesome lock icon for devices with custom headers
   * Requirement 11.7: Display Font Awesome action icons (edit, delete)
   */
  private renderDeviceCard(device: BarkDevice): HTMLElement {
    const card = document.createElement('div');
    card.className = 'device-card';
    card.dataset.deviceId = device.id;

    // Main row: radio | device info | action icons
    const mainRow = document.createElement('div');
    mainRow.className = 'device-main-row';

    // Radio button for default device selection (left side, vertically centered)
    const radioButton = document.createElement('input');
    radioButton.type = 'radio';
    radioButton.name = 'default-device';
    radioButton.className = 'device-radio';
    radioButton.checked = device.isDefault;
    radioButton.title = device.isDefault ? t('settings.defaultDevice') : t('settings.setAsDefault');
    radioButton.onclick = (e) => {
      e.stopPropagation();
      if (this.onSetDefault) {
        this.onSetDefault(device);
      }
    };
    mainRow.appendChild(radioButton);

    // Device info container (center, aligned left)
    const infoContainer = document.createElement('div');
    infoContainer.className = 'device-info';

    // Device name
    const nameElement = document.createElement('div');
    nameElement.className = 'device-name';
    nameElement.textContent = device.name || t('settings.deviceName');
    infoContainer.appendChild(nameElement);

    // URL/Key display with optional lock icon
    const urlKeyDisplay = document.createElement('div');
    urlKeyDisplay.className = 'device-url-key';
    
    const urlKeyText = document.createElement('span');
    urlKeyText.textContent = `${device.serverUrl}/${device.deviceKey}`;
    urlKeyDisplay.appendChild(urlKeyText);

    // Font Awesome lock icon for custom headers
    if (device.customHeaders && device.customHeaders.trim().length > 0) {
      const lockIcon = document.createElement('i');
      lockIcon.className = 'fa-solid fa-lock';
      lockIcon.title = t('settings.hasCustomHeaders');
      urlKeyDisplay.appendChild(lockIcon);
    }

    infoContainer.appendChild(urlKeyDisplay);
    mainRow.appendChild(infoContainer);

    // Action icons on the right (vertically centered)
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'device-actions';

    // Edit icon button (Font Awesome)
    const editBtn = document.createElement('button');
    editBtn.className = 'device-action-btn edit';
    editBtn.title = t('common.edit');
    editBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      if (this.onEditDevice) {
        this.onEditDevice(device);
      }
    };
    actionsContainer.appendChild(editBtn);

    // Delete icon button (Font Awesome)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'device-action-btn delete';
    deleteBtn.title = t('common.delete');
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (this.onDeleteDevice) {
        this.onDeleteDevice(device);
      }
    };
    actionsContainer.appendChild(deleteBtn);

    mainRow.appendChild(actionsContainer);
    card.appendChild(mainRow);

    // Mobile-friendly: clicking the card (except action buttons) sets as default
    card.style.cursor = 'pointer';
    card.onclick = () => {
      if (this.onSetDefault && !device.isDefault) {
        this.onSetDefault(device);
      }
    };

    return card;
  }

  /**
   * Render add device button
   * Requirement 12.1: Display "Add Device" button
   */
  private renderAddButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'btn btn-primary add-device-btn';
    button.textContent = t('settings.addDevice');
    button.onclick = () => {
      if (this.onAddDevice) {
        this.onAddDevice();
      }
    };
    return button;
  }

  /**
   * Refresh the device list
   */
  refresh(): void {
    this.devices = this.storage.getDevices();
  }
}
