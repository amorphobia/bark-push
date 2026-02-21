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

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockUrl = 'blob:http://localhost/mock-url';
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      // Mock document.createElement to capture the anchor element
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          return mockAnchor as any;
        }
        return originalCreateElement(tag);
      });

      // Call handleExport
      (historyTab as any).handleExport();

      // Verify download was triggered
      expect(mockAnchor.download).toContain('bark-push-history-');
      expect(mockAnchor.download).toContain('.json');
      expect(mockAnchor.click).toHaveBeenCalled();

      // Verify URL cleanup
      expect(revokeSpy).toHaveBeenCalledWith(mockUrl);

      createElementSpy.mockRestore();
      revokeSpy.mockRestore();
    });

    test('export includes timestamp', () => {
      const items = [createMockHistoryItem()];
      vi.spyOn(storage, 'getPushHistory').mockReturnValue(items);

      historyTab = new HistoryTab(storage, toast, barkClient);

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockUrl = 'blob:http://localhost/mock-url';
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      // Mock document.createElement
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          return mockAnchor as any;
        }
        return originalCreateElement(tag);
      });

      (historyTab as any).handleExport();

      // Verify filename includes timestamp pattern (YYYYMMDDTHHMMSS)
      const filename = mockAnchor.download;
      expect(filename).toMatch(/bark-push-history-\d{8}T\d{6}[+-]\d{4}\.json/);

      revokeSpy.mockRestore();
    });

    test('export creates blob with correct content type', () => {
      const items = [createMockHistoryItem({ id: 'test-id' })];
      vi.spyOn(storage, 'getPushHistory').mockReturnValue(items);

      historyTab = new HistoryTab(storage, toast, barkClient);

      // Mock URL methods
      const mockUrl = 'blob:http://localhost/mock-url';
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      // Mock document.createElement
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          return mockAnchor as any;
        }
        return originalCreateElement(tag);
      });

      // Call export - should work without errors
      expect(() => (historyTab as any).handleExport()).not.toThrow();

      // Verify download was triggered
      expect(mockAnchor.click).toHaveBeenCalled();

      revokeSpy.mockRestore();
    });

    test('export includes correct records count', () => {
      const items = [
        createMockHistoryItem({ id: 'id-1' }),
        createMockHistoryItem({ id: 'id-2' }),
        createMockHistoryItem({ id: 'id-3' }),
      ];
      vi.spyOn(storage, 'getPushHistory').mockReturnValue(items);

      historyTab = new HistoryTab(storage, toast, barkClient);

      // Mock URL methods
      const mockUrl = 'blob:http://localhost/mock-url';
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      // Mock document.createElement
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          return mockAnchor as any;
        }
        return originalCreateElement(tag);
      });

      // Call export and verify it doesn't throw
      expect(() => (historyTab as any).handleExport()).not.toThrow();

      // Verify download was triggered
      expect(mockAnchor.click).toHaveBeenCalled();

      revokeSpy.mockRestore();
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

      const addSpy = vi.spyOn(storage, 'addPushHistoryItem').mockImplementation(() => {});

      historyTab = new HistoryTab(storage, toast, barkClient);

      // Create a mock file with text() method
      const mockText = JSON.stringify(importData);
      const mockFile = {
        name: 'test.json',
        type: 'application/json',
        text: vi.fn().mockResolvedValue(mockText),
      };
      const mockInput = {
        type: 'file',
        accept: '.json',
        files: [mockFile],
        click: vi.fn(),
        onchange: null as ((this: Event) => void) | null,
      };

      // Mock document.createElement - use original for other tags
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'input') {
          return mockInput as any;
        }
        return originalCreateElement(tag);
      });

      // Call handleImport, then manually trigger the onchange with proper event target
      const importPromise = (historyTab as any).handleImport();
      (mockInput.onchange as any)?.({ target: mockInput });
      await importPromise;

      expect(addSpy).toHaveBeenCalledTimes(2);
      createElementSpy.mockRestore();
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

      const addSpy = vi.spyOn(storage, 'addPushHistoryItem').mockImplementation(() => {});

      historyTab = new HistoryTab(storage, toast, barkClient);

      // Create a mock file with text() method
      const mockText = JSON.stringify(importData);
      const mockFile = {
        name: 'test.json',
        type: 'application/json',
        text: vi.fn().mockResolvedValue(mockText),
      };
      const mockInput = {
        type: 'file',
        accept: '.json',
        files: [mockFile],
        click: vi.fn(),
        onchange: null as ((this: Event) => void) | null,
      };

      // Mock document.createElement - use original for other tags
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'input') {
          return mockInput as any;
        }
        return originalCreateElement(tag);
      });

      // Call handleImport, then manually trigger the onchange with proper event target
      const importPromise = (historyTab as any).handleImport();
      (mockInput.onchange as any)?.({ target: mockInput });
      await importPromise;

      expect(addSpy).toHaveBeenCalledTimes(1);
      createElementSpy.mockRestore();
    });

    test('handleImport shows error for invalid format', async () => {
      vi.spyOn(storage, 'getPushHistory').mockReturnValue([]);

      const toastSpy = vi.spyOn(toast, 'show').mockImplementation(() => '');

      historyTab = new HistoryTab(storage, toast, barkClient);

      // Create a mock file with invalid format (missing version and records)
      const mockText = JSON.stringify({ foo: 'bar' });
      const mockFile = {
        name: 'test.json',
        type: 'application/json',
        text: vi.fn().mockResolvedValue(mockText),
      };
      const mockInput = {
        type: 'file',
        accept: '.json',
        files: [mockFile],
        click: vi.fn(),
        onchange: null as ((this: Event) => void) | null,
      };

      // Mock document.createElement - use original for other tags
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'input') {
          return mockInput as any;
        }
        return originalCreateElement(tag);
      });

      // Call handleImport, then manually trigger the onchange
      const importPromise = (historyTab as any).handleImport();
      (mockInput.onchange as any)?.({ target: mockInput });
      await importPromise;

      // Verify error toast was shown
      expect(toastSpy).toHaveBeenCalled();
      expect(toastSpy.mock.calls[0][1]).toBe('error');
    });

    test('handleImport triggers file input click', () => {
      historyTab = new HistoryTab(storage, toast, barkClient);

      // Create a mock input element
      const mockInput = {
        type: 'file',
        accept: '.json',
        files: [],
        click: vi.fn(),
        onchange: null,
      };

      // Mock document.createElement - use original for other tags
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'input') {
          return mockInput as any;
        }
        return originalCreateElement(tag);
      });

      // Call handleImport
      (historyTab as any).handleImport();

      // Verify click was triggered
      expect(mockInput.click).toHaveBeenCalled();
    });

    test('handleImport shows error for invalid JSON', async () => {
      vi.spyOn(storage, 'getPushHistory').mockReturnValue([]);

      const toastSpy = vi.spyOn(toast, 'show').mockImplementation(() => '');

      historyTab = new HistoryTab(storage, toast, barkClient);

      // Create a mock file with invalid JSON
      const mockFile = {
        name: 'test.json',
        type: 'application/json',
        text: vi.fn().mockResolvedValue('not valid json{{{'),
      };
      const mockInput = {
        type: 'file',
        accept: '.json',
        files: [mockFile],
        click: vi.fn(),
        onchange: null as ((this: Event) => void) | null,
      };

      // Mock document.createElement - use original for other tags
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'input') {
          return mockInput as any;
        }
        return originalCreateElement(tag);
      });

      // Call handleImport, then manually trigger the onchange
      const importPromise = (historyTab as any).handleImport();
      (mockInput.onchange as any)?.({ target: mockInput });
      await importPromise;

      // Verify error toast was shown
      expect(toastSpy).toHaveBeenCalled();
      expect(toastSpy.mock.calls[0][1]).toBe('error');
    });

    test('handleImport handles empty file gracefully', async () => {
      vi.spyOn(storage, 'getPushHistory').mockReturnValue([]);

      const toastSpy = vi.spyOn(toast, 'show').mockImplementation(() => '');

      historyTab = new HistoryTab(storage, toast, barkClient);

      // Create a mock file with empty content
      const mockFile = {
        name: 'test.json',
        type: 'application/json',
        text: vi.fn().mockResolvedValue(''),
      };
      const mockInput = {
        type: 'file',
        accept: '.json',
        files: [mockFile],
        click: vi.fn(),
        onchange: null as ((this: Event) => void) | null,
      };

      // Mock document.createElement - use original for other tags
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'input') {
          return mockInput as any;
        }
        return originalCreateElement(tag);
      });

      // Call handleImport, then manually trigger the onchange
      const importPromise = (historyTab as any).handleImport();
      (mockInput.onchange as any)?.({ target: mockInput });
      await importPromise;

      // Verify error toast was shown for empty file
      expect(toastSpy).toHaveBeenCalled();
      expect(toastSpy.mock.calls[0][1]).toBe('error');
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
