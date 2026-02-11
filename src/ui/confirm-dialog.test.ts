/**
 * Unit tests for ConfirmDialog
 * Feature: bark-push-userscript
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ConfirmDialog } from './confirm-dialog';
import { i18n } from '../i18n';

describe('ConfirmDialog', () => {
  beforeEach(async () => {
    document.body.innerHTML = '';
    await i18n.init();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Unit Tests', () => {
    test('show creates and displays dialog', async () => {
      const promise = ConfirmDialog.show('Test message', 'Test title');
      
      // Wait for next tick to allow DOM updates
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Check overlay exists
      const overlay = document.querySelector('div');
      expect(overlay).toBeTruthy();
      expect(overlay?.textContent).toContain('Test message');
      expect(overlay?.textContent).toContain('Test title');
      
      // Cleanup by pressing ESC
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);
      
      await promise;
    });

    test('resolves to true when confirm button is clicked', async () => {
      const promise = ConfirmDialog.show('Test message');
      
      // Wait for DOM
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const buttons = document.querySelectorAll('button');
      const confirmButton = Array.from(buttons).find(btn => 
        btn.textContent === 'Delete'
      ) as HTMLButtonElement;
      
      expect(confirmButton).toBeTruthy();
      confirmButton?.click();
      
      const result = await promise;
      expect(result).toBe(true);
    });

    test('resolves to false when cancel button is clicked', async () => {
      const promise = ConfirmDialog.show('Test message');
      
      // Wait for DOM
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const buttons = document.querySelectorAll('button');
      const cancelButton = Array.from(buttons).find(btn => 
        btn.textContent === 'Cancel'
      ) as HTMLButtonElement;
      
      expect(cancelButton).toBeTruthy();
      cancelButton?.click();
      
      const result = await promise;
      expect(result).toBe(false);
    });

    test('resolves to false when ESC key is pressed', async () => {
      const promise = ConfirmDialog.show('Test message');
      
      // Wait for DOM
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Simulate ESC key press
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);
      
      const result = await promise;
      expect(result).toBe(false);
    });

    test('removes overlay from DOM after confirmation', async () => {
      const promise = ConfirmDialog.show('Test message');
      
      // Wait for DOM
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const overlayBefore = document.querySelector('div');
      expect(overlayBefore).toBeTruthy();
      
      const buttons = document.querySelectorAll('button');
      const confirmButton = Array.from(buttons).find(btn => 
        btn.textContent === 'Delete'
      ) as HTMLButtonElement;
      confirmButton?.click();
      
      await promise;
      
      // Check overlay is removed
      const overlayAfter = document.body.children.length;
      expect(overlayAfter).toBe(0);
    });

    test('removes overlay from DOM after cancellation', async () => {
      const promise = ConfirmDialog.show('Test message');
      
      // Wait for DOM
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const overlayBefore = document.querySelector('div');
      expect(overlayBefore).toBeTruthy();
      
      const buttons = document.querySelectorAll('button');
      const cancelButton = Array.from(buttons).find(btn => 
        btn.textContent === 'Cancel'
      ) as HTMLButtonElement;
      cancelButton?.click();
      
      await promise;
      
      // Check overlay is removed
      const overlayAfter = document.body.children.length;
      expect(overlayAfter).toBe(0);
    });

    test('cleans up event listeners after dialog closes', async () => {
      const promise = ConfirmDialog.show('Test message');
      
      // Wait for DOM
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const buttons = document.querySelectorAll('button');
      const cancelButton = Array.from(buttons).find(btn => 
        btn.textContent === 'Cancel'
      ) as HTMLButtonElement;
      cancelButton?.click();
      
      await promise;
      
      // Try pressing ESC after dialog is closed - should not cause errors
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      expect(() => document.dispatchEvent(escEvent)).not.toThrow();
    });

    test('handles multiple dialogs sequentially', async () => {
      // First dialog
      const promise1 = ConfirmDialog.show('First message');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      let buttons = document.querySelectorAll('button');
      let confirmButton = Array.from(buttons).find(btn => 
        btn.textContent === 'Delete'
      ) as HTMLButtonElement;
      confirmButton?.click();
      const result1 = await promise1;
      
      expect(result1).toBe(true);
      
      // Second dialog
      const promise2 = ConfirmDialog.show('Second message');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      buttons = document.querySelectorAll('button');
      const cancelButton = Array.from(buttons).find(btn => 
        btn.textContent === 'Cancel'
      ) as HTMLButtonElement;
      cancelButton?.click();
      const result2 = await promise2;
      
      expect(result2).toBe(false);
    });

    test('message supports multi-line text', async () => {
      const multiLineMessage = 'Line 1\nLine 2\nLine 3';
      const promise = ConfirmDialog.show(multiLineMessage);
      
      // Wait for DOM
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const overlay = document.querySelector('div');
      expect(overlay?.textContent).toContain('Line 1');
      expect(overlay?.textContent).toContain('Line 2');
      expect(overlay?.textContent).toContain('Line 3');
      
      // Cleanup
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);
      
      await promise;
    });
  });
});

