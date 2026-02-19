# Plan: History and Recall Feature

## Context

This plan implements a message history and recall feature for the Bark Push userscript. Currently, when users send notifications, there's no record of past messages. Users need to:

1. Track sent notifications with unique IDs
2. Recall (delete) previously sent notifications
3. View and manage push history with filtering
4. Export/import history data

## Implementation Plan

### Phase 1: Message ID Generation

**Location**: New file `src/utils/message-id.ts`

**Approach**: Timestamp-based ID using `Date.now().toString(36)` + random suffix

```typescript
export function generateMessageId(): string {
  // timestamp in base-36 (~13 chars) + 6 random alphanumeric chars
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${random}`; // ~19 chars total
}
```

**Comparison**:
| Method | Length | Pros | Cons |
|--------|--------|------|------|
| Timestamp only | ~13 chars | Simple | Collision possible if same ms + same device |
| UUID v4 | 36 chars | Standard, unique | Verbose, overkill for local use |
| Timestamp + random | ~19 chars | Compact, low collision | Slightly more complex |

Timestamp + random is chosen for compactness while maintaining sufficient uniqueness for a single-user local script.

### Phase 2: Toast Enhancement for Recall Button

**Location**: `src/ui/toast.ts`

Add new method `showWithActions()`:

```typescript
interface ToastAction {
  label: string;
  svg: string; // SVG markup
  callback: () => void;
}

showWithActions(
  message: string,
  actions: ToastAction[],
  type: ToastType = 'info',
  duration: number = 0 // no auto-dismiss for recall toasts
): string
```

The success toast on push will use this to show both recall and dismiss buttons:
- **Recall button**: Undo arrow SVG, calls `recallMessage(id)` on click
- **Dismiss button**: X SVG, calls `toast.hide(id)` on click

### Phase 3: History Storage Schema

**Location**: `src/types/index.ts`

Add new interface and storage key:

```typescript
export type PushHistoryStatus = 'pending' | 'sent' | 'failed' | 'recalled';

export interface PushHistoryItem {
  /** Unique message ID sent to Bark server */
  id: string;

  /** Current status of the message */
  status: PushHistoryStatus;

  /** Notification title */
  title?: string;

  /** Notification body or markdown content */
  content: string;

  /** Whether markdown was enabled */
  markdownEnabled: boolean;

  /** Device IDs this was sent to (broadcasts share same ID) */
  deviceIds: string[];

  /** Device names at send time (for display) */
  deviceNames: string[];

  /** Timestamp when sent (ISO 8601) */
  sentAt: string;

  /** Per-device status for multi-device sends */
  deviceStatuses?: Record<string, PushHistoryStatus>;

  /** Snapshot of advanced options */
  options?: {
    sound?: string;
    icon?: string;
    group?: string;
    url?: string;
    autoCopy?: boolean;
    isArchive?: boolean;
    subtitle?: string;
    badge?: number;
    level?: string;
    volume?: number;
    call?: boolean;
    copy?: string;
    action?: string;
    image?: string;
  };
}

export const STORAGE_KEYS = {
  // ...existing keys
  PUSH_HISTORY: 'bark_push_history',
} as const;
```

### Phase 4: StorageManager History Methods

**Location**: `src/storage/storage-manager.ts`

Add methods:

```typescript
private readonly MAX_HISTORY_SIZE = 500;

getPushHistory(): PushHistoryItem[] {
  // Read from GM_getValue, return [] if empty/corrupt
}

addPushHistoryItem(item: PushHistoryItem): void {
  // Add to front, trim to MAX_HISTORY_SIZE
}

updatePushHistoryItem(id: string, updates: Partial<PushHistoryItem>): void {
  // Find by ID and update
}

deletePushHistoryItems(ids: string[]): void {
  // Remove by IDs
}

