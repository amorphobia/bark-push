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
   * Requirement 11.5: Display inline SVG lock icon for devices with custom headers
   * Requirement 11.7: Display inline SVG action icons (edit, delete)
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
      const lockIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      lockIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      lockIcon.setAttribute('viewBox', '0 0 384 512');
      lockIcon.setAttribute('title', t('settings.hasCustomHeaders'));
      lockIcon.innerHTML = '<path fill="currentColor" d="M128 96l0 64 128 0 0-64c0-35.3-28.7-64-64-64s-64 28.7-64 64zM64 160l0-64C64 25.3 121.3-32 192-32S320 25.3 320 96l0 64c35.3 0 64 28.7 64 64l0 224c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 224c0-35.3 28.7-64 64-64z"/>';
      urlKeyDisplay.appendChild(lockIcon);
    }

    infoContainer.appendChild(urlKeyDisplay);
    mainRow.appendChild(infoContainer);

    // Action icons on the right (vertically centered)
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'device-actions';

    // Edit icon button (inline SVG)
    const editBtn = document.createElement('button');
    editBtn.className = 'device-action-btn edit';
    editBtn.title = t('common.edit');
    editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M36.4 353.2c4.1-14.6 11.8-27.9 22.6-38.7l181.2-181.2 33.9-33.9c16.6 16.6 51.3 51.3 104 104l33.9 33.9-33.9 33.9-181.2 181.2c-10.7 10.7-24.1 18.5-38.7 22.6L30.4 510.6c-8.3 2.3-17.3 0-23.4-6.2S-1.4 489.3 .9 481L36.4 353.2zm55.6-3.7c-4.4 4.7-7.6 10.4-9.3 16.6l-24.1 86.9 86.9-24.1c6.4-1.8 12.2-5.1 17-9.7L91.9 349.5zm354-146.1c-16.6-16.6-51.3-51.3-104-104L308 65.5C334.5 39 349.4 24.1 352.9 20.6 366.4 7 384.8-.6 404-.6S441.6 7 455.1 20.6l35.7 35.7C504.4 69.9 512 88.3 512 107.4s-7.6 37.6-21.2 51.1c-3.5 3.5-18.4 18.4-44.9 44.9z"/></svg>';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      if (this.onEditDevice) {
        this.onEditDevice(device);
      }
    };
    actionsContainer.appendChild(editBtn);

    // Delete icon button (inline SVG)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'device-action-btn delete';
    deleteBtn.title = t('common.delete');
    deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M136.7 5.9L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-8.7-26.1C306.9-7.2 294.7-16 280.9-16L167.1-16c-13.8 0-26 8.8-30.4 21.9zM416 144L32 144 53.1 467.1C54.7 492.4 75.7 512 101 512L347 512c25.3 0 46.3-19.6 47.9-44.9L416 144z"/></svg>';
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
