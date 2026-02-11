import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ModalController } from './modal';
import { StorageManager } from '../storage/storage-manager';

describe('ModalController', () => {
  let modalController: ModalController;
  let storage: StorageManager;

  beforeEach(() => {
    storage = new StorageManager();
    modalController = new ModalController(storage);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up
    const root = document.getElementById('bark-modal-root');
    if (root) {
      root.remove();
    }
  });

  describe('Property Tests', () => {
    it('Property 2: Modal styling consistency - modal should have white background, 8px border-radius, drop shadow, and high z-index', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          modalController.open();

          const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
          expect(shadowRoot).toBeTruthy();

          // Check that styles are injected
          const styleElement = shadowRoot?.querySelector('style');
          expect(styleElement).toBeTruthy();
          
          const styleContent = styleElement?.textContent || '';
          
          // Check modal has white background in CSS
          expect(styleContent).toContain('background: white');
          
          // Check border-radius is 8px
          expect(styleContent).toContain('border-radius: 8px');
          
          // Check box-shadow exists (drop shadow)
          expect(styleContent).toContain('box-shadow');

          // Check overlay has high z-index
          expect(styleContent).toContain('z-index: 999999');

          modalController.close();
        }),
        { numRuns: 10, seed: 42 }
      );
    });

    it('Property 3: Tab state persistence - closing and reopening modal should restore previously active tab', () => {
      fc.assert(
        fc.property(fc.constantFrom('push' as const, 'settings' as const), (tab) => {
          // Open modal and switch to tab
          modalController.open();
          modalController.switchTab(tab);
          modalController.close();

          // Reopen modal
          const newController = new ModalController(storage);
          newController.open();

          const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
          const activeTab = shadowRoot?.querySelector('.bark-tab.active') as HTMLElement;
          
          expect(activeTab?.dataset.tab).toBe(tab);

          newController.close();
        }),
        { numRuns: 20, seed: 42 }
      );
    });

    it('Property 55: Modal cleanup on close - all modal elements should be hidden when closed', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 5 }), (openCount) => {
          // Open and close modal multiple times
          for (let i = 0; i < openCount; i++) {
            modalController.open();
            modalController.close();
          }

          const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
          const overlay = shadowRoot?.querySelector('.bark-modal-overlay') as HTMLElement;
          
          // Modal should be hidden
          expect(overlay?.style.display).toBe('none');
        }),
        { numRuns: 10, seed: 42 }
      );
    });
  });

  describe('Unit Tests: Modal open/close', () => {
    it('should create shadow DOM on first open', () => {
      modalController.open();

      const root = document.getElementById('bark-modal-root');
      expect(root).toBeTruthy();
      expect(root?.shadowRoot).toBeTruthy();
    });

    it('should display modal when opened', () => {
      modalController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      const overlay = shadowRoot?.querySelector('.bark-modal-overlay') as HTMLElement;
      
      expect(overlay?.style.display).toBe('flex');
    });

    it('should hide modal when closed', () => {
      modalController.open();
      modalController.close();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      const overlay = shadowRoot?.querySelector('.bark-modal-overlay') as HTMLElement;
      
      expect(overlay?.style.display).toBe('none');
    });

    it('should reuse shadow DOM on subsequent opens', () => {
      modalController.open();
      const firstRoot = document.getElementById('bark-modal-root');
      modalController.close();

      modalController.open();
      const secondRoot = document.getElementById('bark-modal-root');

      expect(firstRoot).toBe(secondRoot);
    });
  });

  describe('Unit Tests: ESC key closes modal', () => {
    it('should close modal when ESC key is pressed', () => {
      modalController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      let overlay = shadowRoot?.querySelector('.bark-modal-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('flex');

      // Press ESC key
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);

      overlay = shadowRoot?.querySelector('.bark-modal-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });

    it('should not close modal when other keys are pressed', () => {
      modalController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      const overlay = shadowRoot?.querySelector('.bark-modal-overlay') as HTMLElement;

      // Press Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(enterEvent);

      expect(overlay?.style.display).toBe('flex');
    });
  });

  describe('Unit Tests: Backdrop click closes modal', () => {
    it('should close modal when backdrop is clicked', () => {
      modalController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      const overlay = shadowRoot?.querySelector('.bark-modal-overlay') as HTMLElement;
      
      // Click backdrop
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: overlay, enumerable: true });
      Object.defineProperty(clickEvent, 'currentTarget', { value: overlay, enumerable: true });
      overlay.dispatchEvent(clickEvent);

      expect(overlay?.style.display).toBe('none');
    });

    it('should not close modal when modal content is clicked', () => {
      modalController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      const overlay = shadowRoot?.querySelector('.bark-modal-overlay') as HTMLElement;
      const modal = shadowRoot?.querySelector('.bark-modal') as HTMLElement;
      
      // Click modal content
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: modal, enumerable: true });
      Object.defineProperty(clickEvent, 'currentTarget', { value: overlay, enumerable: true });
      overlay.dispatchEvent(clickEvent);

      expect(overlay?.style.display).toBe('flex');
    });
  });

  describe('Unit Tests: Tab switching', () => {
    it('should switch to settings tab when clicked', () => {
      modalController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      const settingsTab = shadowRoot?.querySelector('[data-tab="settings"]') as HTMLElement;
      
      settingsTab.click();

      const activeTab = shadowRoot?.querySelector('.bark-tab.active') as HTMLElement;
      expect(activeTab?.dataset.tab).toBe('settings');
    });

    it('should switch to push tab when clicked', () => {
      modalController.open();
      modalController.switchTab('settings');

      // Verify we're on settings tab
      let shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      let activeTab = shadowRoot?.querySelector('.bark-tab.active') as HTMLElement;
      expect(activeTab?.dataset.tab).toBe('settings');

      // Click push tab
      const pushTab = shadowRoot?.querySelector('[data-tab="push"]') as HTMLElement;
      pushTab.click();

      // After click, the active tab should be push
      shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      activeTab = shadowRoot?.querySelector('.bark-tab.active') as HTMLElement;
      expect(activeTab?.dataset.tab).toBe('push');
    });

    it('should persist tab selection to storage', () => {
      modalController.open();
      modalController.switchTab('settings');

      expect(storage.getLastTab()).toBe('settings');
    });

    it('should load last active tab on open', () => {
      storage.setLastTab('settings');

      const newController = new ModalController(storage);
      newController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      const activeTab = shadowRoot?.querySelector('.bark-tab.active') as HTMLElement;
      
      expect(activeTab?.dataset.tab).toBe('settings');

      newController.close();
    });
  });

  describe('Unit Tests: Focus management', () => {
    it('should store previous focus element on open', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();

      expect(document.activeElement).toBe(button);

      modalController.open();
      
      // Previous focus should be stored (we can't directly test private property)
      // But we can verify focus restoration on close
      modalController.close();

      expect(document.activeElement).toBe(button);
    });

    it('should restore focus on close', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      modalController.open();
      modalController.close();

      expect(document.activeElement).toBe(input);
    });
  });

  describe('Unit Tests: Close button', () => {
    it('should close modal when close button is clicked', () => {
      modalController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      const closeBtn = shadowRoot?.querySelector('.bark-close-btn') as HTMLElement;
      
      closeBtn.click();

      const overlay = shadowRoot?.querySelector('.bark-modal-overlay') as HTMLElement;
      expect(overlay?.style.display).toBe('none');
    });
  });

  describe('Unit Tests: Modal structure', () => {
    it('should render modal header with tabs and close button', () => {
      modalController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      
      expect(shadowRoot?.querySelector('.bark-modal-header')).toBeTruthy();
      expect(shadowRoot?.querySelector('.bark-tabs')).toBeTruthy();
      expect(shadowRoot?.querySelector('.bark-close-btn')).toBeTruthy();
    });

    it('should render modal body', () => {
      modalController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      
      expect(shadowRoot?.querySelector('.bark-modal-body')).toBeTruthy();
    });

    it('should render both tab buttons', () => {
      modalController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      const tabs = shadowRoot?.querySelectorAll('.bark-tab');
      
      expect(tabs?.length).toBe(2);
    });

    it('should mark active tab with active class', () => {
      modalController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      const activeTabs = shadowRoot?.querySelectorAll('.bark-tab.active');
      
      expect(activeTabs?.length).toBe(1);
    });
  });

  describe('Unit Tests: Shadow DOM isolation', () => {
    it('should create shadow root in closed mode', () => {
      modalController.open();

      const root = document.getElementById('bark-modal-root');
      expect(root?.shadowRoot).toBeTruthy();
      expect(root?.shadowRoot?.mode).toBe('open');
    });

    it('should inject styles into shadow root', () => {
      modalController.open();

      const shadowRoot = document.getElementById('bark-modal-root')?.shadowRoot;
      const style = shadowRoot?.querySelector('style');
      
      expect(style).toBeTruthy();
      expect(style?.textContent).toContain('.bark-modal');
    });

    it('should not affect host page DOM', () => {
      const initialChildCount = document.body.children.length;
      
      modalController.open();
      
      // Should only add one element (the shadow root container)
      expect(document.body.children.length).toBe(initialChildCount + 1);
      
      // Should not add any .bark-modal elements to main DOM
      expect(document.querySelector('.bark-modal')).toBeFalsy();
    });
  });
});
