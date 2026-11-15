import { describe, expect, it } from 'vitest';
import { parseArgs } from './parse-args.js';

describe('parseArgs', () => {
  it('shows root help when no arguments are provided', () => {
    expect(parseArgs([])).toEqual({ ok: true, command: 'help' });
  });

  it('parses root help flags', () => {
    expect(parseArgs(['help'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['-h'])).toEqual({ ok: true, command: 'help' });
    expect(parseArgs(['--help'])).toEqual({ ok: true, command: 'help' });
  });

  it('parses update, check, list, and submit commands', () => {
    expect(parseArgs(['update'])).toEqual({ ok: true, command: 'update' });
    expect(parseArgs(['check'])).toEqual({ ok: true, command: 'check' });
    expect(parseArgs(['list'])).toEqual({ ok: true, command: 'list' });
    expect(parseArgs(['submit', '--name', 'foo'])).toEqual({
      ok: true,
      command: 'submit',
      name: 'foo',
    });
  });

  it('parses leaf help via help <sub> and <sub> --help', () => {
    expect(parseArgs(['help', 'update'])).toEqual({
      ok: true,
      command: 'help',
      topic: 'update',
    });
    expect(parseArgs(['check', '-h'])).toEqual({
      ok: true,
      command: 'help',
      topic: 'check',
    });
    expect(parseArgs(['list', '--help'])).toEqual({
      ok: true,
      command: 'help',
      topic: 'list',
    });
    expect(parseArgs(['help', 'submit'])).toEqual({
      ok: true,
      command: 'help',
      topic: 'submit',
    });
    expect(parseArgs(['submit', '--help'])).toEqual({
      ok: true,
      command: 'help',
      topic: 'submit',
    });
  });

  it('requires --name for submit', () => {
    expect(parseArgs(['submit'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Missing required option --name. Run "repos submit --help" for usage.',
    });
    expect(parseArgs(['submit', '--name'])).toEqual({
      ok: false,
      reason: 'usage',
      message: '--name requires a value. Run "repos submit --help" for usage.',
    });
  });

  it('rejects unknown flags on submit', () => {
    expect(parseArgs(['submit', '--name', 'foo', '--bogus'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown option "--bogus". Run "repos submit --help" for usage.',
    });
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

  it('parses list --show-commit-count with default 7 days', () => {
    expect(parseArgs(['list', '--show-commit-count'])).toEqual({
      ok: true,
      command: 'list',
      showCommitCountDays: 7,
    });
    expect(parseArgs(['list', '-scc'])).toEqual({
      ok: true,
      command: 'list',
      showCommitCountDays: 7,
    });
  });

  it('parses list --show-commit-count and -scc with an explicit day count', () => {
    expect(parseArgs(['list', '--show-commit-count', '14'])).toEqual({
      ok: true,
      command: 'list',
      showCommitCountDays: 14,
    });
    expect(parseArgs(['list', '-scc', '3'])).toEqual({
      ok: true,
      command: 'list',
      showCommitCountDays: 3,
    });
  });

  it('rejects invalid show-commit-count days', () => {
    expect(parseArgs(['list', '--show-commit-count', '0'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--show-commit-count must be a positive integer.',
    });
    expect(parseArgs(['list', '-scc', '1.5'])).toEqual({
      ok: false,
      reason: 'invalid',
      message: '-scc must be a positive integer.',
    });
  });

  it('rejects both show-commit-count flags together', () => {
    expect(parseArgs(['list', '--show-commit-count', '-scc'])).toEqual({
      ok: false,
      reason: 'usage',
      message:
        'Use either --show-commit-count or -scc, not both. Run "repos list --help" for usage.',
    });
  });

  it('rejects unknown flags on list', () => {
    expect(parseArgs(['list', '--bogus'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown option "--bogus". Run "repos list --help" for usage.',
    });
  });
});
