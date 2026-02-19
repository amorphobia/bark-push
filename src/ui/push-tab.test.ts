/**
 * Tests for PushTab component
 * Feature: bark-push-userscript
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { PushTab } from './push-tab';
import { StorageManager } from '../storage/storage-manager';
import { BarkClient } from '../api/bark-client';
import type { BarkDevice } from '../types';
import type { ToastManager } from './toast';

// Mock i18n before importing
vi.mock('../i18n', () => {
  const translations = {
    'push.title': 'Title',
    'push.titlePlaceholder': 'Notification title (optional)',
    'push.message': 'Message',
    'push.messagePlaceholder': 'Notification content',
    'push.markdown': 'Markdown',
    'push.markdownEnable': 'Enable Markdown',
    'push.markdownDisable': 'Disable Markdown',
    'push.selectDevice': 'Select Device',
    'push.noDevicesHint': 'Add a device in Settings to get started',
    'push.tips.markdown': '💡 Tip: Enable Markdown for rich text formatting',
    'push.tips.keyboard': '💡 Tip: Press Ctrl+Enter to send quickly',
    'push.tips.multiDevice': '💡 Tip: Select multiple devices to broadcast',
    'push.tips.advanced': '💡 Tip: Use Advanced Options for sounds, icons, and more',
    'push.tips.shortcut': '💡 Tip: Press {shortcut} to show/hide the dialog',
    'push.advancedOptionsExpand': '▼ Advanced Options',
    'push.advancedOptionsCollapse': '▲ Advanced Options',
    'push.advanced.sound': 'Sound',
    'push.advanced.icon': 'Icon URL',
    'push.advanced.iconPlaceholder': 'https://day.app/assets/images/avatar.jpg',
    'push.advanced.group': 'Group',
    'push.advanced.groupPlaceholder': 'Notification group',
    'push.advanced.url': 'URL',
    'push.advanced.urlPlaceholder': 'URL to open on tap',
    'push.advanced.autoCopyLabel': 'Auto copy to clipboard',
    'push.advanced.archiveLabel': 'Archive notification',
    'push.sounds.default': 'Default',
    'push.sounds.alarm': 'Alarm',
    'push.sounds.anticipate': 'Anticipate',
    'push.sounds.bell': 'Bell',
    'push.sounds.birdsong': 'Birdsong',
    'push.sounds.bloom': 'Bloom',
    'push.sounds.calypso': 'Calypso',
    'push.sounds.chime': 'Chime',
    'push.sounds.choo': 'Choo',
    'push.sounds.descent': 'Descent',
    'push.sounds.electronic': 'Electronic',
    'push.sounds.fanfare': 'Fanfare',
    'push.sounds.glass': 'Glass',
    'push.sounds.gotosleep': 'Go to Sleep',
    'push.sounds.healthnotification': 'Health Notification',
    'push.sounds.horn': 'Horn',
    'push.sounds.ladder': 'Ladder',
    'push.sounds.mailsent': 'Mail Sent',
    'push.sounds.minuet': 'Minuet',
    'push.sounds.multiwayinvitation': 'Multiway Invitation',
    'push.sounds.newmail': 'New Mail',
    'push.sounds.newsflash': 'Newsflash',
    'push.sounds.noir': 'Noir',
    'push.sounds.paymentsuccess': 'Payment Success',
    'push.sounds.shake': 'Shake',
    'push.sounds.sherwoodforest': 'Sherwood Forest',
    'push.sounds.silence': 'Silence',
    'push.sounds.spell': 'Spell',
    'push.sounds.suspense': 'Suspense',
    'push.sounds.telegraph': 'Telegraph',
    'push.sounds.tiptoes': 'Tiptoes',
    'push.sounds.typewriters': 'Typewriters',
    'push.sounds.update': 'Update',
    // New advanced options (batch 1)
    'push.advanced.subtitle': 'Subtitle',
    'push.advanced.subtitlePlaceholder': 'Notification subtitle',
    'push.advanced.badge': 'Badge',
    'push.advanced.level': 'Level',
    'push.advanced.levelOptions.active': 'Active',
    'push.advanced.levelOptions.critical': 'Critical',
    'push.advanced.levelOptions.timeSensitive': 'Time Sensitive',
    'push.advanced.levelOptions.passive': 'Passive',
    'push.advanced.volume': 'Volume',
    // New advanced options (batch 2)
    'push.advanced.call': 'Call',
    'push.advanced.callHelp': 'Repeat ringtone for 30 seconds',
    'push.advanced.copy': 'Copy Content',
    'push.advanced.copyPlaceholder': 'Custom content to copy',
    'push.advanced.action': 'Action',
    'push.advanced.actionOptions.none': 'None',
    'push.advanced.actionOptions.passive': 'Passive',
    'push.advanced.image': 'Image URL',
    'push.advanced.imagePlaceholder': 'https://example.com/image.jpg',
    // Common
    'push.sendButton': 'Send Notification',
    'push.sending': 'Sending...',
    'errors.noDeviceSelected': 'Please select at least one device',
    'errors.messageEmpty': 'Message cannot be empty',
  };
  
  return {
    t: (key: string) => translations[key as keyof typeof translations] || key,
    i18n: {
      init: vi.fn(),
      t: (key: string) => translations[key as keyof typeof translations] || key,
    },
  };
});

// Mock GM functions
global.GM_getValue = vi.fn((_key: string, defaultValue: any) => defaultValue);
global.GM_setValue = vi.fn();
global.GM_xmlhttpRequest = vi.fn();

// Mock window.alert
global.alert = vi.fn();

describe('PushTab', () => {
  let storage: StorageManager;
  let barkClient: BarkClient;
  let mockToast: ToastManager;
  let pushTab: PushTab;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new StorageManager();
    barkClient = new BarkClient();
    mockToast = { show: vi.fn(), hide: vi.fn(), clear: vi.fn() } as unknown as ToastManager;
    pushTab = new PushTab(storage, barkClient, mockToast);
  });

  afterEach(() => {
    pushTab.destroy();
  });

  // Helper to create test device
  function createTestDevice(overrides: Partial<BarkDevice> = {}): BarkDevice {
    return {
      id: crypto.randomUUID(),
      name: 'Test Device',
      serverUrl: 'https://api.day.app',
      deviceKey: 'a'.repeat(22),
      isDefault: false,
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  // Property 5: Title field single-line constraint
  // Feature: bark-push-userscript, Property 5: Title field single-line constraint
  test('Property 5: Title field single-line constraint', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (text) => {
          const container = pushTab.render();
          const titleInput = container.querySelector('#push-title') as HTMLInputElement;

          // Simulate typing text with newlines
          titleInput.value = text;

          // Simulate Enter key press
          const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
          const preventDefaultSpy = vi.spyOn(enterEvent, 'preventDefault');
          titleInput.dispatchEvent(enterEvent);

          // Enter should be prevented (single-line constraint)
          return preventDefaultSpy.mock.calls.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 6: Message field multi-line support
  // Feature: bark-push-userscript, Property 6: Message field multi-line support
  test('Property 6: Message field multi-line support', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (text) => {
          const container = pushTab.render();
          const messageTextarea = container.querySelector('#push-message') as HTMLTextAreaElement;

          // Set value with newlines
          const textWithNewlines = text + '\n' + text;
          messageTextarea.value = textWithNewlines;

          // Textarea should preserve newlines
          return messageTextarea.value.includes('\n');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 9: Markdown toggle persistence
  // Feature: bark-push-userscript, Property 9: Markdown toggle persistence
  test('Property 9: Markdown toggle persistence', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (markdownState) => {
          // Clear previous state
          vi.clearAllMocks();
          
          // Set markdown state
          const testStorage = new StorageManager();
          testStorage.setMarkdownEnabled(markdownState);

          // Mock GM_getValue to return the saved state
          vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
            if (key === 'bark_markdown_enabled') {
              return markdownState;
            }
            return defaultValue;
          });

          // Create new push tab
          const newPushTab = new PushTab(testStorage, barkClient, mockToast);
          const container = newPushTab.render();
          const markdownButton = container.querySelector('#push-markdown-toggle') as HTMLButtonElement;

          const result = markdownButton.classList.contains('active') === markdownState;
          newPushTab.destroy();
          return result;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 18: Advanced options visibility
  // Feature: bark-push-userscript, Property 18: Advanced options visibility
  test('Property 18: Advanced options visibility', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (expanded) => {
          vi.clearAllMocks();
          
          const testStorage = new StorageManager();
          testStorage.setAdvancedExpanded(expanded);
          
          vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
            if (key === 'bark_advanced_expanded') {
              return expanded;
            }
            return defaultValue;
          });
          
          const newPushTab = new PushTab(testStorage, barkClient, mockToast);
          const container = newPushTab.render();
          const advancedContent = container.querySelector('.advanced-content') as HTMLElement;

          const result = advancedContent.style.display === (expanded ? 'block' : 'none');
          newPushTab.destroy();
          return result;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 19: Advanced options state persistence
  // Feature: bark-push-userscript, Property 19: Advanced options state persistence
  test('Property 19: Advanced options state persistence', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (expandedState) => {
          vi.clearAllMocks();
          
          // Set advanced options state
          const testStorage = new StorageManager();
          testStorage.setAdvancedExpanded(expandedState);

          vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
            if (key === 'bark_advanced_expanded') {
              return expandedState;
            }
            return defaultValue;
          });

          // Create new push tab and verify state is restored
          const newPushTab = new PushTab(testStorage, barkClient, mockToast);
          const container = newPushTab.render();
          const advancedContent = container.querySelector('.advanced-content') as HTMLElement;

          const result = advancedContent.style.display === (expandedState ? 'block' : 'none');
          newPushTab.destroy();
          return result;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 16: Tips rotation timing
  // Feature: bark-push-userscript, Property 16: Tips rotation timing
  test('Property 16: Tips rotation timing', async () => {
    const device = createTestDevice();
    
    const testStorage = new StorageManager();
    testStorage.saveDevice(device);
    
    vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
      if (key === 'bark_devices') {
        return [device];
      }
      return defaultValue;
    });

    const newPushTab = new PushTab(testStorage, barkClient, mockToast);
    const container = newPushTab.render();
    const tipsElement = container.querySelector('#push-tips') as HTMLElement;

    const initialTip = tipsElement.textContent;

    // Wait for 5.1 seconds (slightly more than rotation interval)
    await new Promise(resolve => setTimeout(resolve, 5100));

    const newTip = tipsElement.textContent;

    // Tip should have changed
    expect(newTip).not.toBe(initialTip);
    
    newPushTab.destroy();
  }, 10000); // 10 second timeout

  // Property 17: Tips cycle continuously
  // Feature: bark-push-userscript, Property 17: Tips cycle continuously
  test('Property 17: Tips cycle continuously', async () => {
    const device = createTestDevice();
    
    const testStorage = new StorageManager();
    testStorage.saveDevice(device);
    
    vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
      if (key === 'bark_devices') {
        return [device];
      }
      return defaultValue;
    });

    const newPushTab = new PushTab(testStorage, barkClient, mockToast);
    const container = newPushTab.render();
    const tipsElement = container.querySelector('#push-tips') as HTMLElement;

    const tips: string[] = [];
    const firstTip = tipsElement.textContent || '';
    tips.push(firstTip);
    
    // Wait for tips to cycle (there are 5 tips, so after 5 rotations we should see the first tip again)
    // Collect 6 tips total to ensure we see the cycle
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 5100));
      tips.push(tipsElement.textContent || '');
    }

    // The 6th tip (index 5) should be the same as the first tip (index 0)
    expect(tips[5]).toBe(firstTip);
    
    newPushTab.destroy();
  }, 30000); // 30 second timeout

  // Property 21: Send button disabled when no devices
  // Feature: bark-push-userscript, Property 21: Send button disabled when no devices
  test('Property 21: Send button disabled when no devices', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          vi.clearAllMocks();
          vi.mocked(GM_getValue).mockImplementation((_key: string, defaultValue: any) => defaultValue);
          
          const testStorage = new StorageManager();
          const newPushTab = new PushTab(testStorage, barkClient, mockToast);
          const container = newPushTab.render();
          const sendButton = container.querySelector('#push-send-button') as HTMLButtonElement;

          const result = sendButton.disabled === true;
          newPushTab.destroy();
          return result;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 22: Send button disabled when none selected
  // Feature: bark-push-userscript, Property 22: Send button disabled when none selected
  test('Property 22: Send button disabled when none selected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (deviceCount) => {
          vi.clearAllMocks();
          
          const devices = Array.from({ length: deviceCount }, () => createTestDevice());
          
          vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
            if (key === 'bark_devices') {
              return devices;
            }
            if (key === 'bark_selected_device_ids') {
              return []; // No devices selected
            }
            return defaultValue;
          });
          
          const testStorage = new StorageManager();
          devices.forEach(d => testStorage.saveDevice(d));
          
          const newPushTab = new PushTab(testStorage, barkClient, mockToast);
          const container = newPushTab.render();
          const sendButton = container.querySelector('#push-send-button') as HTMLButtonElement;

          const result = sendButton.disabled === true;
          newPushTab.destroy();
          return result;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 23: Send button disabled when message empty
  // Feature: bark-push-userscript, Property 23: Send button disabled when message empty
  test('Property 23: Send button disabled when message empty', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          vi.clearAllMocks();
          
          const device = createTestDevice();
          
          vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
            if (key === 'bark_devices') {
              return [device];
            }
            if (key === 'bark_selected_device_ids') {
              return [device.id];
            }
            return defaultValue;
          });
          
          const testStorage = new StorageManager();
          testStorage.saveDevice(device);
          
          const newPushTab = new PushTab(testStorage, barkClient, mockToast);
          const container = newPushTab.render();
          const sendButton = container.querySelector('#push-send-button') as HTMLButtonElement;
          const messageTextarea = container.querySelector('#push-message') as HTMLTextAreaElement;

          // Set message to empty
          messageTextarea.value = '';
          messageTextarea.dispatchEvent(new Event('input'));

          const result = sendButton.disabled === true;
          newPushTab.destroy();
          return result;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 24: Form reset after successful send
  // Feature: bark-push-userscript, Property 24: Form reset after successful send
  test('Property 24: Form reset after successful send', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (title, message) => {
          vi.clearAllMocks();
          
          const device = createTestDevice();
          
          vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
            if (key === 'bark_devices') {
              return [device];
            }
            if (key === 'bark_selected_device_ids') {
              return [device.id];
            }
            return defaultValue;
          });
          
          const testStorage = new StorageManager();
          testStorage.saveDevice(device);
          
          const newPushTab = new PushTab(testStorage, barkClient, mockToast);
          const container = newPushTab.render();
          
          const titleInput = container.querySelector('#push-title') as HTMLInputElement;
          const messageTextarea = container.querySelector('#push-message') as HTMLTextAreaElement;

          // Set form values
          titleInput.value = title;
          messageTextarea.value = message;

          // Mock successful API response
          vi.mocked(GM_xmlhttpRequest).mockImplementation((details: any) => {
            setTimeout(() => details.onload({ status: 200, responseText: '{}' }), 0);
            return undefined as any;
          });

          // Send notification
          await (newPushTab as any).handleSend();

          // Wait for async operations
          await new Promise(resolve => setTimeout(resolve, 100));

          // Title and message should be cleared
          const titleCleared = titleInput.value === '';
          const messageCleared = messageTextarea.value === '';

          newPushTab.destroy();
          return titleCleared && messageCleared;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Unit Tests
  describe('Unit Tests', () => {
    test('form rendering', () => {
      const container = pushTab.render();

      expect(container.querySelector('#push-title')).toBeTruthy();
      expect(container.querySelector('#push-message')).toBeTruthy();
      expect(container.querySelector('#push-markdown-toggle')).toBeTruthy();
      expect(container.querySelector('.device-selector')).toBeTruthy();
      expect(container.querySelector('#push-send-button')).toBeTruthy();
    });

    test('Ctrl+Enter sends notification', async () => {
      const device = createTestDevice();
      storage.saveDevice(device);
      
      const container = pushTab.render();
      pushTab.refresh();

      const messageTextarea = container.querySelector('#push-message') as HTMLTextAreaElement;
      messageTextarea.value = 'Test message';

      // Mock successful send
      vi.mocked(GM_xmlhttpRequest).mockImplementation((details: any) => {
        setTimeout(() => details.onload({ status: 200, responseText: '{}' }), 0);
        return undefined as any;
      });

      const ctrlEnterEvent = new KeyboardEvent('keydown', { 
        key: 'Enter', 
        ctrlKey: true 
      });
      
      const preventDefaultSpy = vi.spyOn(ctrlEnterEvent, 'preventDefault');
      messageTextarea.dispatchEvent(ctrlEnterEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('tips display - no devices', () => {
      // Clear all mocks and ensure no devices
      vi.clearAllMocks();
      vi.mocked(GM_getValue).mockImplementation((_key: string, defaultValue: any) => defaultValue);
      
      const testStorage = new StorageManager();
      const newPushTab = new PushTab(testStorage, barkClient, mockToast);
      const container = newPushTab.render();
      const tipsElement = container.querySelector('#push-tips');

      expect(tipsElement?.textContent).toContain('Add a device');
      newPushTab.destroy();
    });

    test('tips display - with devices', () => {
      const device = createTestDevice();
      
      // Create new storage and save device
      const testStorage = new StorageManager();
      testStorage.saveDevice(device);
      
      // Mock GM_getValue to return the device
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        return defaultValue;
      });

      const newPushTab = new PushTab(testStorage, barkClient, mockToast);
      const container = newPushTab.render();
      const tipsElement = container.querySelector('#push-tips');

      expect(tipsElement?.textContent).toBeTruthy();
      // Should show a tip, not the "add device" message
      expect(tipsElement?.textContent).toContain('💡 Tip');
      newPushTab.destroy();
    });

    test('advanced options expand/collapse', async () => {
      const container = pushTab.render();
      const toggleButton = container.querySelector('.advanced-toggle') as HTMLButtonElement;
      const advancedContent = container.querySelector('.advanced-content') as HTMLElement;

      // Initially collapsed
      expect(advancedContent.style.display).toBe('none');
      expect(advancedContent.style.maxHeight).toBe('0');
      expect(advancedContent.style.opacity).toBe('0');

      // Click to expand
      toggleButton.click();
      expect(advancedContent.style.display).toBe('block');
      expect(advancedContent.style.opacity).toBe('1');

      // Click to collapse
      toggleButton.click();
      expect(advancedContent.style.maxHeight).toBe('0');
      expect(advancedContent.style.opacity).toBe('0');
      
      // Wait for animation to complete (300ms)
      await new Promise(resolve => setTimeout(resolve, 350));
      expect(advancedContent.style.display).toBe('none');
    });

    test('send button disabled when no devices', () => {
      const container = pushTab.render();
      const sendButton = container.querySelector('#push-send-button') as HTMLButtonElement;

      expect(sendButton.disabled).toBe(true);
    });

    test('send button disabled when message empty', () => {
      const device = createTestDevice();
      storage.saveDevice(device);

      const newPushTab = new PushTab(storage, barkClient, mockToast);
      const container = newPushTab.render();
      newPushTab.refresh();

      const sendButton = container.querySelector('#push-send-button') as HTMLButtonElement;
      const messageTextarea = container.querySelector('#push-message') as HTMLTextAreaElement;

      messageTextarea.value = '';
      messageTextarea.dispatchEvent(new Event('input'));

      expect(sendButton.disabled).toBe(true);
      newPushTab.destroy();
    });

    test('loading state during send', async () => {
      const device = createTestDevice();
      
      const testStorage = new StorageManager();
      testStorage.saveDevice(device);
      
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        if (key === 'bark_selected_device_ids') {
          return [device.id];
        }
        return defaultValue;
      });

      const newPushTab = new PushTab(testStorage, barkClient, mockToast);
      const container = newPushTab.render();

      const sendButton = container.querySelector('#push-send-button') as HTMLButtonElement;
      const messageTextarea = container.querySelector('#push-message') as HTMLTextAreaElement;

      messageTextarea.value = 'Test message';

      // Select the device
      (newPushTab as any).deviceSelector.selectDevice(device.id);

      // Mock the API call
      let resolveRequest: any;
      vi.mocked(GM_xmlhttpRequest).mockImplementation((details: any) => {
        resolveRequest = () => details.onload({ status: 200, responseText: '{}' });
        return undefined as any;
      });

      // Trigger send
      const sendPromise = (newPushTab as any).handleSend();

      // Check loading state immediately (synchronously)
      await Promise.resolve(); // Let microtasks run
      expect(sendButton.textContent).toBe('Sending...');
      expect(sendButton.disabled).toBe(true);

      // Resolve the request
      if (resolveRequest) resolveRequest();
      await sendPromise;

      newPushTab.destroy();
    });

    // DESIGN CHANGE: Markdown icon button tests (Requirements 5.1, 5.3, 5.4, 5.5, 5.6, 5.7)
    test('markdown icon button renders in both states', () => {
      // Test disabled state
      vi.clearAllMocks();
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_markdown_enabled') {
          return false;
        }
        return defaultValue;
      });
      
      const testStorageDisabled = new StorageManager();
      testStorageDisabled.setMarkdownEnabled(false);
      const pushTabDisabled = new PushTab(testStorageDisabled, barkClient, mockToast);
      const containerDisabled = pushTabDisabled.render();
      const buttonDisabled = containerDisabled.querySelector('#push-markdown-toggle') as HTMLButtonElement;

      expect(buttonDisabled).toBeTruthy();
      expect(buttonDisabled.classList.contains('active')).toBe(false);
      expect(buttonDisabled.title).toBe('Enable Markdown');
      expect(buttonDisabled.getAttribute('aria-label')).toBe('Enable Markdown');

      pushTabDisabled.destroy();

      // Test enabled state
      vi.clearAllMocks();
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_markdown_enabled') {
          return true;
        }
        return defaultValue;
      });
      
      const testStorageEnabled = new StorageManager();
      testStorageEnabled.setMarkdownEnabled(true);
      const pushTabEnabled = new PushTab(testStorageEnabled, barkClient, mockToast);
      const containerEnabled = pushTabEnabled.render();
      const buttonEnabled = containerEnabled.querySelector('#push-markdown-toggle') as HTMLButtonElement;

      expect(buttonEnabled).toBeTruthy();
      expect(buttonEnabled.classList.contains('active')).toBe(true);
      expect(buttonEnabled.title).toBe('Disable Markdown');
      expect(buttonEnabled.getAttribute('aria-label')).toBe('Disable Markdown');

      pushTabEnabled.destroy();
    });

    test('markdown icon button click toggles state', () => {
      vi.clearAllMocks();
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_markdown_enabled') {
          return false;
        }
        return defaultValue;
      });
      
      const testStorage = new StorageManager();
      testStorage.setMarkdownEnabled(false);
      const testPushTab = new PushTab(testStorage, barkClient, mockToast);
      const container = testPushTab.render();
      const markdownButton = container.querySelector('#push-markdown-toggle') as HTMLButtonElement;

      expect(markdownButton.classList.contains('active')).toBe(false);
      
      // Click to enable
      markdownButton.click();
      expect(markdownButton.classList.contains('active')).toBe(true);
      expect(markdownButton.title).toBe('Disable Markdown');
      
      // Click to disable
      markdownButton.click();
      expect(markdownButton.classList.contains('active')).toBe(false);
      expect(markdownButton.title).toBe('Enable Markdown');
      
      testPushTab.destroy();
    });

    test('markdown icon button updates tooltip on state change', () => {
      vi.clearAllMocks();
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_markdown_enabled') {
          return false;
        }
        return defaultValue;
      });
      
      const testStorage = new StorageManager();
      testStorage.setMarkdownEnabled(false);
      const testPushTab = new PushTab(testStorage, barkClient, mockToast);
      const container = testPushTab.render();
      const markdownButton = container.querySelector('#push-markdown-toggle') as HTMLButtonElement;

      // Initial state - disabled
      expect(markdownButton.title).toBe('Enable Markdown');
      expect(markdownButton.getAttribute('aria-label')).toBe('Enable Markdown');

      // Toggle to enabled
      markdownButton.click();
      expect(markdownButton.title).toBe('Disable Markdown');
      expect(markdownButton.getAttribute('aria-label')).toBe('Disable Markdown');

      // Toggle back to disabled
      markdownButton.click();
      expect(markdownButton.title).toBe('Enable Markdown');
      expect(markdownButton.getAttribute('aria-label')).toBe('Enable Markdown');
      
      testPushTab.destroy();
    });

    test('markdown icon button positioned at top-right of textarea', () => {
      const container = pushTab.render();
      const messageWrapper = container.querySelector('.message-wrapper') as HTMLElement;
      const markdownButton = container.querySelector('#push-markdown-toggle') as HTMLButtonElement;

      expect(messageWrapper).toBeTruthy();
      expect(messageWrapper.style.position).toBe('relative');
      expect(markdownButton.parentElement).toBe(messageWrapper);
    });

    test('markdown icon button has SVG with Markdown logo', () => {
      const container = pushTab.render();
      const markdownButton = container.querySelector('#push-markdown-toggle') as HTMLButtonElement;
      const svg = markdownButton.querySelector('svg');
      const rect = svg?.querySelector('rect');
      const path = svg?.querySelector('path');

      expect(svg).toBeTruthy();
      expect(rect).toBeTruthy();
      expect(path).toBeTruthy();
      // Verify it's the official Markdown logo by checking the path data
      expect(path?.getAttribute('d')).toContain('M30 98V30h20l20 25');
    });

    test('markdown state persists after toggle', () => {
      vi.clearAllMocks();
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_markdown_enabled') {
          return false;
        }
        return defaultValue;
      });
      
      const testStorage = new StorageManager();
      testStorage.setMarkdownEnabled(false);
      const testPushTab = new PushTab(testStorage, barkClient, mockToast);
      const container = testPushTab.render();
      const markdownButton = container.querySelector('#push-markdown-toggle') as HTMLButtonElement;

      // Toggle markdown on
      markdownButton.click();
      
      // Verify storage was updated
      expect(vi.mocked(GM_setValue)).toHaveBeenCalledWith('bark_markdown_enabled', true);

      // Toggle markdown off
      markdownButton.click();
      
      // Verify storage was updated again
      expect(vi.mocked(GM_setValue)).toHaveBeenCalledWith('bark_markdown_enabled', false);
      
      testPushTab.destroy();
    });

    test('advanced options fields are present', () => {
      storage.setAdvancedExpanded(true);
      const newPushTab = new PushTab(storage, barkClient, mockToast);
      const container = newPushTab.render();

      expect(container.querySelector('#push-sound')).toBeTruthy();
      expect(container.querySelector('#push-icon')).toBeTruthy();
      expect(container.querySelector('#push-group')).toBeTruthy();
      expect(container.querySelector('#push-url')).toBeTruthy();
      expect(container.querySelector('#push-autocopy')).toBeTruthy();
      expect(container.querySelector('#push-archive')).toBeTruthy();

      newPushTab.destroy();
    });

    test('new advanced options batch 1 fields are present', () => {
      storage.setAdvancedExpanded(true);
      const newPushTab = new PushTab(storage, barkClient, mockToast);
      const container = newPushTab.render();

      // Batch 1: subtitle, badge, level, volume
      expect(container.querySelector('#push-subtitle')).toBeTruthy();
      expect(container.querySelector('#push-badge')).toBeTruthy();
      expect(container.querySelector('.segmented-control')).toBeTruthy();
      expect(container.querySelector('#push-volume')).toBeTruthy();
      expect(container.querySelector('#push-volume-value')).toBeTruthy();

      newPushTab.destroy();
    });

    test('new advanced options batch 2 fields are present', () => {
      storage.setAdvancedExpanded(true);
      const newPushTab = new PushTab(storage, barkClient, mockToast);
      const container = newPushTab.render();

      // Batch 2: call, copy, action, image
      expect(container.querySelector('#push-call')).toBeTruthy();
      expect(container.querySelector('#push-copy')).toBeTruthy();
      expect(container.querySelector('#push-action')).toBeTruthy();
      expect(container.querySelector('#push-image')).toBeTruthy();

      newPushTab.destroy();
    });

    test('level segmented control has all options', () => {
      storage.setAdvancedExpanded(true);
      const newPushTab = new PushTab(storage, barkClient, mockToast);
      const container = newPushTab.render();

      const segmentedControl = container.querySelector('.segmented-control');
      const buttons = segmentedControl?.querySelectorAll('button');

      expect(buttons).toBeTruthy();
      expect(buttons?.length).toBe(4);

      const buttonValues = Array.from(buttons || []).map(btn => btn.getAttribute('value'));
      expect(buttonValues).toContain('active');
      expect(buttonValues).toContain('critical');
      expect(buttonValues).toContain('timeSensitive');
      expect(buttonValues).toContain('passive');

      newPushTab.destroy();
    });

    test('level segmented control click changes selection', () => {
      storage.setAdvancedExpanded(true);
      const newPushTab = new PushTab(storage, barkClient, mockToast);
      const container = newPushTab.render();

      const segmentedControl = container.querySelector('.segmented-control');
      const buttons = segmentedControl?.querySelectorAll('button');

      // Click on 'critical' button
      const criticalBtn = Array.from(buttons || []).find(btn => btn.getAttribute('value') === 'critical');
      criticalBtn?.click();

      // Verify the critical button is now selected (has primary background)
      const criticalStyle = criticalBtn?.getAttribute('style');
      expect(criticalStyle).toContain('var(--bark-primary)');

      newPushTab.destroy();
    });

    test('action dropdown has all options', () => {
      storage.setAdvancedExpanded(true);
      const newPushTab = new PushTab(storage, barkClient, mockToast);
      const container = newPushTab.render();

      const actionSelect = container.querySelector('#push-action') as HTMLSelectElement;
      const options = Array.from(actionSelect.options);

      expect(options.some(opt => opt.value === 'none')).toBe(true);
      expect(options.some(opt => opt.value === 'passive')).toBe(true);

      newPushTab.destroy();
    });

    test('volume slider has correct range', () => {
      storage.setAdvancedExpanded(true);
      const newPushTab = new PushTab(storage, barkClient, mockToast);
      const container = newPushTab.render();

      const volumeInput = container.querySelector('#push-volume') as HTMLInputElement;

      expect(volumeInput.min).toBe('0');
      expect(volumeInput.max).toBe('10');
      expect(volumeInput.value).toBe('5');

      newPushTab.destroy();
    });

    test('volume slider updates value display', () => {
      storage.setAdvancedExpanded(true);
      const newPushTab = new PushTab(storage, barkClient, mockToast);
      const container = newPushTab.render();

      const volumeInput = container.querySelector('#push-volume') as HTMLInputElement;
      const volumeValue = container.querySelector('#push-volume-value') as HTMLElement;

      expect(volumeValue.textContent).toBe('5');

      // Change slider value
      volumeInput.value = '8';
      volumeInput.dispatchEvent(new Event('input'));

      expect(volumeValue.textContent).toBe('8');

      newPushTab.destroy();
    });

    test('sound dropdown has all options', () => {
      storage.setAdvancedExpanded(true);
      const newPushTab = new PushTab(storage, barkClient, mockToast);
      const container = newPushTab.render();

      const soundSelect = container.querySelector('#push-sound') as HTMLSelectElement;
      const options = Array.from(soundSelect.options);

      expect(options.length).toBeGreaterThan(10);
      expect(options.some(opt => opt.value === 'alarm')).toBe(true);
      expect(options.some(opt => opt.value === 'bell')).toBe(true);

      newPushTab.destroy();
    });

    test('form data persists in memory during session', () => {
      storage.setAdvancedExpanded(true);
      const pushTab = new PushTab(storage, barkClient, mockToast);
      const container = pushTab.render();

      // Fill in form data
      const titleInput = container.querySelector('#push-title') as HTMLInputElement;
      const messageInput = container.querySelector('#push-message') as HTMLTextAreaElement;
      const subtitleInput = container.querySelector('#push-subtitle') as HTMLInputElement;

      titleInput.value = 'Test Title';
      messageInput.value = 'Test Message';
      subtitleInput.value = 'Test Subtitle';

      // Trigger input event to save
      titleInput.dispatchEvent(new Event('input'));
      messageInput.dispatchEvent(new Event('input'));
      subtitleInput.dispatchEvent(new Event('input'));

      // Re-render (simulating tab switch)
      pushTab.destroy();
      const newContainer = pushTab.render();

      // Check data persisted
      const newTitleInput = newContainer.querySelector('#push-title') as HTMLInputElement;
      const newMessageInput = newContainer.querySelector('#push-message') as HTMLTextAreaElement;
      const newSubtitleInput = newContainer.querySelector('#push-subtitle') as HTMLInputElement;

      expect(newTitleInput.value).toBe('Test Title');
      expect(newMessageInput.value).toBe('Test Message');
      expect(newSubtitleInput.value).toBe('Test Subtitle');

      pushTab.destroy();
    });

    test('send button enabled after re-render with persisted message and default device', () => {
      // Add a default device
      const device = {
        id: 'test-device-1',
        name: 'Test Device',
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-12345678901',
        isDefault: true,
        createdAt: new Date().toISOString(),
      };
      storage.saveDevice(device);

      // Mock GM_getValue to return the device
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        if (key === 'bark_selected_device_ids') {
          return [device.id];
        }
        return defaultValue;
      });

      const pushTab = new PushTab(storage, barkClient, mockToast);
      const container = pushTab.render();

      // Fill in message
      const messageInput = container.querySelector('#push-message') as HTMLTextAreaElement;
      messageInput.value = 'Test message';

      // Trigger input event to save
      messageInput.dispatchEvent(new Event('input'));

      // Re-render (simulating dismiss and reopen modal)
      pushTab.destroy();
      const newContainer = pushTab.render();

      // Send button should be enabled now that message is persisted
      const sendButton = newContainer.querySelector('#push-send-button') as HTMLButtonElement;
      expect(sendButton.disabled).toBe(false);

      pushTab.destroy();
    });

    test('form data clears after successful send', async () => {
      storage.setAdvancedExpanded(true);

      // Add a device to enable send button
      const device = {
        id: 'test-device-1',
        name: 'Test Device',
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-12345678901',
        isDefault: true,
        createdAt: new Date().toISOString(),
      };
      storage.saveDevice(device);

      // Mock GM_getValue to return the device
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        if (key === 'bark_selected_device_ids') {
          return [device.id];
        }
        return defaultValue;
      });

      const pushTab = new PushTab(storage, barkClient, mockToast);
      const container = pushTab.render();

      // Fill in form data
      const titleInput = container.querySelector('#push-title') as HTMLInputElement;
      const messageInput = container.querySelector('#push-message') as HTMLTextAreaElement;

      titleInput.value = 'Test Title';
      messageInput.value = 'Test Message';

      // Trigger input event to save
      titleInput.dispatchEvent(new Event('input'));
      messageInput.dispatchEvent(new Event('input'));

      // Mock successful send - must use callback-based onload like real implementation
      vi.mocked(GM_xmlhttpRequest).mockImplementation((details: any) => {
        setTimeout(() => details.onload({ status: 200, responseText: '{}' }), 0);
        return undefined as any;
      });

      // Click send button
      const sendButton = container.querySelector('#push-send-button') as HTMLButtonElement;
      sendButton.click();

      // Wait for async operation to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check form data is cleared in memory
      // Note: We can't directly check the internal formData, but we verify by re-rendering
      const newContainer = pushTab.render();

      // Check data cleared
      const newTitleInput = newContainer.querySelector('#push-title') as HTMLInputElement;
      const newMessageInput = newContainer.querySelector('#push-message') as HTMLTextAreaElement;

      expect(newTitleInput.value).toBe('');
      expect(newMessageInput.value).toBe('');

      pushTab.destroy();
    });

    test('form data persists across advanced options expand/collapse', () => {
      storage.setAdvancedExpanded(false); // Start collapsed
      const pushTab = new PushTab(storage, barkClient, mockToast);
      const container = pushTab.render();

      // Fill in advanced options
      const subtitleInput = container.querySelector('#push-subtitle') as HTMLInputElement;
      subtitleInput.value = 'Test Subtitle';
      subtitleInput.dispatchEvent(new Event('input'));

      // Expand advanced options
      const toggleButton = container.querySelector('.advanced-toggle') as HTMLButtonElement;
      toggleButton.click();

      // Check data still there
      const newSubtitleInput = container.querySelector('#push-subtitle') as HTMLInputElement;
      expect(newSubtitleInput.value).toBe('Test Subtitle');

      pushTab.destroy();
    });

    test('refresh updates device list', () => {
      // Clear all mocks to ensure clean state
      vi.clearAllMocks();
      
      // Reset GM_getValue to return empty defaults
      vi.mocked(GM_getValue).mockImplementation((_key: string, defaultValue: any) => defaultValue);
      
      // Create fresh instance with no devices
      const freshStorage = new StorageManager();
      const freshPushTab = new PushTab(freshStorage, barkClient, mockToast);
      const container = freshPushTab.render();
      
      // Initially no devices
      let tipsElement = container.querySelector('#push-tips');
      expect(tipsElement?.textContent).toContain('Add a device in Settings');

      // Add a device
      const device = createTestDevice();
      
      // Mock GM_getValue to return the device after it's added
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        return defaultValue;
      });
      
      freshStorage.saveDevice(device);

      // Refresh
      freshPushTab.refresh();

      // Tips should change to show tips
      tipsElement = container.querySelector('#push-tips');
      expect(tipsElement?.textContent).toContain('💡 Tip');
      
      freshPushTab.destroy();
    });

    test('destroy stops tips rotation', () => {
      const device = createTestDevice();
      
      const testStorage = new StorageManager();
      testStorage.saveDevice(device);
      
      vi.mocked(GM_getValue).mockImplementation((key: string, defaultValue: any) => {
        if (key === 'bark_devices') {
          return [device];
        }
        return defaultValue;
      });

      const newPushTab = new PushTab(testStorage, barkClient, mockToast);
      newPushTab.render();

      // Tips rotation should be active after render (devices exist)
      expect((newPushTab as any).tipsInterval).toBeTruthy();

      // Destroy should stop it
      newPushTab.destroy();
      expect((newPushTab as any).tipsInterval).toBeNull();
    });
  });
});

