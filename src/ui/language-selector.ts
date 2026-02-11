/**
 * LanguageSelector - handles language selection and UI updates
 * Requirements: 17.5, 17.6
 */

import { i18n, t } from '../i18n';
import type { SupportedLocale } from '../i18n';
import { StorageManager } from '../storage/storage-manager';
import type { ToastManager } from './toast';

export class LanguageSelector {
  private storage: StorageManager;
  private toast: ToastManager;
  private container: HTMLElement | null = null;
  private onLanguageChange?: () => void;

  constructor(storage: StorageManager, toast: ToastManager) {
    this.storage = storage;
    this.toast = toast;
  }

  /**
   * Set callback for when language changes
   * This allows parent components to re-render their UI
   */
  setOnLanguageChange(callback: () => void): void {
    this.onLanguageChange = callback;
  }

  /**
   * Render the language selector
   * Requirement 17.5: Display language selector dropdown
   */
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'bark-language-selector';

    const label = document.createElement('label');
    label.textContent = t('settings.languageLabel');
    label.htmlFor = 'bark-language-select';
    label.style.cssText = `
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
    `;

    const select = document.createElement('select');
    select.id = 'bark-language-select';
    select.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    `;

    // Get current locale
    const currentLocale = i18n.getCurrentLocale();

    // Populate options with all supported languages
    const locales = i18n.getSupportedLocales();
    locales.forEach((locale) => {
      const option = document.createElement('option');
      option.value = locale.code;
      option.textContent = `${locale.nativeName} (${locale.name})`;
      if (locale.code === currentLocale) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    // Handle language change
    select.addEventListener('change', () => {
      this.handleLanguageChange(select.value as SupportedLocale);
    });

    container.appendChild(label);
    container.appendChild(select);

    this.container = container;
    return container;
  }

  /**
   * Handle language change
   * Requirements: 17.6, 17.7, 17.8
   */
  private async handleLanguageChange(locale: SupportedLocale): Promise<void> {
    try {
      // Requirement 17.6: Update i18n system
      await i18n.setLocale(locale);

      // Requirement 17.7: Persist language preference
      this.storage.setLanguage(locale);

      // Requirement 17.6: Update all UI text immediately
      if (this.onLanguageChange) {
        this.onLanguageChange();
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      this.toast.show(t('errors.unknownError'), 'error');
    }
  }

  /**
   * Update the language selector display
   * Called when language changes externally
   */
  updateDisplay(): void {
    if (!this.container) return;

    const select = this.container.querySelector('select');
    const label = this.container.querySelector('label');

    if (select) {
      select.value = i18n.getCurrentLocale();
    }

    if (label) {
      label.textContent = t('settings.languageLabel');
    }
  }
}
