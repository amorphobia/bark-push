/**
 * PushTab - Push notification composition interface
 * Requirements: 4.1-4.7, 5.1-5.4, 6.1-6.7, 7.1-7.5, 8.1-8.6, 9.1-9.9
 */

import type { BarkDevice, NotificationPayload } from '../types';
import { StorageManager } from '../storage/storage-manager';
import { DeviceSelector } from './device-selector';
import { BarkClient } from '../api/bark-client';
import { t } from '../i18n';
import type { ToastManager } from './toast';

/**
 * PushTab provides the notification composition interface
 */
export class PushTab {
  private storage: StorageManager;
  private deviceSelector: DeviceSelector;
  private barkClient: BarkClient;
  private toast: ToastManager;
  private devices: BarkDevice[];
  private markdownEnabled: boolean;
  private advancedExpanded: boolean;
  private containerElement: HTMLElement | null;
  private tipsInterval: number | null;
  private currentTipIndex: number;
  private isSending: boolean;

  constructor(storage: StorageManager, barkClient: BarkClient, toast: ToastManager) {
    this.storage = storage;
    this.barkClient = barkClient;
    this.toast = toast;
    this.deviceSelector = new DeviceSelector(storage);
    this.devices = [];
    this.markdownEnabled = storage.getMarkdownEnabled();
    this.advancedExpanded = storage.getAdvancedExpanded();
    this.containerElement = null;
    this.tipsInterval = null;
    this.currentTipIndex = 0;
    this.isSending = false;
  }

  /**
   * Render the push tab
   * Requirements: 4.1-4.7, 5.1, 6.1, 7.1, 8.1, 9.1
   */
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'push-tab';
    this.containerElement = container;

    // Load devices
    this.devices = this.storage.getDevices();
    this.deviceSelector.setDevices(this.devices);
    this.deviceSelector.loadSelection();

    // Title field (Requirement 4.1)
    const titleGroup = document.createElement('div');
    titleGroup.className = 'form-group';
    
