# Requirements Document

## Introduction

This bugfix addresses a critical issue in the Bark Push Userscript's broadcast functionality. Currently, when sending notifications to multiple devices, the system incorrectly assumes all devices share the same server URL and custom headers. This causes failures when users have devices configured on different Bark servers or with different authentication headers.

The fix will properly group devices by their server URL and custom headers combination, then make separate API calls for each unique group, using the `device_keys` array parameter when multiple devices share the same configuration.

## Glossary

- **Bark_Client**: The API client class responsible for sending notifications to Bark servers
- **Device**: A configured Bark device with server URL, device key, and optional custom headers
- **Device_Group**: A collection of devices that share the same server URL and custom headers
- **Broadcast**: Sending a notification to multiple devices simultaneously
- **device_keys**: Bark API parameter accepting an array of device keys for batch notifications
- **device_key**: Bark API parameter accepting a single device key string

## Requirements

### Requirement 1: Device Grouping

**User Story:** As a user with devices on different Bark servers, I want my broadcast notifications to be sent correctly to all devices, so that all my devices receive the notification regardless of their server configuration.

#### Acceptance Criteria

1. WHEN the Bark_Client sends a broadcast notification, THE Bark_Client SHALL group devices by their server URL and custom headers combination
2. WHEN devices share the same server URL and custom headers, THE Bark_Client SHALL include them in the same Device_Group
3. WHEN devices have different server URLs, THE Bark_Client SHALL place them in separate Device_Groups
4. WHEN devices have different custom headers, THE Bark_Client SHALL place them in separate Device_Groups
5. WHEN devices have the same server URL but different custom headers, THE Bark_Client SHALL place them in separate Device_Groups

### Requirement 2: API Request Optimization

**User Story:** As a user broadcasting to multiple devices on the same server, I want the system to use efficient batch requests, so that notifications are sent quickly without unnecessary network overhead.

#### Acceptance Criteria

1. WHEN a Device_Group contains multiple devices, THE Bark_Client SHALL use the device_keys array parameter in the API request
2. WHEN a Device_Group contains exactly one device, THE Bark_Client SHALL use the device_key string parameter in the API request
3. WHEN sending to multiple Device_Groups, THE Bark_Client SHALL make one HTTP request per Device_Group
4. THE Bark_Client SHALL include the correct custom headers for each Device_Group in its HTTP request

### Requirement 3: Error Handling and Reporting

**User Story:** As a user broadcasting to multiple devices, I want to know which specific devices failed to receive notifications, so that I can troubleshoot configuration issues.

#### Acceptance Criteria

1. WHEN all Device_Groups succeed, THE Bark_Client SHALL show one success message
2. WHEN any Device_Group fails, THE Bark_Client SHALL report which devices failed
3. WHEN a Device_Group fails, THE Bark_Client SHALL include the device names in the error message
4. WHEN multiple Device_Groups fail, THE Bark_Client SHALL report all failures
5. IF a device has no name configured, THEN THE Bark_Client SHALL use the device key in error messages

### Requirement 4: Backward Compatibility

**User Story:** As an existing user with devices on the same server, I want the broadcast functionality to continue working as before, so that my workflow is not disrupted.

#### Acceptance Criteria

1. WHEN all devices share the same server URL and custom headers, THE Bark_Client SHALL send one HTTP request with device_keys array
2. WHEN sending to a single device, THE Bark_Client SHALL use device_key string parameter
3. THE Bark_Client SHALL maintain the existing API request format for all optional parameters
4. THE Bark_Client SHALL preserve the existing timeout and error handling behavior
