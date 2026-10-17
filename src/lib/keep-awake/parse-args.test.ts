import { describe, expect, it } from 'vitest';
import { parseArgs } from './parse-args.js';

describe('parseArgs', () => {
  it('parses status, stop, and help subcommands', () => {
    expect(parseArgs(['status'])).toEqual({ ok: true, command: 'status' });
    expect(parseArgs(['stop'])).toEqual({ ok: true, command: 'stop' });
    expect(parseArgs(['help'])).toEqual({ ok: true, command: 'help' });
  });

  it('returns help needed for empty or unknown subcommands', () => {
    expect(parseArgs([])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Missing command. Run "keep-awake help" for usage.',
    });
    expect(parseArgs(['unknown'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown command "unknown". Run "keep-awake help" for usage.',
    });
  });

  it('parses start with both valid flags as direct options', () => {
    expect(parseArgs(['start', '--hours', '4', '--screen', 'no'])).toEqual({
      ok: true,
      command: 'start',
      mode: 'direct',
      hours: 4,
      screen: false,
    });
    expect(parseArgs(['start', '--screen', 'YES', '--hours', '2'])).toEqual({
      ok: true,
      command: 'start',
      mode: 'direct',
      hours: 2,
      screen: true,
    });
  });

  it('uses interactive mode when any start flag is missing', () => {
    expect(parseArgs(['start'])).toEqual({
      ok: true,
      command: 'start',
      mode: 'interactive',
    });
    expect(parseArgs(['start', '--hours', '4'])).toEqual({
      ok: true,
      command: 'start',
      mode: 'interactive',
    });
    expect(parseArgs(['start', '--screen', 'yes'])).toEqual({
      ok: true,
      command: 'start',
      mode: 'interactive',
    });
  });

  it('rejects invalid hours or screen when both flags are present', () => {
    expect(parseArgs(['start', '--hours', '25', '--screen', 'no'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--hours must be an integer from 1 to 24.',
    });
    expect(parseArgs(['start', '--hours', '0', '--screen', 'yes'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--hours must be an integer from 1 to 24.',
    });
    expect(parseArgs(['start', '--hours', '3.5', '--screen', 'no'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--hours must be an integer from 1 to 24.',
    });
    expect(parseArgs(['start', '--hours', '4', '--screen', 'maybe'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--screen must be "yes" or "no".',
    });
  });
});
