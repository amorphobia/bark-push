# Requirements Document: Bark Push Userscript

## Introduction

This document specifies the requirements for a universal Tampermonkey userscript that enables users to send push notifications to their iOS devices via the Bark app from any website. The userscript provides a modal interface for composing notifications, managing multiple Bark devices, and configuring advanced notification options. All user data is stored locally in Tampermonkey storage, ensuring privacy and security.

## Glossary

- **Bark**: An open-source iOS app that receives push notifications through Apple's APNs service
- **Device_Key**: A 22-character unique identifier provided by the Bark app for each device
- **Server_URL**: The HTTP(S) endpoint where the Bark server is hosted
- **Userscript**: A JavaScript program that runs in the Tampermonkey browser extension
- **Modal**: An overlay UI component that appears on top of the current webpage
- **GM_Storage**: Tampermonkey's persistent storage API (GM_setValue/GM_getValue)
- **Custom_Headers**: Optional HTTP headers configured per device for authentication or proxy scenarios
- **Default_Device**: The device that is automatically selected when opening the push interface
- **Markdown_Mode**: A toggle that enables Markdown formatting in notification content
- **Multi_Select**: The ability to send a notification to multiple devices simultaneously

## Requirements

### Requirement 1: Modal Interface Access

**User Story:** As a user, I want to access the notification interface from any website, so that I can send push notifications without leaving my current page.

#### Acceptance Criteria

1. WHEN a user clicks the Tampermonkey menu item "📱 Send to Bark", THE System SHALL display a modal overlay
2. WHEN the modal is displayed, THE System SHALL center it on the viewport
3. WHEN the viewport width is greater than 470px, THE System SHALL set the modal width to 450px
4. WHEN the viewport width is 470px or less, THE System SHALL set the modal width to calc(100vw - 20px) with max-width 450px
5. THE Modal SHALL have a white background, 8px rounded corners, and a drop shadow
6. THE Modal SHALL display above all page content with a semi-transparent backdrop

### Requirement 2: Modal Dismissal

**User Story:** As a user, I want multiple ways to close the modal, so that I can quickly return to browsing.

#### Acceptance Criteria

1. WHEN a user clicks the [✕] close button, THE System SHALL close the modal and remove it from the DOM
2. WHEN a user presses the ESC key, THE System SHALL close the modal and remove it from the DOM
3. WHEN a user clicks the backdrop area outside the modal, THE System SHALL close the modal and remove it from the DOM
4. WHEN the modal is closed, THE System SHALL restore focus to the page

### Requirement 3: Tab Navigation

**User Story:** As a user, I want to switch between Push and Settings tabs, so that I can access different features.

#### Acceptance Criteria

1. THE Modal SHALL display two tabs: "Push" and "Settings"
2. WHEN a user clicks the "Push" tab, THE System SHALL display the push notification interface
3. WHEN a user clicks the "Settings" tab, THE System SHALL display the device management interface
4. WHEN a tab is active, THE System SHALL highlight it visually
5. THE System SHALL remember the last active tab between modal opens

### Requirement 4: Push Notification Composition

**User Story:** As a user, I want to compose push notifications with title and message, so that I can send custom content to my devices.

#### Acceptance Criteria

1. THE Push_Tab SHALL display a title input field
2. THE Push_Tab SHALL display a message textarea field
3. WHEN a user types in the title field, THE System SHALL accept single-line text input
4. WHEN a user types in the message field, THE System SHALL accept multi-line text input
5. WHEN a user presses Enter in the message field, THE System SHALL insert a newline character
6. WHEN a user presses Ctrl+Enter in the message field, THE System SHALL trigger the send action
7. THE Message_Field SHALL be marked as required with visual indication

### Requirement 5: Markdown Support

**User Story:** As a user, I want to format my notifications with Markdown, so that I can create rich-text notifications.

#### Acceptance Criteria

1. THE Push_Tab SHALL display a "☐ Markdown" checkbox toggle
2. WHEN the Markdown toggle is unchecked, THE System SHALL send the message content in the `body` parameter
3. WHEN the Markdown toggle is checked, THE System SHALL send the message content in the `markdown` parameter instead of `body`
4. THE System SHALL persist the Markdown toggle state between modal opens

### Requirement 6: Device Selection

**User Story:** As a user, I want to select one or multiple devices to receive notifications, so that I can target specific devices or broadcast to all.

#### Acceptance Criteria

