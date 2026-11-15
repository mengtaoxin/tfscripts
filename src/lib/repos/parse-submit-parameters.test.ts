import { describe, expect, it } from 'vitest';
import { flattenAiGitSubmitParameters, parseSubmitParameters } from './parse-submit-parameters.js';

describe('flattenAiGitSubmitParameters', () => {
  it('returns an empty list when parameters are missing', () => {
    expect(flattenAiGitSubmitParameters(undefined)).toEqual([]);
    expect(flattenAiGitSubmitParameters([])).toEqual([]);
  });

  it('splits space-joined fragments into argv tokens', () => {
    expect(flattenAiGitSubmitParameters(['--add yes', '--push yes'])).toEqual([
      '--add',
      'yes',
      '--push',
      'yes',
    ]);
  });
});

describe('parseSubmitParameters', () => {
  it('parses add and push from settings fragments', () => {
    expect(parseSubmitParameters(['--add yes', '--push no'])).toEqual({
      ok: true,
      add: true,
      push: false,
    });
  });

  it('allows omitted parameters', () => {
    expect(parseSubmitParameters(undefined)).toEqual({
      ok: true,
      add: undefined,
      push: undefined,
    });
  });

  it('rejects invalid ai-git-submit flags', () => {
    expect(parseSubmitParameters(['--bogus'])).toEqual({
      ok: false,
      message: 'Unknown option "--bogus". Run "ai-git-submit help" for usage.',
    });
  });
});
