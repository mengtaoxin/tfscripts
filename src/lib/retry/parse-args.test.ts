import { describe, expect, it } from 'vitest';
import { parseArgs } from './parse-args.js';

describe('parseArgs', () => {
  it('starts with no values when no arguments are given', () => {
    expect(parseArgs([])).toEqual({
      ok: true,
      command: 'retry',
      noInput: false,
      shellCommand: undefined,
      times: undefined,
      intervalSeconds: undefined,
    });
  });

  it('parses help, -h, and --help', () => {
    expect(parseArgs(['help'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['-h'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['--help'])).toEqual({ ok: true, command: 'help' });
  });

  it('parses flags including partial sets and --no-input', () => {
    expect(parseArgs(['--command', 'echo ok', '--times', '3', '--interval', '1'])).toEqual({
      ok: true,
      command: 'retry',
      noInput: false,
      shellCommand: 'echo ok',
      times: 3,
      intervalSeconds: 1,
    });
    expect(parseArgs(['--times', '5', '--no-input'])).toEqual({
      ok: true,
      command: 'retry',
      noInput: true,
      shellCommand: undefined,
      times: 5,
      intervalSeconds: undefined,
    });
  });

  it('rejects invalid flag values', () => {
    expect(parseArgs(['--times', '0'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--times must be an integer of at least 1.',
    });
    expect(parseArgs(['--interval', '1.5'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--interval must be an integer of at least 0.',
    });
    expect(parseArgs(['--command'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--command requires a value.',
    });
  });

  it('rejects unknown options and positional args', () => {
    expect(parseArgs(['echo'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "retry help" for usage.',
    });
    expect(parseArgs(['--foo'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown option "--foo". Run "retry help" for usage.',
    });
    expect(parseArgs(['help', 'extra'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "retry help" for usage.',
    });
  });
});
