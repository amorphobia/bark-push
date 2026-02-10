/**
 * Validation utilities for Bark Push userscript
 */

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates a URL string
 * @param url - The URL to validate
 * @returns true if valid, false otherwise
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Trim whitespace
  url = url.trim();

  // Must start with http:// or https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  try {
    const urlObj = new URL(url);
    // Must have a valid hostname
    return urlObj.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validates a device key
 * @param key - The device key to validate
 * @returns true if valid, false otherwise
 */
export function validateDeviceKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Trim whitespace
  key = key.trim();

  // Must not be empty
  return key.length > 0;
}

/**
 * Validates custom headers string
 * Format: "Header-Name: value" (one per line)
 * @param headers - The headers string to validate
 * @returns true if valid, false otherwise
 */
export function validateCustomHeaders(headers: string): boolean {
  if (!headers || typeof headers !== 'string') {
    return true; // Empty is valid (optional field)
  }

  // Trim whitespace
  headers = headers.trim();

  if (headers.length === 0) {
    return true; // Empty is valid
  }

  // Split by newlines
  const lines = headers.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (trimmedLine.length === 0) {
      continue;
    }

    // Must contain a colon
    if (!trimmedLine.includes(':')) {
      return false;
    }

    // Split by first colon
    const colonIndex = trimmedLine.indexOf(':');
    const headerName = trimmedLine.substring(0, colonIndex).trim();

    // Header name must not be empty
    if (headerName.length === 0) {
      return false;
    }

    // Header value can be empty (some headers don't require values)
    // We already checked that the line contains a colon above
  }

  return true;
}

/**
 * Validates push notification form data
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

export function validatePushForm(data: PushFormData): ValidationResult {
  const errors: Record<string, string> = {};

  // Message is required
  if (!data.message || data.message.trim().length === 0) {
    errors.message = 'This field is required';
  }

  // At least one device must be selected
  if (!data.deviceIds || data.deviceIds.length === 0) {
    errors.deviceIds = 'Please select at least one device';
  }

  // Validate optional URL if provided
  if (data.url && data.url.trim().length > 0) {
    if (!validateUrl(data.url)) {
      errors.url = 'Invalid URL format. Use http:// or https://';
    }
  }

  // Validate optional icon URL if provided
  if (data.icon && data.icon.trim().length > 0) {
    if (!validateUrl(data.icon)) {
      errors.icon = 'Invalid URL format. Use http:// or https://';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates device configuration form data
 */
export interface DeviceFormData {
  id?: string;
  name?: string;
  serverUrl: string;
  deviceKey: string;
  customHeaders?: string;
}

export function validateDeviceForm(data: DeviceFormData): ValidationResult {
  const errors: Record<string, string> = {};

  // Server URL is required
  if (!data.serverUrl || data.serverUrl.trim().length === 0) {
    errors.serverUrl = 'This field is required';
  } else if (!validateUrl(data.serverUrl)) {
    errors.serverUrl = 'Invalid URL format. Use http:// or https://';
  }

  // Device key is required
  if (!data.deviceKey || data.deviceKey.trim().length === 0) {
    errors.deviceKey = 'This field is required';
  }

  // Validate custom headers if provided
  if (data.customHeaders && data.customHeaders.trim().length > 0) {
    if (!validateCustomHeaders(data.customHeaders)) {
      errors.customHeaders = 'Invalid header format. Use \'Name: Value\' format, one per line.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
