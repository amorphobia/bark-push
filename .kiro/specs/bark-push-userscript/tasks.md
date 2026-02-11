# Implementation Plan: Bark Push Userscript

## Overview

This implementation plan breaks down the Bark Push Userscript into discrete, incremental coding tasks. Each task builds on previous work, with testing integrated throughout to catch errors early. The plan follows a bottom-up approach: core utilities → storage layer → API client → UI components → integration.

## Tasks

- [x] 1. Project setup and configuration
  - Initialize project with vite-plugin-monkey
  - Configure TypeScript with strict mode
  - Set up Tampermonkey userscript metadata (grants, match patterns, namespace)
  - Configure build scripts (dev, build)
  - Set up testing framework (Vitest + fast-check)
  - _Requirements: 20.1, 25.4_

- [x] 2. Core utilities and validation
  - [x] 2.1 Implement validation utilities
    - Write URL validation function
    - Write device key validation function
    - Write custom headers validation function
    - Write form validation functions (push form, device form)
    - _Requirements: 12.5, 12.6, 22.1, 22.2, 22.5_
  
  - [x] 2.2 Write property test for URL validation
    - **Property 34: URL validation**
    - **Validates: Requirements 12.5**
  
  - [x] 2.3 Write property test for validation error messages
    - **Property 58: Required field error message**
    - **Property 59: Invalid URL error message**
    - **Property 60: Invalid headers error message**
    - **Validates: Requirements 22.1, 22.2, 22.5**
  
  - [x] 2.4 Write unit tests for validation edge cases
    - Test empty strings, whitespace, special characters
    - Test various URL formats (http, https, with/without ports)
    - Test header formats (valid, missing colon, empty lines)
    - _Requirements: 12.5, 12.6, 22.5_

- [x] 3. Data models and TypeScript interfaces
  - [x] 3.1 Define core TypeScript interfaces
    - Define BarkDevice interface
    - Define NotificationPayload interface
    - Define BarkApiRequest interface
    - Define ValidationResult interface
    - Define storage schema types
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_
  
  - [x] 3.2 Write property test for device data structure
    - **Property 51: Device data structure completeness**
    - **Property 53: Device data type validation**
    - **Validates: Requirements 19.1, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8**

- [x] 4. Storage manager implementation
  - [x] 4.1 Implement StorageManager class
    - Wrap GM_setValue/GM_getValue with type safety
    - Implement device CRUD operations (get, save, update, delete)
    - Implement preferences operations (language, selected devices, markdown state, etc.)
    - Handle storage errors gracefully
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_
  
  - [x] 4.2 Write property test for storage round-trip consistency
    - **Property 49: Storage round-trip consistency**
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5, 18.6**
  
  - [x] 4.3 Write property test for device ID uniqueness
    - **Property 52: Device ID uniqueness**
    - **Validates: Requirements 19.2**
  
  - [x] 4.4 Write property test for single default device constraint
    - **Property 44: Single default device constraint**
    - **Validates: Requirements 15.2**
  
  - [x] 4.5 Write unit tests for storage operations
    - Test device save, update, delete operations
    - Test default device management
    - Test storage error handling
    - _Requirements: 12.10, 13.2, 14.2, 15.1, 18.7_

- [x] 5. Checkpoint - Ensure storage layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. i18n system implementation
  - [x] 6.1 Create i18n infrastructure
    - Implement locale detection logic
    - Implement t() translation function
    - Create I18n class with locale switching
    - Define supported locales list
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  
  - [x] 6.2 Create translation files
    - Create en.ts (English) with all UI strings
    - Create zh-CN.ts (Simplified Chinese)
    - Create zh-TW.ts (Traditional Chinese)
    - Create ja.ts (Japanese)
    - Create ko.ts (Korean)
    - _Requirements: 17.1_
  
  - [x] 6.3 Write property test for language matching
    - **Property 46: Language matching**
    - **Validates: Requirements 17.3**
  
  - [x] 6.4 Write property test for language persistence
    - **Property 48: Language preference persistence**
    - **Validates: Requirements 17.7, 17.8**
  
  - [x] 6.5 Write unit tests for i18n system
    - Test locale detection with various browser languages
    - Test fallback to English for unsupported locales
    - Test translation key lookup
    - _Requirements: 17.2, 17.3, 17.4_

