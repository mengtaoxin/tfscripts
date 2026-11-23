import { describe, expect, it } from 'vitest';
import { HELP_CHECK, HELP_LIST, HELP_SUBMIT, HELP_TEXT, HELP_UPDATE, helpTextFor } from './help.js';

describe('HELP_TEXT', () => {
  it('mentions the command name, config path, and subcommands', () => {
    expect(HELP_TEXT).toContain('repos');
    expect(HELP_TEXT).toContain('~/.tfscripts/repos/settings.yml');
    expect(HELP_TEXT).toContain('repos --help');
    expect(HELP_TEXT).toContain('repos update');
    expect(HELP_TEXT).toContain('repos check');
    expect(HELP_TEXT).toContain('repos list');
    expect(HELP_TEXT).toContain('repos submit');
    expect(HELP_TEXT).toContain('repos help update');
    expect(HELP_TEXT).toContain('environment: ssh');
    expect(HELP_TEXT).toContain('ssh-host: devbox');
    expect(HELP_TEXT).toContain('ai-git-submit-parameters');
    expect(HELP_TEXT).toContain('after-update-commands');
    expect(HELP_TEXT).toContain('name: local-tfscripts');
    expect(HELP_TEXT).toContain('list.show-commit-count');
    expect(HELP_TEXT).toContain('remote-operation.throttling');
    expect(HELP_TEXT).toContain('GH_TOKEN');
    expect(HELP_TEXT).toContain('login shell');
  });
});

describe('helpTextFor', () => {
  it('returns leaf help for each subcommand', () => {
    expect(helpTextFor('update')).toBe(HELP_UPDATE);
    expect(helpTextFor('check')).toBe(HELP_CHECK);
    expect(helpTextFor('list')).toBe(HELP_LIST);
    expect(helpTextFor('submit')).toBe(HELP_SUBMIT);
    expect(HELP_UPDATE).toContain('repos update');
    expect(HELP_UPDATE).toContain('remote-operation.throttling');
    expect(HELP_UPDATE).toContain('after-update-commands');
    expect(HELP_CHECK).toContain('repos check');
    expect(HELP_CHECK).toContain('list.show-commit-count');
    expect(HELP_CHECK).toContain('remote-operation.throttling');
    expect(HELP_LIST).toContain('repos list');
    expect(HELP_LIST).not.toContain('--show-commit-count');
    expect(HELP_LIST).not.toContain('-scc');
    expect(HELP_SUBMIT).toContain('repos submit --name');
    expect(HELP_SUBMIT).toContain('ai-git-submit');
    expect(HELP_SUBMIT).toContain('--protect-main');
  });
});
