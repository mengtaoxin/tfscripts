import { describe, expect, it } from 'vitest';
import { HELP_TEXT } from './help.js';

describe('HELP_TEXT', () => {
  it('mentions the command name, flags, and settings path', () => {
    expect(HELP_TEXT).toContain('open-in-vscode');
    expect(HELP_TEXT).toContain('--path');
    expect(HELP_TEXT).toContain('--reuse-window');
    expect(HELP_TEXT).toContain('~/.tfscripts/open-in-vscode/settings.json');
    expect(HELP_TEXT).toContain('path-configs');
  });
});
