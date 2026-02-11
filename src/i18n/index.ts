// i18n system for Bark Push Userscript
import type { LocaleInfo, SupportedLocale, TranslationObject } from './types';

// Supported locales configuration
const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
];

class I18n {
  private currentLocale: SupportedLocale = 'en';
  private translations: TranslationObject = {};
  private fallbackTranslations: TranslationObject = {};

  /**
   * Initialize the i18n system
   * Detects locale and loads translations
   */
  async init(): Promise<void> {
    this.currentLocale = this.detectLocale();
    await this.loadTranslations(this.currentLocale);
  }

  /**
   * Detect the user's preferred locale
   * Priority: stored preference > browser language > fallback to English
   */
  detectLocale(): SupportedLocale {
    // Try to get stored preference (will be implemented with StorageManager)
    const storedLocale = this.getStoredLocale();
    if (storedLocale && this.isSupported(storedLocale)) {
      return storedLocale as SupportedLocale;
    }

    // Try browser language
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang) {
      const matched = this.matchLocale(browserLang);
      if (matched) {
        return matched;
      }
    }

    // Try browser languages list
    if (navigator.languages && navigator.languages.length > 0) {
      for (const lang of navigator.languages) {
        const matched = this.matchLocale(lang);
        if (matched) {
          return matched;
        }
      }
    }

    // Fallback to English
    return 'en';
  }

  /**
   * Match a browser language string to a supported locale
   * Handles exact matches, language fallbacks, and base language matching
   */
  private matchLocale(browserLang: string): SupportedLocale | null {
    // Exact match (e.g., "zh-CN" -> "zh-CN")
    if (this.isSupported(browserLang)) {
      return browserLang as SupportedLocale;
    }

    // Try lowercase exact match
    const lowerLang = browserLang.toLowerCase();
    const exactMatch = SUPPORTED_LOCALES.find(
      (locale) => locale.code.toLowerCase() === lowerLang
    );
    if (exactMatch) {
      return exactMatch.code as SupportedLocale;
    }

    // Base language match (e.g., "zh" -> "zh-CN", "zh-Hans" -> "zh-CN")
    const baseLang = browserLang.split('-')[0].toLowerCase();
    const baseMatch = SUPPORTED_LOCALES.find(
      (locale) => locale.code.split('-')[0].toLowerCase() === baseLang
    );
    if (baseMatch) {
      return baseMatch.code as SupportedLocale;
    }

    return null;
  }

  /**
   * Check if a locale is supported
   */
  private isSupported(locale: string): boolean {
    return SUPPORTED_LOCALES.some((l) => l.code === locale);
  }

  /**
   * Get stored locale preference from GM_getValue
   */
  private getStoredLocale(): string | null {
    try {
      if (typeof GM_getValue !== 'undefined') {
        return GM_getValue('bark_language', null);
      }
    } catch (error) {
      console.warn('Failed to get stored locale:', error);
    }
    return null;
  }

  /**
   * Load translations for a specific locale
   */
  async loadTranslations(locale: SupportedLocale): Promise<void> {
    try {
      // Dynamic import based on locale
      const module = await import(`./locales/${locale}.ts`);
      this.translations = module.default;

      // Always load English as fallback
      if (locale !== 'en') {
        const fallbackModule = await import('./locales/en.ts');
        this.fallbackTranslations = fallbackModule.default;
      }
    } catch (error) {
      console.error(`Failed to load translations for ${locale}:`, error);
      // Load English as fallback
      if (locale !== 'en') {
        const fallbackModule = await import('./locales/en.ts');
        this.translations = fallbackModule.default;
      }
    }
  }

  /**
   * Translate a key to the current locale
   * Supports nested keys with dot notation (e.g., "push.title")
   */
  t(key: string): string {
    const value = this.getNestedValue(this.translations, key);
    if (value !== undefined) {
      return value;
    }

    // Try fallback translations
    if (this.currentLocale !== 'en') {
      const fallbackValue = this.getNestedValue(this.fallbackTranslations, key);
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
    }

    // Return key if translation not found
    console.warn(`Translation not found for key: ${key}`);
    return key;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: TranslationObject, key: string): string | undefined {
    const keys = key.split('.');
    let current: any = obj;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }

    return typeof current === 'string' ? current : undefined;
  }

  /**
   * Set the current locale and reload translations
   */
  async setLocale(locale: SupportedLocale): Promise<void> {
    if (!this.isSupported(locale)) {
      console.warn(`Locale ${locale} is not supported`);
      return;
    }

    this.currentLocale = locale;
    await this.loadTranslations(locale);

    // Store preference
    try {
      if (typeof GM_setValue !== 'undefined') {
        GM_setValue('bark_language', locale);
      }
    } catch (error) {
      console.warn('Failed to store locale preference:', error);
    }
  }

  /**
   * Get the current locale
   */
  getCurrentLocale(): SupportedLocale {
    return this.currentLocale;
  }

  /**
   * Get list of supported locales
   */
  getSupportedLocales(): LocaleInfo[] {
    return SUPPORTED_LOCALES;
  }
}

// Create singleton instance
const i18n = new I18n();

// Export convenience function
export function t(key: string): string {
  return i18n.t(key);
}

// Export i18n instance
export { i18n };
export type { LocaleInfo, SupportedLocale };
