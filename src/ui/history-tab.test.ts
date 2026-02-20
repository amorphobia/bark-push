/**
 * Tests for HistoryTab component
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { HistoryTab } from './history-tab';
import { StorageManager } from '../storage/storage-manager';
import { BarkClient } from '../api/bark-client';
import { ToastManager } from './toast';
import type { PushHistoryItem } from '../types';

describe('HistoryTab', () => {
  let storage: StorageManager;
  let toast: ToastManager;
  let barkClient: BarkClient;
  let historyTab: HistoryTab;

  const createMockHistoryItem = (overrides: Partial<PushHistoryItem> = {}): PushHistoryItem => ({
    id: 'test-id-123',
    status: undefined,
    title: 'Test Title',
    content: 'Test message content',
    markdownEnabled: false,
    devices: [{
      id: 'device-1',
      name: 'My iPhone',
      apiUrl: 'https://api.day.app/abc123/',
    }],
    requestTimestamp: Date.now(),
    timezone: 'UTC',
    isEncrypted: false,
    responseJson: [{ code: 200, message: 'success', timestamp: Date.now() }],
    ...overrides,
  });

  beforeEach(() => {
    storage = new StorageManager();
    toast = new ToastManager();
    barkClient = new BarkClient();
    historyTab = new HistoryTab(storage, toast, barkClient);

    // Clear localStorage
    localStorage.clear();

    // Mock GM_setClipboard and GM_getClipboard
    (globalThis as any).GM_setClipboard = vi.fn();
    (globalThis as any).GM_getClipboard = vi.fn(() => '');

    // Mock barkClient methods
    vi.spyOn(storage, 'getPushHistory').mockImplementation(() => []);
    vi.spyOn(storage, 'deletePushHistoryItems').mockImplementation(() => {});
  });

  afterEach(() => {
    toast.clear();
    vi.restoreAllMocks();
  });

  describe('Status Derivation', () => {
    test('returns sent when all responses have code 200', () => {
      const item = createMockHistoryItem({
        responseJson: [
          { code: 200, message: 'success', timestamp: Date.now() },
          { code: 200, message: 'success', timestamp: Date.now() },
        ],
      });

      // Access private method for testing
      const getItemStatus = (historyTab as any).getItemStatus.bind(historyTab);
      expect(getItemStatus(item)).toBe('sent');
    });

    test('returns failed when any response has code !== 200', () => {
      const item = createMockHistoryItem({
        responseJson: [
          { code: 200, message: 'success', timestamp: Date.now() },
          { code: 400, message: 'bad request', timestamp: Date.now() },
        ],
      });

      const getItemStatus = (historyTab as any).getItemStatus.bind(historyTab);
      expect(getItemStatus(item)).toBe('failed');
    });

    test('returns recalled when status is recalled', () => {
      const item = createMockHistoryItem({
        status: 'recalled',
        responseJson: [
          { code: 200, message: 'success', timestamp: Date.now() },
        ],
      });

      const getItemStatus = (historyTab as any).getItemStatus.bind(historyTab);
      expect(getItemStatus(item)).toBe('recalled');
    });

    test('recalled status takes precedence over failed responses', () => {
      const item = createMockHistoryItem({
        status: 'recalled',
        responseJson: [
          { code: 400, message: 'error', timestamp: Date.now() },
        ],
      });

      const getItemStatus = (historyTab as any).getItemStatus.bind(historyTab);
      expect(getItemStatus(item)).toBe('recalled');
    });
  });

  describe('Filtered History', () => {
    test('returns all items when filter is empty', () => {
      const items = [
        createMockHistoryItem({ id: '1', content: 'Hello' }),
        createMockHistoryItem({ id: '2', content: 'World' }),
      ];
      vi.spyOn(storage, 'getPushHistory').mockReturnValue(items);

      const getFilteredHistory = (historyTab as any).getFilteredHistory.bind(historyTab);
      const result = getFilteredHistory();

      expect(result).toHaveLength(2);
    });

    test('filters by content', () => {
      const items = [
        createMockHistoryItem({ id: '1', content: 'Hello world' }),
        createMockHistoryItem({ id: '2', content: 'Goodbye' }),
        createMockHistoryItem({ id: '3', content: 'Hello again' }),
      ];
      vi.spyOn(storage, 'getPushHistory').mockReturnValue(items);

      historyTab = new HistoryTab(storage, toast, barkClient);
      (historyTab as any).filterText = 'hello';

      const getFilteredHistory = (historyTab as any).getFilteredHistory.bind(historyTab);
      const result = getFilteredHistory();

      expect(result).toHaveLength(2);
    });

    test('filters by device name', () => {
      const items = [
        createMockHistoryItem({
          id: '1',
          content: 'Message 1',
          devices: [{ id: 'd1', name: 'iPhone', apiUrl: 'https://api.day.app/key1/' }],
        }),
        createMockHistoryItem({
          id: '2',
          content: 'Message 2',
          devices: [{ id: 'd2', name: 'iPad', apiUrl: 'https://api.day.app/key2/' }],
        }),
      ];
      vi.spyOn(storage, 'getPushHistory').mockReturnValue(items);

      historyTab = new HistoryTab(storage, toast, barkClient);
      (historyTab as any).filterText = 'iPad';

      const getFilteredHistory = (historyTab as any).getFilteredHistory.bind(historyTab);
      const result = getFilteredHistory();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    test('filter is case insensitive', () => {
      const items = [
        createMockHistoryItem({ id: '1', content: 'HELLO' }),
        createMockHistoryItem({ id: '2', content: 'hello' }),
        createMockHistoryItem({ id: '3', content: 'HeLLo' }),
      ];
      vi.spyOn(storage, 'getPushHistory').mockReturnValue(items);

      historyTab = new HistoryTab(storage, toast, barkClient);
      (historyTab as any).filterText = 'HELLO';

      const getFilteredHistory = (historyTab as any).getFilteredHistory.bind(historyTab);
      const result = getFilteredHistory();

      expect(result).toHaveLength(3);
    });
  });

  describe('Export Functionality', () => {
    test('export creates valid JSON format', () => {
      const items = [
        createMockHistoryItem({ id: 'test-id-1' }),
        createMockHistoryItem({ id: 'test-id-2' }),
      ];
      vi.spyOn(storage, 'getPushHistory').mockReturnValue(items);

      historyTab = new HistoryTab(storage, toast, barkClient);

      // Call handleExport and check GM_setClipboard was called
      (historyTab as any).handleExport();

      expect((globalThis as any).GM_setClipboard).toHaveBeenCalled();
      const clipboardContent = (globalThis as any).GM_setClipboard.mock.calls[0][0];
      const parsed = JSON.parse(clipboardContent);

      expect(parsed.version).toBe(1);
      expect(parsed.records).toHaveLength(2);
      expect(parsed.records[0].id).toBe('test-id-1');
    });

    test('export includes timestamp', () => {
      const items = [createMockHistoryItem()];
      vi.spyOn(storage, 'getPushHistory').mockReturnValue(items);

      historyTab = new HistoryTab(storage, toast, barkClient);
      (historyTab as any).handleExport();

      const clipboardContent = (globalThis as any).GM_setClipboard.mock.calls[0][0];
      const parsed = JSON.parse(clipboardContent);

      expect(parsed.exportedAt).toBeTruthy();
      expect(new Date(parsed.exportedAt)).toBeInstanceOf(Date);
    });
  });

  describe('Import Functionality', () => {
    test('handleImport parses and merges records', async () => {
      const existingItems = [createMockHistoryItem({ id: 'existing-id' })];
      vi.spyOn(storage, 'getPushHistory').mockReturnValue(existingItems);

      const importData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        records: [
          createMockHistoryItem({ id: 'new-id-1' }),
          createMockHistoryItem({ id: 'new-id-2' }),
        ],
      };

      (globalThis as any).GM_getClipboard = vi.fn(() => JSON.stringify(importData));

      const addSpy = vi.spyOn(storage, 'addPushHistoryItem').mockImplementation(() => {});

      historyTab = new HistoryTab(storage, toast, barkClient);
      await (historyTab as any).handleImport();

      expect(addSpy).toHaveBeenCalledTimes(2);
    });

    test('handleImport ignores duplicate IDs', async () => {
      const existingItems = [createMockHistoryItem({ id: 'duplicate-id' })];
      vi.spyOn(storage, 'getPushHistory').mockReturnValue(existingItems);

      const importData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        records: [
          createMockHistoryItem({ id: 'duplicate-id' }),
          createMockHistoryItem({ id: 'new-id' }),
        ],
      };

      (globalThis as any).GM_getClipboard = vi.fn(() => JSON.stringify(importData));

      const addSpy = vi.spyOn(storage, 'addPushHistoryItem').mockImplementation(() => {});

      historyTab = new HistoryTab(storage, toast, barkClient);
      await (historyTab as any).handleImport();

      expect(addSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Text Truncation', () => {
    test('truncates long text', () => {
      const longText = 'A'.repeat(100);
      historyTab = new HistoryTab(storage, toast, barkClient);

      const truncateText = (historyTab as any).truncateText.bind(historyTab);
      const result = truncateText(longText, 50);

      expect(result.length).toBe(53); // 50 chars + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    test('does not truncate short text', () => {
      const shortText = 'Hello';
      historyTab = new HistoryTab(storage, toast, barkClient);

      const truncateText = (historyTab as any).truncateText.bind(historyTab);
      const result = truncateText(shortText, 50);

      expect(result).toBe('Hello');
    });
  });

  describe('Delete Operations', () => {
    test('handleDelete removes single item', () => {
      const deleteSpy = vi.spyOn(storage, 'deletePushHistoryItems').mockImplementation(() => {});

      historyTab = new HistoryTab(storage, toast, barkClient);
      (historyTab as any).handleDelete('test-id');

      expect(deleteSpy).toHaveBeenCalledWith(['test-id']);
    });

    test('handleDeleteSelected removes multiple items', () => {
      const deleteSpy = vi.spyOn(storage, 'deletePushHistoryItems').mockImplementation(() => {});

      historyTab = new HistoryTab(storage, toast, barkClient);
      (historyTab as any).selectedIds = new Set(['id-1', 'id-2', 'id-3']);
      (historyTab as any).handleDeleteSelected();

      expect(deleteSpy).toHaveBeenCalledWith(['id-1', 'id-2', 'id-3']);
    });
  });

  describe('Refresh and Destroy', () => {
    test('refresh clears selection and filter', () => {
      historyTab = new HistoryTab(storage, toast, barkClient);
      (historyTab as any).selectedIds = new Set(['id-1']);
      (historyTab as any).filterText = 'test';

      historyTab.refresh();

      expect((historyTab as any).selectedIds.size).toBe(0);
      expect((historyTab as any).filterText).toBe('');
    });

    test('destroy clears container element', () => {
      historyTab = new HistoryTab(storage, toast, barkClient);
      historyTab.destroy();

      expect((historyTab as any).containerElement).toBeNull();
    });
  });
});
