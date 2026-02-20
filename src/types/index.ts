/**
 * Core TypeScript interfaces for Bark Push Userscript
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8
 */

/**
 * BarkDevice represents a configured Bark device
 * Requirement 19.1: Device configuration data model
 */
export interface BarkDevice {
  /** Unique identifier (UUID v4) - Requirement 19.2 */
  id: string;
  
  /** Optional friendly name - Requirement 19.3 */
  name?: string;
  
  /** Server URL (e.g., "https://api.day.app") - Requirement 19.4 */
  serverUrl: string;
  
  /** Device key from Bark app - Requirement 19.5 */
  deviceKey: string;
  
  /** Optional newline-separated custom headers - Requirement 19.6 */
  customHeaders?: string;
  
  /** Whether this is the default device - Requirement 19.7 */
  isDefault: boolean;
  
  /** ISO 8601 timestamp of creation - Requirement 19.8 */
  createdAt: string;
}

/**
 * NotificationPayload represents the data for a push notification
 * Used internally before converting to BarkApiRequest
 */
export interface NotificationPayload {
  /** Notification title (optional) */
  title?: string;
  
  /** Notification body text (used when markdown disabled) */
  body?: string;
  
  /** Markdown content (used when markdown enabled, replaces body) */
  markdown?: string;
  
  /** Notification sound */
  sound?: string;
  
  /** Custom icon URL */
  icon?: string;
  
  /** Notification group */
  group?: string;
  
  /** URL to open when tapped */
  url?: string;
  
  /** Auto-copy content */
  autoCopy?: boolean;
  
  /** Alternative name for autoCopy */
  automaticallyCopy?: boolean;
  
  /** Archive notification */
  isArchive?: string;
  
  /** Specific content to copy */
  copy?: string;
  
  /** Badge count */
  badge?: number;
  
  /** Notification priority level */
  level?: 'critical' | 'active' | 'timeSensitive' | 'passive';
  
  /** Notification volume (0-10) */
  volume?: number;
  
  /** Continuous ringtone for 30 seconds */
  call?: string;
  
  /** Encrypted push notification ciphertext */
  ciphertext?: string;
  
  /** Action on tap ("none" = do nothing) */
  action?: string;
  
  /** Image URL to push */
  image?: string;
  
  /** Notification ID for updates */
  id?: string;
  
  /** Delete notification from history */
  delete?: string;
  
  /** Notification subtitle */
  subtitle?: string;
}

/**
 * BarkApiRequest represents the actual API request format
 * Sent to Bark server POST /push endpoint
 */
export interface BarkApiRequest {
  /** Single device key (used for single device) */
  device_key?: string;
  
  /** Multiple device keys (used for multi-device, omits device_key) */
  device_keys?: string[];
  
  /** Notification title */
  title?: string;
  
  /** Notification body (used when markdown disabled) */
  body?: string;
  
  /** Markdown content (used when markdown enabled, omits body) */
  markdown?: string;
  
  /** Notification sound */
  sound?: string;
  
  /** Custom icon URL */
  icon?: string;
  
  /** Notification group */
  group?: string;
  
  /** URL to open when tapped */
  url?: string;
  
  /** Badge count */
  badge?: number;
  
  /** Notification priority level */
  level?: 'critical' | 'active' | 'timeSensitive' | 'passive';
  
  /** Notification volume (0-10) */
  volume?: number;
  
  /** Continuous ringtone for 30 seconds */
  call?: string;
  
  /** Archive notification */
  isArchive?: string;
  
  /** Auto-copy content */
  autoCopy?: string;
  
  /** Specific content to copy */
  copy?: string;
  
  /** Alternative name for autoCopy */
  automaticallyCopy?: boolean;
  
  /** Encrypted push notification ciphertext */
  ciphertext?: string;
  
  /** Action on tap */
  action?: string;
  
  /** Image URL to push */
  image?: string;
  
  /** Notification ID for updates */
  id?: string;
  
  /** Delete notification from history */
  delete?: string;
  
  /** Notification subtitle */
  subtitle?: string;
}