1. THE Push_Tab SHALL display a device selector dropdown
2. WHEN the dropdown is opened, THE System SHALL display all configured devices with checkboxes
3. WHEN no devices are configured, THE System SHALL display "No devices configured"
4. WHEN one or more devices are selected, THE System SHALL display "X device(s) selected" in the dropdown
5. WHEN the modal opens, THE System SHALL auto-select the default device if one is configured
6. WHEN multiple devices are selected, THE System SHALL use the `device_keys` array parameter instead of `device_key`
7. THE System SHALL persist the selected devices between modal opens

### Requirement 7: Contextual Tips

**User Story:** As a user, I want to see helpful tips in the interface, so that I can learn about features and best practices.

#### Acceptance Criteria

1. THE Push_Tab SHALL display a tips section below the device selector
2. WHEN no devices are configured, THE System SHALL display "Add a device in Settings to get started"
3. WHEN devices are configured, THE System SHALL rotate through helpful tips every 5 seconds
4. THE Tips SHALL include information about markdown, keyboard shortcuts, multi-device sending, and advanced options
5. THE System SHALL cycle through all tips continuously

### Requirement 8: Advanced Notification Options

**User Story:** As a user, I want to configure advanced notification parameters, so that I can customize notification behavior.

#### Acceptance Criteria

1. THE Push_Tab SHALL display an "Advanced Options" collapsible section
2. WHEN the section is collapsed, THE System SHALL hide all advanced fields
3. WHEN the section is expanded, THE System SHALL display: sound dropdown, icon URL field, group field, URL field, auto-copy checkbox, and archive checkbox
4. THE Sound_Dropdown SHALL include all Bark-supported sounds
5. THE System SHALL include all optional parameters in the API request when values are provided
6. THE System SHALL persist the expanded/collapsed state between modal opens

### Requirement 9: Send Notification Action

**User Story:** As a user, I want to send notifications with clear feedback, so that I know when the operation succeeds or fails.

#### Acceptance Criteria

1. THE Push_Tab SHALL display a "Send" button
2. WHEN no devices are configured, THE Send_Button SHALL be disabled
3. WHEN no devices are selected, THE Send_Button SHALL be disabled
4. WHEN the message field is empty, THE Send_Button SHALL be disabled
5. WHEN the send button is clicked, THE System SHALL display a loading state with spinner
6. WHEN the API request succeeds, THE System SHALL display a success message for 30 seconds
7. WHEN the API request fails, THE System SHALL display an error message with details
8. WHEN a notification is sent successfully, THE System SHALL clear the title and message fields but preserve device selection
9. WHEN Ctrl+Enter is pressed, THE System SHALL trigger the send action

### Requirement 10: Bark API Integration

**User Story:** As a developer, I want the system to correctly integrate with the Bark API, so that notifications are delivered reliably.

#### Acceptance Criteria

1. THE System SHALL send POST requests to `{serverUrl}/push` endpoint
2. THE System SHALL include `Content-Type: application/json; charset=utf-8` header
3. WHEN sending to a single device, THE System SHALL include `device_key` parameter
4. WHEN sending to multiple devices, THE System SHALL include `device_keys` array parameter and omit `device_key`
5. WHEN markdown mode is enabled, THE System SHALL include `markdown` parameter and omit `body`
6. WHEN markdown mode is disabled, THE System SHALL include `body` parameter
7. WHEN custom headers are configured for a device, THE System SHALL include them in the request
8. WHEN the API returns an error, THE System SHALL parse the error message and display it to the user
9. THE System SHALL handle network timeouts gracefully with user-friendly messages

### Requirement 11: Device Management Interface

**User Story:** As a user, I want to manage my Bark devices, so that I can add, edit, and remove device configurations.

#### Acceptance Criteria

1. THE Settings_Tab SHALL display a list of all configured devices
2. WHEN no devices are configured, THE System SHALL display "No devices yet. Add your first device below."
3. WHEN devices exist, THE System SHALL display each device with: name, server URL, truncated device key
4. WHEN a device is the default device, THE System SHALL display a ⭐ star icon next to it
5. WHEN a device has custom headers configured, THE System SHALL display a 🔒 lock icon
6. THE System SHALL order devices by creation time (oldest first)
7. THE System SHALL display [Set Default] [Edit] [Delete] buttons for each device

### Requirement 12: Add Device Workflow

**User Story:** As a user, I want to add new Bark devices, so that I can send notifications to them.

#### Acceptance Criteria

