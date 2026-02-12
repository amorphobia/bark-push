# Design Document: Broadcast Device Grouping Fix

## Overview

This design addresses a critical bug in the Bark Push Userscript's broadcast functionality. The current implementation incorrectly assumes all devices share the same server URL and custom headers, causing failures when users have devices on different Bark servers or with different authentication configurations.

The fix introduces a device grouping mechanism that:
1. Groups devices by their server URL and custom headers combination
2. Makes separate HTTP requests for each unique group
3. Uses the `device_keys` array parameter for groups with multiple devices
4. Uses the `device_key` string parameter for groups with a single device
5. Provides detailed error reporting for failed device groups

## Architecture

### Current Implementation Problem

The existing `sendNotification` method in `BarkClient` has this flawed logic:

```typescript
async sendNotification(devices: BarkDevice[], payload: NotificationPayload): Promise<void> {
  // ❌ PROBLEM: Uses only the first device's server URL and headers
  const serverUrl = devices[0].serverUrl;
  const customHeaders = devices[0].customHeaders 
    ? this.parseCustomHeaders(devices[0].customHeaders)
    : {};
  
  // Makes ONE request assuming all devices share the same server
  GM_xmlhttpRequest({
    url: `${serverUrl}/push`,
    headers: { ...customHeaders },
    // ...
  });
}
```

This fails when:
- Device 1 is on `https://server-a.com` and Device 2 is on `https://server-b.com`
- Device 1 has `Authorization: Bearer token1` and Device 2 has `Authorization: Bearer token2`

### Proposed Solution Architecture

The fix introduces a two-phase approach:

**Phase 1: Grouping**
- Group devices by `(serverUrl, customHeaders)` tuple
- Each unique tuple becomes a separate device group

**Phase 2: Parallel Requests**
- Make one HTTP request per device group
- Use `device_keys` array for multi-device groups
- Use `device_key` string for single-device groups
- Collect results and report errors with device details

## Components and Interfaces

### Modified BarkClient Class

The `BarkClient` class will be refactored with these changes:

#### New Private Method: groupDevicesByServer

```typescript
/**
 * Group devices by their server URL and custom headers combination
 * 
 * @param devices - Array of devices to group
 * @returns Map of group key to devices array
 */
private groupDevicesByServer(devices: BarkDevice[]): Map<string, BarkDevice[]> {
  const groups = new Map<string, BarkDevice[]>();
  
  for (const device of devices) {
    // Create a unique key from serverUrl and customHeaders
    const key = `${device.serverUrl}|||${device.customHeaders || ''}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(device);
  }
  
  return groups;
}
```

**Key Design Decision:** We use `|||` as a separator because:
- It's unlikely to appear in URLs or headers
- It's simple and doesn't require complex escaping
- It creates a deterministic, unique key for each configuration

#### Modified Method: sendNotification

```typescript
/**
 * Send a push notification to one or more devices
 * Handles devices on different servers by grouping them appropriately
 * 
 * @param devices - Array of devices to send to
 * @param payload - Notification content and options
 * @throws Error with details about which devices failed
 */
async sendNotification(
  devices: BarkDevice[],
  payload: NotificationPayload
): Promise<void> {
  if (devices.length === 0) {
    throw new Error('No devices provided');
  }

  // Group devices by server URL and custom headers
  const deviceGroups = this.groupDevicesByServer(devices);
  
  // Send to each group in parallel
  const results = await Promise.allSettled(
    Array.from(deviceGroups.values()).map(group => 
      this.sendToDeviceGroup(group, payload)
    )
  );
  
  // Check for failures
  const failures: Array<{ devices: BarkDevice[], error: string }> = [];
  let groupIndex = 0;
  
  for (const result of results) {
    if (result.status === 'rejected') {
      const group = Array.from(deviceGroups.values())[groupIndex];
      failures.push({
        devices: group,
        error: result.reason.message
      });
    }
    groupIndex++;
  }
  
  // Report failures if any
  if (failures.length > 0) {
    const errorMessages = failures.map(f => {
      const deviceNames = f.devices
        .map(d => d.name || d.deviceKey)
        .join(', ');
      return `Failed to send to: ${deviceNames} (${f.error})`;
    });
    throw new Error(errorMessages.join('\n'));
  }
}
```

#### New Private Method: sendToDeviceGroup

```typescript
/**
 * Send notification to a single device group (same server + headers)
 * 
 * @param devices - Devices in this group (all share same server/headers)
 * @param payload - Notification payload
 */
