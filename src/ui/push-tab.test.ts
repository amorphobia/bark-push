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

// Mock GM functions
global.GM_getValue = vi.fn((_key: string, defaultValue: any) => defaultValue);
global.GM_setValue = vi.fn();
global.GM_xmlhttpRequest = vi.fn();

describe('PushTab', () => {
  let storage: StorageManager;
  let barkClient: BarkClient;
  let pushTab: PushTab;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new StorageManager();
    barkClient = new BarkClient();
    pushTab = new PushTab(storage, barkClient);
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
          // Set markdown state
          storage.setMarkdownEnabled(markdownState);

          // Create new push tab
          const newPushTab = new PushTab(storage, barkClient);
          const container = newPushTab.render();
          const markdownCheckbox = container.querySelector('#push-markdown') as HTMLInputElement;

          const result = markdownCheckbox.checked === markdownState;
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
          storage.setAdvancedExpanded(expanded);
          const newPushTab = new PushTab(storage, barkClient);
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
          // Set advanced options state
          storage.setAdvancedExpanded(expandedState);

          // Create new push tab and verify state is restored
          const newPushTab = new PushTab(storage, barkClient);
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

  // Unit Tests
  describe('Unit Tests', () => {
    test('form rendering', () => {
      const container = pushTab.render();

      expect(container.querySelector('#push-title')).toBeTruthy();
      expect(container.querySelector('#push-message')).toBeTruthy();
      expect(container.querySelector('#push-markdown')).toBeTruthy();
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
      const container = pushTab.render();
      const tipsElement = container.querySelector('#push-tips');

      expect(tipsElement?.textContent).toContain('Add a device');
    });

    test('tips display - with devices', () => {
      const device = createTestDevice();
      storage.saveDevice(device);

      const newPushTab = new PushTab(storage, barkClient);
      const container = newPushTab.render();
      const tipsElement = container.querySelector('#push-tips');

      expect(tipsElement?.textContent).toBeTruthy();
      expect(tipsElement?.textContent).not.toContain('Add a device');
      newPushTab.destroy();
    });

    test('advanced options expand/collapse', () => {
      const container = pushTab.render();
      const toggleButton = container.querySelector('.advanced-toggle') as HTMLButtonElement;
      const advancedContent = container.querySelector('.advanced-content') as HTMLElement;

      // Initially collapsed
      expect(advancedContent.style.display).toBe('none');

      // Click to expand
      toggleButton.click();
      expect(advancedContent.style.display).toBe('block');

      // Click to collapse
      toggleButton.click();
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

      const newPushTab = new PushTab(storage, barkClient);
      const container = newPushTab.render();
      newPushTab.refresh();

      const sendButton = container.querySelector('#push-send-button') as HTMLButtonElement;
      const messageTextarea = container.querySelector('#push-message') as HTMLTextAreaElement;

      messageTextarea.value = '';
      messageTextarea.dispatchEvent(new Event('input'));

      expect(sendButton.disabled).toBe(true);
      newPushTab.destroy();
    });

    test('loading state during send', () => {
      const device = createTestDevice();
      storage.saveDevice(device);

      const newPushTab = new PushTab(storage, barkClient);
      const container = newPushTab.render();
      newPushTab.refresh();

      const sendButton = container.querySelector('#push-send-button') as HTMLButtonElement;
      const messageTextarea = container.querySelector('#push-message') as HTMLTextAreaElement;

      messageTextarea.value = 'Test message';

      // Mock slow send
      vi.mocked(GM_xmlhttpRequest).mockImplementation((details: any) => {
        setTimeout(() => details.onload({ status: 200, responseText: '{}' }), 100);
        return undefined as any;
      });

      sendButton.click();

      // Button should show loading state immediately
      expect(sendButton.textContent).toContain('Sending');
      expect(sendButton.disabled).toBe(true);

      newPushTab.destroy();
    });

    test('markdown checkbox toggles state', () => {
      const container = pushTab.render();
      const markdownCheckbox = container.querySelector('#push-markdown') as HTMLInputElement;

      const initialState = markdownCheckbox.checked;
      markdownCheckbox.click();

      expect(markdownCheckbox.checked).toBe(!initialState);
    });

    test('advanced options fields are present', () => {
      storage.setAdvancedExpanded(true);
      const newPushTab = new PushTab(storage, barkClient);
      const container = newPushTab.render();

      expect(container.querySelector('#push-sound')).toBeTruthy();
      expect(container.querySelector('#push-icon')).toBeTruthy();
      expect(container.querySelector('#push-group')).toBeTruthy();
      expect(container.querySelector('#push-url')).toBeTruthy();
      expect(container.querySelector('#push-autocopy')).toBeTruthy();
      expect(container.querySelector('#push-archive')).toBeTruthy();

      newPushTab.destroy();
    });

    test('sound dropdown has all options', () => {
      storage.setAdvancedExpanded(true);
      const newPushTab = new PushTab(storage, barkClient);
      const container = newPushTab.render();

      const soundSelect = container.querySelector('#push-sound') as HTMLSelectElement;
      const options = Array.from(soundSelect.options);

      expect(options.length).toBeGreaterThan(10);
      expect(options.some(opt => opt.value === 'alarm')).toBe(true);
      expect(options.some(opt => opt.value === 'bell')).toBe(true);

      newPushTab.destroy();
    });

    test('refresh updates device list', () => {
      const container = pushTab.render();
      
      // Initially no devices
      let tipsElement = container.querySelector('#push-tips');
      expect(tipsElement?.textContent).toContain('Add a device');

      // Add a device
      const device = createTestDevice();
      storage.saveDevice(device);

      // Refresh
      pushTab.refresh();

      // Tips should change
      tipsElement = container.querySelector('#push-tips');
      expect(tipsElement?.textContent).not.toContain('Add a device');
    });

    test('destroy stops tips rotation', () => {
      const device = createTestDevice();
      storage.saveDevice(device);

      const newPushTab = new PushTab(storage, barkClient);
      newPushTab.render();

      // Tips rotation should be active
      expect((newPushTab as any).tipsInterval).toBeTruthy();

      // Destroy should stop it
      newPushTab.destroy();
      expect((newPushTab as any).tipsInterval).toBeNull();
    });
  });
});
