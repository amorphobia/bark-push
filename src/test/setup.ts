import { fc } from '@fast-check/vitest';

// Configure fast-check for property-based testing
fc.configureGlobal({
  numRuns: 100, // Run each property test 100 times
  verbose: true,
});

// Mock Tampermonkey APIs for testing
(globalThis as any).GM_setValue = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

(globalThis as any).GM_getValue = (key: string, defaultValue?: any) => {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : defaultValue;
};

(globalThis as any).GM_xmlhttpRequest = (_details: any) => {
  // Mock implementation for testing
  return Promise.resolve({
    status: 200,
    responseText: JSON.stringify({ code: 200, message: 'success' }),
  });
};

(globalThis as any).GM_registerMenuCommand = (caption: string, _callback: () => void) => {
  // Mock implementation for testing
  return caption;
};
