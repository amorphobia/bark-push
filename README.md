# Bark Push

---
[中文自述](./README-zh.md)

A Tampermonkey userscript that lets you send custom push notifications to your iOS devices from any website using [Bark](https://github.com/Finb/Bark).

## Features

- **Universal** - Works on any website
- **Multi-device** - Send to multiple iOS devices at once
- **Rich Notifications** - Support for custom sounds, icons, images, and more
- **Markdown** - Send rich formatted messages
- **History** - View and manage sent notifications
- **Recall** - Delete previously sent notifications
- **Privacy-first** - All data stored locally on your device
- **International** - Supports English, Chinese (Simplified/Traditional), Japanese, Korean

## Installation

1. Install the [Tampermonkey](https://tampermonkey.net/) browser extension
2. Download `bark-push.user.js` from the [Releases](https://gitea.xuesong.eu.org/me/bark-push/releases) page
3. Open Tampermonkey dashboard and go to "Utilities"
4. Click "Import" and select the downloaded file
5. Or: Copy the script content and create a new Tampermonkey script

## Usage

1. Press `Alt+B` (or your custom shortcut) to open the push dialog
2. Enter your message and select target device(s)
3. Click "Send Notification"
4. Your iOS device will receive the push notification

### History & Recall

- Click the "History" tab to view all sent notifications
- Use the search filter to find specific messages
- Click the recall button (undo icon) to delete a sent notification
- Export/import your history for backup

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build production userscript
pnpm build

# Run tests
pnpm test:run
```

## License

[AGPL-3.0](./LICENSE)
