/**
 * BarkClient - API client for sending notifications to Bark servers
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9
 */

import type { BarkDevice, NotificationPayload, BarkApiRequest, PushHistoryResponse } from '../types';

// Error types for translation in UI layer
export const BarkErrorType = {
  noDevicesProvided: 'noDevicesProvided',
  networkError: 'networkError',
  timeout: 'timeout',
  serverError: 'serverError',
  unknownError: 'unknownError',
  sendFailed: 'sendFailed',
} as const;

export type BarkErrorType = typeof BarkErrorType[keyof typeof BarkErrorType];

/**
 * BarkClient handles all communication with Bark servers
 */
export class BarkClient {
  /**
   * Send a push notification to one or more devices
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 2.3
   *
   * Handles devices on different servers by grouping them appropriately
   * and making separate API calls for each unique server/headers combination.
   *
   * @param devices - Array of devices to send to
   * @param payload - Notification content and options
   * @param messageId - Optional message ID for history tracking
   * @returns Array of push history responses from all device groups
   * @throws Error if network request fails or API returns error
   */
  async sendNotification(
    devices: BarkDevice[],
    payload: NotificationPayload,
    messageId?: string
  ): Promise<PushHistoryResponse[]> {
    if (devices.length === 0) {
      throw new Error(BarkErrorType.noDevicesProvided);
    }

    // Group devices by server URL and custom headers
    const deviceGroups = this.groupDevicesByServer(devices);

    // Send to each group in parallel
    const results = await Promise.allSettled(
      Array.from(deviceGroups.values()).map(group =>
        this.sendToDeviceGroup(group, payload, messageId)
      )
    );

    // Collect all responses
    const allResponses: PushHistoryResponse[] = [];

    // Collect failures and report with device details
    // Requirements: 3.2, 3.3, 3.4, 3.5
    const failures: Array<{ devices: BarkDevice[], error: string }> = [];
    let groupIndex = 0;

    for (const result of results) {
      const group = Array.from(deviceGroups.values())[groupIndex];

      if (result.status === 'rejected') {
        failures.push({
          devices: group,
          error: result.reason.message || BarkErrorType.unknownError
        });
        // Add error response for each device in the group
        for (const _device of group) {
          allResponses.push({
            code: -1,
            message: result.reason.message || BarkErrorType.unknownError,
            timestamp: Date.now(),
          });
        }
      } else {
        // Add successful responses
        allResponses.push(...result.value);
      }
      groupIndex++;
    }

    // Report failures if any occurred
    if (failures.length > 0) {
      const errorMessages = failures.map(f => {
        // Use device name if available, otherwise use device key
        // Requirement 3.5: Use device key if no name configured
        const deviceNames = f.devices
          .map(d => d.name || d.deviceKey)
          .join(', ');
        return JSON.stringify({ devices: deviceNames, error: f.error });
      });
      throw new Error(JSON.stringify(errorMessages));
    }

    return allResponses;
  }

