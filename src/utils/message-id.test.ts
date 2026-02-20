/**
 * Property-based and unit tests for message ID generation
 */

import { describe, test, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { generateMessageId } from './message-id';

describe('Message ID Generation', () => {
  describe('Unit Tests', () => {
    test('generates a non-empty string', () => {
      const id = generateMessageId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    test('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateMessageId());
      }
      expect(ids.size).toBe(100);
    });

    test('ID contains only valid base-36 characters', () => {
      const id = generateMessageId();
      // base-36 characters are 0-9 and a-z
      expect(id).toMatch(/^[0-9a-z]+$/);
    });

    test('ID has expected minimum length', () => {
      const id = generateMessageId();
      // timestamp is at least 10 chars, random is 6 chars
      // Real timestamp is ~13 chars, random is 6 chars, total ~19
      expect(id.length).toBeGreaterThanOrEqual(10);
      expect(id.length).toBeLessThanOrEqual(30);
    });
  });

  describe('Property Tests', () => {
    test('generated IDs are always unique', () => {
      fc.assert(
        fc.property(fc.nat({ max: 1000 }), (count) => {
          const ids = new Set<string>();
          for (let i = 0; i < count; i++) {
            ids.add(generateMessageId());
          }
          return ids.size === count;
        }),
        { numRuns: 50 }
      );
    });

    test('generated IDs match expected format', () => {
      fc.assert(
        fc.property(fc.nat({ max: 100 }), () => {
          const id = generateMessageId();
          // ID should be non-empty alphanumeric string
          return id.length > 0 && /^[0-9a-z]+$/.test(id);
        }),
        { numRuns: 100 }
      );
    });

    test('generated IDs are not empty', () => {
      fc.assert(
        fc.property(fc.nat({ max: 100 }), () => {
          const id = generateMessageId();
          return id.length > 0;
        }),
        { numRuns: 100 }
      );
    });
  });
});
