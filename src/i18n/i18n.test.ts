// Property-based and unit tests for i18n system
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { i18n } from './index';
import type { SupportedLocale } from './types';

describe('i18n System', () => {
  beforeEach(() => {
    // Mock GM_getValue and GM_setValue
    global.GM_getValue = vi.fn((_key: string, defaultValue: any) => defaultValue);
    global.GM_setValue = vi.fn();
  });

  describe('Property 46: Language matching', () => {
    /**
     * Feature: bark-push-userscript, Property 46: Language matching
     * 
     * For any supported browser language, the system should use that language for the UI
     * Validates: Requirements 17.3
     */
    test.prop([
      fc.constantFrom('en', 'zh-CN', 'zh-TW', 'ja', 'ko'),
    ])('should match exact supported locale', (locale) => {
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        value: locale,
        configurable: true,
      });

      const detected = i18n.detectLocale();
      expect(detected).toBe(locale);
    });

    test.prop([
      fc.constantFrom(
        'en-US',
        'en-GB',
        'zh-Hans',
        'zh-Hant',
        'zh',
        'ja-JP',
        'ko-KR'
      ),
    ])('should match base language to supported locale', (browserLang) => {
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        value: browserLang,
        configurable: true,
      });

      const detected = i18n.detectLocale();
      const baseLang = browserLang.split('-')[0];

      // Should match to a supported locale with the same base language
      if (baseLang === 'en') {
        expect(detected).toBe('en');
      } else if (baseLang === 'zh') {
        expect(['zh-CN', 'zh-TW']).toContain(detected);
      } else if (baseLang === 'ja') {
        expect(detected).toBe('ja');
      } else if (baseLang === 'ko') {
        expect(detected).toBe('ko');
      }
    });

    test.prop([
      fc.constantFrom('fr', 'de', 'es', 'it', 'pt', 'ru', 'ar'),
    ])('should fallback to English for unsupported languages', (unsupportedLang) => {
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        value: unsupportedLang,
        configurable: true,
      });

      const detected = i18n.detectLocale();
      expect(detected).toBe('en');
    });

    test.prop([
      fc.constantFrom('en', 'zh-CN', 'zh-TW', 'ja', 'ko'),
    ])('should prioritize stored preference over browser language', (storedLocale) => {
      // Mock stored preference
      global.GM_getValue = vi.fn((key: string) => {
        if (key === 'bark_language') return storedLocale;
        return null;
      });

      // Mock different browser language
      Object.defineProperty(navigator, 'language', {
        value: 'fr',
        configurable: true,
      });

      const detected = i18n.detectLocale();
      expect(detected).toBe(storedLocale);
    });
  });

  describe('Property 48: Language preference persistence', () => {
    /**
     * Feature: bark-push-userscript, Property 48: Language preference persistence
     * 
     * For any language selection, it should be saved to storage and restored on next modal open (round-trip)
     * Validates: Requirements 17.7, 17.8
     */
    test.prop([
      fc.constantFrom<SupportedLocale>('en', 'zh-CN', 'zh-TW', 'ja', 'ko'),
    ])('should persist language preference to storage', async (locale) => {
      const setValueSpy = vi.fn();
      global.GM_setValue = setValueSpy;

      await i18n.setLocale(locale);

      // Should save to storage
      expect(setValueSpy).toHaveBeenCalledWith('bark_language', locale);
    });

    test.prop([
      fc.constantFrom<SupportedLocale>('en', 'zh-CN', 'zh-TW', 'ja', 'ko'),
    ])('should restore language preference from storage', async (locale) => {
      // First, set the locale
      await i18n.setLocale(locale);

      // Mock GM_getValue to return the stored locale
      global.GM_getValue = vi.fn((key: string) => {
        if (key === 'bark_language') return locale;
        return null;
      });

      // Detect locale should return the stored preference
      const detected = i18n.detectLocale();
      expect(detected).toBe(locale);
    });

    test.prop([
      fc.constantFrom<SupportedLocale>('en', 'zh-CN', 'zh-TW', 'ja', 'ko'),
    ])('should complete round-trip: save then load returns same value', async (locale) => {
      let storedValue: string | null = null;

      // Mock storage
      global.GM_setValue = vi.fn((key: string, value: any) => {
        if (key === 'bark_language') {
          storedValue = value;
        }
      });

      global.GM_getValue = vi.fn((key: string) => {
        if (key === 'bark_language') return storedValue;
        return null;
      });

      // Save
      await i18n.setLocale(locale);

      // Load
      const detected = i18n.detectLocale();

      // Should match
      expect(detected).toBe(locale);
    });
  });

  describe('Unit Tests: Locale detection', () => {
    it('should detect locale from navigator.language', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'zh-CN',
        configurable: true,
      });

      const detected = i18n.detectLocale();
      expect(detected).toBe('zh-CN');
    });

    it('should fallback to English for unsupported locale', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'fr-FR',
        configurable: true,
      });

      const detected = i18n.detectLocale();
      expect(detected).toBe('en');
    });

    it('should try navigator.languages if navigator.language is unsupported', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'fr',
        configurable: true,
      });

      Object.defineProperty(navigator, 'languages', {
        value: ['fr', 'ja', 'en'],
        configurable: true,
      });

      const detected = i18n.detectLocale();
      expect(detected).toBe('ja');
    });
  });

  describe('Unit Tests: Translation key lookup', () => {
    beforeEach(async () => {
      // Initialize with English
      await i18n.setLocale('en');
    });

    it('should translate simple keys', () => {
      const translated = i18n.t('common.send');
      expect(translated).toBe('Send');
    });

    it('should translate nested keys', () => {
      const translated = i18n.t('push.title');
      expect(translated).toBe('Title');
    });

    it('should return key if translation not found', () => {
      const translated = i18n.t('nonexistent.key');
      expect(translated).toBe('nonexistent.key');
    });

    it('should handle deep nesting', () => {
      const translated = i18n.t('push.sounds.alarm');
      expect(translated).toBe('Alarm');
    });
  });

  describe('Unit Tests: Locale switching', () => {
    it('should switch locale and update current locale', async () => {
      await i18n.setLocale('ja');
      expect(i18n.getCurrentLocale()).toBe('ja');

      await i18n.setLocale('ko');
      expect(i18n.getCurrentLocale()).toBe('ko');
    });

    it('should not switch to unsupported locale', async () => {
      await i18n.setLocale('en');
      const before = i18n.getCurrentLocale();

      // Try to set unsupported locale
      await i18n.setLocale('fr' as SupportedLocale);

      // Should remain unchanged
      expect(i18n.getCurrentLocale()).toBe(before);
    });
  });

  describe('Unit Tests: Supported locales', () => {
    it('should return list of supported locales', () => {
      const locales = i18n.getSupportedLocales();

      expect(locales).toHaveLength(5);
      expect(locales.map((l) => l.code)).toEqual(['en', 'zh-CN', 'zh-TW', 'ja', 'ko']);
    });

    it('should include native names for each locale', () => {
      const locales = i18n.getSupportedLocales();

      const english = locales.find((l) => l.code === 'en');
      expect(english?.nativeName).toBe('English');

      const chinese = locales.find((l) => l.code === 'zh-CN');
      expect(chinese?.nativeName).toBe('简体中文');
    });
  });
});
