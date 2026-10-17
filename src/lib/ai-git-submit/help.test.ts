import { describe, expect, it } from 'vitest';
import { HELP_TEXT } from './help.js';

describe('HELP_TEXT', () => {
  it('documents usage, options, and interactive defaults', () => {
    expect(HELP_TEXT).toContain('ai-git-submit');
    expect(HELP_TEXT).toContain('--add');
    expect(HELP_TEXT).toContain('--push');
    expect(HELP_TEXT).toContain('interactively');
    expect(HELP_TEXT).toContain('AI_GIT_SUBMIT_');
  });
});
