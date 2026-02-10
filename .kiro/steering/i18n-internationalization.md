---
inclusion: always
---

# Internationalization (i18n) Standards

## Approach
Use a lightweight, custom i18n solution built with TypeScript for type safety and minimal bundle size.

## File Structure
```
src/
  i18n/
    index.ts           # Main i18n logic, t() function, locale detection
    types.ts           # TypeScript types for translation keys
    locales/
      en.ts            # English (default/fallback)
      zh-CN.ts         # Simplified Chinese
      zh-TW.ts         # Traditional Chinese
      ja.ts            # Japanese
      ko.ts            # Korean
      [locale].ts      # Other languages as needed
```

## Translation File Format

Each locale file exports a const object with nested structure:

```typescript
// src/i18n/locales/en.ts
export default {
  common: {
    send: 'Send',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    add: 'Add',
    remove: 'Remove',
  },
  push: {
    title: 'Title',
    titlePlaceholder: 'Notification title',
    body: 'Body',
    bodyPlaceholder: 'Notification content',
    selectDevice: 'Select Device',
    sendButton: 'Send Notification',
    sending: 'Sending...',
    success: 'Notification sent successfully!',
    noDevices: 'Add a device in Settings to get started',
    advancedOptions: 'Advanced Options',
  },
  settings: {
    title: 'Settings',
    devices: 'Devices',
    addDevice: 'Add Device',
    editDevice: 'Edit Device',
    deleteDevice: 'Delete Device',
    deviceName: 'Device Name',
    deviceNamePlaceholder: 'e.g., My iPhone, Work iPad',
    deviceNameHint: 'Give your device a friendly name',
    serverUrl: 'Server URL',
    serverUrlPlaceholder: 'https://api.day.app',
    deviceKey: 'Device Key',
    deviceKeyPlaceholder: '22-character key from Bark app',
    customHeaders: 'Custom Headers (Optional)',
    customHeadersPlaceholder: 'Authorization: Bearer token',
    testConnection: 'Test Connection',
    testing: 'Testing...',
    testSuccess: 'Connection successful!',
    testFailed: 'Connection failed. Check your settings.',
  },
  errors: {
    required: '{field} is required',
    invalidUrl: 'Invalid URL format',
    invalidKey: 'Device key must be 22 characters',
    networkError: 'Network error. Please try again.',
    serverError: 'Server error. Check your server URL.',
    unknownError: 'An unexpected error occurred',
  },
  menu: {
    sendToBark: '📱 Send to Bark',
  },
} as const;
```

## Usage in Code

### Basic Translation
```typescript
import { t } from '@/i18n';

// Simple translation
const buttonText = t('common.send');

// Nested keys
const title = t('push.title');
const placeholder = t('settings.deviceNamePlaceholder');
```

### Translation with Variables
```typescript
// For strings with variables, use template literals
const error = t('errors.required').replace('{field}', 'Server URL');

// Or create a helper function
function tr(key: string, vars: Record<string, string>): string {
  let text = t(key);
  Object.entries(vars).forEach(([k, v]) => {
    text = text.replace(`{${k}}`, v);
  });
  return text;
}

const error = tr('errors.required', { field: 'Server URL' });
```

### In HTML/DOM
```typescript
// Set text content
element.textContent = t('common.send');

// Set placeholder
input.placeholder = t('settings.deviceNamePlaceholder');

// Set title/tooltip
button.title = t('settings.testConnection');
```

## Locale Detection

### Priority Order
1. User preference (stored in GM_getValue)
2. Browser language (`navigator.language`)
3. Browser languages list (`navigator.languages[0]`)
4. Fallback to English

### Supported Locales
- `en` - English (default)
- `zh-CN` - Simplified Chinese
- `zh-TW` - Traditional Chinese
- `ja` - Japanese
- `ko` - Korean
- More can be added as needed

### Locale Matching
- Exact match first: `zh-CN` → `zh-CN.ts`
- Language fallback: `zh-Hans` → `zh-CN.ts`
- Base language: `zh` → `zh-CN.ts`
- Final fallback: `en.ts`

## Type Safety

### Auto-generated Types
```typescript
// src/i18n/types.ts (auto-generated from en.ts)
type TranslationKeys = 
  | 'common.send'
  | 'common.cancel'
  | 'push.title'
  | 'settings.deviceName'
  // ... all keys

export type { TranslationKeys };
```

### Type-safe t() Function
```typescript
import type { TranslationKeys } from './types';

export function t(key: TranslationKeys): string {
  // Implementation
}
```

This ensures:
- ✅ Autocomplete for all translation keys
- ✅ Compile-time errors for missing keys
- ✅ Refactoring safety

## Adding New Languages

1. Copy `src/i18n/locales/en.ts` to `src/i18n/locales/[locale].ts`
2. Translate all strings
3. Import in `src/i18n/index.ts`
4. Add to supported locales list

## Best Practices

### String Guidelines
- Keep strings concise and clear
- Use sentence case for UI text
- Include context in key names (`push.title` not just `title`)
- Group related strings together

### Placeholders
- Use `{variable}` syntax for variables
- Document what each variable represents
- Example: `'Hello {name}!'` → `'Hello John!'`

### Punctuation
- Include punctuation in translation strings
- Don't concatenate strings (breaks i18n)
- ❌ Bad: `t('hello') + ' ' + name + '!'`
- ✅ Good: `t('greeting').replace('{name}', name)`

### Testing
- Test with different locales during development
- Verify text doesn't overflow UI elements
- Check RTL languages if supported (future)

## Performance
- All translations loaded at startup (~2-3KB total)
- No runtime translation overhead
- Locale detection happens once on init
- Translations cached in memory
