# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bark Push is a Tampermonkey userscript that allows users to send custom push notifications to iOS devices via Bark from any website. It's built with TypeScript, Vite, and vite-plugin-monkey.

**Key Characteristics:**
- Universal: Works on all websites (`*://*/*` match pattern)
- Privacy-first: All user data stored locally via Tampermonkey's GM_setValue/GM_getValue
- Multi-device support: Users can configure multiple Bark devices
- Internationalization: Supports English, Simplified Chinese, Traditional Chinese, Japanese, Korean
- Type-safe: Full TypeScript strict mode with path aliases (`@/*` → `src/*`)

Code comments reference requirement IDs from `.kiro/specs/` (e.g., "Requirements: 1.1, 17.2").

## Development Commands

Use pnpm as the package manager:

```bash
pnpm dev          # Start development server with hot reload
pnpm build        # Build production userscript (output: dist/bark-push.user.js)
pnpm test         # Run tests in watch mode
pnpm test:ui      # Open Vitest UI for interactive testing
pnpm test:run     # Run tests once (CI mode)
pnpm preview      # Preview production build locally
```

## Architecture

### Core Components

**Entry Point** (`src/main.ts`)
- Initializes i18n system, storage manager, and modal controller
- Registers Tampermonkey menu command (`GM_registerMenuCommand`)
- Sets up keyboard shortcut listener (configurable via settings)
- Modal is lazy-injected into the page when user activates the script

**UI Layer** (`src/ui/`)
- `modal.ts` - Main modal container with tabbed interface (Push/History/Settings)
- `push-tab.ts` - Push notification form with advanced options
- `settings-tab.ts` - Device management and configuration
- `history-tab.ts` - Push history view with recall, export/import functionality
- `device-manager.ts` - CRUD operations for Bark devices
- `device-form.ts` / `device-list.ts` / `device-selector.ts` - Device UI components
- `toast.ts` / `confirm-dialog.ts` - User feedback components
- `language-selector.ts` - UI for switching languages

**API Layer** (`src/api/bark-client.ts`)
- `BarkClient` class handles all Bark server communication
- Groups devices by server URL + custom headers for batch requests
- Implements `testConnection()` method for device validation
- Implements `recallNotification()` for deleting sent notifications
- Uses `GM_xmlhttpRequest` for cross-domain requests
- Error handling with user-friendly messages

**Storage** (`src/storage/storage-manager.ts`)
- `StorageManager` class abstracts Tampermonkey GM_* APIs
- Type-safe storage with schema defined in `src/types/index.ts`
- Manages devices, default device, language preference, UI state
- Push history with max 500 records, supports add/update/delete/clear operations

**Internationalization** (`src/i18n/`)
- Lightweight custom i18n solution with type safety
- Translation keys follow nested structure defined in locale files; type safety via `TranslationObject` interface
- Locale detection: user preference → browser language → English fallback
- Five supported locales: en, zh-CN, zh-TW, ja, ko

**Types** (`src/types/`)
- Core interfaces: `BarkDevice`, `NotificationPayload`, `BarkApiRequest`
- History types: `PushHistoryItem`, `PushHistoryDevice`, `PushHistoryResponse`, `PushHistoryStatus`
- Storage schema with `STORAGE_KEYS` constants
- Form data interfaces for validation

**Utilities** (`src/utils/`)
- `validation.ts` - Form validation logic
- `device-factory.ts` - Device creation helpers
- `message-id.ts` - Unique message ID generation for push tracking

### Key Design Patterns

1. **Privacy-First Storage**: All user data stays local via Tampermonkey storage APIs.
2. **Device Grouping**: Devices with same server URL + headers are batched into single API call.
3. **Lazy UI Injection**: Modal DOM is injected only when needed, preventing conflicts with host page.
4. **Type-Safe Translations**: Translation keys follow a structured pattern; type safety is maintained through the `TranslationObject` interface.
5. **Error Resilience**: Network failures are handled gracefully with device-specific error reporting.

### Build System

