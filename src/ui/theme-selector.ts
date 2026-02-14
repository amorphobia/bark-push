/**
 * ThemeSelector - handles theme selection and UI updates
 */

import { themeManager } from './theme-manager';
import type { ThemeType } from '../types';
import { StorageManager } from '../storage/storage-manager';
import type { ToastManager } from './toast';
import { t } from '../i18n';

export class ThemeSelector {
  private toast: ToastManager;
  private container: HTMLElement | null = null;
  private onThemeChange?: () => void;

  constructor(_storage: StorageManager, toast: ToastManager) {
    this.toast = toast;
  }

  /**
   * Set callback for when theme changes
   * This allows parent components to re-render their UI
   */
  setOnThemeChange(callback: () => void): void {
    this.onThemeChange = callback;
  }

  /**
   * Render the theme selector
   */
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'bark-theme-selector';

    const label = document.createElement('label');
    label.textContent = t('settings.themeLabel');
    label.htmlFor = 'bark-theme-select';
    label.style.cssText = `
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--bark-text-primary);
    `;

    const select = document.createElement('select');
    select.id = 'bark-theme-select';
    select.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--bark-border);
      border-radius: 4px;
      font-size: 14px;
      background: var(--bark-bg-primary);
      color: var(--bark-text-primary);
      cursor: pointer;
    `;

    // Get current theme
    const currentTheme = themeManager.getTheme();

    // Populate options with all theme options
    const themeOptions: Array<{ value: ThemeType, labelKey: string }> = [
      { value: 'light', labelKey: 'settings.themeOptions.light' },
      { value: 'dark', labelKey: 'settings.themeOptions.dark' },
      { value: 'auto', labelKey: 'settings.themeOptions.auto' },
    ];

    themeOptions.forEach(({ value, labelKey }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = t(labelKey);
      if (value === currentTheme) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    // Handle theme change
    select.addEventListener('change', () => {
      this.handleThemeChange(select.value as ThemeType);
    });

    container.appendChild(label);
    container.appendChild(select);

    this.container = container;
    return container;
  }

  /**
   * Handle theme change
   */
  private async handleThemeChange(theme: ThemeType): Promise<void> {
    try {
      // Update theme manager
      themeManager.setTheme(theme);

      // Trigger callback after theme is applied
      if (this.onThemeChange) {
        this.onThemeChange();
      }
    } catch (error) {
      console.error('Failed to change theme:', error);
      this.toast.show(t('errors.unknownError'), 'error');
    }
  }

  /**
   * Update the theme selector display
   * Called when theme changes externally
   */
  updateDisplay(): void {
    if (!this.container) return;

    const select = this.container.querySelector('select');
    const label = this.container.querySelector('label');

    if (select) {
      select.value = themeManager.getTheme();
    }

    if (label) {
      label.textContent = t('settings.themeLabel');
    }
  }
}