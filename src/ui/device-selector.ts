/**
 * DeviceSelector - Multi-select dropdown for device selection
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import type { BarkDevice } from '../types';
import { StorageManager } from '../storage/storage-manager';

/**
 * DeviceSelector provides a multi-select dropdown for choosing devices
 * Handles device selection state and persistence
 */
export class DeviceSelector {
  private devices: BarkDevice[];
  private selectedIds: string[];
  private isOpen: boolean;
  private storage: StorageManager;
  private containerElement: HTMLElement | null;
  private onSelectionChange?: (selectedIds: string[]) => void;

  constructor(storage: StorageManager) {
    this.devices = [];
    this.selectedIds = [];
    this.isOpen = false;
    this.storage = storage;
    this.containerElement = null;
  }

  /**
   * Set the callback for selection changes
   */
  setOnSelectionChange(callback: (selectedIds: string[]) => void): void {
    this.onSelectionChange = callback;
  }

  /**
   * Update the devices list
   * Requirement 6.2: Display all configured devices
   */
  setDevices(devices: BarkDevice[]): void {
    this.devices = devices;
    
    // Auto-select default device if one exists and nothing is selected
    // Requirement 6.5: Auto-select default device
    if (this.selectedIds.length === 0) {
      const defaultDevice = devices.find(d => d.isDefault);
      if (defaultDevice) {
        this.selectedIds = [defaultDevice.id];
        this.storage.setSelectedDeviceIds(this.selectedIds);
      }
    }
    
    // Remove selected IDs that no longer exist
    this.selectedIds = this.selectedIds.filter(id => 
      devices.some(d => d.id === id)
    );
    
    this.updateDisplay();
  }

  /**
   * Load selected devices from storage
   * Requirement 6.7: Persist device selection
   */
  loadSelection(): void {
    this.selectedIds = this.storage.getSelectedDeviceIds();
  }

  /**
   * Render the device selector component
   * Requirement 6.1: Display device selector dropdown
   */
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'device-selector';
    this.containerElement = container;

    // Dropdown button
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'device-selector-button';
    button.addEventListener('click', () => this.toggle());
    container.appendChild(button);

    // Dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'device-selector-dropdown';
    dropdown.style.display = 'none';
    container.appendChild(dropdown);

    this.updateDisplay();

    return container;
  }

  /**
   * Toggle dropdown open/close
   * Requirement 6.1: Open/close dropdown
   */
  toggle(): void {
    this.isOpen = !this.isOpen;
    this.updateDisplay();
  }

  /**
   * Select a device
   * Requirement 6.3: Select/deselect devices
   */
  selectDevice(deviceId: string): void {
    if (!this.selectedIds.includes(deviceId)) {
      this.selectedIds.push(deviceId);
      this.storage.setSelectedDeviceIds(this.selectedIds);
      this.updateDisplay();
      
      if (this.onSelectionChange) {
        this.onSelectionChange(this.selectedIds);
      }
    }
  }

  /**
   * Deselect a device
   * Requirement 6.3: Select/deselect devices
   */
  deselectDevice(deviceId: string): void {
    const index = this.selectedIds.indexOf(deviceId);
    if (index !== -1) {
      this.selectedIds.splice(index, 1);
      this.storage.setSelectedDeviceIds(this.selectedIds);
      this.updateDisplay();
      
      if (this.onSelectionChange) {
        this.onSelectionChange(this.selectedIds);
      }
    }
  }

  /**
   * Get currently selected devices
   */
  getSelectedDevices(): BarkDevice[] {
    return this.devices.filter(d => this.selectedIds.includes(d.id));
  }

  /**
   * Get selected device IDs
   */
  getSelectedIds(): string[] {
    return [...this.selectedIds];
  }

  /**
   * Update the display text and dropdown content
   * Requirement 6.4: Display selection count
   */
  updateDisplay(): void {
    if (!this.containerElement) return;

    const button = this.containerElement.querySelector('.device-selector-button') as HTMLButtonElement;
    const dropdown = this.containerElement.querySelector('.device-selector-dropdown') as HTMLElement;

    if (!button || !dropdown) return;

    // Update button text
    // Requirement 6.4: Show "X device(s) selected"
    if (this.devices.length === 0) {
      button.textContent = 'No devices configured';
      button.disabled = true;
    } else if (this.selectedIds.length === 0) {
      button.textContent = 'Select device(s)';
      button.disabled = false;
    } else {
      const count = this.selectedIds.length;
      button.textContent = `${count} device(s) selected`;
      button.disabled = false;
    }

    // Update dropdown visibility
    dropdown.style.display = this.isOpen ? 'block' : 'none';

    // Update dropdown content
    if (this.isOpen) {
      dropdown.innerHTML = '';

      if (this.devices.length === 0) {
        // Requirement 6.3: Show message when no devices
        const message = document.createElement('div');
        message.className = 'device-selector-empty';
        message.textContent = 'No devices configured';
        dropdown.appendChild(message);
      } else {
        // Requirement 6.2: Display all devices with checkboxes
        this.devices.forEach(device => {
          const item = document.createElement('label');
          item.className = 'device-selector-item';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = this.selectedIds.includes(device.id);
          checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
              this.selectDevice(device.id);
            } else {
              this.deselectDevice(device.id);
            }
          });

          const label = document.createElement('span');
          label.textContent = device.name || device.deviceKey.substring(0, 8) + '...';
          
          // Show star for default device
          if (device.isDefault) {
            label.textContent = '⭐ ' + label.textContent;
          }

          item.appendChild(checkbox);
          item.appendChild(label);
          dropdown.appendChild(item);
        });
      }
    }
  }

  /**
   * Close the dropdown
   */
  close(): void {
    this.isOpen = false;
    this.updateDisplay();
  }

  /**
   * Check if dropdown is open
   */
  isDropdownOpen(): boolean {
    return this.isOpen;
  }
}
