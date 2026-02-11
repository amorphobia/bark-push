/**
 * Property-based tests for device data structure
 * Feature: bark-push-userscript
 * Validates: Requirements 19.1, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { createDevice } from '../utils/device-factory';

describe('Device Data Structure', () => {
  // Feature: bark-push-userscript, Property 51: Device data structure completeness
  test('Property 51: Device data structure completeness', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.option(fc.string()),
          serverUrl: fc.webUrl(),
          deviceKey: fc.string({ minLength: 1 }),
          customHeaders: fc.option(fc.string()),
          isDefault: fc.option(fc.boolean()),
        }),
        (input) => {
          const device = createDevice(input);

          // Device must have all required properties
          expect(device).toHaveProperty('id');
          expect(device).toHaveProperty('name');
          expect(device).toHaveProperty('serverUrl');
          expect(device).toHaveProperty('deviceKey');
          expect(device).toHaveProperty('customHeaders');
          expect(device).toHaveProperty('isDefault');
          expect(device).toHaveProperty('createdAt');

          // All properties must be defined (even if undefined for optional ones)
          const keys = Object.keys(device);
          expect(keys).toContain('id');
          expect(keys).toContain('name');
          expect(keys).toContain('serverUrl');
          expect(keys).toContain('deviceKey');
          expect(keys).toContain('customHeaders');
          expect(keys).toContain('isDefault');
          expect(keys).toContain('createdAt');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: bark-push-userscript, Property 53: Device data type validation
  test('Property 53: Device data type validation', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.option(fc.string()),
          serverUrl: fc.webUrl(),
          deviceKey: fc.string({ minLength: 1 }),
          customHeaders: fc.option(fc.string()),
          isDefault: fc.option(fc.boolean()),
        }),
        (input) => {
          const device = createDevice(input);

          // Requirement 19.2: id must be a string
          expect(typeof device.id).toBe('string');
          expect(device.id.length).toBeGreaterThan(0);

          // Requirement 19.3: name must be string or undefined
          if (device.name !== undefined && device.name !== null) {
            expect(typeof device.name).toBe('string');
          }

          // Requirement 19.4: serverUrl must be a non-empty string
          expect(typeof device.serverUrl).toBe('string');
          expect(device.serverUrl.length).toBeGreaterThan(0);

          // Requirement 19.5: deviceKey must be a non-empty string
          expect(typeof device.deviceKey).toBe('string');
          expect(device.deviceKey.length).toBeGreaterThan(0);

          // Requirement 19.6: customHeaders must be string or undefined
          if (device.customHeaders !== undefined && device.customHeaders !== null) {
            expect(typeof device.customHeaders).toBe('string');
          }

          // Requirement 19.7: isDefault must be boolean
          expect(typeof device.isDefault).toBe('boolean');

          // Requirement 19.8: createdAt must be ISO 8601 string
          expect(typeof device.createdAt).toBe('string');
          // Validate ISO 8601 format by parsing
          const date = new Date(device.createdAt);
          expect(date.toISOString()).toBe(device.createdAt);
          expect(isNaN(date.getTime())).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Verify device ID uniqueness (Property 52 will be tested in storage layer)
  test('Device IDs are unique across multiple creations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.option(fc.string()),
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 1 }),
            customHeaders: fc.option(fc.string()),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        (deviceInputs) => {
          const devices = deviceInputs.map((input) => createDevice(input));
          const ids = devices.map((d) => d.id);
          const uniqueIds = new Set(ids);

          // All IDs must be unique
          expect(ids.length).toBe(uniqueIds.size);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Verify serverUrl format
  test('Device serverUrl must be valid URL format', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.option(fc.string()),
          serverUrl: fc.webUrl(),
          deviceKey: fc.string({ minLength: 1 }),
          customHeaders: fc.option(fc.string()),
        }),
        (input) => {
          const device = createDevice(input);

          // serverUrl must be parseable as URL
          expect(() => new URL(device.serverUrl)).not.toThrow();

          // Must start with http:// or https://
          expect(
            device.serverUrl.startsWith('http://') ||
              device.serverUrl.startsWith('https://')
          ).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Verify isDefault defaults to false when not provided
  test('Device isDefault defaults to false', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.option(fc.string()),
          serverUrl: fc.webUrl(),
          deviceKey: fc.string({ minLength: 1 }),
          customHeaders: fc.option(fc.string()),
        }),
        (input) => {
          // Create device without isDefault
          const device = createDevice(input);

          // Should default to false
          expect(device.isDefault).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Verify createdAt is recent timestamp
  test('Device createdAt is a recent timestamp', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.option(fc.string()),
          serverUrl: fc.webUrl(),
          deviceKey: fc.string({ minLength: 1 }),
          customHeaders: fc.option(fc.string()),
        }),
        (input) => {
          const beforeCreation = Date.now();
          const device = createDevice(input);
          const afterCreation = Date.now();

          const createdTime = new Date(device.createdAt).getTime();

          // createdAt should be between before and after
          expect(createdTime).toBeGreaterThanOrEqual(beforeCreation);
          expect(createdTime).toBeLessThanOrEqual(afterCreation);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
