import { describe, expect, it, vi } from 'vitest';
import {
  applyKeepAwakeDefaults,
  formatKeepAwakeInvocation,
  promptKeepAwakeOptions,
} from './prompts.js';

describe('promptKeepAwakeOptions', () => {
  it('offers Yes/No select for screen with No as default', async () => {
    const askHours = vi.fn().mockResolvedValue(4);
    const askScreen = vi.fn().mockResolvedValue(false);

    const result = await promptKeepAwakeOptions({}, { askHours, askScreen });

    expect(askScreen).toHaveBeenCalledWith({
      message: 'Keep the screen on?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: false,
    });
    expect(result).toEqual({ hours: 4, screen: false });
  });

  it('skips prompts for values already supplied by flags', async () => {
    const askHours = vi.fn();
    const askScreen = vi.fn().mockResolvedValue(true);

    const result = await promptKeepAwakeOptions({ hours: 6 }, { askHours, askScreen });

    expect(askHours).not.toHaveBeenCalled();
    expect(askScreen).toHaveBeenCalledOnce();
    expect(result).toEqual({ hours: 6, screen: true });
  });
});

describe('applyKeepAwakeDefaults', () => {
  it('requires both flags when not prompting', () => {
    expect(applyKeepAwakeDefaults({})).toEqual({ missing: ['--hours', '--screen'] });
    expect(applyKeepAwakeDefaults({ hours: 4 })).toEqual({ missing: ['--screen'] });
    expect(applyKeepAwakeDefaults({ hours: 4, screen: false })).toEqual({
      hours: 4,
      screen: false,
    });
  });
});

describe('formatKeepAwakeInvocation', () => {
  it('prints a non-interactive equivalent command line', () => {
    expect(formatKeepAwakeInvocation({ hours: 4, screen: false })).toBe(
      'keep-awake --hours 4 --screen no',
    );
  });
});
