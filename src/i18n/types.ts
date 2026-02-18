// Type definitions for i18n system

export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
}

export type SupportedLocale = 'en' | 'zh-CN' | 'zh-TW' | 'ja' | 'ko';

export interface TranslationObject {
  [key: string]: string | TranslationObject;
}

export interface I18nInterface {
  t(key: string, replacements?: Record<string, string>): string;
}
