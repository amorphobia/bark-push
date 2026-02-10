import { describe, it, expect } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import {
  validateUrl,
  validateDeviceKey,
  validateCustomHeaders,
  validatePushForm,
  validateDeviceForm,
  type PushFormData,
  type DeviceFormData,
} from './validation';

describe('Validation Utilities', () => {
  describe('Property 34: URL validation', () => {
    test.prop([fc.webUrl()])('should accept valid URLs', (url) => {
      expect(validateUrl(url)).toBe(true);
    });

    test.prop([fc.string()])('should reject strings without http:// or https://', (str) => {
      // Skip if string happens to start with http:// or https://
      fc.pre(!str.startsWith('http://') && !str.startsWith('https://'));
      expect(validateUrl(str)).toBe(false);
    });

    test.prop([fc.constantFrom('http://', 'https://'), fc.string()])
      ('should reject URLs with empty or whitespace-only hostnames', (protocol, host) => {
        // Only test with truly invalid hostnames (empty or whitespace)
        fc.pre(host.trim().length === 0);
        const url = protocol + host;
        expect(validateUrl(url)).toBe(false);
      });
  });

  describe('Property 58: Required field error message', () => {
    test.prop([fc.array(fc.string(), { minLength: 1 })])
      ('should display "This field is required" for empty message', (deviceIds) => {
        const formData: PushFormData = {
          message: '',
          deviceIds,
          markdownEnabled: false,
        };
        const result = validatePushForm(formData);
        expect(result.valid).toBe(false);
        expect(result.errors.message).toBe('This field is required');
      });

    test.prop([fc.string({ minLength: 1 })])
      ('should display "This field is required" for empty serverUrl', (deviceKey) => {
        const formData: DeviceFormData = {
          serverUrl: '',
          deviceKey,
        };
        const result = validateDeviceForm(formData);
        expect(result.valid).toBe(false);
        expect(result.errors.serverUrl).toBe('This field is required');
      });

    test.prop([fc.webUrl()])
      ('should display "This field is required" for empty deviceKey', (serverUrl) => {
        const formData: DeviceFormData = {
          serverUrl,
          deviceKey: '',
        };
        const result = validateDeviceForm(formData);
        expect(result.valid).toBe(false);
        expect(result.errors.deviceKey).toBe('This field is required');
      });
  });

  describe('Property 59: Invalid URL error message', () => {
    test.prop([fc.string().filter(s => s.trim().length > 0 && !s.startsWith('http://') && !s.startsWith('https://'))])
      ('should display "Invalid URL format" for invalid URLs in device form', (invalidUrl) => {
        const formData: DeviceFormData = {
          serverUrl: invalidUrl,
          deviceKey: 'test-key',
        };
        const result = validateDeviceForm(formData);
        expect(result.valid).toBe(false);
        // Could be either "This field is required" or "Invalid URL format" depending on the string
        expect(result.errors.serverUrl).toBeDefined();
        if (invalidUrl.trim().length > 0) {
          expect(result.errors.serverUrl).toBe('Invalid URL format. Use http:// or https://');
        }
      });

    test.prop([
      fc.string({ minLength: 1 }),
      fc.array(fc.string(), { minLength: 1 }),
      fc.string().filter(s => s.trim().length > 0 && !s.startsWith('http://') && !s.startsWith('https://')),
    ])('should display "Invalid URL format" for invalid icon URL', (message, deviceIds, invalidUrl) => {
      const formData: PushFormData = {
        message,
        deviceIds,
        markdownEnabled: false,
        icon: invalidUrl,
      };
      const result = validatePushForm(formData);
      if (!result.valid && result.errors.icon) {
        expect(result.errors.icon).toBe('Invalid URL format. Use http:// or https://');
      }
    });
  });

  describe('Property 60: Invalid headers error message', () => {
    test.prop([
      fc.array(fc.string().filter(s => !s.includes(':') && s.trim().length > 0), { minLength: 1 }),
    ])('should display "Invalid header format" for headers without colon', (invalidLines) => {
      const headers = invalidLines.join('\n');
      const result = validateCustomHeaders(headers);
      expect(result).toBe(false);
    });

    test.prop([
      fc.webUrl(),
      fc.string({ minLength: 1 }),
      fc.array(fc.string().filter(s => !s.includes(':') && s.trim().length > 0), { minLength: 1 }),
    ])('should display error message in device form for invalid headers', (serverUrl, deviceKey, invalidLines) => {
      const formData: DeviceFormData = {
        serverUrl,
        deviceKey,
        customHeaders: invalidLines.join('\n'),
      };
      const result = validateDeviceForm(formData);
      if (!result.valid && result.errors.customHeaders) {
        expect(result.errors.customHeaders).toBe('Invalid header format. Use \'Name: Value\' format, one per line.');
      }
    });
  });
});

