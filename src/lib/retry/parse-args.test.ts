import { describe, expect, it } from 'vitest';
import { parseArgs } from './parse-args.js';

describe('parseArgs', () => {
  it('starts interactive mode when no arguments are given', () => {
    expect(parseArgs([])).toEqual({ ok: true, command: 'retry', mode: 'interactive' });
  });

  it('parses help, -h, and --help', () => {
    expect(parseArgs(['help'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['-h'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['--help'])).toEqual({ ok: true, command: 'help' });
  });

  it('rejects any other arguments', () => {
    const failure = {
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "retry help" for usage.',
    };
    expect(parseArgs(['echo'])).toEqual(failure);
    expect(parseArgs(['help', 'extra'])).toEqual(failure);
    expect(parseArgs(['--times', '10'])).toEqual(failure);
  });
});
