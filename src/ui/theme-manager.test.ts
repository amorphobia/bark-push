/**
 * Tests for ThemeManager
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeManager } from './theme-manager';

// Mock StorageManager
const mockStorage = {
  getTheme: vi.fn(),
  setTheme: vi.fn(),
};

describe('ThemeManager', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    // Reset singleton instance
    ThemeManager['instance'] = null;
    themeManager = ThemeManager.getInstance();

    // Reset mocks
    mockStorage.getTheme.mockReturnValue('auto');
    mockStorage.setTheme.mockImplementation(() => {});

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    themeManager.cleanup();
    vi.clearAllMocks();
  });

  describe('init', () => {
    test('should initialize with stored theme', () => {
      mockStorage.getTheme.mockReturnValue('dark');
      themeManager.init(mockStorage as any);

      expect(themeManager.getTheme()).toBe('dark');
    });

    test('should default to auto if no stored theme', () => {
      mockStorage.getTheme.mockReturnValue('light');
      themeManager.init(mockStorage as any);

      expect(themeManager.getTheme()).toBe('light');
    });
  });

  describe('setTheme', () => {
    beforeEach(() => {
      themeManager.init(mockStorage as any);
    });

    test('should update theme and save to storage', () => {
      themeManager.setTheme('dark');

      expect(themeManager.getTheme()).toBe('dark');
      expect(mockStorage.setTheme).toHaveBeenCalledWith('dark');
    });

    test('should throw error if not initialized', () => {
      ThemeManager['instance'] = null;
      const freshManager = ThemeManager.getInstance();

      expect(() => freshManager.setTheme('dark')).toThrow('ThemeManager not initialized');
    });

    test('should not notify callbacks if theme did not change', () => {
      const callback = vi.fn();
      themeManager.setOnThemeChange(callback);

      mockStorage.setTheme.mockClear();
      themeManager.setTheme('auto');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getEffectiveTheme', () => {
    beforeEach(() => {
      themeManager.init(mockStorage as any);
    });

    test('should return light for auto when page is in light mode', () => {
      // Mock document.body computed styles for light mode
      const mockBody = {
        style: {},
        parentElement: null,
      };
      Object.defineProperty(document, 'body', {
        value: mockBody,
        configurable: true,
      });
      const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        backgroundColor: 'rgb(255, 255, 255)',
        color: 'rgb(0, 0, 0)',
      } as CSSStyleDeclaration);

      expect(themeManager.getEffectiveTheme()).toBe('light');

      getComputedStyleSpy.mockRestore();
    });

    test('should return dark for auto when page is in dark mode', () => {
      // Mock document.body computed styles for dark mode
      const mockBody = {
        style: {},
        parentElement: null,
      };
      Object.defineProperty(document, 'body', {
        value: mockBody,
        configurable: true,
      });
      const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        backgroundColor: 'rgb(0, 0, 0)',
        color: 'rgb(255, 255, 255)',
      } as CSSStyleDeclaration);

      expect(themeManager.getEffectiveTheme()).toBe('dark');

      getComputedStyleSpy.mockRestore();
    });

    test('should return explicit theme value', () => {
      themeManager.setTheme('dark');
      expect(themeManager.getEffectiveTheme()).toBe('dark');

      themeManager.setTheme('light');
      expect(themeManager.getEffectiveTheme()).toBe('light');
    });
  });

  describe('theme change callbacks', () => {
    beforeEach(() => {
      themeManager.init(mockStorage as any);
    });

    test('should call registered callbacks when theme changes', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      themeManager.setOnThemeChange(callback1);
      themeManager.setOnThemeChange(callback2);

      themeManager.setTheme('dark');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    test('should allow removing callbacks', () => {
      const callback = vi.fn();

      themeManager.setOnThemeChange(callback);
      themeManager.removeOnThemeChange(callback);
      themeManager.setTheme('dark');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('applyCssVariablesToElement', () => {
    beforeEach(() => {
      themeManager.init(mockStorage as any);
    });

    test('should apply CSS variables to element', () => {
      const mockElement = {
        style: {
          setProperty: vi.fn(),
        },
      } as any;

      themeManager.applyCssVariablesToElement(mockElement);

      expect(mockElement.style.setProperty).toHaveBeenCalled();
    });

    test('should use provided palette if given', () => {
      const mockElement = {
        style: {
          setProperty: vi.fn(),
        },
      } as any;
      const customPalette = {
        '--custom-color': '#ff0000',
      };

      themeManager.applyCssVariablesToElement(mockElement, customPalette);

      expect(mockElement.style.setProperty).toHaveBeenCalledWith('--custom-color', '#ff0000');
    });
  });

  describe('getCurrentPalette', () => {
    beforeEach(() => {
      themeManager.init(mockStorage as any);
    });

    test('should return dark palette for dark theme', () => {
      themeManager.setTheme('dark');
      const palette = themeManager.getCurrentPalette();

      expect(palette['--bark-bg-primary']).toBe('#000000');
      expect(palette['--bark-primary']).toBe('#0a84ff');
    });

    test('should return light palette for light theme', () => {
      themeManager.setTheme('light');
      const palette = themeManager.getCurrentPalette();

      expect(palette['--bark-bg-primary']).toBe('#ffffff');
      expect(palette['--bark-primary']).toBe('#007aff');
    });
  });
});
