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

  it('rejects extra arguments and flags on list', () => {
    expect(parseArgs(['list', '--show-commit-count'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "repos --help" for usage.',
    });
    expect(parseArgs(['list', '-scc', '7'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "repos --help" for usage.',
    });
    expect(parseArgs(['list', '--bogus'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "repos --help" for usage.',
    });
    expect(parseArgs(['list', 'extra'])).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "repos --help" for usage.',
    });
  });
});
