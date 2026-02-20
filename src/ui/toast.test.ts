import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToastManager } from './toast';

describe('ToastManager', () => {
  let toastManager: ToastManager;

  beforeEach(() => {
    toastManager = new ToastManager();
    // Clear any existing toasts
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    toastManager.clear();
    vi.restoreAllMocks();
  });

  describe('Unit Tests: Toast display and auto-dismiss', () => {
    it('should create toast container on first show', () => {
      toastManager.show('Test message', 'info');
      
      const container = document.querySelector('.bark-toast-container');
      expect(container).toBeTruthy();
    });

    it('should display toast with correct message', () => {
      toastManager.show('Test message', 'info');
      
      const toast = document.querySelector('.bark-toast');
      expect(toast?.textContent).toBe('Test message');
    });

    it('should apply correct type class', () => {
      toastManager.show('Success message', 'success');
      
      const toast = document.querySelector('.bark-toast');
      expect(toast?.classList.contains('success')).toBe(true);
    });

    it('should auto-dismiss after specified duration', () => {
      const toastId = toastManager.show('Test message', 'info', 2000);
      
      // Toast should exist initially
      let toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      expect(toast).toBeTruthy();
      
      // Fast-forward time
      vi.advanceTimersByTime(2000);
      
      // Toast should be hidden (class removed)
      toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      expect(toast?.classList.contains('show')).toBe(false);
    });

    it('should not auto-dismiss when duration is 0', () => {
      const toastId = toastManager.show('Persistent message', 'info', 0);
      
      // Fast-forward time
      vi.advanceTimersByTime(10000);
      
      // Toast should still exist
      const toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      expect(toast).toBeTruthy();
    });
  });

  describe('Unit Tests: Multiple toasts', () => {
    it('should display multiple toasts simultaneously', () => {
      toastManager.show('Message 1', 'info');
      toastManager.show('Message 2', 'success');
      toastManager.show('Message 3', 'error');
      
      const toasts = document.querySelectorAll('.bark-toast');
      expect(toasts.length).toBe(3);
    });

    it('should stack toasts vertically', () => {
      toastManager.show('Message 1', 'info');
      toastManager.show('Message 2', 'success');
      
      // Container has style tag + toast elements
      const toasts = document.querySelectorAll('.bark-toast');
      expect(toasts.length).toBe(2);
    });

    it('should auto-dismiss toasts independently', () => {
      const id1 = toastManager.show('Message 1', 'info', 1000);
      const id2 = toastManager.show('Message 2', 'success', 2000);
      
      // After 1 second, first toast should be dismissed
      vi.advanceTimersByTime(1000);
      
      let toast1 = document.querySelector(`[data-toast-id="${id1}"]`);
      let toast2 = document.querySelector(`[data-toast-id="${id2}"]`);
      
      expect(toast1?.classList.contains('show')).toBe(false);
      expect(toast2?.classList.contains('show')).toBe(true);
      
      // After another second, second toast should be dismissed
      vi.advanceTimersByTime(1000);
      
      toast2 = document.querySelector(`[data-toast-id="${id2}"]`);
      expect(toast2?.classList.contains('show')).toBe(false);
    });
  });

  describe('Unit Tests: Toast types', () => {
    it('should display success toast with correct styling', () => {
      toastManager.show('Success!', 'success');
      
      const toast = document.querySelector('.bark-toast');
      expect(toast?.classList.contains('success')).toBe(true);
    });

    it('should display error toast with correct styling', () => {
      toastManager.show('Error!', 'error');
      
      const toast = document.querySelector('.bark-toast');
      expect(toast?.classList.contains('error')).toBe(true);
    });

    it('should display info toast with correct styling', () => {
      toastManager.show('Info!', 'info');
      
      const toast = document.querySelector('.bark-toast');
      expect(toast?.classList.contains('info')).toBe(true);
    });

    it('should default to info type when not specified', () => {
      toastManager.show('Default message');
      
      const toast = document.querySelector('.bark-toast');
      expect(toast?.classList.contains('info')).toBe(true);
    });
  });

  describe('Unit Tests: Manual dismissal', () => {
    it('should hide toast when hide() is called', () => {
      const toastId = toastManager.show('Test message', 'info', 0);
      
      // Toast should exist
      let toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      expect(toast).toBeTruthy();
      
      // Hide the toast
      toastManager.hide(toastId);
      
      // Toast should have show class removed
      toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      expect(toast?.classList.contains('show')).toBe(false);
    });

    it('should clear timeout when manually hiding toast', () => {
      const toastId = toastManager.show('Test message', 'info', 5000);
      
      // Manually hide before auto-dismiss
      toastManager.hide(toastId);
      
      // Fast-forward past original timeout
      vi.advanceTimersByTime(5000);
      
      // Toast should already be hidden, no double-hide
      const toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      expect(toast).toBeFalsy();
    });

    it('should dismiss toast when clicked', () => {
      const toastId = toastManager.show('Click me', 'info', 0);
      
      const toast = document.querySelector(`[data-toast-id="${toastId}"]`) as HTMLElement;
      expect(toast).toBeTruthy();
      
      // Click the toast
      toast.click();
      
      // Toast should be hidden
      expect(toast.classList.contains('show')).toBe(false);
    });
  });

  describe('Unit Tests: Clear all toasts', () => {
    it('should clear all toasts', () => {
      toastManager.show('Message 1', 'info', 0);
      toastManager.show('Message 2', 'success', 0);
      toastManager.show('Message 3', 'error', 0);
      
      // Should have 3 toasts
      let toasts = document.querySelectorAll('.bark-toast');
      expect(toasts.length).toBe(3);
      
      // Clear all
      toastManager.clear();
      
      // Container should be removed
      const container = document.querySelector('.bark-toast-container');
      expect(container).toBeFalsy();
    });

    it('should clear all timeouts when clearing', () => {
      toastManager.show('Message 1', 'info', 1000);
      toastManager.show('Message 2', 'success', 2000);
      
      // Clear all
      toastManager.clear();
      
      // Fast-forward time
      vi.advanceTimersByTime(5000);
      
      // No toasts should appear
      const toasts = document.querySelectorAll('.bark-toast');
      expect(toasts.length).toBe(0);
    });
  });

  describe('Unit Tests: Container cleanup', () => {
    it('should remove container when last toast is dismissed', () => {
      toastManager.show('Last toast', 'info', 1000);
      
      // Container should exist
      const container = document.querySelector('.bark-toast-container');
      expect(container).toBeTruthy();
      
      // Wait for auto-dismiss
      vi.advanceTimersByTime(1000);
      
      // Wait for removal animation
      vi.advanceTimersByTime(200);
      
      // Check that no toast elements remain
      const toasts = document.querySelectorAll('.bark-toast');
      expect(toasts.length).toBe(0);
    });

    it('should keep container when multiple toasts exist', () => {
      toastManager.show('Toast 1', 'info', 1000);
      toastManager.show('Toast 2', 'success', 2000);
      
      // Wait for first toast to dismiss
      vi.advanceTimersByTime(1000);
      vi.advanceTimersByTime(200);
      
      // Container should still exist
      const container = document.querySelector('.bark-toast-container');
      expect(container).toBeTruthy();
    });
  });

  describe('Unit Tests: Return value', () => {
    it('should return unique ID for each toast', () => {
      const id1 = toastManager.show('Message 1', 'info');
      const id2 = toastManager.show('Message 2', 'success');
      const id3 = toastManager.show('Message 3', 'error');

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should return ID that can be used to hide toast', () => {
      const toastId = toastManager.show('Test message', 'info', 0);

      // Use returned ID to hide
      toastManager.hide(toastId);

      const toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      expect(toast?.classList.contains('show')).toBe(false);
    });
  });

  describe('Unit Tests: Toast with actions', () => {
    const mockActions = [
      {
        label: 'Action 1',
        svg: '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>',
        callback: vi.fn(),
      },
      {
        label: 'Action 2',
        svg: '<svg viewBox="0 0 24 24"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>',
        callback: vi.fn(),
      },
    ];

    it('should show toast with actions', () => {
      const toastId = toastManager.showWithActions(
        'Message with actions',
        mockActions,
        'success',
        0
      );

      const toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      expect(toast).toBeTruthy();
      expect(toast?.textContent).toContain('Message with actions');
    });

    it('should display action buttons', () => {
      const toastId = toastManager.showWithActions(
        'Test message',
        mockActions,
        'info',
        0
      );

      const toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      const actionButtons = toast?.querySelectorAll('.bark-toast-action');

      expect(actionButtons).toHaveLength(2);
    });

    it('should call callback when action button is clicked', () => {
      const toastId = toastManager.showWithActions(
        'Test message',
        mockActions,
        'info',
        0
      );

      const toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      const firstButton = toast?.querySelectorAll('.bark-toast-action')[0] as HTMLButtonElement;

      firstButton.click();

      expect(mockActions[0].callback).toHaveBeenCalledWith(toastId);
    });

    it('should stop propagation when clicking action button', () => {
      const toastId = toastManager.showWithActions(
        'Test message',
        mockActions,
        'info',
        0
      );

      const toast = document.querySelector(`[data-toast-id="${toastId}"]`) as HTMLElement;
      const firstButton = toast?.querySelectorAll('.bark-toast-action')[0] as HTMLButtonElement;

      let toastClicked = false;
      toast.addEventListener('click', () => { toastClicked = true; });

      firstButton.click();

      expect(toastClicked).toBe(false);
    });

    it('should dismiss toast when clicking message area', () => {
      const toastId = toastManager.showWithActions(
        'Test message',
        mockActions,
        'info',
        0
      );

      const toast = document.querySelector(`[data-toast-id="${toastId}"]`) as HTMLElement;
      const messageArea = toast?.querySelector('.bark-toast-message') as HTMLElement;

      messageArea.click();

      expect(toast.classList.contains('show')).toBe(false);
    });

    it('should not auto-dismiss by default when duration is 0', () => {
      const toastId = toastManager.showWithActions(
        'Test message',
        mockActions,
        'info',
        0
      );

      // Fast-forward time
      vi.advanceTimersByTime(10000);

      const toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      expect(toast).toBeTruthy();
    });

    it('should apply correct type class to toast with actions', () => {
      const toastId = toastManager.showWithActions(
        'Success message',
        mockActions,
        'success',
        0
      );

      const toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      expect(toast?.classList.contains('success')).toBe(true);
    });

    it('should return unique ID for toast with actions', () => {
      const id1 = toastManager.showWithActions('Msg 1', mockActions, 'info');
      const id2 = toastManager.showWithActions('Msg 2', mockActions, 'success');

      expect(id1).not.toBe(id2);
    });

    it('should pass toastId to callback', () => {
      const callback = vi.fn();
      const toastId = toastManager.showWithActions(
        'Test',
        [{ label: 'Test', svg: '', callback }],
        'info',
        0
      );

      const toast = document.querySelector(`[data-toast-id="${toastId}"]`);
      const button = toast?.querySelector('.bark-toast-action') as HTMLButtonElement;
      button.click();

      expect(callback).toHaveBeenCalledWith(toastId);
    });
  });
});
