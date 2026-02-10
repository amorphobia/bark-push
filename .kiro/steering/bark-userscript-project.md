---
inclusion: always
---

# Bark Push Userscript Project

## What We're Building
A universal userscript that allows users to send custom push notifications to their iOS devices via Bark from any website they're browsing.

## About Bark
Bark is an open-source iOS app that receives push notifications through Apple's APNs service. Users can send notifications by making simple HTTP requests.

### Bark API Basics

#### Ping Endpoint (GET)
Used to test server connectivity:
```
GET {protocol}://{url}/ping
```

#### Healthz Endpoint (GET)
Used to check server health:
```
GET {protocol}://{url}/heathz
```

#### Info Endpoint (GET)
Used to get server information:
```
GET {protocol}://{url}/info
```

#### Push Notification Endpoint (POST)
We only support POST requests with JSON format:
```
POST {protocol}://{url}/push
Content-Type: application/json; charset=utf-8

{
  "body": "Notification body text",
  "title": "Notification title",
  "device_key": "your_device_key"
}
```

**Required Parameters:**
- `body` (string): Notification body text (recommended max 30 characters)
- `device_key` (string): 22-character device key from Bark app

**Optional Parameters:**
- `title` (string): Notification title (recommended max 8 characters)
- `subtitle` (string): Notification subtitle
- `device_keys` (array): Used for batch pushing
- `sound` (string): Notification ringtone (e.g., "alarm", "anticipate", "bell", "birdsong", "bloom", "calypso", "chime", "choo", "descent", "electronic", "fanfare", "glass", "gotosleep", "healthnotification", "horn", "ladder", "mailsent", "minuet", "multiwayinvitation", "newmail", "newsflash", "noir", "paymentsuccess", "shake", "sherwoodforest", "silence", "spell", "suspense", "telegraph", "tiptoes", "typewriters", "update")
- `icon` (string): Custom icon URL (downloaded once per unique URL)
- `group` (string): Notification grouping (recommended max 8 characters)
- `url` (string): URL to open when notification is tapped (supports URL Scheme and Universal Link)
- `badge` (integer): Badge count to display on Bark app icon
- `level` (string): Notification priority - "critical", "active" (default), "timeSensitive", or "passive"
- `volume` (integer): Notification volume (0-10)
- `call` (string): Must be 1, The ringtone will continue to play for 30 seconds
- `isArchive` (string): Value must be 1. Whether or not should be archived by the app
- `autoCopy` (string): Must be 1
- `copy` (string): Specific content to copy (if not specified, copies entire notification)
- `automaticallyCopy` (boolean): Alternative name for autoCopy
- `ciphertext` (string): The ciphertext of encrypted push notifications
- `action` (string): Set to "none", tap notifications do nothing
- `markdown` (string): Push content with basic Markdown. When this is provided, the body field is ignored.
- `image` (string): URL of image to push
- `id` (string): When using the same ID value, it will update the corresponding push notification content; Requires Bark v1.5.2, bark-server v2.2.5 or above
- `delete` (string): Pass "1" to delete the notification from the system notification center and APP history, must be used with the id parameter; Requires "Background App Refresh" to be enabled in settings, otherwise it will not work.

**Custom Headers:**
- Users can configure custom HTTP headers for their devices
- Common use case: Authentication or tokens for Bark servers behind proxies
- Headers are stored per-device in Tampermonkey storage
- Example: `Authorization: Bearer token123` or `X-Custom-Auth: secret`

**Key Points:**
- Endpoint is always `/push` for notifications
- Must use POST with JSON body
- **Each device has**: A unique server URL + a unique device key

## Product Requirements

### Core Functionality
- **Universal**: Works on ALL websites (match pattern: `*://*/*`)
- **User-triggered**: Notifications are ALWAYS sent by user choice, never automatic
- **Multi-device support**: Users can configure multiple Bark devices
- **Flexible content**: Users can send any content they want with notifications

### User Data Management
- **NEVER hardcode** API keys or server URLs
- **Use GM_setValue/GM_getValue** (Tampermonkey storage) for persistence
- **User must configure**: Server URL and device key for each device
- **Privacy first**: All data stays local in Tampermonkey storage

### Target Audience
This is a public product. Any Bark user should be able to:
1. Install the userscript
2. Configure their Bark device(s)
3. Start sending notifications from any website

## Technical Constraints
- Must work across all websites without conflicts
- Must handle network errors gracefully
- Must respect user privacy (no data collection)
- Must be easy to configure for non-technical users