    const titleLabel = document.createElement('label');
    titleLabel.textContent = t('push.title');
    titleLabel.htmlFor = 'push-title';
    
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'push-title';
    titleInput.className = 'form-input';
    titleInput.placeholder = t('push.titlePlaceholder');
    // Requirement 4.3: Single-line constraint - prevent Enter
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Move focus to message field
        const messageField = this.containerElement?.querySelector('#bark-message') as HTMLTextAreaElement;
        if (messageField) {
          messageField.focus();
        }
      }
    });
    
    titleGroup.appendChild(titleLabel);
    titleGroup.appendChild(titleInput);
    container.appendChild(titleGroup);

    // Message field (Requirement 4.2)
    const messageGroup = document.createElement('div');
    messageGroup.className = 'form-group';
    
    const messageLabel = document.createElement('label');
    messageLabel.textContent = t('push.message');
    messageLabel.htmlFor = 'push-message';
    
    const messageTextarea = document.createElement('textarea');
    messageTextarea.id = 'push-message';
    messageTextarea.className = 'form-textarea';
    messageTextarea.placeholder = t('push.messagePlaceholder');
    messageTextarea.rows = 4;
    messageTextarea.required = true;
    // Requirement 4.6, 21.2: Ctrl+Enter sends notification
    messageTextarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.handleSend();
      }
      // Requirement 4.5: Enter inserts newline (default behavior, no action needed)
    });
    // Update send button state on input
    messageTextarea.addEventListener('input', () => {
      this.updateSendButtonState();
    });
    
    messageGroup.appendChild(messageLabel);
    messageGroup.appendChild(messageTextarea);
    container.appendChild(messageGroup);

    // Markdown toggle (Requirement 5.1)
    const markdownGroup = document.createElement('div');
    markdownGroup.className = 'form-group form-checkbox';
    
    const markdownLabel = document.createElement('label');
    const markdownCheckbox = document.createElement('input');
    markdownCheckbox.type = 'checkbox';
    markdownCheckbox.id = 'push-markdown';
    markdownCheckbox.checked = this.markdownEnabled;
    markdownCheckbox.addEventListener('change', () => {
      this.markdownEnabled = markdownCheckbox.checked;
      this.storage.setMarkdownEnabled(this.markdownEnabled);
    });
    
    const markdownText = document.createElement('span');
    markdownText.textContent = t('push.markdown');
    
    markdownLabel.appendChild(markdownCheckbox);
    markdownLabel.appendChild(markdownText);
    markdownGroup.appendChild(markdownLabel);
    container.appendChild(markdownGroup);

    // Device selector (Requirement 6.1)
    const deviceGroup = document.createElement('div');
    deviceGroup.className = 'form-group';
    
    const deviceLabel = document.createElement('label');
    deviceLabel.textContent = t('push.selectDevice');
    
    const deviceSelectorElement = this.deviceSelector.render();
    
    deviceGroup.appendChild(deviceLabel);
    deviceGroup.appendChild(deviceSelectorElement);
    container.appendChild(deviceGroup);

    // Tips section (Requirement 7.1)
    const tipsSection = this.renderTips();
    container.appendChild(tipsSection);

    // Advanced options (Requirement 8.1)
    const advancedSection = this.renderAdvancedOptions();
    container.appendChild(advancedSection);

    // Send button (Requirement 9.1)
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'form-actions';
    
    const sendButton = document.createElement('button');
    sendButton.type = 'button';
    sendButton.id = 'push-send-button';
    sendButton.className = 'btn btn-primary';
    sendButton.textContent = t('push.sendButton');
    sendButton.addEventListener('click', () => this.handleSend());
    buttonContainer.appendChild(sendButton);
    
    container.appendChild(buttonContainer);

    // Update button state
    this.updateSendButtonState();

    // Start tips rotation if devices exist
    if (this.devices.length > 0) {
      this.startTipsRotation();
    }

    return container;
  }

  /**
   * Render tips section
   * Requirements: 7.1, 7.2, 7.3
   */
  private renderTips(): HTMLElement {
    const tipsSection = document.createElement('div');
    tipsSection.className = 'tips-section';
    tipsSection.id = 'push-tips';

    if (this.devices.length === 0) {
      // Requirement 7.2: Show "add device" message when no devices
      tipsSection.textContent = t('push.noDevicesHint');
    } else {
      // Requirement 7.3: Show rotating tips
      tipsSection.textContent = this.getCurrentTip();
    }

    return tipsSection;
  }

  /**
   * Get current tip text
   * Requirement 7.4: Tips content
   */
  private getCurrentTip(): string {
    // Get configured shortcut for the shortcut tip
    const shortcut = this.storage.getKeyboardShortcut() || 'Alt+B';
    
    const tips = [
      t('push.tips.markdown'),
      t('push.tips.keyboard'),
      t('push.tips.multiDevice'),
      t('push.tips.advanced'),
      t('push.tips.shortcut').replace('{shortcut}', shortcut),
    ];
    return tips[this.currentTipIndex % tips.length];
  }

  /**
   * Start tips rotation
   * Requirement 7.3: Rotate every 5 seconds
   */
  private startTipsRotation(): void {
    if (this.tipsInterval) {
      clearInterval(this.tipsInterval);
    }

    // Only start if we have devices
    if (this.devices.length === 0) {
      return;
    }

    this.tipsInterval = window.setInterval(() => {
      this.currentTipIndex++;
      const tipsElement = this.containerElement?.querySelector('#push-tips');
      if (tipsElement) {
        tipsElement.textContent = this.getCurrentTip();
      }
    }, 5000);
  }

  /**
   * Stop tips rotation
   */
  stopTipsRotation(): void {
    if (this.tipsInterval) {
      clearInterval(this.tipsInterval);
      this.tipsInterval = null;
    }
  }

  /**
   * Render advanced options section
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  private renderAdvancedOptions(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'advanced-section';

    // Card-style container
    const card = document.createElement('div');
    card.className = 'advanced-card';

    // Toggle button (Requirement 8.2)
    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'advanced-toggle';
    
    // Arrow icon
    const arrow = document.createElement('span');
    arrow.className = 'advanced-arrow';
    arrow.textContent = '▾';
    
    // Text label
    const label = document.createElement('span');
    label.textContent = t('push.advancedOptions');
    
    toggleButton.appendChild(arrow);
    toggleButton.appendChild(label);
    
    toggleButton.addEventListener('click', () => {
      this.advancedExpanded = !this.advancedExpanded;
      this.storage.setAdvancedExpanded(this.advancedExpanded);
      
      // Update arrow rotation
      arrow.style.transform = this.advancedExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
      
      // Toggle content visibility with smooth animation
      if (this.advancedExpanded) {
        content.style.display = 'block';
        // Trigger reflow to enable transition
        content.offsetHeight;
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.opacity = '1';
      } else {
        content.style.maxHeight = '0';
        content.style.opacity = '0';
        // Hide after animation completes
        setTimeout(() => {
          if (!this.advancedExpanded) {
            content.style.display = 'none';
          }
        }, 300);
      }
    });
    card.appendChild(toggleButton);

    // Advanced options content
    const content = document.createElement('div');
    content.className = 'advanced-content';
    
    // Set initial state
    if (this.advancedExpanded) {
      content.style.display = 'block';
      content.style.maxHeight = 'none';
      content.style.opacity = '1';
      arrow.style.transform = 'rotate(180deg)';
    } else {
      content.style.display = 'none';
      content.style.maxHeight = '0';
      content.style.opacity = '0';
    }

    // Sound dropdown (Requirement 8.3)
    const soundGroup = document.createElement('div');
    soundGroup.className = 'form-group';
    
    const soundLabel = document.createElement('label');
    soundLabel.textContent = t('push.advanced.sound');
    soundLabel.htmlFor = 'push-sound';
    
    const soundSelect = document.createElement('select');
    soundSelect.id = 'push-sound';
    soundSelect.className = 'form-select';
    
    // Add sound options (Requirement 8.4)
    const sounds = [
      '', 'alarm', 'anticipate', 'bell', 'birdsong', 'bloom', 'calypso',
      'chime', 'choo', 'descent', 'electronic', 'fanfare', 'glass',
      'gotosleep', 'healthnotification', 'horn', 'ladder', 'mailsent',
      'minuet', 'multiwayinvitation', 'newmail', 'newsflash', 'noir',
      'paymentsuccess', 'shake', 'sherwoodforest', 'silence', 'spell',
      'suspense', 'telegraph', 'tiptoes', 'typewriters', 'update'
    ];
    
    sounds.forEach(sound => {
      const option = document.createElement('option');
      option.value = sound;
      option.textContent = sound ? t(`push.sounds.${sound}`) : t('push.sounds.default');
      soundSelect.appendChild(option);
    });
    
    soundGroup.appendChild(soundLabel);
    soundGroup.appendChild(soundSelect);
    content.appendChild(soundGroup);

    // Icon URL field
    const iconGroup = document.createElement('div');
    iconGroup.className = 'form-group';
    
    const iconLabel = document.createElement('label');
    iconLabel.textContent = t('push.advanced.icon');
    iconLabel.htmlFor = 'push-icon';
    
    const iconInput = document.createElement('input');
    iconInput.type = 'url';
    iconInput.id = 'push-icon';
    iconInput.className = 'form-input';
    iconInput.placeholder = t('push.advanced.iconPlaceholder');
    
    iconGroup.appendChild(iconLabel);
    iconGroup.appendChild(iconInput);
    content.appendChild(iconGroup);

    // Group field
    const groupGroup = document.createElement('div');
    groupGroup.className = 'form-group';
    
    const groupLabel = document.createElement('label');
    groupLabel.textContent = t('push.advanced.group');
    groupLabel.htmlFor = 'push-group';
    
    const groupInput = document.createElement('input');
    groupInput.type = 'text';
    groupInput.id = 'push-group';
    groupInput.className = 'form-input';
    groupInput.placeholder = t('push.advanced.groupPlaceholder');
    
    groupGroup.appendChild(groupLabel);
    groupGroup.appendChild(groupInput);
    content.appendChild(groupGroup);

    // URL field
    const urlGroup = document.createElement('div');
    urlGroup.className = 'form-group';
    
    const urlLabel = document.createElement('label');
    urlLabel.textContent = t('push.advanced.url');
    urlLabel.htmlFor = 'push-url';
    
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.id = 'push-url';
    urlInput.className = 'form-input';
    urlInput.placeholder = t('push.advanced.urlPlaceholder');
    
    urlGroup.appendChild(urlLabel);
    urlGroup.appendChild(urlInput);
    content.appendChild(urlGroup);

    // Auto-copy checkbox
    const autoCopyGroup = document.createElement('div');
    autoCopyGroup.className = 'form-group form-checkbox';
    
    const autoCopyLabel = document.createElement('label');
    const autoCopyCheckbox = document.createElement('input');
    autoCopyCheckbox.type = 'checkbox';
    autoCopyCheckbox.id = 'push-autocopy';
    
    const autoCopyText = document.createElement('span');
    autoCopyText.textContent = t('push.advanced.autoCopyLabel');
    
    autoCopyLabel.appendChild(autoCopyCheckbox);
    autoCopyLabel.appendChild(autoCopyText);
    autoCopyGroup.appendChild(autoCopyLabel);
    content.appendChild(autoCopyGroup);

    // Archive checkbox
    const archiveGroup = document.createElement('div');
    archiveGroup.className = 'form-group form-checkbox';
    
    const archiveLabel = document.createElement('label');
    const archiveCheckbox = document.createElement('input');
    archiveCheckbox.type = 'checkbox';
    archiveCheckbox.id = 'push-archive';
    
    const archiveText = document.createElement('span');
    archiveText.textContent = t('push.advanced.archiveLabel');
    
    archiveLabel.appendChild(archiveCheckbox);
    archiveLabel.appendChild(archiveText);
    archiveGroup.appendChild(archiveLabel);
    content.appendChild(archiveGroup);

    card.appendChild(content);
    section.appendChild(card);
    return section;
  }

  /**
   * Update send button state
   * Requirements: 9.2, 9.3, 9.4
   */
  private updateSendButtonState(): void {
    if (!this.containerElement) return;

    const sendButton = this.containerElement.querySelector('#push-send-button') as HTMLButtonElement;
    const messageTextarea = this.containerElement.querySelector('#push-message') as HTMLTextAreaElement;

    if (!sendButton || !messageTextarea) return;

    const selectedDevices = this.deviceSelector.getSelectedIds();
    const message = messageTextarea.value.trim();

    // Requirement 9.2: Disable when no devices configured
    // Requirement 9.3: Disable when none selected
    // Requirement 9.4: Disable when message empty
    const shouldDisable = 
      this.devices.length === 0 ||
      selectedDevices.length === 0 ||
      message.length === 0 ||
      this.isSending;

    sendButton.disabled = shouldDisable;
  }

  /**
   * Handle send notification
   * Requirements: 9.1, 9.5, 9.6, 9.7, 9.8
   */
  private async handleSend(): Promise<void> {
    if (!this.containerElement) return;

    const titleInput = this.containerElement.querySelector('#push-title') as HTMLInputElement;
    const messageTextarea = this.containerElement.querySelector('#push-message') as HTMLTextAreaElement;
    const sendButton = this.containerElement.querySelector('#push-send-button') as HTMLButtonElement;

    // Validate
    const selectedDevices = this.deviceSelector.getSelectedDevices();
    const message = messageTextarea.value.trim();

    if (selectedDevices.length === 0) {
      this.showError(t('errors.noDeviceSelected'));
      return;
    }

    if (!message) {
      this.showError(t('errors.messageEmpty'));
      return;
    }

    // Build payload
    const payload: NotificationPayload = {
      title: titleInput.value.trim() || undefined,
    };

    // Handle markdown vs body (Requirements 5.2, 5.3)
    if (this.markdownEnabled) {
      payload.markdown = message;
    } else {
      payload.body = message;
    }

    // Add advanced options if provided (Requirement 8.5)
    const soundSelect = this.containerElement.querySelector('#push-sound') as HTMLSelectElement;
    const iconInput = this.containerElement.querySelector('#push-icon') as HTMLInputElement;
    const groupInput = this.containerElement.querySelector('#push-group') as HTMLInputElement;
    const urlInput = this.containerElement.querySelector('#push-url') as HTMLInputElement;
    const autoCopyCheckbox = this.containerElement.querySelector('#push-autocopy') as HTMLInputElement;
    const archiveCheckbox = this.containerElement.querySelector('#push-archive') as HTMLInputElement;

    if (soundSelect?.value) payload.sound = soundSelect.value;
    if (iconInput?.value) payload.icon = iconInput.value;
    if (groupInput?.value) payload.group = groupInput.value;
    if (urlInput?.value) payload.url = urlInput.value;
    if (autoCopyCheckbox?.checked) payload.autoCopy = true;
    if (archiveCheckbox?.checked) payload.isArchive = '1';

    // Show loading state (Requirement 9.5)
    this.isSending = true;
    sendButton.textContent = t('push.sending');
    sendButton.disabled = true;

    try {
      // Send notification
      await this.barkClient.sendNotification(selectedDevices, payload);

      // Show success message (Requirement 9.6)
      this.showSuccess(t('push.success'));

      // Clear form (Requirement 9.8)
      titleInput.value = '';
      messageTextarea.value = '';

      // Reset advanced options
      if (soundSelect) soundSelect.value = '';
      if (iconInput) iconInput.value = '';
      if (groupInput) groupInput.value = '';
      if (urlInput) urlInput.value = '';
      if (autoCopyCheckbox) autoCopyCheckbox.checked = false;
      if (archiveCheckbox) archiveCheckbox.checked = false;

    } catch (error) {
      // Show error message (Requirement 9.7)
      const errorMessage = error instanceof Error ? error.message : t('push.failed');
      this.showError(errorMessage);
    } finally {
      // Restore button state
      this.isSending = false;
      sendButton.textContent = t('push.sendButton');
      this.updateSendButtonState();
    }
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.toast.show(message, 'success');
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.toast.show(message, 'error');
  }

  /**
   * Cleanup when tab is hidden
   */
  destroy(): void {
    this.stopTipsRotation();
  }

  /**
   * Refresh the tab (reload devices, etc.)
   */
  refresh(): void {
    this.devices = this.storage.getDevices();
    this.deviceSelector.setDevices(this.devices);
    
    // Update tips section
    const tipsElement = this.containerElement?.querySelector('#push-tips');
    if (tipsElement) {
      if (this.devices.length === 0) {
        tipsElement.textContent = t('push.noDevicesHint');
        this.stopTipsRotation();
      } else {
        tipsElement.textContent = this.getCurrentTip();
        this.startTipsRotation();
      }
    }

    this.updateSendButtonState();
  }
}
