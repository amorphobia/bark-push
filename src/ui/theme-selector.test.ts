/**
 * Tests for ThemeSelector component
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { ThemeSelector } from './theme-selector';
import { themeManager } from './theme-manager';

// Mock i18n
vi.mock('../i18n', () => ({
  t: vi.fn((key: string) => {
    const translations: Record<string, string> = {
      'settings.themeLabel': 'Appearance',
      'settings.themeOptions.light': 'Light',
      'settings.themeOptions.dark': 'Dark',
      'settings.themeOptions.auto': 'Auto (System)',
      'errors.unknownError': 'An unexpected error occurred',
    };
    return translations[key] || key;
  }),
}));

// Mock ToastManager
const mockToast = {
  show: vi.fn(),
};

// Mock StorageManager
const mockStorage = {
  getTheme: vi.fn(),
  setTheme: vi.fn(),
};

// Mock themeManager
vi.mock('./theme-manager', () => ({
  themeManager: {
    getTheme: vi.fn(),
    setTheme: vi.fn(),
  },
}));

describe('ThemeSelector', () => {
  let themeSelector: ThemeSelector;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    (themeManager.getTheme as Mock).mockReturnValue('auto');
    (themeManager.setTheme as Mock).mockImplementation(() => {});

    themeSelector = new ThemeSelector(mockStorage as any, mockToast as any);
  });

  describe('render', () => {
    test('should create container with correct class', () => {
      const container = themeSelector.render();

      expect(container.className).toBe('bark-theme-selector');
    });

    test('should create label with correct text', () => {
      const container = themeSelector.render();
      const label = container.querySelector('label');

      expect(label).not.toBeNull();
      expect(label?.textContent).toBe('Appearance');
      expect(label?.htmlFor).toBe('bark-theme-select');
    });

    test('should create select element with correct id', () => {
      const container = themeSelector.render();
      const select = container.querySelector('select') as HTMLSelectElement;

      expect(select).not.toBeNull();
      expect(select?.id).toBe('bark-theme-select');
    });

    test('should have correct options', () => {
      const container = themeSelector.render();
      const select = container.querySelector('select') as HTMLSelectElement;
      const options = select?.options;

      expect(options?.length).toBe(3);
      expect(options?.[0].value).toBe('light');
      expect(options?.[0].textContent).toBe('Light');
      expect(options?.[1].value).toBe('dark');
      expect(options?.[1].textContent).toBe('Dark');
      expect(options?.[2].value).toBe('auto');
      expect(options?.[2].textContent).toBe('Auto (System)');
    });

    test('should select current theme', () => {
      (themeManager.getTheme as Mock).mockReturnValue('dark');

      const container = themeSelector.render();
      const select = container.querySelector('select') as HTMLSelectElement;

      expect(select?.value).toBe('dark');
    });
  });

  describe('handleThemeChange', () => {
    beforeEach(() => {
      themeSelector = new ThemeSelector(mockStorage as any, mockToast as any);
    });

    test('should set theme on themeManager', async () => {
      (themeManager.setTheme as Mock).mockImplementation(() => {});

      await themeSelector['handleThemeChange']('dark');

      expect(themeManager.setTheme).toHaveBeenCalledWith('dark');
    });

    test('should trigger callback on theme change', async () => {
      const callback = vi.fn();
      themeSelector.setOnThemeChange(callback);

      await themeSelector['handleThemeChange']('dark');

      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should show error toast on failure', async () => {
      (themeManager.setTheme as Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      await themeSelector['handleThemeChange']('dark');

      expect(mockToast.show).toHaveBeenCalledWith('An unexpected error occurred', 'error');
    });
  });

  describe('updateDisplay', () => {
    test('should update select value', () => {
      const container = themeSelector.render();
      const select = container.querySelector('select') as HTMLSelectElement;

      (themeManager.getTheme as Mock).mockReturnValue('light');
      themeSelector.updateDisplay();

      expect(select.value).toBe('light');
    });

    test('should update label text', () => {
      const container = themeSelector.render();
      const label = container.querySelector('label') as HTMLLabelElement;

      themeSelector.updateDisplay();

      expect(label.textContent).toBe('Appearance');
    });
  });

  describe('setOnThemeChange', () => {
    test('should register callback', () => {
      const callback = vi.fn();

      themeSelector.setOnThemeChange(callback);
    });
  });
});
