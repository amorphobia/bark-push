import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should have Tampermonkey APIs mocked', () => {
    expect(typeof GM_setValue).toBe('function');
    expect(typeof GM_getValue).toBe('function');
    expect(typeof GM_xmlhttpRequest).toBe('function');
    expect(typeof GM_registerMenuCommand).toBe('function');
  });

  it('should support GM_setValue and GM_getValue', () => {
    GM_setValue('test_key', 'test_value');
    const value = GM_getValue('test_key');
    expect(value).toBe('test_value');
  });

  it('should return default value when key does not exist', () => {
    const value = GM_getValue('non_existent_key', 'default');
    expect(value).toBe('default');
  });
});
