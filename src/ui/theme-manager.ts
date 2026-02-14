/**
 * ThemeManager - handles theme detection, switching, and CSS variable injection
 */

import type { ThemeType } from '../types';
import { StorageManager } from '../storage/storage-manager';

// CSS variable names for theming
const CSS_VARIABLES = {
  // Background colors
  BG_PRIMARY: '--bark-bg-primary',
  BG_SECONDARY: '--bark-bg-secondary',
  BG_TERTIARY: '--bark-bg-tertiary',
  // Text colors
  TEXT_PRIMARY: '--bark-text-primary',
  TEXT_SECONDARY: '--bark-text-secondary',
  // Border colors
  BORDER: '--bark-border',
  BORDER_LIGHT: '--bark-border-light',
  // Accent colors
  PRIMARY: '--bark-primary',
  PRIMARY_HOVER: '--bark-primary-hover',
  DANGER: '--bark-danger',
  DANGER_HOVER: '--bark-danger-hover',
  SUCCESS: '--bark-success',
  // UI colors
  OVERLAY: '--bark-overlay',
  SHADOW: '--bark-shadow',
} as const;

// Light theme color palette (iOS-style)
const LIGHT_PALETTE: Record<string, string> = {
  [CSS_VARIABLES.BG_PRIMARY]: '#ffffff',
  [CSS_VARIABLES.BG_SECONDARY]: '#f5f5f5',
  [CSS_VARIABLES.BG_TERTIARY]: '#f8f9fa',
  [CSS_VARIABLES.TEXT_PRIMARY]: '#333333',
  [CSS_VARIABLES.TEXT_SECONDARY]: '#666666',
  [CSS_VARIABLES.BORDER]: '#e5e5e5',
  [CSS_VARIABLES.BORDER_LIGHT]: '#dddddd',
  [CSS_VARIABLES.PRIMARY]: '#007aff',
  [CSS_VARIABLES.PRIMARY_HOVER]: '#0051d5',
  [CSS_VARIABLES.DANGER]: '#ff3b30',
  [CSS_VARIABLES.DANGER_HOVER]: '#d70015',
  [CSS_VARIABLES.SUCCESS]: '#34c759',
  [CSS_VARIABLES.OVERLAY]: 'rgba(0, 0, 0, 0.5)',
  [CSS_VARIABLES.SHADOW]: 'rgba(0, 0, 0, 0.15)',
};

// Dark theme color palette (iOS-style true black)
const DARK_PALETTE: Record<string, string> = {
  [CSS_VARIABLES.BG_PRIMARY]: '#000000',
  [CSS_VARIABLES.BG_SECONDARY]: '#1c1c1e',
  [CSS_VARIABLES.BG_TERTIARY]: '#2c2c2e',
  [CSS_VARIABLES.TEXT_PRIMARY]: '#ffffff',
  [CSS_VARIABLES.TEXT_SECONDARY]: '#8e8e93',
  [CSS_VARIABLES.BORDER]: '#38383a',
  [CSS_VARIABLES.BORDER_LIGHT]: '#48484a',
  [CSS_VARIABLES.PRIMARY]: '#0a84ff',
  [CSS_VARIABLES.PRIMARY_HOVER]: '#409cff',
  [CSS_VARIABLES.DANGER]: '#ff453a',
  [CSS_VARIABLES.DANGER_HOVER]: '#ff6961',
  [CSS_VARIABLES.SUCCESS]: '#30d158',
  [CSS_VARIABLES.OVERLAY]: 'rgba(0, 0, 0, 0.7)',
  [CSS_VARIABLES.SHADOW]: 'rgba(0, 0, 0, 0.3)',
};

/**
 * ThemeManager class
 * Singleton that manages theme detection, switching, and CSS variable injection
 */
export class ThemeManager {
  private static instance: ThemeManager | null = null;

  private storage: StorageManager | null = null;
  private currentTheme: ThemeType = 'auto';
  private onThemeChangeCallbacks: Array<() => void> = [];
  private systemThemeMediaQuery: MediaQueryList | null = null;
  private systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Initialize theme manager with storage
   * Must be called before using theme manager
   */
  init(storage: StorageManager): void {
    this.storage = storage;

    // Load saved theme preference
    this.currentTheme = storage.getTheme();

    // Apply initial theme
    this.applyTheme();

    // Set up system theme detection for 'auto' mode
    this.setupSystemThemeDetection();
  }

  /**
   * Set up system theme detection using matchMedia
   */
  private setupSystemThemeDetection(): void {
    // Clean up existing listener if any
    if (this.systemThemeListener && this.systemThemeMediaQuery) {
      this.systemThemeMediaQuery.removeEventListener('change', this.systemThemeListener);
    }

    // Create new listener
    this.systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemThemeListener = (_event: MediaQueryListEvent) => {
      // Only respond if current theme is 'auto'
      if (this.currentTheme === 'auto') {
        this.applyTheme();
        this.notifyThemeChange();
      }
    };

    this.systemThemeMediaQuery.addEventListener('change', this.systemThemeListener);
  }

