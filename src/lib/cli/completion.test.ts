import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COMPLETION_TOKEN,
  filterByPrefix,
  parseCompletionArgv,
  writeCompletionCandidates,
} from './completion.js';

describe('completion protocol', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('recognizes __complete -- words and returns the words after --', () => {
    expect(parseCompletionArgv([COMPLETION_TOKEN, '--', 'submit', '--name', ''])).toEqual({
      ok: true,
      words: ['submit', '--name', ''],
    });
    expect(parseCompletionArgv([COMPLETION_TOKEN, '--'])).toEqual({
      ok: true,
      words: [],
    });
  });

  it('rejects argv that is not a completion request', () => {
    expect(parseCompletionArgv(['submit', '--name', 'foo'])).toEqual({ ok: false });
    expect(parseCompletionArgv([COMPLETION_TOKEN])).toEqual({ ok: false });
    expect(parseCompletionArgv([COMPLETION_TOKEN, 'submit'])).toEqual({ ok: false });
  });

  it('filters candidates by prefix; empty prefix keeps all', () => {
    const names = ['alpha', 'beta', 'alpine'];
    expect(filterByPrefix(names, '')).toEqual(names);
    expect(filterByPrefix(names, 'al')).toEqual(['alpha', 'alpine']);
  });

  it('writes one candidate per line to stdout', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    writeCompletionCandidates(['update', 'check']);
    expect(log).toHaveBeenCalledWith('update\ncheck');
  });

  it('writes nothing when there are no candidates', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    writeCompletionCandidates([]);
    expect(log).not.toHaveBeenCalled();
  });
});
