import { describe, expect, it, vi } from 'vitest';
import { runRepoSubmit } from './run-submit.js';

describe('runRepoSubmit', () => {
  it('submits the matching repo by name', async () => {
    const submitOne = vi.fn().mockResolvedValue(0);
    const result = await runRepoSubmit(
      { name: 'foo' },
      {
        loadSettings: () => ({
          repos: [
            { name: 'foo', path: '/a', environment: 'local' },
            { name: 'bar', path: '/b', environment: 'local' },
          ],
        }),
        submitOne,
        error: vi.fn(),
      },
    );

    expect(result.exitCode).toBe(0);
    expect(submitOne).toHaveBeenCalledWith(
      { name: 'foo', path: '/a', environment: 'local' },
      expect.objectContaining({ remoteHomeCache: expect.any(Map) }),
    );
  });

  it('fails when no repo matches the name', async () => {
    const error = vi.fn();
    const submitOne = vi.fn();
    const result = await runRepoSubmit(
      { name: 'missing' },
      {
        loadSettings: () => ({
          repos: [{ name: 'foo', path: '/a', environment: 'local' }],
        }),
        submitOne,
        error,
      },
    );

    expect(result.exitCode).toBe(1);
    expect(submitOne).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('No repo named "missing" in settings.');
  });

  it('fails when multiple repos share the same name', async () => {
    const error = vi.fn();
    const submitOne = vi.fn();
    const result = await runRepoSubmit(
      { name: 'dup' },
      {
        loadSettings: () => ({
          repos: [
            { name: 'dup', path: '/a', environment: 'local' },
            { name: 'dup', path: '/b', environment: 'ssh', sshHost: 'devbox' },
          ],
        }),
        submitOne,
        error,
      },
    );

    expect(result.exitCode).toBe(1);
    expect(submitOne).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      'Multiple repos named "dup" in settings; names must be unique.',
    );
  });

  it('returns loadSettings failures', async () => {
    const error = vi.fn();
    const result = await runRepoSubmit(
      { name: 'foo' },
      {
        loadSettings: () => {
          throw new Error('bad settings');
        },
        error,
      },
    );

    expect(result.exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith('bad settings');
  });
});