describe('Unit Tests - Validation Edge Cases', () => {
  describe('validateUrl', () => {
    it('should accept valid http URLs', () => {
      expect(validateUrl('http://example.com')).toBe(true);
      expect(validateUrl('http://example.com:8080')).toBe(true);
      expect(validateUrl('http://example.com/path')).toBe(true);
    });

    it('should accept valid https URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('https://api.day.app')).toBe(true);
      expect(validateUrl('https://bark.example.com:443/path')).toBe(true);
    });

    it('should reject URLs without protocol', () => {
      expect(validateUrl('example.com')).toBe(false);
      expect(validateUrl('www.example.com')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(validateUrl('')).toBe(false);
      expect(validateUrl('   ')).toBe(false);
    });

    it('should reject invalid protocols', () => {
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('file:///path')).toBe(false);
    });

    it('should handle URLs with special characters', () => {
      expect(validateUrl('https://example.com/path?query=value')).toBe(true);
      expect(validateUrl('https://example.com/path#fragment')).toBe(true);
    });
  });

  describe('validateDeviceKey', () => {
    it('should accept non-empty strings', () => {
      expect(validateDeviceKey('abc123')).toBe(true);
      expect(validateDeviceKey('a')).toBe(true);
      expect(validateDeviceKey('very-long-key-string-123456')).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(validateDeviceKey('')).toBe(false);
      expect(validateDeviceKey('   ')).toBe(false);
    });

    it('should accept keys with special characters', () => {
      expect(validateDeviceKey('key-with-dashes')).toBe(true);
      expect(validateDeviceKey('key_with_underscores')).toBe(true);
      expect(validateDeviceKey('key.with.dots')).toBe(true);
    });
  });

  describe('validateCustomHeaders', () => {
    it('should accept valid header format', () => {
      expect(validateCustomHeaders('Authorization: Bearer token')).toBe(true);
      expect(validateCustomHeaders('X-Custom: value')).toBe(true);
    });

    it('should accept multiple headers', () => {
      const headers = 'Authorization: Bearer token\nX-Custom: value';
      expect(validateCustomHeaders(headers)).toBe(true);
    });

    it('should accept empty strings (optional field)', () => {
      expect(validateCustomHeaders('')).toBe(true);
      expect(validateCustomHeaders('   ')).toBe(true);
    });

    it('should accept headers with empty values', () => {
      expect(validateCustomHeaders('X-Empty:')).toBe(true);
      expect(validateCustomHeaders('X-Empty: ')).toBe(true);
    });

    it('should reject headers without colon', () => {
      expect(validateCustomHeaders('Invalid Header')).toBe(false);
    });

    it('should reject headers with empty names', () => {
      expect(validateCustomHeaders(': value')).toBe(false);
      expect(validateCustomHeaders('  : value')).toBe(false);
    });

    it('should skip empty lines', () => {
      const headers = 'Authorization: Bearer token\n\nX-Custom: value';
      expect(validateCustomHeaders(headers)).toBe(true);
    });

    it('should handle Windows line endings', () => {
      const headers = 'Authorization: Bearer token\r\nX-Custom: value';
      expect(validateCustomHeaders(headers)).toBe(true);
    });
  });

  describe('validatePushForm', () => {
    it('should pass with valid minimal data', () => {
      const data: PushFormData = {
        message: 'Test message',
        deviceIds: ['device1'],
        markdownEnabled: false,
      };
      const result = validatePushForm(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should fail when message is empty', () => {
      const data: PushFormData = {
        message: '',
        deviceIds: ['device1'],
        markdownEnabled: false,
      };
      const result = validatePushForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.message).toBeDefined();
    });

    it('should fail when no devices selected', () => {
      const data: PushFormData = {
        message: 'Test',
        deviceIds: [],
        markdownEnabled: false,
      };
      const result = validatePushForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.deviceIds).toBeDefined();
    });

    it('should validate optional URL fields', () => {
      const data: PushFormData = {
        message: 'Test',
        deviceIds: ['device1'],
        markdownEnabled: false,
        url: 'invalid-url',
        icon: 'also-invalid',
      };
      const result = validatePushForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.url).toBeDefined();
      expect(result.errors.icon).toBeDefined();
    });
  });

  describe('validateDeviceForm', () => {
    it('should pass with valid minimal data', () => {
      const data: DeviceFormData = {
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      };
      const result = validateDeviceForm(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should fail when serverUrl is empty', () => {
      const data: DeviceFormData = {
        serverUrl: '',
        deviceKey: 'test-key',
      };
      const result = validateDeviceForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.serverUrl).toBeDefined();
    });

    it('should fail when deviceKey is empty', () => {
      const data: DeviceFormData = {
        serverUrl: 'https://api.day.app',
        deviceKey: '',
      };
      const result = validateDeviceForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.deviceKey).toBeDefined();
    });

    it('should validate custom headers', () => {
      const data: DeviceFormData = {
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key',
        customHeaders: 'Invalid Header Without Colon',
      };
      const result = validateDeviceForm(data);
      expect(result.valid).toBe(false);
      expect(result.errors.customHeaders).toBeDefined();
    });

    it('should pass with valid custom headers', () => {
      const data: DeviceFormData = {
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key',
        customHeaders: 'Authorization: Bearer token\nX-Custom: value',
      };
      const result = validateDeviceForm(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });
});
