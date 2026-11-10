import { describe, expect, it } from 'vitest';
import { parseArgs } from './parse-args.js';

describe('parseArgs', () => {
  it('parses status, stop, and root help', () => {
    expect(parseArgs(['status'])).toEqual({ ok: true, command: 'status' });
    expect(parseArgs(['stop'])).toEqual({ ok: true, command: 'stop' });
    expect(parseArgs(['help'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['-h'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['--help'])).toEqual({ ok: true, command: 'help' });
  });

  it('parses leaf help via help <sub> and <sub> --help', () => {
    expect(parseArgs(['help', 'status'])).toEqual({
      ok: true,
      command: 'help',
      topic: 'status',
    });
    expect(parseArgs(['stop', '-h'])).toEqual({
      ok: true,
      command: 'help',
      topic: 'stop',
    });
    expect(parseArgs(['status', '--help'])).toEqual({
      ok: true,
      command: 'help',
      topic: 'status',
    });
  });

  it('rejects unknown subcommands including start', () => {
    expect(parseArgs(['unknown'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown command "unknown". Run "keep-awake help" for usage.',
    });
    expect(parseArgs(['start'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown command "start". Run "keep-awake help" for usage.',
    });
  });

  it('parses bare flags with both valid values as direct options', () => {
    expect(parseArgs(['--hours', '4', '--screen', 'no'])).toEqual({
      ok: true,
      command: 'start',
      noInput: false,
      hours: 4,
      screen: false,
    });
    expect(parseArgs(['--screen', 'YES', '--hours', '2', '--no-input'])).toEqual({
      ok: true,
      command: 'start',
      noInput: true,
      hours: 2,
      screen: true,
    });
  });

  it('keeps partial flags as start with undefined values', () => {
    expect(parseArgs([])).toEqual({
      ok: true,
      command: 'start',
      noInput: false,
      hours: undefined,
      screen: undefined,
    });
    expect(parseArgs(['--hours', '4'])).toEqual({
      ok: true,
      command: 'start',
      noInput: false,
      hours: 4,
      screen: undefined,
    });
    expect(parseArgs(['--screen', 'yes', '--no-input'])).toEqual({
      ok: true,
      command: 'start',
      noInput: true,
      hours: undefined,
      screen: true,
    });
  });

  it('rejects invalid hours or screen when the flag is present', () => {
    expect(parseArgs(['--hours', '25', '--screen', 'no'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--hours must be an integer from 1 to 24.',
    });
    expect(parseArgs(['--hours', '0'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--hours must be an integer from 1 to 24.',
    });
    expect(parseArgs(['--hours', '3.5', '--screen', 'no'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--hours must be an integer from 1 to 24.',
    });
    expect(parseArgs(['--hours', '4', '--screen', 'maybe'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--screen must be "yes" or "no".',
    });
  });
});