/**
 * ValidationResult represents the result of form validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  
  /** Map of field names to error messages */
  errors: Record<string, string>;
}

/**
 * Storage schema types for Tampermonkey GM_Storage
 */

/** Storage key constants */
export const STORAGE_KEYS = {
  DEVICES: 'bark_devices',
  DEFAULT_DEVICE_ID: 'bark_default_device_id',
  LANGUAGE: 'bark_language',
  SELECTED_DEVICE_IDS: 'bark_selected_device_ids',
  MARKDOWN_ENABLED: 'bark_markdown_enabled',
  ADVANCED_EXPANDED: 'bark_advanced_expanded',
  LAST_TAB: 'bark_last_tab',
  KEYBOARD_SHORTCUT: 'bark_keyboard_shortcut',
  THEME: 'bark_theme',
  PUSH_HISTORY: 'bark_push_history',
} as const;

/** Type for tab selection */
export type TabType = 'push' | 'history' | 'settings';

/** Type for theme selection */
export type ThemeType = 'light' | 'dark' | 'auto';

/** Complete storage schema */
export interface StorageSchema {
  [STORAGE_KEYS.DEVICES]: BarkDevice[];
  [STORAGE_KEYS.DEFAULT_DEVICE_ID]: string | null;
  [STORAGE_KEYS.LANGUAGE]: string;
  [STORAGE_KEYS.SELECTED_DEVICE_IDS]: string[];
  [STORAGE_KEYS.MARKDOWN_ENABLED]: boolean;
  [STORAGE_KEYS.ADVANCED_EXPANDED]: boolean;
  [STORAGE_KEYS.LAST_TAB]: TabType;
  [STORAGE_KEYS.KEYBOARD_SHORTCUT]: string;
  [STORAGE_KEYS.THEME]: ThemeType;
  [STORAGE_KEYS.PUSH_HISTORY]: PushHistoryItem[];
}

/**
 * PushFormData represents the push notification form state
 */
export interface PushFormData {
  title?: string;
  message: string;
  deviceIds: string[];
  markdownEnabled: boolean;
  sound?: string;
  icon?: string;
  group?: string;
  url?: string;
  autoCopy?: boolean;
  isArchive?: boolean;
}

/**
 * DeviceFormData represents the device configuration form state
 */
export interface DeviceFormData {
  id?: string;
  name?: string;
  serverUrl: string;
  deviceKey: string;
  customHeaders?: string;
}

/**
 * Push history item status - only "recalled" is stored in item
 * Other statuses (sent/failed) are derived from responseJson array
 */
export type PushHistoryStatus = 'recalled';

/**
 * Represents a device in push history
 */
export interface PushHistoryDevice {
  /** Device ID (from BarkDevice.id) */
  id: string;

  /** Optional friendly name at send time */
  name?: string;

  /** API URL = server URL + device key (e.g., "https://api.day.app/9fKraLksfTus3PyGPF2bR7/") */
  apiUrl: string;

  /** Optional custom headers at send time */
  customHeaders?: string;
}

/**
 * Response from Bark server for each device request
 */
export interface PushHistoryResponse {
  /** HTTP status code */
  code: number;

  /** Response message */
  message: string;

  /** Server timestamp (Unix ms) */
  timestamp: number;
}

/**
 * Push history item - stores complete record of a push notification
 */
export interface PushHistoryItem {
  /** Unique message ID sent to Bark server */
  id: string;

  /** Only "recalled" is stored; other statuses derived from responseJson */
  status: PushHistoryStatus | undefined;

  /** Notification title */
  title?: string;

  /** Notification body or markdown content */
  content: string;

  /** Whether markdown was enabled */
  markdownEnabled: boolean;

  /** Devices this was sent to (broadcasts share same ID) */
  devices: PushHistoryDevice[];

  /** Timestamp when request was made (Unix ms) */
  requestTimestamp: number;

  /** User's timezone (e.g., "Asia/Shanghai") */
  timezone: string;

  /** Whether notification was encrypted (always false for now) */
  isEncrypted: boolean;

  /** Server responses for each device request */
  responseJson: PushHistoryResponse[];

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