private async sendToDeviceGroup(
  devices: BarkDevice[],
  payload: NotificationPayload
): Promise<void> {
  // Build the API request
  const request = this.buildRequest(devices, payload);
  
  // All devices in group share same server URL and headers
  const serverUrl = devices[0].serverUrl;
  const customHeaders = devices[0].customHeaders 
    ? this.parseCustomHeaders(devices[0].customHeaders)
    : {};

  // Send the request
  return new Promise((resolve, reject) => {
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
        if (response.status >= 200 && response.status < 300) {
          resolve();
        } else {
          const error = this.parseErrorResponse(response.responseText);
          reject(new Error(error));
        }
      },
      onerror: () => {
        reject(new Error('Network error. Please check your connection.'));
      },
      ontimeout: () => {
        reject(new Error('Request timed out. Please try again.'));
      },
    });
  });
}
```

### Unchanged Components

The following methods remain unchanged:
- `buildRequest()` - Already handles single vs multi-device correctly
- `parseCustomHeaders()` - Already parses headers correctly
- `parseErrorResponse()` - Already extracts error messages correctly
- `testConnection()` - Not affected by this bug

## Data Models

### Device Group

A device group is represented implicitly as an array of `BarkDevice` objects that share the same server URL and custom headers. No new data structure is needed.

### Group Key Format

Internal grouping key format: `{serverUrl}|||{customHeaders}`

Examples:
- `https://api.day.app|||` (no custom headers)
- `https://api.day.app|||Authorization: Bearer token` (with headers)
- `https://custom.server.com|||X-Auth: secret\nX-User: john` (multiple headers)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Device Grouping Correctness

*For any* set of devices, grouping by server URL and custom headers should place devices with identical URL and headers in the same group, and devices with different URL or headers in separate groups.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Multi-Device Request Format

*For any* device group containing more than one device, the API request should use the `device_keys` array parameter containing all device keys from that group.

**Validates: Requirements 2.1, 4.1**

### Property 3: Single-Device Request Format

*For any* device group containing exactly one device, the API request should use the `device_key` string parameter with that device's key.

**Validates: Requirements 2.2, 4.2**

### Property 4: Request Count Matches Group Count

*For any* set of devices, the number of HTTP requests made should equal the number of unique device groups (unique server URL and custom headers combinations).

**Validates: Requirements 2.3**

### Property 5: Headers Match Device Group

*For any* device group, the HTTP request for that group should include exactly the custom headers from devices in that group.

**Validates: Requirements 2.4**

### Property 6: Error Reporting Completeness

*For any* broadcast where some device groups fail, the error message should include device identifiers (name or key) for all devices in failed groups.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

### Property 7: Optional Parameters Preserved

*For any* notification payload with optional parameters, all non-empty optional parameters should appear in every API request made to device groups.

**Validates: Requirements 4.3**

### Property 8: Error Handling Preservation

*For any* device group request that times out or encounters a network error, the error should be caught and reported with the appropriate error message.

**Validates: Requirements 4.4**

## Error Handling

### Error Scenarios

1. **All groups succeed**: Return successfully, no error thrown
2. **Some groups fail**: Throw error with details about failed devices
3. **All groups fail**: Throw error with details about all devices
4. **Network timeout**: Caught per-group, reported with device names
5. **Server error**: Caught per-group, reported with device names

### Error Message Format

When failures occur, the error message format is:

```
Failed to send to: Device1, Device2 (Network error. Please check your connection.)
Failed to send to: Device3 (Server error. Please check your settings.)
```

Each line represents one failed device group, with:
- Device names (or keys if no name)
- The specific error that occurred

### Parallel Execution

Using `Promise.allSettled()` ensures:
- All requests are attempted even if some fail
- We can collect all failures and report them together
- Users get complete information about what succeeded and what failed

## Testing Strategy

### Dual Testing Approach

This bugfix requires both unit tests and property-based tests:

**Unit Tests** focus on:
- Specific examples of device grouping scenarios
- Edge cases (empty device list, single device, all same server)
- Error message formatting
- Integration with existing code

**Property Tests** focus on:
- Universal properties that hold for all device configurations
- Comprehensive input coverage through randomization
- Verifying correctness across many scenarios

### Property-Based Testing Configuration

We'll use the existing test framework (Vitest) with a property-based testing library for TypeScript (fast-check).

Each property test will:
- Run minimum 100 iterations
- Generate random device configurations
- Verify the property holds for all generated inputs
- Reference the design document property number

Tag format: `Feature: broadcast-device-grouping-fix, Property {number}: {property_text}`

### Test Coverage

**Unit Tests:**
- Group devices with same server URL and headers
- Group devices with different server URLs
- Group devices with different custom headers
- Single device broadcast
- Empty device list error
- Error message formatting with device names
- Error message formatting with device keys (no names)

**Property Tests:**
- Property 1: Grouping correctness for random device sets
- Property 2: Multi-device groups use device_keys array
- Property 3: Single-device groups use device_key string
- Property 4: Request count equals group count
- Property 5: Headers match device group configuration
- Property 6: Error messages include all failed devices
- Property 7: Optional parameters preserved in all requests
- Property 8: Timeout and network errors handled correctly

### Testing the Fix

To verify the fix works:

1. **Setup**: Create test devices on different servers
2. **Execute**: Send broadcast notification
3. **Verify**: Check that correct number of HTTP requests were made
4. **Verify**: Check that each request has correct server URL and headers
5. **Verify**: Check that device_keys array is used appropriately

### Backward Compatibility Testing

Ensure existing functionality still works:
- Single device notifications
- Multiple devices on same server
- Optional parameters (sound, icon, etc.)
- Markdown mode
- Error handling for invalid responses
