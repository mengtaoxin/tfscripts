import { describe, expect, it } from 'vitest';
import { parseArgs } from './parse-args.js';

describe('parseArgs', () => {
  it('parses help via bare argv, help, -h, and --help', () => {
    expect(parseArgs([])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['help'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['-h'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['--help'])).toEqual({ ok: true, command: 'help' });
  });

  it('requires --path when other flags are present', () => {
    expect(parseArgs(['--reuse-window', 'yes'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Missing --path. Run "open-in-vscode help" for usage.',
    });
  });

  it('parses --path and defaults reuse-window to yes', () => {
    expect(parseArgs(['--path', 'demo'])).toEqual({
      ok: true,
      command: 'open',
      path: 'demo',
      reuseWindow: true,
    });
    expect(parseArgs(['--path', '/tmp/demo'])).toEqual({
      ok: true,
      command: 'open',
      path: '/tmp/demo',
      reuseWindow: true,
    });
  });

  it('parses --reuse-window yes|no case-insensitively', () => {
    expect(parseArgs(['--path', 'demo', '--reuse-window', 'yes'])).toEqual({
      ok: true,
      command: 'open',
      path: 'demo',
      reuseWindow: true,
    });
    expect(parseArgs(['--reuse-window', 'NO', '--path', '/tmp/x'])).toEqual({
      ok: true,
      command: 'open',
      path: '/tmp/x',
      reuseWindow: false,
    });
  });

  it('rejects invalid --reuse-window values', () => {
    expect(parseArgs(['--path', 'demo', '--reuse-window', 'maybe'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--reuse-window must be "yes" or "no".',
    });
    expect(parseArgs(['--path', 'demo', '--reuse-window'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--reuse-window must be "yes" or "no".',
    });
  });

  it('rejects missing --path value and unknown options', () => {
    expect(parseArgs(['--path'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--path requires a value.',
    });
    expect(parseArgs(['--path', 'demo', '--foo'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown option "--foo". Run "open-in-vscode help" for usage.',
    });
    expect(parseArgs(['open', '--path', 'demo'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown command "open". Run "open-in-vscode help" for usage.',
    });
  });
});