clearPushHistory(): void {
  // Remove all history
}
```

### Phase 5: Recall Functionality

**Location**: `src/api/bark-client.ts`

Modify `sendToDeviceGroup()` to accept optional `messageId` parameter. When provided, include in request body:

```typescript
private async sendToDeviceGroup(
  devices: BarkDevice[],
  payload: NotificationPayload,
  messageId?: string
): Promise<void> {
  const request = this.buildRequest(devices, payload);

  // Add ID if provided
  if (messageId) {
    request.id = messageId;
  }

  // ... existing GM_xmlhttpRequest
}
```

Add new recall method:

```typescript
async recallNotification(
  device: BarkDevice,
  messageId: string,
  originalPayload: NotificationPayload
): Promise<void> {
  // Send same payload with "delete": "1" and the same id
  const recallPayload: NotificationPayload = {
    ...originalPayload,
    id: messageId,
    delete: '1',
  };

  // Remove content fields for cleaner delete request
  delete recallPayload.body;
  delete recallPayload.markdown;

  await this.sendToDeviceGroup([device], recallPayload);
}
```

### Phase 6: PushTab Integration

**Location**: `src/ui/push-tab.ts`

Modify `handleSend()`:
1. Generate message ID before sending
2. Build `PushHistoryItem` from form data
3. On success, add to history storage
4. Show success toast with recall button

```typescript
private async handleSend(): Promise<void> {
  // ... validation

  const messageId = generateMessageId();
  const historyItem: PushHistoryItem = {
    id: messageId,
    status: 'pending',
    title: this.formData.title,
    content: this.formData.message,
    markdownEnabled: this.formData.markdownEnabled,
    deviceIds: selectedDeviceIds,
    deviceNames: deviceNames,
    sentAt: new Date().toISOString(),
    deviceStatuses: Object.fromEntries(selectedDeviceIds.map(id => [id, 'pending'])),
    options: { /* snapshot */ },
  };

  // Add to history immediately as pending
  this.storage.addPushHistoryItem(historyItem);

  try {
    await this.barkClient.sendNotification(selectedDevices, payload);

    // Update status to sent (or per-device status)
    this.storage.updatePushHistoryItem(messageId, { status: 'sent' });

    // Show toast with recall button
    this.toast.showWithActions(
      t('push.success'),
      [{
        label: t('history.recall'),
        svg: RECALL_UNDO_SVG,
        callback: () => this.recallMessage(messageId, historyItem),
      }],
      'success',
      0 // no auto-dismiss
    );
  } catch (error) {
    // Update status to failed
    this.storage.updatePushHistoryItem(messageId, { status: 'failed' });
    throw error; // Re-throw for error toast
  }
}
```

### Phase 7: New HistoryTab Component

**Location**: `src/ui/history-tab.ts`

Structure:
```typescript
export class HistoryTab {
  private containerElement: HTMLElement | null = null;

  constructor(
    private storage: StorageManager,
    private toast: ToastManager,
    private barkClient: BarkClient
  ) {}

  render(): HTMLElement {
    return this.createContainer();
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'bark-history';

    // Header with record count
    const header = this.createHeader();
    container.appendChild(header);

    // Filter input
    const filter = this.createFilterInput();
    container.appendChild(filter);

    // Table
    const table = this.createHistoryTable();
    container.appendChild(table);

    return container;
  }

  private createHeader(): HTMLElement {
    // <div class="bark-history-header">
    //   <span>{count} record(s) total</span>
    //   <div class="bark-history-actions">
    //     <button class="bark-btn-icon" title="Export">EXPORT_SVG</button>
    //     <button class="bark-btn-icon" title="Import">IMPORT_SVG</button>
    //     <button class="bark-btn-icon" title="Delete selected">DELETE_SVG</button>
    //   </div>
    // </div>
  }

  private createHistoryTable(): HTMLElement {
    // <table class="bark-history-table">
    //   <thead>
    //     <tr>
    //       <th><input type="checkbox" id="select-all"></th>
    //       <th>Time</th>
    //       <th>Content</th>
    //       <th>Status</th>
    //       <th>Device</th>
    //     </tr>
    //   </thead>
    //   <tbody>...</tbody>
    // </table>
  }

  refresh(): void {
    // Reload history and re-render
  }

  destroy(): void {
    this.containerElement = null;
  }
}
```

**Table columns**:
1. Checkbox (fixed column)
2. Time (format: `YYYY-MM-DD HH:mm:ss`)
3. Content (show title + body, truncate if long)
4. Status (plain text: "Sent", "Failed", "Recalled")
5. Device (comma-separated names)

### Phase 8: Modal Integration

**Location**: `src/ui/modal.ts`

1. Update `TabType`: `type TabType = 'push' | 'history' | 'settings';`
2. Add history tab button in footer
3. Inject HistoryTab in `injectTabComponent()`

```typescript
// In renderTabs()
case 'history':
  this.historyTab = new HistoryTab(this.storage, this.toast, this.barkClient);
  return this.historyTab.render();
