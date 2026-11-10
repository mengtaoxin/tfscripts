import { describe, expect, it, vi } from 'vitest';
import { applySubmitDefaults, formatSubmitInvocation, promptSubmitOptions } from './prompts.js';

describe('promptSubmitOptions', () => {
  it('asks add then push with No as the default for both', async () => {
    const askAdd = vi.fn().mockResolvedValue(false);
    const askPush = vi.fn().mockResolvedValue(false);

    const result = await promptSubmitOptions({}, { askAdd, askPush });

    expect(askAdd).toHaveBeenCalledWith({
      message: 'Run "git add ." before generating the commit message?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: false,
    });
    expect(askPush).toHaveBeenCalledWith({
      message: 'Run "git push" after a successful commit?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: false,
    });
    expect(result).toEqual({ add: false, push: false });
  });

  it('skips prompts for values already supplied by flags', async () => {
    const askAdd = vi.fn();
    const askPush = vi.fn().mockResolvedValue(true);

    const result = await promptSubmitOptions({ add: true }, { askAdd, askPush });

    expect(askAdd).not.toHaveBeenCalled();
    expect(askPush).toHaveBeenCalledOnce();
    expect(result).toEqual({ add: true, push: true });
  });
});

describe('applySubmitDefaults', () => {
  it('fills omitted flags with no/no', () => {
    expect(applySubmitDefaults({})).toEqual({ add: false, push: false });
    expect(applySubmitDefaults({ add: true })).toEqual({ add: true, push: false });
  });
});

describe('formatSubmitInvocation', () => {
  it('prints a non-interactive equivalent command line', () => {
    expect(formatSubmitInvocation({ add: true, push: false })).toBe(
      'ai-git-submit --add yes --push no',
    );
  });
});