  /**
   * Detect the current page theme by checking computed styles
   * This works regardless of how the page implements dark mode (CSS classes, custom properties, inline styles)
   */
  private detectPageTheme(): 'light' | 'dark' {
    try {
      // Guard: check if document.body exists (may not in test environments)
      if (!document || !document.body) {
        return this.detectSystemTheme();
      }

      // Get computed styles from document body
      const bodyStyle = getComputedStyle(document.body);

      // Check background color brightness
      const bgColor = bodyStyle.backgroundColor;
      const textColor = bodyStyle.color;

      // Parse RGB values from computed styles
      const bgRgb = this.parseRgb(bgColor);
      const textRgb = this.parseRgb(textColor);

      if (!bgRgb || !textRgb) {
        // Fallback to system theme if parsing fails
        return this.detectSystemTheme();
      }

      // Calculate relative luminance
      const bgLuminance = this.getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
      const textLuminance = this.getLuminance(textRgb.r, textRgb.g, textRgb.b);

      // If text is brighter than background, it's likely dark mode
      // (dark background with light text = typical dark mode)
      return textLuminance > bgLuminance ? 'dark' : 'light';
    } catch {
      // Fallback to system theme on error
      return this.detectSystemTheme();
    }
  }

  /**
   * Parse RGB values from CSS rgb() or rgba() string
   */
  private parseRgb(colorString: string): { r: number; g: number; b: number } | null {
    const match = colorString.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
      };
    }
    return null;
  }

  /**
   * Calculate relative luminance using sRGB formula
   */
  private getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      const srgb = c / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Detect the current system theme (light or dark)
   */
  private detectSystemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * Get the effective theme (resolves 'auto' to page theme)
   */
  getEffectiveTheme(): 'light' | 'dark' {
    if (this.currentTheme === 'auto') {
      // For auto mode, detect page theme first
      return this.detectPageTheme();
    }
    return this.currentTheme;
  }

  /**
   * Get the current theme preference
   */
  getTheme(): ThemeType {
    return this.currentTheme;
  }

  /**
   * Set the theme preference
   */
  setTheme(theme: ThemeType): void {
    if (!this.storage) {
      throw new Error('ThemeManager not initialized. Call init() first.');
    }

    const oldTheme = this.currentTheme;
    this.currentTheme = theme;

    try {
      // Save to storage
      this.storage.setTheme(theme);

      // Apply new theme
      this.applyTheme();

      // Notify callbacks if theme actually changed
      if (oldTheme !== theme) {
        this.notifyThemeChange();
      }
    } catch (error) {
      // Revert on error
      this.currentTheme = oldTheme;
      console.error('Failed to set theme:', error);
      throw error;
    }
  }

  /**
   * Apply the current theme to the document and any registered elements
   */
  applyTheme(): void {
    const effectiveTheme = this.getEffectiveTheme();
    const palette = effectiveTheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;

    // Apply CSS variables to document root
    this.applyCssVariablesToElement(document.documentElement, palette);

    // Apply to any additional registered elements (like shadow DOM)
    // This is handled by callbacks from components
  }

  /**
   * Apply CSS variables to a specific element
   * Useful for shadow DOM elements that don't inherit from document root
   */
  applyCssVariablesToElement(element: HTMLElement, palette?: Record<string, string>): void {
    const effectiveTheme = this.getEffectiveTheme();
    const targetPalette = palette || (effectiveTheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE);

    Object.entries(targetPalette).forEach(([variable, value]) => {
      element.style.setProperty(variable, value);
    });
  }

  /**
   * Get the CSS variable palette for the current theme
   * Useful for components that need to apply variables manually
   */
  getCurrentPalette(): Record<string, string> {
    const effectiveTheme = this.getEffectiveTheme();
    return effectiveTheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
  }

  /**
   * Register a callback for theme changes
   */
  setOnThemeChange(callback: () => void): void {
    this.onThemeChangeCallbacks.push(callback);
  }

  /**
   * Remove a callback
   */
  removeOnThemeChange(callback: () => void): void {
    const index = this.onThemeChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.onThemeChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all registered callbacks of theme change
   */
  private notifyThemeChange(): void {
    this.onThemeChangeCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in theme change callback:', error);
      }
    });
  }

  /**
   * Clean up resources (event listeners)
   */
  cleanup(): void {
    if (this.systemThemeListener && this.systemThemeMediaQuery) {
      this.systemThemeMediaQuery.removeEventListener('change', this.systemThemeListener);
      this.systemThemeListener = null;
      this.systemThemeMediaQuery = null;
    }
    this.onThemeChangeCallbacks = [];
  }
}

// Export singleton instance
export const themeManager = ThemeManager.getInstance();