1. THE Settings_Tab SHALL display an "Add Device" button
2. WHEN the "Add Device" button is clicked, THE System SHALL display the device form
3. THE Device_Form SHALL display fields for: device name, server URL, device key, custom headers
4. THE Device_Name_Field SHALL be optional with placeholder "e.g., My iPhone, Work iPad"
5. THE Server_URL_Field SHALL be required and validate URL format
6. THE Device_Key_Field SHALL be required with no length restrictions
7. THE Custom_Headers_Field SHALL be optional and accept multi-line input (one header per line)
8. THE Device_Form SHALL display a "Test Connection" button
9. THE Device_Form SHALL display a "Save" button
10. WHEN the "Save" button is clicked and validation passes, THE System SHALL save the device to GM_Storage
11. WHEN the "Save" button is clicked and validation fails, THE System SHALL display field-specific error messages
12. WHEN a device is saved successfully, THE System SHALL return to the device list view

### Requirement 13: Edit Device Workflow

**User Story:** As a user, I want to edit existing device configurations, so that I can update server URLs or keys.

#### Acceptance Criteria

1. WHEN the "Edit" button is clicked for a device, THE System SHALL display the device form pre-filled with existing values
2. WHEN the user modifies fields and clicks "Save", THE System SHALL update the device in GM_Storage
3. WHEN the user clicks a back/cancel button, THE System SHALL return to the device list without saving changes
4. THE System SHALL preserve the device's creation timestamp and default status when editing

### Requirement 14: Delete Device Workflow

**User Story:** As a user, I want to delete devices I no longer use, so that I can keep my device list clean.

#### Acceptance Criteria

1. WHEN the "Delete" button is clicked for a device, THE System SHALL display a confirmation dialog
2. WHEN the user confirms deletion, THE System SHALL remove the device from GM_Storage
3. WHEN the deleted device was the default device, THE System SHALL clear the default device setting
4. WHEN the user cancels deletion, THE System SHALL keep the device unchanged

### Requirement 15: Default Device Management

**User Story:** As a user, I want to set a default device, so that it's automatically selected when I open the push interface.

#### Acceptance Criteria

1. WHEN the "Set Default" button is clicked for a device, THE System SHALL mark that device as the default
2. WHEN a device is set as default, THE System SHALL remove the default status from any other device
3. WHEN the push tab opens, THE System SHALL auto-select the default device in the device selector
4. THE System SHALL persist the default device ID in GM_Storage

### Requirement 16: Test Connection Feature

**User Story:** As a user, I want to test my device configuration before saving, so that I can verify it works correctly.

#### Acceptance Criteria

1. WHEN the "Test Connection" button is clicked, THE System SHALL validate the server URL and device key fields
2. WHEN validation fails, THE System SHALL display field-specific error messages
3. WHEN validation passes, THE System SHALL send a GET request to `{serverUrl}/ping`
4. WHEN the ping request succeeds, THE System SHALL display "Connection successful!" message
5. WHEN the ping request fails, THE System SHALL display "Connection failed. Check your settings." message
6. THE Test_Button SHALL display states: normal, testing (with spinner), success, failed

### Requirement 17: Internationalization Support

**User Story:** As a user, I want to use the interface in my preferred language, so that I can understand all UI text.

#### Acceptance Criteria

1. THE System SHALL support English, Simplified Chinese, Traditional Chinese, Japanese, and Korean
2. WHEN the userscript loads for the first time, THE System SHALL detect the browser language
3. WHEN the browser language matches a supported language, THE System SHALL use that language
4. WHEN the browser language is not supported, THE System SHALL default to English
5. THE Settings_Tab SHALL display a language selector dropdown
6. WHEN the user selects a different language, THE System SHALL update all UI text immediately
7. THE System SHALL persist the user's language preference in GM_Storage
8. THE System SHALL use the stored language preference on subsequent loads

### Requirement 18: Data Persistence

**User Story:** As a developer, I want all user data stored securely in Tampermonkey storage, so that configurations persist across browser sessions.

#### Acceptance Criteria

1. THE System SHALL store device configurations as an array in GM_Storage
2. THE System SHALL store the default device ID in GM_Storage
3. THE System SHALL store the last selected devices in GM_Storage
4. THE System SHALL store the user's language preference in GM_Storage
5. THE System SHALL store the markdown toggle state in GM_Storage
6. THE System SHALL store the advanced options expanded state in GM_Storage
7. WHEN GM_Storage is unavailable, THE System SHALL display an error message and disable functionality
8. THE System SHALL never transmit user data to external servers except Bark API endpoints

