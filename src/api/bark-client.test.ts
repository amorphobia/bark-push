/**
 * Property-based and unit tests for BarkClient
 * Feature: bark-push-userscript
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { fc } from '@fast-check/vitest';
import { BarkClient } from './bark-client';
import { createDevice } from '../utils/device-factory';
import type { NotificationPayload } from '../types';

describe('BarkClient', () => {
  let client: BarkClient;
  let mockXmlHttpRequest: any;

  beforeEach(() => {
    client = new BarkClient();
    
    // Reset mock
    mockXmlHttpRequest = vi.fn();
    (globalThis as any).GM_xmlhttpRequest = mockXmlHttpRequest;
    
    // Clear mock calls
    vi.clearAllMocks();
  });

  // ============================================================================
  // PROPERTY-BASED TESTS
  // ============================================================================

  describe('Property 25: API endpoint correctness', () => {
    test('all notification requests use POST to {serverUrl}/push', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              serverUrl: fc.webUrl(),
              deviceKey: fc.string({ minLength: 1 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          fc.record({
            body: fc.string({ minLength: 1 }),
            title: fc.option(fc.string(), { nil: undefined }),
          }),
          async (deviceInputs, payload) => {
            // Reset mock for this iteration
            mockXmlHttpRequest.mockClear();
            
            const devices = deviceInputs.map(input => createDevice(input));
            
            mockXmlHttpRequest.mockImplementation((details: any) => {
              details.onload({ status: 200, responseText: '{}' });
            });

            await client.sendNotification(devices, payload);

            expect(mockXmlHttpRequest).toHaveBeenCalled();
            const callArgs = mockXmlHttpRequest.mock.calls[0][0];
            
            expect(callArgs.method).toBe('POST');
            expect(callArgs.url).toBe(`${devices[0].serverUrl}/push`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 26: Content-Type header inclusion', () => {
    test('all requests include Content-Type: application/json; charset=utf-8', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 1 }),
          }),
          fc.record({
            body: fc.string({ minLength: 1 }),
          }),
          async (deviceInput, payload) => {
            mockXmlHttpRequest.mockClear();
            
            const device = createDevice(deviceInput);
            
            mockXmlHttpRequest.mockImplementation((details: any) => {
              details.onload({ status: 200, responseText: '{}' });
            });

            await client.sendNotification([device], payload);

            const callArgs = mockXmlHttpRequest.mock.calls[0][0];
            expect(callArgs.headers['Content-Type']).toBe('application/json; charset=utf-8');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14: Single device uses device_key', () => {
    test('single device requests include device_key parameter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 1 }),
          }),
          fc.record({
            body: fc.string({ minLength: 1 }),
          }),
          async (deviceInput, payload) => {
            mockXmlHttpRequest.mockClear();
            
            const device = createDevice(deviceInput);
            
            mockXmlHttpRequest.mockImplementation((details: any) => {
              details.onload({ status: 200, responseText: '{}' });
            });

            await client.sendNotification([device], payload);

            const callArgs = mockXmlHttpRequest.mock.calls[0][0];
            const requestData = JSON.parse(callArgs.data);
            
            expect(requestData.device_key).toBe(device.deviceKey);
            expect(requestData.device_keys).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 13: Multi-device uses device_keys array', () => {
    test('multi-device requests include device_keys array and omit device_key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl(), // Generate one server URL for all devices
          fc.array(
            fc.string({ minLength: 1 }), // Generate device keys
            { minLength: 2, maxLength: 5 }
          ),
          fc.record({
            body: fc.string({ minLength: 1 }),
          }),
          async (serverUrl, deviceKeys, payload) => {
            mockXmlHttpRequest.mockClear();
            
            // Create devices with the SAME server URL so they're in one group
            const devices = deviceKeys.map(deviceKey => 
              createDevice({ serverUrl, deviceKey })
            );
            
            mockXmlHttpRequest.mockImplementation((details: any) => {
              details.onload({ status: 200, responseText: '{}' });
            });

            await client.sendNotification(devices, payload);

            // Should make exactly one request since all devices share same server
            expect(mockXmlHttpRequest.mock.calls.length).toBe(1);
            
            const callArgs = mockXmlHttpRequest.mock.calls[0][0];
            const requestData = JSON.parse(callArgs.data);
            
            // Multi-device group should use device_keys array, not device_key
            expect(requestData.device_key).toBeUndefined();
            expect(Array.isArray(requestData.device_keys)).toBe(true);
            expect(requestData.device_keys.length).toBe(devices.length);
            requestData.device_keys.forEach((key: string, i: number) => {
              expect(key).toBe(deviceKeys[i]);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7 & 8: Markdown mode affects body/markdown parameters', () => {
    test('markdown disabled uses body parameter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 1 }),
          }),
          fc.string({ minLength: 1 }),
          async (deviceInput, messageText) => {
            mockXmlHttpRequest.mockClear();
            
            const device = createDevice(deviceInput);
            const payload: NotificationPayload = { body: messageText };
            
            mockXmlHttpRequest.mockImplementation((details: any) => {
              details.onload({ status: 200, responseText: '{}' });
            });

            await client.sendNotification([device], payload);

            const callArgs = mockXmlHttpRequest.mock.calls[0][0];
            const requestData = JSON.parse(callArgs.data);
            
            expect(requestData.body).toBe(messageText);
            expect(requestData.markdown).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('markdown enabled uses markdown parameter and omits body', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 1 }),
          }),
          fc.string({ minLength: 1 }),
          async (deviceInput, markdownText) => {
            mockXmlHttpRequest.mockClear();
            
            const device = createDevice(deviceInput);
            const payload: NotificationPayload = { markdown: markdownText };
            
            mockXmlHttpRequest.mockImplementation((details: any) => {
              details.onload({ status: 200, responseText: '{}' });
            });

            await client.sendNotification([device], payload);

            const callArgs = mockXmlHttpRequest.mock.calls[0][0];
            const requestData = JSON.parse(callArgs.data);
            
            expect(requestData.markdown).toBe(markdownText);
            expect(requestData.body).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 27: Custom headers inclusion', () => {
    test('devices with custom headers include them in requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 1 }),
            customHeaders: fc.string({ minLength: 1 }),
          }),
          fc.record({
            body: fc.string({ minLength: 1 }),
          }),
          async (deviceInput, payload) => {
            mockXmlHttpRequest.mockClear();
            
            // Create valid header format
            const headerName = 'X-Custom-Header';
            const headerValue = 'test-value';
            const device = createDevice({
              ...deviceInput,
              customHeaders: `${headerName}: ${headerValue}`,
            });
            
            mockXmlHttpRequest.mockImplementation((details: any) => {
              details.onload({ status: 200, responseText: '{}' });
            });

            await client.sendNotification([device], payload);

            const callArgs = mockXmlHttpRequest.mock.calls[0][0];
            expect(callArgs.headers[headerName]).toBe(headerValue);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Optional parameters inclusion', () => {
    test('optional parameters with values are included in request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            serverUrl: fc.webUrl(),
            deviceKey: fc.string({ minLength: 1 }),
          }),
          fc.record({
            body: fc.string({ minLength: 1 }),
            title: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
            sound: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
            icon: fc.option(fc.webUrl(), { nil: undefined }),
            group: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
            url: fc.option(fc.webUrl(), { nil: undefined }),
          }),
          async (deviceInput, payload) => {
            mockXmlHttpRequest.mockClear();
            
            const device = createDevice(deviceInput);
            
            mockXmlHttpRequest.mockImplementation((details: any) => {
              details.onload({ status: 200, responseText: '{}' });
            });

            await client.sendNotification([device], payload);

            const callArgs = mockXmlHttpRequest.mock.calls[0][0];
            const requestData = JSON.parse(callArgs.data);
            
            // Check that all provided optional parameters are included
            if (payload.title) expect(requestData.title).toBe(payload.title);
            if (payload.sound) expect(requestData.sound).toBe(payload.sound);
            if (payload.icon) expect(requestData.icon).toBe(payload.icon);
            if (payload.group) expect(requestData.group).toBe(payload.group);
            if (payload.url) expect(requestData.url).toBe(payload.url);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // UNIT TESTS
  // ============================================================================

  describe('sendNotification', () => {
    test('sends notification to single device successfully', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      const payload: NotificationPayload = {
        title: 'Test Title',
        body: 'Test message',
      };

      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onload({ status: 200, responseText: '{"code":200,"message":"success"}' });
      });

      await client.sendNotification([device], payload);

      expect(mockXmlHttpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://api.day.app/push',
          headers: expect.objectContaining({
            'Content-Type': 'application/json; charset=utf-8',
          }),
        })
      );
    });

    test('throws error when no devices provided', async () => {
      const payload: NotificationPayload = { body: 'Test' };

      await expect(client.sendNotification([], payload)).rejects.toThrow('No devices provided');
    });

    test('handles network timeout', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      const payload: NotificationPayload = { body: 'Test' };

      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.ontimeout();
      });

      await expect(client.sendNotification([device], payload)).rejects.toThrow('Request timed out');
    });

    test('handles network error', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      const payload: NotificationPayload = { body: 'Test' };

      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onerror();
      });

      await expect(client.sendNotification([device], payload)).rejects.toThrow('Network error');
    });

    test('parses API error response', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      const payload: NotificationPayload = { body: 'Test' };

      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onload({
          status: 400,
          responseText: '{"code":400,"message":"Invalid device key"}',
        });
      });

      await expect(client.sendNotification([device], payload)).rejects.toThrow('Invalid device key');
    });

    test('handles non-JSON error response', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      const payload: NotificationPayload = { body: 'Test' };

      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onload({
          status: 500,
          responseText: 'Internal Server Error',
        });
      });

      await expect(client.sendNotification([device], payload)).rejects.toThrow('Server error');
    });
  });

  describe('testConnection', () => {
    test('returns true for successful connection', async () => {
      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onload({ status: 200, responseText: 'pong' });
      });

      const result = await client.testConnection(
        'https://api.day.app',
        'test-key-123'
      );

      expect(result).toBe(true);
      expect(mockXmlHttpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'https://api.day.app/ping',
        })
      );
    });

    test('returns false for failed connection', async () => {
      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onerror();
      });

      const result = await client.testConnection(
        'https://api.day.app',
        'test-key-123'
      );

      expect(result).toBe(false);
    });

    test('returns false for timeout', async () => {
      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.ontimeout();
      });

      const result = await client.testConnection(
        'https://api.day.app',
        'test-key-123'
      );

      expect(result).toBe(false);
    });

    test('includes custom headers in ping request', async () => {
      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onload({ status: 200, responseText: 'pong' });
      });

      await client.testConnection(
        'https://api.day.app',
        'test-key-123',
        'Authorization: Bearer token123'
      );

      expect(mockXmlHttpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123',
          }),
        })
      );
    });
  });

  describe('Custom Headers Parsing', () => {
    test('parses single header correctly', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
        customHeaders: 'Authorization: Bearer token123',
      });
      const payload: NotificationPayload = { body: 'Test' };

      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onload({ status: 200, responseText: '{}' });
      });

      await client.sendNotification([device], payload);

      const callArgs = mockXmlHttpRequest.mock.calls[0][0];
      expect(callArgs.headers['Authorization']).toBe('Bearer token123');
    });

    test('parses multiple headers correctly', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
        customHeaders: 'Authorization: Bearer token123\nX-Custom-Header: value456',
      });
      const payload: NotificationPayload = { body: 'Test' };

      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onload({ status: 200, responseText: '{}' });
      });

      await client.sendNotification([device], payload);

      const callArgs = mockXmlHttpRequest.mock.calls[0][0];
      expect(callArgs.headers['Authorization']).toBe('Bearer token123');
      expect(callArgs.headers['X-Custom-Header']).toBe('value456');
    });

    test('ignores malformed headers', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
        customHeaders: 'Valid-Header: value\nInvalidHeaderNoColon\nAnother-Valid: value2',
      });
      const payload: NotificationPayload = { body: 'Test' };

      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onload({ status: 200, responseText: '{}' });
      });

      await client.sendNotification([device], payload);

      const callArgs = mockXmlHttpRequest.mock.calls[0][0];
      expect(callArgs.headers['Valid-Header']).toBe('value');
      expect(callArgs.headers['Another-Valid']).toBe('value2');
      expect(callArgs.headers['InvalidHeaderNoColon']).toBeUndefined();
    });

    test('handles empty custom headers', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
        customHeaders: '',
      });
      const payload: NotificationPayload = { body: 'Test' };

      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onload({ status: 200, responseText: '{}' });
      });

      await client.sendNotification([device], payload);

      const callArgs = mockXmlHttpRequest.mock.calls[0][0];
      expect(callArgs.headers['Content-Type']).toBe('application/json; charset=utf-8');
      // Should only have Content-Type header
      expect(Object.keys(callArgs.headers).length).toBe(1);
    });
  });

  describe('Request Building', () => {
    test('includes title when provided', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      const payload: NotificationPayload = {
        title: 'Test Title',
        body: 'Test message',
      };

      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onload({ status: 200, responseText: '{}' });
      });

      await client.sendNotification([device], payload);

      const callArgs = mockXmlHttpRequest.mock.calls[0][0];
      const requestData = JSON.parse(callArgs.data);
      expect(requestData.title).toBe('Test Title');
    });

    test('converts autoCopy boolean to string', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      const payload: NotificationPayload = {
        body: 'Test',
        autoCopy: true,
      };

      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onload({ status: 200, responseText: '{}' });
      });

      await client.sendNotification([device], payload);

      const callArgs = mockXmlHttpRequest.mock.calls[0][0];
      const requestData = JSON.parse(callArgs.data);
      expect(requestData.autoCopy).toBe('1');
    });

    test('includes all optional parameters when provided', async () => {
      const device = createDevice({
        serverUrl: 'https://api.day.app',
        deviceKey: 'test-key-123',
      });
      const payload: NotificationPayload = {
        body: 'Test',
        sound: 'alarm',
        icon: 'https://example.com/icon.png',
        group: 'test-group',
        url: 'https://example.com',
        badge: 5,
        level: 'critical',
        volume: 8,
      };

      mockXmlHttpRequest.mockImplementation((details: any) => {
        details.onload({ status: 200, responseText: '{}' });
      });

      await client.sendNotification([device], payload);

      const callArgs = mockXmlHttpRequest.mock.calls[0][0];
      const requestData = JSON.parse(callArgs.data);
      expect(requestData.sound).toBe('alarm');
      expect(requestData.icon).toBe('https://example.com/icon.png');
      expect(requestData.group).toBe('test-group');
      expect(requestData.url).toBe('https://example.com');
      expect(requestData.badge).toBe(5);
      expect(requestData.level).toBe('critical');
      expect(requestData.volume).toBe(8);
    });
  });
});
