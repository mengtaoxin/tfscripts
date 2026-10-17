import { describe, expect, it, vi } from 'vitest';
import { withExponentialBackoff } from './retry.js';

describe('withExponentialBackoff', () => {
  it('returns on first success without sleeping', async () => {
    const sleep = vi.fn();
    const result = await withExponentialBackoff(async () => 'ok', {
      maxRetries: 3,
      baseMs: 500,
      sleep,
      random: () => 0,
    });

    expect(result).toBe('ok');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries after failures and eventually succeeds', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockResolvedValueOnce('done');

    const result = await withExponentialBackoff(fn, {
      maxRetries: 3,
      baseMs: 100,
      sleep,
      random: () => 0,
    });

    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 200);
  });

  it('gives up after maxRetries and throws the last error', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValue(new Error('always'));

    await expect(
      withExponentialBackoff(fn, {
        maxRetries: 2,
        baseMs: 50,
        sleep,
        random: () => 0,
      }),
    ).rejects.toThrow('always');

    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('includes jitter from random in the delay', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('ok');

    await withExponentialBackoff(fn, {
      maxRetries: 1,
      baseMs: 100,
      sleep,
      random: () => 0.5,
    });

    expect(sleep).toHaveBeenCalledWith(150);
  });
});
