import { describe, expect, it } from 'vitest';
import { isNetworkError } from './network-error.js';

describe('isNetworkError', () => {
  it('detects system error codes on the error or its cause', () => {
    expect(isNetworkError(Object.assign(new Error('fail'), { code: 'ENOTFOUND' }))).toBe(true);
    expect(isNetworkError(Object.assign(new Error('fail'), { code: 'ECONNRESET' }))).toBe(true);
    expect(
      isNetworkError(
        Object.assign(new TypeError('fetch failed'), {
          cause: Object.assign(new Error('connect'), { code: 'ETIMEDOUT' }),
        }),
      ),
    ).toBe(true);
  });

  it('detects common git and fetch network messages', () => {
    expect(isNetworkError(new Error('Could not resolve host: github.com'))).toBe(true);
    expect(isNetworkError(new Error('Failed to connect to github.com port 443'))).toBe(true);
    expect(isNetworkError(new TypeError('fetch failed'))).toBe(true);
  });

  it('rejects permanent application failures', () => {
    expect(isNetworkError(new Error('[rejected] main -> main (non-fast-forward)'))).toBe(false);
    expect(
      isNetworkError(new Error('LLM request failed with status 402: insufficient balance')),
    ).toBe(false);
    expect(isNetworkError(new Error('LLM returned an empty commit message.'))).toBe(false);
  });
});
