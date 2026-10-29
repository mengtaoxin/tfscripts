import { describe, expect, it } from 'vitest';
import { parseArgs } from './parse-args.js';

describe('parseArgs', () => {
  it('runs sync when no arguments are provided', () => {
    expect(parseArgs([])).toEqual({ ok: true, command: 'sync' });
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
      message: 'Unknown command "unknown". Run "repo-sync help" for usage.',
    });
  });

  it('rejects unknown options', () => {
    expect(parseArgs(['--foo'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown option "--foo". Run "repo-sync help" for usage.',
    });
  });
});