  /**
   * Test connection to a Bark server
   * Requirements: 16.3, 16.4, 16.5
   *
   * @param serverUrl - Server URL to test
   * @param _deviceKey - Device key (not used for ping, but kept for API consistency)
   * @param customHeaders - Optional custom headers
   * @returns true if connection successful, false otherwise
   */
  async testConnection(
    serverUrl: string,
    _deviceKey: string,
    customHeaders?: string
  ): Promise<boolean> {
    const headers = customHeaders
      ? this.parseCustomHeaders(customHeaders)
      : {};

    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `${serverUrl}/ping`,
        headers,
        timeout: 10000,
        onload: (response) => {
          resolve(response.status >= 200 && response.status < 300);
        },
        onerror: () => {
          resolve(false);
        },
        ontimeout: () => {
          resolve(false);
        },
      });
    });
  }

  /**
   * Recall a previously sent notification
   *
   * @param device - Device to recall from
   * @param messageId - Message ID to recall
   * @param originalPayload - Original payload (to preserve server URL and headers)
   * @returns Push history response
   */
  async recallNotification(
    device: BarkDevice,
    messageId: string,
    originalPayload: NotificationPayload
  ): Promise<PushHistoryResponse> {
    // All devices in group share same server URL and headers
    const serverUrl = device.serverUrl;
    const customHeaders = device.customHeaders
      ? this.parseCustomHeaders(device.customHeaders)
      : {};

    // Build request - all original fields plus id and delete flag
    const request: BarkApiRequest = {
      device_key: device.deviceKey,
      id: messageId,
      delete: '1',
    };

    // Add all original fields (recall request = original request + delete: "1")
    if (originalPayload.title) request.title = originalPayload.title;
    if (originalPayload.body) request.body = originalPayload.body;
    if (originalPayload.markdown) request.markdown = originalPayload.markdown;
    if (originalPayload.sound) request.sound = originalPayload.sound;
    if (originalPayload.icon) request.icon = originalPayload.icon;
    if (originalPayload.group) request.group = originalPayload.group;
    if (originalPayload.url) request.url = originalPayload.url;
    if (originalPayload.badge !== undefined) request.badge = originalPayload.badge;
    if (originalPayload.level) request.level = originalPayload.level;
    if (originalPayload.volume !== undefined) request.volume = originalPayload.volume;
    if (originalPayload.call) request.call = originalPayload.call;
    if (originalPayload.isArchive) request.isArchive = originalPayload.isArchive;
    if (originalPayload.copy) request.copy = originalPayload.copy;
    if (originalPayload.ciphertext) request.ciphertext = originalPayload.ciphertext;
    if (originalPayload.action) request.action = originalPayload.action;
    if (originalPayload.image) request.image = originalPayload.image;
    if (originalPayload.subtitle) request.subtitle = originalPayload.subtitle;
    if (originalPayload.autoCopy) request.autoCopy = '1';
    if (originalPayload.automaticallyCopy) request.automaticallyCopy = true;

    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: `${serverUrl}/push`,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...customHeaders,
        },
        data: JSON.stringify(request),
        timeout: 10000,
        onload: (response) => {
          // Parse response to get timestamp
          let timestamp = Date.now();
          try {
            const parsed = JSON.parse(response.responseText);
            if (parsed.timestamp) {
              timestamp = parsed.timestamp;
            }
          } catch {
            // Use current time if parsing fails
          }

          if (response.status >= 200 && response.status < 300) {
            resolve({
              code: response.status,
              message: 'success',
              timestamp,
            });
          } else {
            const error = this.parseErrorResponse(response.responseText);
            resolve({
              code: response.status,
              message: error,
              timestamp,
            });
          }
        },
        onerror: () => {
          resolve({
            code: -1,
            message: BarkErrorType.networkError,
            timestamp: Date.now(),
          });
        },
        ontimeout: () => {
          resolve({
            code: -1,
            message: BarkErrorType.timeout,
            timestamp: Date.now(),
          });
        },
      });
    });
  }

  /**
   * Group devices by their server URL and custom headers combination
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   * 
   * Devices with the same server URL and custom headers are grouped together
   * to enable batch requests. Devices with different configurations are
   * placed in separate groups to ensure correct API calls.
   * 
   * @param devices - Array of devices to group
   * @returns Map of group key to devices array
   */
  private groupDevicesByServer(devices: BarkDevice[]): Map<string, BarkDevice[]> {
    const groups = new Map<string, BarkDevice[]>();
    
    for (const device of devices) {
      // Create a unique key from serverUrl and customHeaders
      // Using ||| as separator (unlikely to appear in URLs or headers)
      const key = `${device.serverUrl}|||${device.customHeaders || ''}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(device);
    }
    
    return groups;
  }

  /**
   * Send notification to a single device group (same server + headers)
   * Requirements: 2.1, 2.2, 2.3, 2.4
   *
   * All devices in the group share the same server URL and custom headers,
   * allowing us to make a single HTTP request with device_keys array.
   *
   * @param devices - Devices in this group (all share same server/headers)
   * @param payload - Notification payload
   * @param messageId - Optional message ID for history tracking
   * @throws Error if network request fails or API returns error
   */
  private async sendToDeviceGroup(
    devices: BarkDevice[],
    payload: NotificationPayload,
    messageId?: string
  ): Promise<PushHistoryResponse[]> {
    // Build the API request
    const request = this.buildRequest(devices, payload);

    // Add message ID if provided
    if (messageId) {
      request.id = messageId;
    }

    // All devices in group share same server URL and headers
    const serverUrl = devices[0].serverUrl;
    const customHeaders = devices[0].customHeaders
      ? this.parseCustomHeaders(devices[0].customHeaders)
      : {};

    // Send the request
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: `${serverUrl}/push`,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...customHeaders,
        },
        data: JSON.stringify(request),
        timeout: 10000,
        onload: (response) => {
          // Parse response to get timestamp
          let timestamp = Date.now();
          try {
            const parsed = JSON.parse(response.responseText);
            if (parsed.timestamp) {
              timestamp = parsed.timestamp;
            }
          } catch {
            // Use current time if parsing fails
          }

          if (response.status >= 200 && response.status < 300) {
            // Return response for each device in group
            const responses: PushHistoryResponse[] = devices.map(() => ({
              code: response.status,
              message: 'success',
              timestamp,
            }));
            resolve(responses);
          } else {
            const error = this.parseErrorResponse(response.responseText);
            // Return error responses for each device in group
            const responses: PushHistoryResponse[] = devices.map(() => ({
              code: response.status,
              message: error,
              timestamp,
            }));
            resolve(responses);
          }
        },
        onerror: () => {
          // Return error responses for each device in group
          const responses: PushHistoryResponse[] = devices.map(() => ({
            code: -1,
            message: BarkErrorType.networkError,
            timestamp: Date.now(),
          }));
          resolve(responses);
        },
        ontimeout: () => {
          // Return error responses for each device in group
          const responses: PushHistoryResponse[] = devices.map(() => ({
            code: -1,
            message: BarkErrorType.timeout,
            timestamp: Date.now(),
          }));
          resolve(responses);
        },
      });
    });
  }

  /**
   * Build API request from devices and payload
   * Requirements: 10.3, 10.4, 10.5, 10.6
   * 
   * Handles:
   * - Single device: uses device_key
   * - Multiple devices: uses device_keys array
   * - Markdown mode: uses markdown parameter, omits body
   * - Normal mode: uses body parameter
   * - Optional parameters: includes only non-empty values
   * 
   * @param devices - Devices to send to
   * @param payload - Notification payload
   * @returns Bark API request object
   */
  private buildRequest(
    devices: BarkDevice[],
    payload: NotificationPayload
  ): BarkApiRequest {
    const request: BarkApiRequest = {};

    // Handle single vs multi-device
    // Requirement 10.3: Single device uses device_key
    // Requirement 10.4: Multiple devices use device_keys array
    if (devices.length === 1) {
      request.device_key = devices[0].deviceKey;
    } else {
      request.device_keys = devices.map(d => d.deviceKey);
    }

    // Handle markdown vs body
    // Requirement 10.5: Markdown mode uses markdown parameter
    // Requirement 10.6: Normal mode uses body parameter
    if (payload.markdown) {
      request.markdown = payload.markdown;
    } else if (payload.body) {
      request.body = payload.body;
    }

    // Add title if provided
    if (payload.title) {
      request.title = payload.title;
    }

    // Add optional parameters (Requirement 8.5)
    if (payload.sound) request.sound = payload.sound;
    if (payload.icon) request.icon = payload.icon;
    if (payload.group) request.group = payload.group;
    if (payload.url) request.url = payload.url;
    if (payload.badge !== undefined) request.badge = payload.badge;
    if (payload.level) request.level = payload.level;
    if (payload.volume !== undefined) request.volume = payload.volume;
    if (payload.call) request.call = payload.call;
    if (payload.isArchive) request.isArchive = payload.isArchive;
    if (payload.copy) request.copy = payload.copy;
    if (payload.ciphertext) request.ciphertext = payload.ciphertext;
    if (payload.action) request.action = payload.action;
    if (payload.image) request.image = payload.image;
    if (payload.id) request.id = payload.id;
    if (payload.delete) request.delete = payload.delete;
    if (payload.subtitle) request.subtitle = payload.subtitle;

    // Handle autoCopy (can be boolean or string)
    if (payload.autoCopy) {
      request.autoCopy = '1';
    }
    if (payload.automaticallyCopy) {
      request.automaticallyCopy = true;
    }

    return request;
  }

  /**
   * Parse custom headers from string format
   * Requirement 10.7: Custom headers inclusion
   * 
   * Format: "Name: Value" (one per line)
   * 
   * @param headers - Newline-separated headers
   * @returns Object with header key-value pairs
   */
  private parseCustomHeaders(headers: string): Record<string, string> {
    const result: Record<string, string> = {};
    
    if (!headers || !headers.trim()) {
      return result;
    }

    const lines = headers.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (key && value) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Parse error response from Bark API
   * Requirements: 10.8, 10.9
   * 
   * @param responseText - Response body text
   * @returns User-friendly error message
   */
  private parseErrorResponse(responseText: string): string {
    try {
      const response = JSON.parse(responseText);
      if (response.message) {
        return response.message;
      }
    } catch {
      // Not JSON or no message field
    }

    return BarkErrorType.serverError;
  }
}