### Requirement 19: Device Configuration Data Model

**User Story:** As a developer, I want a consistent data structure for device configurations, so that the system handles devices reliably.

#### Acceptance Criteria

1. THE System SHALL store each device with the following properties: id, name, serverUrl, deviceKey, customHeaders, isDefault, createdAt
2. THE Device_ID SHALL be a unique identifier generated when the device is created
3. THE Device_Name SHALL be an optional string
4. THE Server_URL SHALL be a required string in valid URL format
5. THE Device_Key SHALL be a required string
6. THE Custom_Headers SHALL be an optional string with newline-separated headers
7. THE Is_Default SHALL be a boolean indicating default status
8. THE Created_At SHALL be an ISO 8601 timestamp

### Requirement 20: Universal Website Compatibility

**User Story:** As a user, I want the userscript to work on all websites, so that I can send notifications from anywhere.

#### Acceptance Criteria

1. THE Userscript SHALL use the match pattern `*://*/*` to run on all websites
2. THE System SHALL inject the modal into a shadow DOM to prevent CSS conflicts
3. THE System SHALL not interfere with the host page's JavaScript execution
4. THE System SHALL not modify the host page's DOM except for adding the modal container
5. WHEN the modal is closed, THE System SHALL remove all injected elements

### Requirement 21: Keyboard Navigation

**User Story:** As a user, I want to navigate the interface with keyboard shortcuts, so that I can work efficiently.

#### Acceptance Criteria

1. WHEN the modal is open and the user presses ESC, THE System SHALL close the modal
2. WHEN the message field is focused and the user presses Ctrl+Enter, THE System SHALL send the notification
3. WHEN the modal opens, THE System SHALL focus the message field
4. THE System SHALL support Tab key navigation through all interactive elements
5. THE System SHALL display visible focus indicators on all focusable elements

### Requirement 22: Error Handling and Validation

**User Story:** As a user, I want clear error messages when something goes wrong, so that I can fix issues quickly.

#### Acceptance Criteria

1. WHEN a required field is empty, THE System SHALL display "This field is required"
2. WHEN a URL is invalid, THE System SHALL display "Invalid URL format. Use http:// or https://"
3. WHEN a network request fails, THE System SHALL display "Network error. Please check your connection."
4. WHEN the Bark server returns an error, THE System SHALL display the server's error message
5. WHEN custom headers are malformed, THE System SHALL display "Invalid header format. Use 'Name: Value' format, one per line."
6. THE System SHALL display errors inline near the relevant field
7. THE System SHALL clear error messages when the user corrects the input

### Requirement 23: Responsive Design

**User Story:** As a user, I want the interface to work on both desktop and mobile browsers, so that I can use it on any device.

#### Acceptance Criteria

1. WHEN the viewport width is greater than 470px, THE Modal SHALL be 450px wide
2. WHEN the viewport width is 470px or less, THE Modal SHALL be calc(100vw - 20px) wide with max-width 450px
3. THE Modal SHALL have a maximum height of 600px with scrollable content
4. THE System SHALL use touch-friendly button sizes (minimum 44x44px)
5. THE System SHALL display properly on iOS Safari, Chrome, and Firefox mobile browsers

### Requirement 24: Visual Design Standards

**User Story:** As a user, I want a clean and professional interface, so that the tool feels polished and trustworthy.

#### Acceptance Criteria

1. THE System SHALL use iOS-style color scheme with primary color #007AFF
2. THE System SHALL use consistent spacing (8px, 16px, 24px)
3. THE System SHALL use readable font sizes (minimum 14px for body text)
4. THE System SHALL provide sufficient color contrast for accessibility (WCAG AA)
5. THE System SHALL use smooth transitions for interactive elements (200ms)
6. THE System SHALL display loading spinners for all async operations
7. THE System SHALL use consistent button styles (primary, secondary, danger)

### Requirement 25: Performance Requirements

**User Story:** As a user, I want the interface to load and respond quickly, so that it doesn't slow down my browsing.

#### Acceptance Criteria

1. THE Modal SHALL appear within 100ms of clicking the menu item
2. THE System SHALL render the device list within 50ms for up to 20 devices
3. THE System SHALL send API requests with a 10-second timeout
4. THE System SHALL have a total bundle size under 100KB
5. THE System SHALL not block the main thread during initialization
