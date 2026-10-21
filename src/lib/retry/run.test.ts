import { EventEmitter } from 'node:events';
import { constants } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { formatRetryNotice, runRetry, runShellCommand } from './run.js';

describe('runRetry', () => {
  it('returns 0 on the first success without sleeping', async () => {
    const run = vi.fn().mockResolvedValue(0);
    const sleep = vi.fn();
    const onRetry = vi.fn();

    const code = await runRetry({
      command: 'echo ok',
      times: 10,
      intervalSeconds: 10,
      run,
      sleep,
      onRetry,
    });

    expect(code).toBe(0);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('echo ok');
    expect(sleep).not.toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('retries with a fixed interval until the command succeeds', async () => {
    const run = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const sleep = vi.fn().mockResolvedValue(undefined);
    const onRetry = vi.fn();

    const code = await runRetry({
      command: 'false',
      times: 10,
      intervalSeconds: 3,
      run,
      sleep,
      onRetry,
    });

    expect(code).toBe(0);
    expect(run).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(3000);
    expect(onRetry).toHaveBeenCalledWith({ attempt: 1, exitCode: 1, delaySeconds: 3 });
  });

  it('stops after 10 failures and returns the last non-zero exit code', async () => {
    let attempt = 0;
    const run = vi.fn(async () => {
      attempt += 1;
      return attempt === 10 ? 7 : 1;
    });
    const sleep = vi.fn().mockResolvedValue(undefined);

    const code = await runRetry({
      command: 'false',
      times: 10,
      intervalSeconds: 10,
      run,
      sleep,
    });

    expect(code).toBe(7);
    expect(run).toHaveBeenCalledTimes(10);
    expect(sleep).toHaveBeenCalledTimes(9);
    for (const call of sleep.mock.calls) {
      expect(call).toEqual([10_000]);
    }
  });
});

describe('formatRetryNotice', () => {
  it('describes the failed attempt and the fixed wait', () => {
    expect(formatRetryNotice({ attempt: 1, exitCode: 1, delaySeconds: 10 })).toBe(
      'Attempt 1 failed with exit code 1. Retrying in 10s.',
    );
  });
});

describe('runShellCommand', () => {
  it('runs the command with sh -c and returns its exit code', async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);
    const pending = runShellCommand('echo ok', spawn);
    child.emit('close', 0, null);

    await expect(pending).resolves.toBe(0);
    expect(spawn).toHaveBeenCalledWith('sh', ['-c', 'echo ok'], { stdio: 'inherit' });
  });

  it('maps a terminating signal to 128 plus the signal number', async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);
    const pending = runShellCommand('sleep 10', spawn);
    child.emit('close', null, 'SIGTERM');

    await expect(pending).resolves.toBe(128 + constants.signals.SIGTERM);
  });

  it('returns 1 when the process ends without a code or signal', async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);
    const pending = runShellCommand('sleep 10', spawn);
    child.emit('close', null, null);

    await expect(pending).resolves.toBe(1);
  });

  it('returns 1 when the process fails to spawn', async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);
    const pending = runShellCommand('missing', spawn);
    child.emit('error', new Error('spawn ENOENT'));

    await expect(pending).resolves.toBe(1);
  });
});
