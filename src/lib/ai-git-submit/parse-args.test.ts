import { describe, expect, it } from 'vitest';
import { parseArgs } from './parse-args.js';

describe('parseArgs', () => {
  it('uses interactive mode when no arguments are provided', () => {
    expect(parseArgs([])).toEqual({
      ok: true,
      command: 'submit',
      mode: 'interactive',
    });
  });

  it('parses help flags', () => {
    expect(parseArgs(['help'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['-h'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['--help'])).toEqual({ ok: true, command: 'help' });
  });

  it('rejects unknown commands', () => {
    expect(parseArgs(['unknown'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown command "unknown". Run "ai-git-submit help" for usage.',
    });
  });

  it('parses direct mode with both flags', () => {
    expect(parseArgs(['--add', 'yes', '--push', 'no'])).toEqual({
      ok: true,
      command: 'submit',
      mode: 'direct',
      add: true,
      push: false,
    });
    expect(parseArgs(['--push', 'YES', '--add', 'NO'])).toEqual({
      ok: true,
      command: 'submit',
      mode: 'direct',
      add: false,
      push: true,
    });
  });

  it('applies defaults for omitted flags in direct mode', () => {
    expect(parseArgs(['--add', 'yes'])).toEqual({
      ok: true,
      command: 'submit',
      mode: 'direct',
      add: true,
      push: false,
    });
    expect(parseArgs(['--push', 'yes'])).toEqual({
      ok: true,
      command: 'submit',
      mode: 'direct',
      add: false,
      push: true,
    });
  });

  it('rejects invalid or missing yes/no values', () => {
    expect(parseArgs(['--add', 'maybe'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--add must be "yes" or "no".',
    });
    expect(parseArgs(['--push', 'maybe'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--push must be "yes" or "no".',
    });
    expect(parseArgs(['--add'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--add must be "yes" or "no".',
    });
    expect(parseArgs(['--push', '--add', 'yes'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--push must be "yes" or "no".',
    });
  });

  it('rejects unknown options', () => {
    expect(parseArgs(['--hours', '4'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown option "--hours". Run "ai-git-submit help" for usage.',
    });
  });
});
