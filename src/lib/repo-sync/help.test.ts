import { describe, expect, it } from 'vitest';
import { HELP_TEXT } from './help.js';

describe('HELP_TEXT', () => {
  it('mentions the command name, config path, and help usage', () => {
    expect(HELP_TEXT).toContain('repo-sync');
    expect(HELP_TEXT).toContain('~/.tfscripts/repo-sync/settings.json');
    expect(HELP_TEXT).toContain('repo-sync help');
  });
});
