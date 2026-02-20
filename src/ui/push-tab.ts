/**
 * PushTab - Push notification composition interface
 * Requirements: 4.1-4.7, 5.1-5.4, 6.1-6.7, 7.1-7.5, 8.1-8.6, 9.1-9.9
 */

import type { BarkDevice, NotificationPayload, PushHistoryDevice, PushHistoryItem, PushHistoryResponse } from '../types';
import { StorageManager } from '../storage/storage-manager';
import { DeviceSelector } from './device-selector';
import { BarkClient, BarkErrorType } from '../api/bark-client';
import { t } from '../i18n';
import type { ToastManager } from './toast';
import { generateMessageId } from '../utils/message-id';

/**
 * PushTab provides the notification composition interface
 */
/**
 * Interface for push form data (in-memory persistence)
 */
interface PushFormData {
  title: string;
  message: string;
  sound: string;
  icon: string;
  group: string;
  url: string;
  autoCopy: boolean;
  archive: boolean;
  subtitle: string;
  badge: string;
  level: string;
  volume: string;
  call: boolean;
  copy: string;
  action: string;
  image: string;
}

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
  // In-memory form data persistence
  private formData: PushFormData;

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
    // Initialize empty form data
    this.formData = {
      title: '',
      message: '',
      sound: '',
      icon: '',
      group: '',
      url: '',
      autoCopy: false,
      archive: false,
      subtitle: '',
      badge: '',
      level: 'active',
      volume: '5',
      call: false,
      copy: '',
      action: 'none',
      image: '',
    };
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
    
    // Message textarea wrapper with position: relative for icon button positioning
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'message-wrapper';
    messageWrapper.style.position = 'relative';
    
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
    
    // Markdown icon button (Requirements 5.1, 5.3, 5.4, 5.5, 5.6, 5.7)
    const markdownButton = document.createElement('button');
    markdownButton.type = 'button';
    markdownButton.id = 'push-markdown-toggle';
    markdownButton.className = 'markdown-toggle-icon';
    
    // Create official Markdown logo SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 208 128');
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '198');
    rect.setAttribute('height', '118');
    rect.setAttribute('x', '5');
    rect.setAttribute('y', '5');
    rect.setAttribute('ry', '10');
    rect.setAttribute('stroke', 'currentColor');
    rect.setAttribute('stroke-width', '10');
    rect.setAttribute('fill', 'none');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M30 98V30h20l20 25 20-25h20v68H90V59L70 84 50 59v39zm125 0l-30-33h20V30h20v35h20z');
    path.setAttribute('fill', 'currentColor');
    
    svg.appendChild(rect);
    svg.appendChild(path);
    markdownButton.appendChild(svg);
    
    // Handle click to toggle markdown state
    markdownButton.addEventListener('click', () => {
      this.markdownEnabled = !this.markdownEnabled;
      this.storage.setMarkdownEnabled(this.markdownEnabled);
      this.updateMarkdownButton(markdownButton);
    });
    
    // Set initial state using updateMarkdownButton
    this.updateMarkdownButton(markdownButton);
    
    messageWrapper.appendChild(messageTextarea);
    messageWrapper.appendChild(markdownButton);
    
    messageGroup.appendChild(messageLabel);
    messageGroup.appendChild(messageWrapper);
    container.appendChild(messageGroup);

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

    // Load persisted form data
    this.loadFormData();

    // Add input event listeners to save form data as user types
    const formInputs = container.querySelectorAll('input, textarea, select');
    formInputs.forEach(input => {
      input.addEventListener('input', () => this.saveFormData());
      input.addEventListener('change', () => this.saveFormData());
    });

    return container;
  }

  /**
   * Update markdown button state
   * Requirements: 5.3, 5.4, 5.5, 5.6
   */
  private updateMarkdownButton(button: HTMLButtonElement): void {
    if (this.markdownEnabled) {
      button.classList.add('active');
      button.setAttribute('aria-label', t('push.markdownDisable'));
      button.title = t('push.markdownDisable');
    } else {
      button.classList.remove('active');
      button.setAttribute('aria-label', t('push.markdownEnable'));
      button.title = t('push.markdownEnable');
    }
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

    // Subtitle field (batch 1)
    const subtitleGroup = document.createElement('div');
    subtitleGroup.className = 'form-group';

    const subtitleLabel = document.createElement('label');
    subtitleLabel.textContent = t('push.advanced.subtitle');
    subtitleLabel.htmlFor = 'push-subtitle';

    const subtitleInput = document.createElement('input');
    subtitleInput.type = 'text';
    subtitleInput.id = 'push-subtitle';
    subtitleInput.className = 'form-input';
    subtitleInput.placeholder = t('push.advanced.subtitlePlaceholder');

    subtitleGroup.appendChild(subtitleLabel);
    subtitleGroup.appendChild(subtitleInput);
    content.appendChild(subtitleGroup);

    // Badge field (batch 1)
    const badgeGroup = document.createElement('div');
    badgeGroup.className = 'form-group';

    const badgeLabel = document.createElement('label');
    badgeLabel.textContent = t('push.advanced.badge');
    badgeLabel.htmlFor = 'push-badge';

    const badgeInput = document.createElement('input');
    badgeInput.type = 'number';
    badgeInput.id = 'push-badge';
    badgeInput.className = 'form-input';
    badgeInput.min = '0';
    badgeInput.max = '99';
    badgeInput.placeholder = '0';

    badgeGroup.appendChild(badgeLabel);
    badgeGroup.appendChild(badgeInput);
    content.appendChild(badgeGroup);

    // Level segmented control (batch 1)
    const levelGroup = document.createElement('div');
    levelGroup.className = 'form-group';

    const levelLabel = document.createElement('label');
    levelLabel.textContent = t('push.advanced.level');

    const levelContainer = document.createElement('div');
    levelContainer.className = 'segmented-control';
    levelContainer.style.cssText = 'display: flex; border: 1px solid var(--bark-border-light); border-radius: 6px; overflow: hidden; margin: 0 -1px -1px -1px; gap: 0;';

    const levels = ['active', 'critical', 'timeSensitive', 'passive'];
    levels.forEach((level) => {
      const levelBtn = document.createElement('button');
      levelBtn.type = 'button';
      levelBtn.value = level;
      levelBtn.textContent = t(`push.advanced.levelOptions.${level}`);
      levelBtn.style.cssText = `
        flex: 1;
        padding: 8px 4px;
        border: none;
        background: var(--bark-bg-primary);
        color: var(--bark-text-secondary);
        font-size: 12px;
        cursor: pointer;
        transition: all 200ms;
        margin: 0 !important;
      `;
      if (level === 'active') {
        levelBtn.style.background = 'var(--bark-primary)';
        levelBtn.style.color = 'white';
      }

      levelBtn.addEventListener('click', () => {
        // Update all buttons
        const btns = levelContainer.querySelectorAll('button');
        btns.forEach(btn => {
          (btn as HTMLButtonElement).style.background = 'var(--bark-bg-primary)';
          (btn as HTMLButtonElement).style.color = 'var(--bark-text-secondary)';
        });
        levelBtn.style.background = 'var(--bark-primary)';
        levelBtn.style.color = 'white';
      });

      levelContainer.appendChild(levelBtn);
    });

    levelGroup.appendChild(levelLabel);
    levelGroup.appendChild(levelContainer);
    content.appendChild(levelGroup);

    // Volume slider (batch 1)
    const volumeGroup = document.createElement('div');
    volumeGroup.className = 'form-group';

    const volumeLabel = document.createElement('label');
    volumeLabel.textContent = t('push.advanced.volume');
    volumeLabel.htmlFor = 'push-volume';

    const volumeContainer = document.createElement('div');
    volumeContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const volumeInput = document.createElement('input');
    volumeInput.type = 'range';
    volumeInput.id = 'push-volume';
    volumeInput.className = 'form-range';
    volumeInput.min = '0';
    volumeInput.max = '10';
    volumeInput.value = '5';

    const volumeValue = document.createElement('span');
    volumeValue.id = 'push-volume-value';
    volumeValue.textContent = '5';
    volumeValue.style.cssText = 'min-width: 20px; text-align: center; color: var(--bark-text-secondary); font-size: 12px;';

    volumeInput.addEventListener('input', () => {
      volumeValue.textContent = volumeInput.value;
    });

    volumeContainer.appendChild(volumeInput);
    volumeContainer.appendChild(volumeValue);

    volumeGroup.appendChild(volumeLabel);
    volumeGroup.appendChild(volumeContainer);
    content.appendChild(volumeGroup);

    // Call field (batch 2)
    const callGroup = document.createElement('div');
    callGroup.className = 'form-group';

    const callLabel = document.createElement('label');
    callLabel.htmlFor = 'push-call';

    const callCheckbox = document.createElement('input');
    callCheckbox.type = 'checkbox';
    callCheckbox.id = 'push-call';
    callCheckbox.value = '1';

    const callText = document.createElement('span');
    callText.textContent = t('push.advanced.call');

    const callHelp = document.createElement('span');
    callHelp.textContent = ' - ' + t('push.advanced.callHelp');
    callHelp.style.cssText = 'font-size: 12px; color: var(--bark-text-secondary); margin-left: 4px;';

    callLabel.appendChild(callCheckbox);
    callLabel.appendChild(callText);
    callLabel.appendChild(callHelp);
    callGroup.appendChild(callLabel);
    content.appendChild(callGroup);

    // Copy field (batch 2)
    const copyGroup = document.createElement('div');
    copyGroup.className = 'form-group';

    const copyLabel = document.createElement('label');
    copyLabel.textContent = t('push.advanced.copy');
    copyLabel.htmlFor = 'push-copy';

    const copyInput = document.createElement('input');
    copyInput.type = 'text';
    copyInput.id = 'push-copy';
    copyInput.className = 'form-input';
    copyInput.placeholder = t('push.advanced.copyPlaceholder');

    copyGroup.appendChild(copyLabel);
    copyGroup.appendChild(copyInput);
    content.appendChild(copyGroup);

    // Action dropdown (batch 2)
    const actionGroup = document.createElement('div');
    actionGroup.className = 'form-group';

    const actionLabel = document.createElement('label');
    actionLabel.textContent = t('push.advanced.action');
    actionLabel.htmlFor = 'push-action';

    const actionSelect = document.createElement('select');
    actionSelect.id = 'push-action';
    actionSelect.className = 'form-select';

    const actionOptions = ['none', 'passive'];
    actionOptions.forEach(action => {
      const option = document.createElement('option');
      option.value = action;
      option.textContent = t(`push.advanced.actionOptions.${action}`);
      actionSelect.appendChild(option);
    });

    actionGroup.appendChild(actionLabel);
    actionGroup.appendChild(actionSelect);
    content.appendChild(actionGroup);

    // Image URL field (batch 2)
    const imageGroup = document.createElement('div');
    imageGroup.className = 'form-group';

    const imageLabel = document.createElement('label');
    imageLabel.textContent = t('push.advanced.image');
    imageLabel.htmlFor = 'push-image';

    const imageInput = document.createElement('input');
    imageInput.type = 'url';
    imageInput.id = 'push-image';
    imageInput.className = 'form-input';
    imageInput.placeholder = t('push.advanced.imagePlaceholder');

    imageGroup.appendChild(imageLabel);
    imageGroup.appendChild(imageInput);
    content.appendChild(imageGroup);

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

    // Save form data before sending (for persistence)
    this.saveFormData();

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

    // Generate message ID for history tracking
    const messageId = generateMessageId();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Build devices array from selected devices
    const historyDevices: PushHistoryDevice[] = selectedDevices.map(d => ({
      id: d.id,
      name: d.name,
      apiUrl: `${d.serverUrl}/${d.deviceKey}/`,
      customHeaders: d.customHeaders,
    }));

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
    const subtitleInput = this.containerElement.querySelector('#push-subtitle') as HTMLInputElement;
    const badgeInput = this.containerElement.querySelector('#push-badge') as HTMLInputElement;
    const levelContainer = this.containerElement.querySelector('.segmented-control');
    const selectedLevelBtn = levelContainer?.querySelector('button[style*="var(--bark-primary)"]') as HTMLButtonElement;
    const volumeInput = this.containerElement.querySelector('#push-volume') as HTMLInputElement;
    const callCheckbox = this.containerElement.querySelector('#push-call') as HTMLInputElement;
    const copyInput = this.containerElement.querySelector('#push-copy') as HTMLInputElement;
    const actionSelect = this.containerElement.querySelector('#push-action') as HTMLSelectElement;
    const imageInput = this.containerElement.querySelector('#push-image') as HTMLInputElement;

    if (soundSelect?.value) payload.sound = soundSelect.value;
    if (iconInput?.value) payload.icon = iconInput.value;
    if (groupInput?.value) payload.group = groupInput.value;
    if (urlInput?.value) payload.url = urlInput.value;
    if (autoCopyCheckbox?.checked) payload.autoCopy = true;
    if (archiveCheckbox?.checked) payload.isArchive = '1';

    // Batch 1: subtitle, badge, level, volume
    if (subtitleInput?.value) payload.subtitle = subtitleInput.value;
    if (badgeInput?.value) payload.badge = parseInt(badgeInput.value, 10);
    if (selectedLevelBtn?.value && selectedLevelBtn.value !== 'active') payload.level = selectedLevelBtn.value as 'critical' | 'active' | 'timeSensitive' | 'passive';
    if (volumeInput?.value && volumeInput.value !== '5') payload.volume = parseInt(volumeInput.value, 10);

    // Batch 2: call, copy, action, image
    if (callCheckbox?.checked) payload.call = callCheckbox.value;
    if (copyInput?.value) payload.copy = copyInput.value;
    if (actionSelect?.value && actionSelect.value !== 'none') payload.action = actionSelect.value;
    if (imageInput?.value) payload.image = imageInput.value;

    // Build history item
    const historyItem: PushHistoryItem = {
      id: messageId,
      status: undefined, // will be derived from responseJson
      title: titleInput.value.trim() || undefined,
      content: message,
      markdownEnabled: this.markdownEnabled,
      devices: historyDevices,
      requestTimestamp: Date.now(),
      timezone,
      isEncrypted: false,
      responseJson: [],
      options: {
        sound: payload.sound,
        icon: payload.icon,
        group: payload.group,
        url: payload.url,
        autoCopy: payload.autoCopy,
        isArchive: !!payload.isArchive,
        subtitle: payload.subtitle,
        badge: payload.badge,
        level: payload.level,
        volume: payload.volume,
        call: !!payload.call,
        copy: payload.copy,
        action: payload.action,
        image: payload.image,
      },
    };

    // Add to history immediately
    this.storage.addPushHistoryItem(historyItem);

    // Show loading state (Requirement 9.5)
    this.isSending = true;
    sendButton.textContent = t('push.sending');
    sendButton.disabled = true;

    // SVG icons for toast actions
    const recallSvg = '<svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8"></path></svg>';

    try {
      // Send notification with message ID
      const responses = await this.barkClient.sendNotification(selectedDevices, payload, messageId);

      // Update history with responses
      this.storage.updatePushHistoryItem(messageId, { responseJson: responses });

      // Build recall callback
      const recallCallback = () => this.recallMessage(messageId, { ...historyItem, responseJson: responses });

      // SVG for dismiss button
      const dismissSvg = '<svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>';

      // Show success toast with recall and dismiss buttons
      this.toast.showWithActions(
        t('push.success'),
        [
          {
            label: t('history.recall'),
            svg: recallSvg,
            callback: (toastId) => {
              recallCallback();
              if (toastId) this.toast.hide(toastId);
            },
          },
          {
            label: t('common.close'),
            svg: dismissSvg,
            callback: (toastId) => {
              if (toastId) this.toast.hide(toastId);
            },
          },
        ],
        'success',
        0 // no auto-dismiss
      );

      // Clear form and persisted data (Requirement 9.8)
      this.clearFormData();

      // Reload the cleared form data to update UI
      this.loadFormData();

    } catch (error) {
      // Update history with error response
      const errorResponses: PushHistoryResponse[] = [{
        code: -1,
        message: error instanceof Error ? error.message : t('push.failed'),
        timestamp: Date.now(),
      }];
      this.storage.updatePushHistoryItem(messageId, { responseJson: errorResponses });

      // Show error message (Requirement 9.7)
      const errorMessage = error instanceof Error ? error.message : t('push.failed');
      const translatedMessage = this.translateError(errorMessage);
      this.showError(translatedMessage);
    } finally {
      // Restore button state
      this.isSending = false;
      sendButton.textContent = t('push.sendButton');
      this.updateSendButtonState();
    }
  }

  /**
   * Recall a previously sent message
   */
  private async recallMessage(messageId: string, historyItem: PushHistoryItem): Promise<void> {
    try {
      // Recall from each device
      for (const deviceInfo of historyItem.devices) {
        // Get the original device from storage to get server URL and headers
        const devices = this.storage.getDevices();
        const device = devices.find(d => d.id === deviceInfo.id);

        if (device) {
          // Build recall payload with all original fields
          const recallPayload: NotificationPayload = {
            title: historyItem.title,
            body: historyItem.markdownEnabled ? undefined : historyItem.content,
            markdown: historyItem.markdownEnabled ? historyItem.content : undefined,
          };

          // Add all options, converting boolean to string where needed
          if (historyItem.options) {
            if (historyItem.options.sound) recallPayload.sound = historyItem.options.sound;
            if (historyItem.options.icon) recallPayload.icon = historyItem.options.icon;
            if (historyItem.options.group) recallPayload.group = historyItem.options.group;
            if (historyItem.options.url) recallPayload.url = historyItem.options.url;
            if (historyItem.options.autoCopy) recallPayload.autoCopy = historyItem.options.autoCopy;
            if (historyItem.options.isArchive) recallPayload.isArchive = '1';
            if (historyItem.options.subtitle) recallPayload.subtitle = historyItem.options.subtitle;
            if (historyItem.options.badge !== undefined) recallPayload.badge = historyItem.options.badge;
            if (historyItem.options.level) recallPayload.level = historyItem.options.level as 'active' | 'critical' | 'timeSensitive' | 'passive';
            if (historyItem.options.volume !== undefined) recallPayload.volume = historyItem.options.volume;
            if (historyItem.options.call) recallPayload.call = historyItem.options.call ? '1' : undefined;
            if (historyItem.options.copy) recallPayload.copy = historyItem.options.copy;
            if (historyItem.options.action) recallPayload.action = historyItem.options.action;
            if (historyItem.options.image) recallPayload.image = historyItem.options.image;
          }

          await this.barkClient.recallNotification(device, messageId, recallPayload);
        }
      }

      // Update history item status to recalled
      this.storage.updatePushHistoryItem(messageId, { status: 'recalled' });

      // Show success message
      this.toast.show(t('history.recallSuccess'), 'success');

    } catch (error) {
      // Show error message
      this.toast.show(t('history.recallFailed'), 'error');
    }
  }

  /**
   * Translate error message or error type to localized text
   */
  private translateError(errorMessage: string): string {
    // Check if it's a JSON array of errors (batch send failures)
    if (errorMessage.startsWith('[') && errorMessage.endsWith(']')) {
      try {
        const errors = JSON.parse(errorMessage) as Array<{ devices: string; error: string }>;
        return errors.map(e => {
          const deviceInfo = e.devices;
          const errorKey = e.error as BarkErrorType;
          const errorText = this.getErrorTranslation(errorKey);
          return t('errors.sendFailed', { device: deviceInfo, error: errorText });
        }).join('\n');
      } catch {
        // Not valid JSON, fall through to regular error handling
      }
    }

    // Check if it's a single error type
    const errorKey = errorMessage as BarkErrorType;
    return this.getErrorTranslation(errorKey);
  }

  /**
   * Get translated text for an error type
   */
  private getErrorTranslation(errorType: BarkErrorType): string {
    switch (errorType) {
      case BarkErrorType.noDevicesProvided:
        return t('errors.noDevicesProvided');
      case BarkErrorType.networkError:
        return t('errors.networkError');
      case BarkErrorType.timeout:
        return t('errors.timeout');
      case BarkErrorType.serverError:
        return t('errors.serverError');
      case BarkErrorType.unknownError:
        return t('errors.unknownError');
      default:
        return t('errors.unknownError');
    }
  }

  /**
   * Save form data to memory (for session persistence)
   */
  private saveFormData(): void {
    if (!this.containerElement) return;

    this.formData.title = (this.containerElement.querySelector('#push-title') as HTMLInputElement)?.value || '';
    this.formData.message = (this.containerElement.querySelector('#push-message') as HTMLTextAreaElement)?.value || '';
    this.formData.sound = (this.containerElement.querySelector('#push-sound') as HTMLSelectElement)?.value || '';
    this.formData.icon = (this.containerElement.querySelector('#push-icon') as HTMLInputElement)?.value || '';
    this.formData.group = (this.containerElement.querySelector('#push-group') as HTMLInputElement)?.value || '';
    this.formData.url = (this.containerElement.querySelector('#push-url') as HTMLInputElement)?.value || '';
    this.formData.autoCopy = (this.containerElement.querySelector('#push-autocopy') as HTMLInputElement)?.checked || false;
    this.formData.archive = (this.containerElement.querySelector('#push-archive') as HTMLInputElement)?.checked || false;
    this.formData.subtitle = (this.containerElement.querySelector('#push-subtitle') as HTMLInputElement)?.value || '';
    this.formData.badge = (this.containerElement.querySelector('#push-badge') as HTMLInputElement)?.value || '';
    this.formData.volume = (this.containerElement.querySelector('#push-volume') as HTMLInputElement)?.value || '5';
    this.formData.call = (this.containerElement.querySelector('#push-call') as HTMLInputElement)?.checked || false;
    this.formData.copy = (this.containerElement.querySelector('#push-copy') as HTMLInputElement)?.value || '';
    this.formData.action = (this.containerElement.querySelector('#push-action') as HTMLSelectElement)?.value || 'none';
    this.formData.image = (this.containerElement.querySelector('#push-image') as HTMLInputElement)?.value || '';

    // Handle level from segmented control
    const levelContainer = this.containerElement.querySelector('.segmented-control');
    const selectedLevelBtn = levelContainer?.querySelector('button[style*="var(--bark-primary)"]') as HTMLButtonElement;
    this.formData.level = selectedLevelBtn?.value || 'active';
  }

  /**
   * Load form data from memory into the rendered form
   */
  private loadFormData(): void {
    if (!this.containerElement) return;

    const titleInput = this.containerElement.querySelector('#push-title') as HTMLInputElement;
    const messageInput = this.containerElement.querySelector('#push-message') as HTMLTextAreaElement;
    const soundSelect = this.containerElement.querySelector('#push-sound') as HTMLSelectElement;
    const iconInput = this.containerElement.querySelector('#push-icon') as HTMLInputElement;
    const groupInput = this.containerElement.querySelector('#push-group') as HTMLInputElement;
    const urlInput = this.containerElement.querySelector('#push-url') as HTMLInputElement;
    const autoCopyCheckbox = this.containerElement.querySelector('#push-autocopy') as HTMLInputElement;
    const archiveCheckbox = this.containerElement.querySelector('#push-archive') as HTMLInputElement;
    const subtitleInput = this.containerElement.querySelector('#push-subtitle') as HTMLInputElement;
    const badgeInput = this.containerElement.querySelector('#push-badge') as HTMLInputElement;
    const volumeInput = this.containerElement.querySelector('#push-volume') as HTMLInputElement;
    const volumeValue = this.containerElement.querySelector('#push-volume-value') as HTMLElement;
    const callCheckbox = this.containerElement.querySelector('#push-call') as HTMLInputElement;
    const copyInput = this.containerElement.querySelector('#push-copy') as HTMLInputElement;
    const actionSelect = this.containerElement.querySelector('#push-action') as HTMLSelectElement;
    const imageInput = this.containerElement.querySelector('#push-image') as HTMLInputElement;

    if (titleInput) titleInput.value = this.formData.title;
    if (messageInput) messageInput.value = this.formData.message;
    if (soundSelect) soundSelect.value = this.formData.sound;
    if (iconInput) iconInput.value = this.formData.icon;
    if (groupInput) groupInput.value = this.formData.group;
    if (urlInput) urlInput.value = this.formData.url;
    if (autoCopyCheckbox) autoCopyCheckbox.checked = this.formData.autoCopy;
    if (archiveCheckbox) archiveCheckbox.checked = this.formData.archive;
    if (subtitleInput) subtitleInput.value = this.formData.subtitle;
    if (badgeInput) badgeInput.value = this.formData.badge;
    if (volumeInput) {
      volumeInput.value = this.formData.volume;
      if (volumeValue) volumeValue.textContent = this.formData.volume;
    }
    if (callCheckbox) callCheckbox.checked = this.formData.call;
    if (copyInput) copyInput.value = this.formData.copy;
    if (actionSelect) actionSelect.value = this.formData.action;
    if (imageInput) imageInput.value = this.formData.image;

    // Load level from segmented control
    const levelContainer = this.containerElement.querySelector('.segmented-control');
    if (levelContainer) {
      const buttons = levelContainer.querySelectorAll('button');
      buttons.forEach(btn => {
        const htmlBtn = btn as HTMLButtonElement;
        if (htmlBtn.value === this.formData.level) {
          htmlBtn.style.background = 'var(--bark-primary)';
          htmlBtn.style.color = 'white';
        } else {
          htmlBtn.style.background = 'var(--bark-bg-primary)';
          htmlBtn.style.color = 'var(--bark-text-secondary)';
        }
      });
    }

    // Update send button state after restoring form data
    this.updateSendButtonState();
  }

  /**
   * Clear form data after successful send
   */
  private clearFormData(): void {
    this.formData = {
      title: '',
      message: '',
      sound: '',
      icon: '',
      group: '',
      url: '',
      autoCopy: false,
      archive: false,
      subtitle: '',
      badge: '',
      level: 'active',
      volume: '5',
      call: false,
      copy: '',
      action: 'none',
      image: '',
    };
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
