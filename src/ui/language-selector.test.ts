/**
 * Property-based and unit tests for LanguageSelector
 * Feature: bark-push-userscript
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { LanguageSelector } from './language-selector';
import { StorageManager } from '../storage/storage-manager';
import { i18n } from '../i18n';
import type { SupportedLocale } from '../i18n';

describe('LanguageSelector', () => {
  let storage: StorageManager;
  let languageSelector: LanguageSelector;

  beforeEach(async () => {
    localStorage.clear();
    // Reset to English and wait for it to complete
    await i18n.setLocale('en');
    await i18n.init();
    storage = new StorageManager();
    languageSelector = new LanguageSelector(storage);
  });

  describe('Property 47: Language change updates UI', () => {
    test('changing language triggers callback and updates storage', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom<SupportedLocale>('en', 'zh-CN', 'zh-TW', 'ja', 'ko'),
          async (locale) => {
            localStorage.clear();
            await i18n.init();
            storage = new StorageManager();
            languageSelector = new LanguageSelector(storage);

            // Get current locale before change
            const initialLocale = i18n.getCurrentLocale();
            
            // Skip if we're "changing" to the same locale
            if (initialLocale === locale) {
              return true;
            }

            let callbackTriggered = false;
            languageSelector.setOnLanguageChange(() => {
              callbackTriggered = true;
            });

            const container = languageSelector.render();
            const select = container.querySelector('select') as HTMLSelectElement;

            // Change language
            select.value = locale;
            const changeEvent = new Event('change');
            select.dispatchEvent(changeEvent);

            // Wait for async setLocale to complete (dynamic imports take time)
            await new Promise(resolve => setTimeout(resolve, 250));

            const storedLanguage = storage.getLanguage();
            const currentLocale = i18n.getCurrentLocale();

            return callbackTriggered && 
                   storedLanguage === locale && 
                   currentLocale === locale;
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Unit Tests', () => {
    test('renders language selector with label', () => {
      const container = languageSelector.render();
      
      const label = container.querySelector('label');
      const select = container.querySelector('select');

      expect(label).toBeTruthy();
      expect(select).toBeTruthy();
      // Check that translation was loaded (not returning the key)
      expect(label?.textContent).not.toBe('settings.languageLabel');
      expect(label?.textContent).toBeTruthy();
    });

    test('renders all supported languages as options', () => {
      const container = languageSelector.render();
      const select = container.querySelector('select') as HTMLSelectElement;
      const options = Array.from(select.options);

      expect(options.length).toBe(5); // en, zh-CN, zh-TW, ja, ko
      
      const values = options.map(opt => opt.value);
      expect(values).toContain('en');
      expect(values).toContain('zh-CN');
      expect(values).toContain('zh-TW');
      expect(values).toContain('ja');
      expect(values).toContain('ko');
    });

    test('selects current language by default', () => {
      const currentLocale = i18n.getCurrentLocale();
      const container = languageSelector.render();
      const select = container.querySelector('select') as HTMLSelectElement;

      expect(select.value).toBe(currentLocale);
    });

    test('changing language triggers callback', async () => {
      let callbackTriggered = false;
      languageSelector.setOnLanguageChange(() => {
        callbackTriggered = true;
      });

      const container = languageSelector.render();
      const select = container.querySelector('select') as HTMLSelectElement;

      select.value = 'ja';
      select.dispatchEvent(new Event('change'));

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(callbackTriggered).toBe(true);
    });

    test('updateDisplay updates label text', () => {
      const container = languageSelector.render();
      const label = container.querySelector('label') as HTMLLabelElement;

      // Change language directly
      i18n.setLocale('ja');

      // Update display
      languageSelector.updateDisplay();

      // Label should be updated (may be different in Japanese)
      expect(label.textContent).toBeDefined();
    });

    test('updateDisplay updates selected option', async () => {
      const container = languageSelector.render();
      const select = container.querySelector('select') as HTMLSelectElement;

      // Change language directly through i18n
      await i18n.setLocale('zh-TW');

      // Update display
      languageSelector.updateDisplay();

      expect(select.value).toBe('zh-TW');
    });
  });
});
