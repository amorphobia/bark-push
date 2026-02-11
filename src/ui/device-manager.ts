/**
 * DeviceManager - handles device management actions
 * Requirements: 12.2, 13.1, 14.1, 14.2, 14.3, 14.4, 15.1, 15.2
 */

import { t } from '../i18n';
import { StorageManager } from '../storage/storage-manager';
import type { BarkDevice } from '../types';

export class DeviceManager {
  private storage: StorageManager;

  constructor(storage: StorageManager) {
    this.storage = storage;
  }

  /**
   * Handle add device action
   * Requirement 12.2: Navigate to device form in add mode
   */
  handleAddDevice(onNavigate: (device: BarkDevice | null) => void): void {
    onNavigate(null);
  }

  /**
   * Handle edit device action
   * Requirement 13.1: Navigate to device form with device data
   */
  handleEditDevice(device: BarkDevice, onNavigate: (device: BarkDevice | null) => void): void {
    onNavigate(device);
  }

  /**
   * Handle delete device action
   * Requirements: 14.1, 14.2, 14.3, 14.4
   */
  handleDeleteDevice(device: BarkDevice, onComplete: () => void): void {
    // Requirement 14.1: Show confirmation dialog
    const confirmed = confirm(
      `${t('settings.deleteConfirm')}\n\n${t('settings.deleteConfirmMessage')}`
    );

    if (!confirmed) {
      return;
    }

    try {
      // Requirement 14.2: Delete device from storage
      this.storage.deleteDevice(device.id);

      // Requirement 14.3: Clear default device if deleted device was default
      // This is handled by StorageManager.deleteDevice()

      // Requirement 14.4: Refresh device list
      onComplete();
    } catch (error) {
      console.error('Delete device error:', error);
      alert(t('errors.storageError'));
    }
  }

  /**
   * Handle set default device action
   * Requirements: 15.1, 15.2
   */
  handleSetDefault(device: BarkDevice, onComplete: () => void): void {
    try {
      // Requirement 15.1: Set device as default
      this.storage.setDefaultDeviceId(device.id);

      // Requirement 15.2: Only one device can be default (handled by StorageManager)

      // Refresh device list to show updated default status
      onComplete();
    } catch (error) {
      console.error('Set default device error:', error);
      alert(t('errors.storageError'));
    }
  }
}