- [ ] 7. Bark API client implementation
  - [ ] 7.1 Implement BarkClient class
    - Implement sendNotification method
    - Implement testConnection method (ping endpoint)
    - Implement buildRequest helper (handles single vs multi-device, markdown vs body)
    - Implement parseCustomHeaders helper
    - Implement error parsing and handling
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_
  
  - [ ] 7.2 Write property test for API endpoint correctness
    - **Property 25: API endpoint correctness**
    - **Validates: Requirements 10.1**
  
  - [ ] 7.3 Write property test for Content-Type header
    - **Property 26: Content-Type header inclusion**
    - **Validates: Requirements 10.2**
  
  - [ ] 7.4 Write property test for single device request format
    - **Property 14: Single device uses device_key**
    - **Validates: Requirements 10.3**
  
  - [ ] 7.5 Write property test for multi-device request format
    - **Property 13: Multi-device uses device_keys array**
    - **Validates: Requirements 6.6, 10.4**
  
  - [ ] 7.6 Write property test for markdown mode
    - **Property 7: Markdown mode affects body parameter**
    - **Property 8: Markdown mode affects markdown parameter**
    - **Validates: Requirements 5.2, 5.3, 10.5, 10.6**
  
  - [ ] 7.7 Write property test for custom headers inclusion
    - **Property 27: Custom headers inclusion**
    - **Validates: Requirements 10.7**
  
  - [ ] 7.8 Write property test for optional parameters
    - **Property 20: Optional parameters inclusion**
    - **Validates: Requirements 8.5**
  
  - [ ] 7.9 Write unit tests for API client
    - Test successful notification send
    - Test connection test (ping)
    - Test network timeout handling
    - Test API error response parsing
    - _Requirements: 10.8, 10.9, 16.3, 16.4, 16.5_

- [ ] 8. Checkpoint - Ensure API client tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Toast notification system
  - [ ] 9.1 Implement ToastManager class
    - Create toast container element
    - Implement show() method with auto-dismiss
    - Implement hide() and clear() methods
    - Style toasts (success, error, info)
    - _Requirements: 9.6, 9.7, 22.3_
  
  - [ ] 9.2 Write unit tests for toast system
    - Test toast display and auto-dismiss
    - Test multiple toasts
    - Test toast types (success, error, info)
    - _Requirements: 9.6, 9.7_

- [ ] 10. Modal controller and shadow DOM
  - [ ] 10.1 Implement ModalController class
    - Create shadow DOM container
    - Inject scoped styles
    - Implement open() and close() methods
    - Implement tab switching logic
    - Handle ESC key, close button, backdrop click
    - Manage focus (initial focus, focus restoration)
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 20.2, 21.3_
  
  - [ ] 10.2 Write property test for modal styling
    - **Property 2: Modal styling consistency**
    - **Validates: Requirements 1.5, 1.6**
  
  - [ ] 10.3 Write property test for tab state persistence
    - **Property 3: Tab state persistence**
    - **Validates: Requirements 3.5**
  
  - [ ] 10.4 Write property test for modal cleanup
    - **Property 55: Modal cleanup on close**
    - **Validates: Requirements 20.5**
  
  - [ ] 10.5 Write unit tests for modal controller
    - Test modal open/close
    - Test ESC key closes modal
    - Test backdrop click closes modal
    - Test tab switching
    - Test focus management
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.2, 3.3, 21.3_

