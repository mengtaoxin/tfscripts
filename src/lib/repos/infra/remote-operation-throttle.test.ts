import { describe, expect, it, vi } from 'vitest';
import {
  isRemoteOperationThrottled,
  REMOTE_OPERATION_THROTTLED_REASON,
  tryBeginRemoteOperation,
} from './remote-operation-throttle.js';
import type { ReposState } from './state.js';

describe('isRemoteOperationThrottled', () => {
  const nowMs = Date.parse('2026-11-15T14:01:10.000Z');

  it('is not throttled when there is no last time', () => {
    expect(isRemoteOperationThrottled(undefined, nowMs, 10)).toBe(false);
  });

  it('is throttled when inside the window', () => {
    expect(isRemoteOperationThrottled('2026-11-15T14:01:05.000Z', nowMs, 10)).toBe(true);
  });

  it('is not throttled when exactly at the window boundary', () => {
    expect(isRemoteOperationThrottled('2026-11-15T14:01:00.000Z', nowMs, 10)).toBe(false);
  });

  it('is not throttled when past the window', () => {
    expect(isRemoteOperationThrottled('2026-11-15T14:00:50.000Z', nowMs, 10)).toBe(false);
  });

  it('treats invalid last time as not throttled', () => {
    expect(isRemoteOperationThrottled('not-a-date', nowMs, 10)).toBe(false);
  });
});

describe('tryBeginRemoteOperation', () => {
  it('exports a stable throttled reason', () => {
    expect(REMOTE_OPERATION_THROTTLED_REASON).toBe('remote operation throttled; try again later');
  });

  it('returns throttled when inside the window and does not write', () => {
    let stored: ReposState = {
      '/abs/foo': { 'last-remote-operation-time': '2026-11-15T14:01:05.000Z' },
    };
    const writeFile = vi.fn((_path: string, data: string) => {
      stored = JSON.parse(data) as ReposState;
    });

    const result = tryBeginRemoteOperation({
      statePath: '/s.json',
      key: '/abs/foo',
      throttlingSeconds: 10,
      now: () => new Date('2026-11-15T14:01:10.000Z'),
      readFile: () => JSON.stringify(stored),
      writeFile,
      mkdir: () => undefined,
    });

    expect(result).toEqual({ allowed: false, reason: REMOTE_OPERATION_THROTTLED_REASON });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('stamps last-remote-operation-time when allowed', () => {
    let stored: ReposState = {};
    const writeFile = vi.fn((_path: string, data: string) => {
      stored = JSON.parse(data) as ReposState;
    });

    const result = tryBeginRemoteOperation({
      statePath: '/s.json',
      key: '/abs/foo',
      throttlingSeconds: 10,
      now: () => new Date('2026-11-15T14:01:10.000Z'),
      readFile: () => JSON.stringify(stored),
      writeFile,
      mkdir: () => undefined,
    });

    expect(result).toEqual({ allowed: true });
    expect(stored['/abs/foo']).toEqual({
      'last-remote-operation-time': '2026-11-15T14:01:10.000Z',
    });
  });
});
