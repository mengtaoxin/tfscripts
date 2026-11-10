import { describe, expect, it } from 'vitest';
import { HELP_TEXT } from './help.js';

describe('HELP_TEXT', () => {
  it('mentions the command name, config path, and subcommands', () => {
    expect(HELP_TEXT).toContain('repos');
    expect(HELP_TEXT).toContain('~/.tfscripts/repos/settings.json');
    expect(HELP_TEXT).toContain('repos --help');
    expect(HELP_TEXT).toContain('repos update');
    expect(HELP_TEXT).toContain('repos check');
    expect(HELP_TEXT).toContain('repos list');
  });
});