- [ ] 11. Responsive design and styling
  - [ ] 11.1 Implement responsive modal styles
    - Write CSS for modal width (desktop: 450px, mobile: calc(100vw - 20px))
    - Write CSS for modal max-height (600px with scroll)
    - Write CSS for iOS-style colors (#007AFF primary)
    - Write CSS for consistent spacing (8px, 16px, 24px)
    - Write CSS for button styles (primary, secondary, danger)
    - Write CSS for touch-friendly sizes (44x44px minimum)
    - Write CSS for transitions (200ms)
    - Write CSS for focus indicators
    - Ensure WCAG AA color contrast
    - _Requirements: 1.3, 1.4, 23.1, 23.2, 23.3, 23.4, 24.1, 24.2, 24.3, 24.4, 24.5, 24.7_
  
  - [ ] 11.2 Write property test for responsive width
    - **Property 1: Modal responsive width**
    - **Validates: Requirements 1.3, 1.4, 23.1, 23.2**
  
  - [ ] 11.3 Write property test for touch-friendly sizing
    - **Property 63: Touch-friendly button sizing**
    - **Validates: Requirements 23.4**
  
  - [ ] 11.4 Write property test for color contrast
    - **Property 65: Color contrast compliance**
    - **Validates: Requirements 24.4**
  
  - [ ] 11.5 Write property test for focus indicators
    - **Property 57: Focus indicator visibility**
    - **Validates: Requirements 21.5**

- [ ] 12. Device selector component
  - [ ] 12.1 Implement DeviceSelector class
    - Render dropdown with multi-select checkboxes
    - Implement toggle() to open/close dropdown
    - Implement selectDevice() and deselectDevice()
    - Update display text ("X device(s) selected")
    - Handle default device auto-selection
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 12.2 Write property test for device selector display
    - **Property 10: Device selector shows all devices**
    - **Validates: Requirements 6.2**
  
  - [ ] 12.3 Write property test for selection count display
    - **Property 11: Device selection count display**
    - **Validates: Requirements 6.4**
  
  - [ ] 12.4 Write property test for default device auto-selection
    - **Property 12: Default device auto-selection**
    - **Validates: Requirements 6.5, 15.3**
  
  - [ ] 12.5 Write property test for device selection persistence
    - **Property 15: Device selection persistence**
    - **Validates: Requirements 6.7**
  
  - [ ] 12.6 Write unit tests for device selector
    - Test dropdown open/close
    - Test device selection/deselection
    - Test display with no devices
    - Test display text updates
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 13. Push tab component
  - [ ] 13.1 Implement PushTab class
    - Render title input field
    - Render message textarea field
    - Render markdown toggle checkbox
    - Integrate DeviceSelector component
    - Render tips section with rotation logic
    - Render advanced options collapsible section
    - Render send button with disabled states
    - Implement form validation
    - Implement handleSend() method
    - Handle Ctrl+Enter keyboard shortcut
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.8, 9.9_
  
  - [ ] 13.2 Write property test for title field single-line constraint
    - **Property 5: Title field single-line constraint**
    - **Validates: Requirements 4.3**
  
  - [ ] 13.3 Write property test for message field multi-line support
    - **Property 6: Message field multi-line support**
    - **Validates: Requirements 4.4**
  
  - [ ] 13.4 Write property test for markdown toggle persistence
    - **Property 9: Markdown toggle persistence**
    - **Validates: Requirements 5.4**
  
  - [ ] 13.5 Write property test for tips rotation
    - **Property 16: Tips rotation timing**
    - **Property 17: Tips cycle continuously**
    - **Validates: Requirements 7.3, 7.5**
  
  - [ ] 13.6 Write property test for advanced options visibility
    - **Property 18: Advanced options visibility**
    - **Validates: Requirements 8.2**
  
  - [ ] 13.7 Write property test for advanced options persistence
    - **Property 19: Advanced options state persistence**
    - **Validates: Requirements 8.6**
  
  - [ ] 13.8 Write property test for send button disabled states
    - **Property 21: Send button disabled when no devices**
    - **Property 22: Send button disabled when none selected**
    - **Property 23: Send button disabled when message empty**
    - **Validates: Requirements 9.2, 9.3, 9.4**
  
  - [ ] 13.9 Write property test for form reset after send
    - **Property 24: Form reset after successful send**
    - **Validates: Requirements 9.8**
  
  - [ ] 13.10 Write unit tests for push tab
    - Test form rendering
    - Test Ctrl+Enter sends notification
    - Test tips display (no devices vs with devices)
    - Test advanced options expand/collapse
    - Test send button states
    - Test loading state during send
    - Test success/error messages
    - _Requirements: 4.5, 4.6, 7.2, 8.2, 9.5, 9.6, 9.7_

- [ ] 14. Checkpoint - Ensure push tab tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Settings tab - device list view
  - [ ] 15.1 Implement device list rendering
    - Render "No devices" message when empty
    - Render device cards with name, URL, truncated key
    - Display ⭐ icon for default device
    - Display 🔒 icon for devices with custom headers
    - Render [Set Default] [Edit] [Delete] buttons
    - Implement device ordering by createdAt
    - Render "Add Device" button
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 12.1_
  
  - [ ] 15.2 Write property test for device list display
    - **Property 29: Device list display completeness**
    - **Validates: Requirements 11.3**
  
  - [ ] 15.3 Write property test for default device indicator
    - **Property 30: Default device visual indicator**
    - **Validates: Requirements 11.4**
  
  - [ ] 15.4 Write property test for custom headers indicator
    - **Property 31: Custom headers visual indicator**
    - **Validates: Requirements 11.5**
  
  - [ ] 15.5 Write property test for device list ordering
    - **Property 32: Device list ordering**
    - **Validates: Requirements 11.6**
  
  - [ ] 15.6 Write property test for device action buttons
    - **Property 33: Device action buttons presence**
    - **Validates: Requirements 11.7**
  
  - [ ] 15.7 Write unit tests for device list
    - Test empty state display
    - Test device card rendering
    - Test icon display (star, lock)
    - Test button rendering
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.7_

- [ ] 16. Settings tab - device form view
  - [ ] 16.1 Implement device form rendering
    - Render device name field (optional)
    - Render server URL field (required)
    - Render device key field (required)
    - Render custom headers field (optional, multi-line)
    - Render "Test Connection" button with states
    - Render "Save" button
    - Render back/cancel button
    - Implement form validation with inline errors
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.11_
  
  - [ ] 16.2 Implement device form actions
    - Implement handleTestConnection() with loading states
    - Implement handleSave() with validation
    - Implement form pre-population for edit mode
    - Handle navigation back to device list
    - _Requirements: 12.10, 12.12, 13.1, 13.2, 13.3, 16.1, 16.3, 16.4, 16.5_
  
  - [ ] 16.3 Write property test for device save operation
    - **Property 36: Device save operation**
    - **Validates: Requirements 12.10**
  
  - [ ] 16.4 Write property test for validation error display
    - **Property 37: Validation error display**
    - **Validates: Requirements 12.11, 16.2, 22.6**
  
  - [ ] 16.5 Write property test for edit form pre-population
    - **Property 38: Edit form pre-population**
    - **Validates: Requirements 13.1**
  
  - [ ] 16.6 Write property test for device update operation
    - **Property 39: Device update operation**
    - **Validates: Requirements 13.2**
  
  - [ ] 16.7 Write property test for edit preserves immutable fields
    - **Property 40: Edit preserves immutable fields**
    - **Validates: Requirements 13.4**
  
  - [ ] 16.8 Write property test for error clearing
    - **Property 61: Error clearing on correction**
    - **Validates: Requirements 22.7**
  
  - [ ] 16.9 Write unit tests for device form
    - Test form rendering (add vs edit mode)
    - Test validation on save
    - Test test connection button
    - Test form submission
    - Test cancel/back navigation
    - _Requirements: 12.2, 12.11, 12.12, 13.3, 16.1, 16.3, 16.4, 16.5_

- [ ] 17. Settings tab - device management actions
  - [ ] 17.1 Implement device management handlers
    - Implement handleAddDevice() - navigate to form
    - Implement handleEditDevice() - navigate to form with device data
    - Implement handleDeleteDevice() - show confirmation, delete from storage
    - Implement handleSetDefault() - update default device
    - _Requirements: 12.2, 13.1, 14.1, 14.2, 14.3, 14.4, 15.1, 15.2_
  
  - [ ] 17.2 Write property test for device deletion
    - **Property 41: Device deletion operation**
    - **Validates: Requirements 14.2**
  
  - [ ] 17.3 Write property test for default device cleared on deletion
    - **Property 42: Default device cleared on deletion**
    - **Validates: Requirements 14.3**
  
  - [ ] 17.4 Write property test for set default operation
    - **Property 43: Set default operation**
    - **Validates: Requirements 15.1**
  
  - [ ] 17.5 Write property test for default device ID persistence
    - **Property 45: Default device ID persistence**
    - **Validates: Requirements 15.4**
  
  - [ ] 17.6 Write unit tests for device management
    - Test add device navigation
    - Test edit device navigation
    - Test delete confirmation dialog
    - Test delete operation
    - Test set default operation
    - _Requirements: 12.2, 13.1, 14.1, 14.2, 14.4, 15.1_

- [ ] 18. Settings tab - language selector
  - [ ] 18.1 Implement language selector
    - Render language dropdown with current language
    - List all supported languages
    - Implement handleLanguageChange() - update i18n and storage
    - Update all UI text immediately on change
    - _Requirements: 17.5, 17.6_
  
  - [ ] 18.2 Write property test for language change updates UI
    - **Property 47: Language change updates UI**
    - **Validates: Requirements 17.6**
  
  - [ ] 18.3 Write unit tests for language selector
    - Test dropdown rendering
    - Test language selection
    - Test UI text updates
    - _Requirements: 17.5, 17.6_

- [ ] 19. Settings tab integration
  - [ ] 19.1 Implement SettingsTab class
    - Integrate device list view
    - Integrate device form view
    - Integrate language selector
    - Manage view state (list vs form)
    - Handle navigation between views
    - _Requirements: 11.1, 12.1, 12.2, 13.1, 17.5_
  
  - [ ] 19.2 Write unit tests for settings tab
    - Test view switching (list to form, form to list)
    - Test add/edit/delete workflows
    - Test language selector integration
    - _Requirements: 12.2, 13.1, 13.3_

- [ ] 20. Checkpoint - Ensure settings tab tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Keyboard navigation and accessibility
  - [ ] 21.1 Implement keyboard navigation
    - Ensure Tab key moves focus through elements in order
    - Ensure ESC key closes modal
    - Ensure Ctrl+Enter sends notification
    - Ensure Enter key submits forms
    - Set initial focus to message field on modal open
    - Restore focus to page on modal close
    - _Requirements: 2.2, 2.4, 4.6, 21.1, 21.2, 21.3, 21.4_
  
  - [ ] 21.2 Write property test for tab navigation order
    - **Property 56: Tab navigation order**
    - **Validates: Requirements 21.4**
  
  - [ ] 21.3 Write unit tests for keyboard navigation
    - Test ESC closes modal
    - Test Ctrl+Enter sends notification
    - Test Tab navigation
    - Test initial focus
    - Test focus restoration
    - _Requirements: 2.2, 4.6, 21.1, 21.2, 21.3_

- [ ] 22. Main entry point and integration
  - [ ] 22.1 Implement main.ts entry point
    - Register Tampermonkey menu item "📱 Send to Bark"
    - Initialize i18n system on load
    - Create ModalController instance
    - Handle menu item click - open modal
    - Inject modal into page on demand
    - _Requirements: 1.1, 17.2, 20.1_
  
  - [ ] 22.2 Write property test for host page DOM isolation
    - **Property 54: Host page DOM isolation**
    - **Validates: Requirements 20.4**
  
  - [ ] 22.3 Write property test for no external data transmission
    - **Property 50: No external data transmission**
    - **Validates: Requirements 18.8**
  
  - [ ] 22.4 Write unit tests for main entry point
    - Test menu item registration
    - Test modal creation on click
    - Test i18n initialization
    - _Requirements: 1.1, 17.2_

- [ ] 23. Performance optimization
  - [ ] 23.1 Optimize modal appearance time
    - Lazy load modal content
    - Minimize initial render work
    - Use requestAnimationFrame for smooth appearance
    - _Requirements: 25.1_
  
  - [ ] 23.2 Optimize device list rendering
    - Use document fragments for batch DOM updates
    - Minimize reflows and repaints
    - _Requirements: 25.2_
  
  - [ ] 23.3 Write property test for modal appearance performance
    - **Property 68: Modal appearance performance**
    - **Validates: Requirements 25.1**
  
  - [ ] 23.4 Write property test for device list rendering performance
    - **Property 69: Device list rendering performance**
    - **Validates: Requirements 25.2**

- [ ] 24. Final integration and polish
  - [ ] 24.1 Integration testing
    - Test complete add device workflow
    - Test complete send notification workflow
    - Test complete edit device workflow
    - Test complete delete device workflow
    - Test language switching across all UI
    - Test modal open/close/reopen cycles
    - _Requirements: All_
  
  - [ ] 24.2 Error handling polish
    - Ensure all error messages are user-friendly
    - Ensure all errors are properly logged
    - Test error recovery flows
    - _Requirements: 10.8, 10.9, 18.7, 22.1, 22.2, 22.3, 22.5_
  
  - [ ] 24.3 Visual polish
    - Review all spacing and alignment
    - Review all colors and contrast
    - Review all transitions and animations
    - Test on different screen sizes
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_
  
  - [ ] 24.4 Bundle size optimization
    - Review and minimize dependencies
    - Enable tree-shaking
    - Minify production build
    - Verify bundle size < 100KB
    - _Requirements: 25.4_

- [ ] 25. Final checkpoint - Ensure all tests pass
  - Run full test suite (unit + property tests)
  - Verify all 69 correctness properties pass
  - Test on multiple websites (simple HTML, React SPAs, complex sites)
  - Test on multiple browsers (Chrome, Firefox, Safari)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (69 total)
- Unit tests validate specific examples and edge cases
- Integration tests validate complete user workflows
- The implementation follows a bottom-up approach: utilities → storage → API → UI → integration
- Testing is integrated throughout to catch errors early
- All property tests should run with minimum 100 iterations
- Each property test must be tagged with: `Feature: bark-push-userscript, Property N: [property text]`