```

### Phase 9: Export/Import

**Location**: `src/ui/history-tab.ts`

**Export format**:
```json
{
  "version": 1,
  "exportedAt": "2026-02-19T12:00:00.000Z",
  "records": [
    {
      "id": "l8x2k3m4n5o6p",
      "status": "sent",
      "title": "Hello",
      "content": "World",
      "markdownEnabled": false,
      "deviceIds": ["abc123"],
      "deviceNames": ["My iPhone"],
      "sentAt": "2026-02-19T12:00:00.000Z",
      "deviceStatuses": { "abc123": "sent" },
      "options": {
        "sound": "default",
        "icon": "https://...",
        ...
      }
    }
  ]
}
```

**Export flow**:
1. Get all history items
2. Wrap in export format with metadata
3. Copy to clipboard via `GM_setClipboard()`
4. Show success toast

**Import flow**:
1. Parse JSON from clipboard
2. Validate schema (check version, required fields)
3. Confirm overwrite/merge dialog
4. Merge with existing history
5. Show import result toast

### Phase 10: i18n Translations

**Location**: `src/i18n/locales/*.ts` (all 5 locale files)

Add `history` section:

```typescript
history: {
  title: 'History';
  tab: 'History';
  noHistory: 'No push history yet';
  noHistoryHint: 'Sent notifications will appear here';
  recordsTotal: '{count} record(s) total';
  filterPlaceholder: 'Filter by content or device';
  columns: {
    time: 'Time';
    content: 'Content';
    status: 'Status';
    device: 'Device';
    select: 'Select';
  };
  status: {
    pending: 'Pending';
    sent: 'Sent';
    failed: 'Failed';
    recalled: 'Recalled';
  };
  recall: 'Recall';
  recalling: 'Recalling...';
  recallSuccess: 'Message recalled successfully';
  recallFailed: 'Failed to recall message';
  export: 'Export';
  exportSuccess: 'History exported to clipboard';
  import: 'Import';
  importSuccess: 'Imported {count} records';
  importFailed: 'Failed to import history';
  importConfirm: 'Import history?';
  importConfirmMessage: 'This will merge {count} records with existing history.';
  delete: 'Delete';
  deleteSelected: 'Delete Selected';
  deleteSelectedConfirm: 'Delete {count} record(s)?';
  deleteSuccess: '{count} record(s) deleted';
  clear: 'Clear History';
  clearConfirm: 'Clear all history?';
  clearSuccess: 'History cleared';
  actions: {
    export: 'Export messages';
    import: 'Import messages';
    delete: 'Delete selected';
  };
}
```

## Critical Files to Modify

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add `PushHistoryItem`, `PushHistoryStatus`, update `STORAGE_KEYS`, `TabType` |
| `src/storage/storage-manager.ts` | Add history CRUD methods |
| `src/ui/toast.ts` | Add `showWithActions()` method |
| `src/api/bark-client.ts` | Add `recallNotification()` method, modify `sendToDeviceGroup()` |
| `src/ui/push-tab.ts` | Generate ID, save history, show recall toast |
| `src/ui/modal.ts` | Add history tab integration |
| `src/ui/history-tab.ts` | **New file** - HistoryTab component |
| `src/utils/message-id.ts` | **New file** - ID generation |
| `src/i18n/locales/*.ts` | Add history translations (5 files: en, zh-CN, zh-TW, ja, ko) |

## SVG Assets

**Recall button (undo arrow)**:
```svg
<svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8"></path></svg>
```

**Dismiss button (X)**:
```svg
<svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
```

**Export button (down arrow)**:
```svg
<svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z"></path></svg>
```

**Import button (up arrow)**:
```svg
<svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5zm0-10h4v6h6v-6h4l-7-7z"></path></svg>
```

**Delete button (waste bin)**:
```svg
<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"></path></svg>
```

## Testing Plan

### Unit Tests

1. **ID Generation** (`src/utils/message-id.test.ts`):
   - Test ID uniqueness (generate 1000 IDs, check no duplicates)
   - Test ID format (should be non-empty string)

2. **Storage Tests** (`src/storage/storage-manager.test.ts`):
   - Test `addPushHistoryItem()` trims to max size
   - Test `updatePushHistoryItem()` updates status correctly
   - Test `deletePushHistoryItems()` removes correct items
   - Test `clearPushHistory()` empties storage

3. **BarkClient Tests** (`src/api/bark-client.test.ts`):
   - Test `recallNotification()` builds correct payload with `delete: "1"`
   - Test `sendToDeviceGroup()` includes `id` when provided

### Integration Tests

4. **HistoryTab Tests** (`src/ui/history-tab.test.ts`):
   - Render history table with mock data
   - Test filter input filtering by content/device
   - Test checkbox selection and "select all" functionality
   - Test export generates valid JSON
   - Test import parses and validates

### Manual Testing

5. **Manual Testing Checklist**:
   - [ ] Send notification, verify ID appears in API request body
   - [ ] Check success toast shows with recall button
   - [ ] Click recall button, verify delete request sent with same ID
   - [ ] Open History tab, verify record appears with correct status
   - [ ] Test filter input filters records correctly
   - [ ] Test export copies valid JSON to clipboard
   - [ ] Test import merges records correctly
   - [ ] Test delete selected records
   - [ ] Verify recall button is disabled/hidden for failed/recalled items
