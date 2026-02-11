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
   * Requirement 11.3: Display device with name, URL, truncated key
   * Requirement 11.4: Display ⭐ icon for default device
   * Requirement 11.5: Display 🔒 icon for devices with custom headers
   * Requirement 11.7: Display action buttons
   */
  private renderDeviceCard(device: BarkDevice): HTMLElement {
    const card = document.createElement('div');
    card.className = 'device-card';
    card.dataset.deviceId = device.id;

    // Device header with name and icons
    const header = document.createElement('div');
    header.className = 'device-header';

    const nameContainer = document.createElement('div');
    nameContainer.className = 'device-name-container';

    // Requirement 11.4: Show ⭐ for default device
    if (device.isDefault) {
      const starIcon = document.createElement('span');
      starIcon.className = 'device-icon default-icon';
      starIcon.textContent = '⭐';
      starIcon.title = t('settings.defaultDevice');
      nameContainer.appendChild(starIcon);
    }

    const name = document.createElement('span');
    name.className = 'device-name';
    name.textContent = device.name || t('settings.deviceName');
    nameContainer.appendChild(name);

    // Requirement 11.5: Show 🔒 for devices with custom headers
    if (device.customHeaders && device.customHeaders.trim().length > 0) {
      const lockIcon = document.createElement('span');
      lockIcon.className = 'device-icon lock-icon';
      lockIcon.textContent = '🔒';
      lockIcon.title = t('settings.hasCustomHeaders');
      nameContainer.appendChild(lockIcon);
    }

    header.appendChild(nameContainer);
    card.appendChild(header);

    // Device details
    const details = document.createElement('div');
    details.className = 'device-details';

    const urlLabel = document.createElement('div');
    urlLabel.className = 'device-detail-label';
    urlLabel.textContent = t('settings.serverUrl') + ':';
    details.appendChild(urlLabel);

    const url = document.createElement('div');
    url.className = 'device-detail-value';
    url.textContent = device.serverUrl;
    details.appendChild(url);

    const keyLabel = document.createElement('div');
    keyLabel.className = 'device-detail-label';
    keyLabel.textContent = t('settings.deviceKey') + ':';
    details.appendChild(keyLabel);

    const key = document.createElement('div');
    key.className = 'device-detail-value device-key';
    // Truncate key: show first 6 and last 4 characters
    key.textContent = this.truncateKey(device.deviceKey);
    details.appendChild(key);

    card.appendChild(details);

    // Requirement 11.7: Action buttons
    const actions = document.createElement('div');
    actions.className = 'device-actions';

    // Set Default button (only show if not already default)
    if (!device.isDefault) {
      const setDefaultBtn = document.createElement('button');
      setDefaultBtn.className = 'btn btn-secondary';
      setDefaultBtn.textContent = t('settings.setDefault');
      setDefaultBtn.onclick = () => {
        if (this.onSetDefault) {
          this.onSetDefault(device);
        }
      };
      actions.appendChild(setDefaultBtn);
    }

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary';
    editBtn.textContent = t('common.edit');
    editBtn.onclick = () => {
      if (this.onEditDevice) {
        this.onEditDevice(device);
      }
    };
    actions.appendChild(editBtn);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = t('common.delete');
    deleteBtn.onclick = () => {
      if (this.onDeleteDevice) {
        this.onDeleteDevice(device);
      }
    };
    actions.appendChild(deleteBtn);

    card.appendChild(actions);

    return card;
  }

  /**
   * Truncate device key for display
   * Shows first 6 and last 4 characters
   */
  private truncateKey(key: string): string {
    if (key.length <= 10) {
      return key;
    }
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
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
