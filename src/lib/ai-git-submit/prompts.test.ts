import { describe, expect, it, vi } from 'vitest';
import { applySubmitDefaults, formatSubmitInvocation, promptSubmitOptions } from './prompts.js';

describe('promptSubmitOptions', () => {
  it('asks add, push, then protect-main with their defaults', async () => {
    const askAdd = vi.fn().mockResolvedValue(false);
    const askPush = vi.fn().mockResolvedValue(false);
    const askProtectMain = vi.fn().mockResolvedValue(true);

    const result = await promptSubmitOptions({}, { askAdd, askPush, askProtectMain });

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
    expect(askProtectMain).toHaveBeenCalledWith({
      message: 'Protect main/master by committing on a new feature branch?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: true,
    });
    expect(result).toEqual({ add: false, push: false, protectMain: true });
  });

  it('skips prompts for values already supplied by flags', async () => {
    const askAdd = vi.fn();
    const askPush = vi.fn().mockResolvedValue(true);
    const askProtectMain = vi.fn();

    const result = await promptSubmitOptions(
      { add: true, protectMain: false },
      { askAdd, askPush, askProtectMain },
    );

    expect(askAdd).not.toHaveBeenCalled();
    expect(askPush).toHaveBeenCalledOnce();
    expect(askProtectMain).not.toHaveBeenCalled();
    expect(result).toEqual({ add: true, push: true, protectMain: false });
  });
});

describe('applySubmitDefaults', () => {
  it('fills omitted flags with no/no/yes', () => {
    expect(applySubmitDefaults({})).toEqual({ add: false, push: false, protectMain: true });
    expect(applySubmitDefaults({ add: true })).toEqual({
      add: true,
      push: false,
      protectMain: true,
    });
    expect(applySubmitDefaults({ protectMain: false })).toEqual({
      add: false,
      push: false,
      protectMain: false,
    });
  });
});

describe('formatSubmitInvocation', () => {
  it('prints a non-interactive equivalent command line', () => {
    expect(formatSubmitInvocation({ add: true, push: false, protectMain: true })).toBe(
      'ai-git-submit --add yes --push no --protect-main yes',
    );
  });
});