- **Bundler**: Vite with vite-plugin-monkey for userscript metadata generation
- **Post-processing**: Custom plugin injects i18n metadata into built userscript header
- **Output**: Single `.user.js` file with all dependencies bundled
- **Path Aliases**: `@/` maps to `src/` for cleaner imports

## Testing

- **Framework**: Vitest with jsdom environment
- **Property Testing**: fast-check for generative testing
- **Mocking**: Tampermonkey APIs mocked in `src/test/setup.ts`
- **Coverage**: v8 provider with HTML reports
- **UI Tests**: Component tests using DOM APIs (no React)

Run `pnpm test:ui` for interactive test exploration.

To run a single test file: `pnpm test src/path/to/test.ts`

## Code Style & Standards

See `.kiro/steering/code-style.md` for detailed guidelines.

**Key Points:**
- File naming: kebab-case (`bark-client.ts`)
- Classes: PascalCase (`BarkClient`)
- Functions: camelCase (`sendNotification`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)
- Strict TypeScript: `noUnusedLocals`, `noUnusedParameters` enabled
- Error handling: Always provide user-friendly messages
- Comments: Explain "why" not "what"
- Git commits: Use conventional commits format

## Internationalization

See `.kiro/steering/i18n-internationalization.md` for full details.

**Translation Keys**: Use nested structure (`common.send`, `push.title`)
**Variables**: Use `{variable}` syntax in translation strings
**Locale Files**: Add new languages in `src/i18n/locales/[locale].ts`
**Type Safety**: The `t()` function accepts string keys; ensure keys match those defined in locale files

## Bark API Integration

**Base URL**: User-configured server URL (e.g., `https://api.day.app`)
**Endpoints**:
- `POST /push` - Send notification (main endpoint)
- `GET /ping` - Connection testing
- `POST /push` with `delete: "1"` and same `id` - Recall/delete notification
**Required Fields**: `device_key` (or `device_keys` array) + `body`/`markdown`
**Optional Fields**: `title`, `sound`, `icon`, `group`, `url`, `badge`, `id`, `delete`, etc.
**Custom Headers**: Per-device configuration for authentication
**Message ID**: Generated via `generateMessageId()` for tracking and recall

## Important Notes

1. **Never hardcode** API keys or server URLs - all configuration comes from user storage
2. **Respect host pages**: The script runs on any website; avoid conflicts with existing page styles/scripts
3. **Network errors are common**: Bark servers may be self-hosted or offline; handle gracefully
4. **Keyboard shortcuts**: Configurable via settings; respect input fields (don't trigger when typing)
5. **Device management**: Users can add/edit/delete devices; each has unique server URL + device key
6. **Batch sending**: When multiple devices selected, group by server+headers for efficient API calls
7. **History tracking**: Push history stores up to 500 records with devices, responses, and options snapshot
8. **Recall feature**: Messages can be recalled via Bark's delete API using the same message ID

## Common Development Tasks

### Adding a New UI Component
1. Create component in `src/ui/` with `.ts` and `.test.ts` files
2. Import and use the `t()` function for translatable text
3. Follow existing patterns for DOM manipulation and event handling
4. Add to modal if needed via `modal.ts` or appropriate tab

### Adding a New Translation Key
1. Add key to `src/i18n/locales/en.ts` (English master)
2. Update other locale files with translations
3. Ensure keys are consistent across all locale files (no automatic type generation)
4. Use new key with `t()` function

### Modifying Storage Schema
1. Update `STORAGE_KEYS` and `StorageSchema` in `src/types/index.ts`
2. Add migration logic in `StorageManager` if needed
3. Update any affected components that read/write the changed key

### Testing Network Requests
Use mocked `GM_xmlhttpRequest` in tests (see `src/test/setup.ts`). The `BarkClient` tests demonstrate mocking successful/failed responses.

## Debugging

- Console logs are prefixed with `[Bark Push]`
- Tampermonkey provides script isolation; check Tampermonkey dashboard for errors
- Use `pnpm dev` for hot reload during development
- Test on simple HTML pages to isolate from complex SPA frameworks