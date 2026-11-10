import { describe, expect, it, vi } from 'vitest';
import { resolveInteractiveOptions } from './resolve-options.js';

describe('resolveInteractiveOptions', () => {
  it('prompts when needed and allowed, then logs the invocation', async () => {
    const log = vi.fn();
    const result = await resolveInteractiveOptions({
      noInput: false,
      needsPrompt: true,
      isTTY: true,
      prompt: async () => ({ hours: 2 }),
      applyDefaults: () => ({ missing: ['--hours'] as const }),
      formatInvocation: (options) => `cmd --hours ${options.hours}`,
      log,
    });

    expect(result).toEqual({ ok: true, options: { hours: 2 } });
    expect(log).toHaveBeenCalledWith('Run this again without prompts:\n  cmd --hours 2');
  });

  it('applies defaults when prompting is not needed', async () => {
    const prompt = vi.fn(async () => ({ hours: 9 }));
    const result = await resolveInteractiveOptions({
      noInput: false,
      needsPrompt: false,
      prompt,
      applyDefaults: () => ({ hours: 4 }),
    });

    expect(result).toEqual({ ok: true, options: { hours: 4 } });
    expect(prompt).not.toHaveBeenCalled();
  });

  it('returns missing flags when non-interactive and defaults cannot fill them', async () => {
    const result = await resolveInteractiveOptions({
      noInput: true,
      needsPrompt: true,
      prompt: async () => ({ hours: 2 }),
      applyDefaults: () => ({ missing: ['--hours'] as const }),
    });

    expect(result).toEqual({ ok: false, missing: ['--hours'] });
  });
});
