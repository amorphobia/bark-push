# Implementation Plan: Broadcast Device Grouping Fix

## Overview

This implementation plan fixes the broadcast functionality bug by adding device grouping logic to the BarkClient. The fix ensures devices are properly grouped by server URL and custom headers, with separate HTTP requests made for each unique group. Error reporting will include specific device information for failed requests.

## Tasks

- [x] 1. Add device grouping method to BarkClient
  - Create `groupDevicesByServer()` private method
  - Group devices by `(serverUrl, customHeaders)` tuple using `|||` separator
  - Return Map of group key to devices array
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 1.1 Write property test for device grouping
  - **Property 1: Device Grouping Correctness**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

- [x] 2. Add device group sending method to BarkClient
  - Create `sendToDeviceGroup()` private method
  - Accept devices array and payload
  - Use first device's serverUrl and customHeaders (all in group share same values)
  - Make single HTTP request with GM_xmlhttpRequest
  - Return Promise that resolves on success, rejects on failure
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 2.1 Write property tests for request format
  - **Property 2: Multi-Device Request Format**
  - **Validates: Requirements 2.1, 4.1**
  - **Property 3: Single-Device Request Format**
  - **Validates: Requirements 2.2, 4.2**

- [ ]* 2.2 Write property test for headers
  - **Property 5: Headers Match Device Group**
  - **Validates: Requirements 2.4**

- [ ] 3. Refactor sendNotification method
  - [x] 3.1 Replace single-request logic with grouping logic
    - Call `groupDevicesByServer()` to get device groups
    - Map each group to `sendToDeviceGroup()` call
    - Use `Promise.allSettled()` to execute all requests in parallel
    - _Requirements: 2.3_
  
  - [x] 3.2 Implement error collection and reporting
    - Collect failed results from `Promise.allSettled()`
    - For each failure, extract device names (or keys if no name)
    - Format error message with device identifiers and error details
    - Throw combined error if any failures occurred
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 3.3 Write property test for request count
  - **Property 4: Request Count Matches Group Count**
  - **Validates: Requirements 2.3**

- [ ]* 3.4 Write property test for error reporting
  - **Property 6: Error Reporting Completeness**
  - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `pnpm test:run` to verify all tests pass
  - Run `pnpm build` to verify TypeScript compilation succeeds
  - Ask the user if questions arise

- [ ]* 5. Write property tests for backward compatibility
  - [ ]* 5.1 Write property test for optional parameters
    - **Property 7: Optional Parameters Preserved**
    - **Validates: Requirements 4.3**
  
  - [ ]* 5.2 Write property test for error handling
    - **Property 8: Error Handling Preservation**
    - **Validates: Requirements 4.4**

- [ ]* 6. Write unit tests for edge cases
  - Test empty device list throws error
  - Test single device uses device_key string
  - Test multiple devices on same server use device_keys array
  - Test devices on different servers make separate requests
  - Test error message includes device names
  - Test error message uses device keys when names missing
  - Test all groups succeed shows one success message
  - Test some groups fail reports all failures

- [x] 7. Final checkpoint - Verify fix works end-to-end
  - Ensure all tests pass
  - Verify TypeScript compilation succeeds
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The fix maintains backward compatibility with existing single-device and same-server multi-device scenarios
- Property tests validate universal correctness properties across random inputs
- Unit tests validate specific examples and edge cases
- The `|||` separator is used for grouping keys as it's unlikely to appear in URLs or headers
