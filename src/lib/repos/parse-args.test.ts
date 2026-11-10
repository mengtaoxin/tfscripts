import { describe, expect, it } from 'vitest';
import { parseArgs } from './parse-args.js';

describe('parseArgs', () => {
  it('shows help when no arguments are provided', () => {
    expect(parseArgs([])).toEqual({ ok: true, command: 'help' });
  });

  it('parses help flags', () => {
    expect(parseArgs(['help'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['-h'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['--help'])).toEqual({ ok: true, command: 'help' });
  });

  it('parses update, check, and list commands', () => {
    expect(parseArgs(['update'])).toEqual({ ok: true, command: 'update' });
    expect(parseArgs(['check'])).toEqual({ ok: true, command: 'check' });
    expect(parseArgs(['list'])).toEqual({ ok: true, command: 'list' });
  });

  it('rejects unknown commands', () => {
    expect(parseArgs(['unknown'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown command "unknown". Run "repos --help" for usage.',
    });
  });

  it('rejects unknown options', () => {
    expect(parseArgs(['--foo'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown option "--foo". Run "repos --help" for usage.',
    });
  });

  it('rejects extra arguments after a command', () => {
    expect(parseArgs(['update', 'extra'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "repos --help" for usage.',
    });
  });
});
