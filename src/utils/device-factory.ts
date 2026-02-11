/**
 * Device factory utilities for creating BarkDevice instances
 */

import type { BarkDevice } from '../types';

/**
 * Generates a UUID v4
 * @returns A UUID v4 string
 */
export function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a BarkDevice from partial input data
 * @param input - Partial device data
 * @returns A complete BarkDevice
 */
export function createDevice(input: {
  name?: string | null;
  serverUrl: string;
  deviceKey: string;
  customHeaders?: string | null;
  isDefault?: boolean | null;
}): BarkDevice {
  return {
    id: generateDeviceId(),
    name: input.name ?? undefined,
    serverUrl: input.serverUrl,
    deviceKey: input.deviceKey,
    customHeaders: input.customHeaders ?? undefined,
    isDefault: input.isDefault ?? false,
    createdAt: new Date().toISOString(),
  };
}
