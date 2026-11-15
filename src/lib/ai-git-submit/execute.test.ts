import { describe, expect, it, vi } from 'vitest';
import { executeSubmit } from './execute.js';

describe('executeSubmit', () => {
  it('fails when not in a git repository before prompting', async () => {
    const prompt = vi.fn();
    const runSubmitFn = vi.fn();
    const error = vi.fn();

    const exitCode = await executeSubmit(
      { noInput: false },
      {
        resolveRepoRootFn: vi
          .fn()
          .mockRejectedValue(new Error('Not a git repository (or any of the parent directories).')),
        promptSubmitOptionsFn: prompt,
        runSubmitFn,
        error,
        isTTY: true,
      },
    );

    expect(exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith('Not a git repository (or any of the parent directories).');
    expect(prompt).not.toHaveBeenCalled();
    expect(runSubmitFn).not.toHaveBeenCalled();
  });

  it('prompts and submits when inside a git repository', async () => {
    const prompt = vi.fn().mockResolvedValue({ add: true, push: false });
    const runSubmitFn = vi.fn().mockResolvedValue({ exitCode: 0, commitMessage: 'feat: x' });

    const exitCode = await executeSubmit(
      { noInput: false },
      {
        resolveRepoRootFn: vi.fn().mockResolvedValue('/repo'),
        promptSubmitOptionsFn: prompt,
        runSubmitFn,
        error: vi.fn(),
        isTTY: true,
      },
    );

    expect(exitCode).toBe(0);
    expect(prompt).toHaveBeenCalled();
    expect(runSubmitFn).toHaveBeenCalledWith({ add: true, push: false }, expect.any(Object));
  });
});
