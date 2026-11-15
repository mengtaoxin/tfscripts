import { describe, expect, it } from 'vitest';
import { flattenSubmitParameterFragments, parseSubmitFlags } from './flags.js';

describe('flattenSubmitParameterFragments', () => {
  it('returns an empty list when parameters are missing', () => {
    expect(flattenSubmitParameterFragments(undefined)).toEqual([]);
    expect(flattenSubmitParameterFragments([])).toEqual([]);
  });

  it('splits space-joined fragments into argv tokens', () => {
    expect(flattenSubmitParameterFragments(['--add yes', '--push yes'])).toEqual([
      '--add',
      'yes',
      '--push',
      'yes',
    ]);
  });
});

describe('parseSubmitFlags', () => {
  const usageHint = 'example help';

  it('parses empty argv as all options unset', () => {
    expect(parseSubmitFlags([], { usageHint })).toEqual({
      ok: true,
      noInput: false,
      add: undefined,
      push: undefined,
      protectMain: undefined,
    });
  });

  it('parses yes/no flags and --no-input', () => {
    expect(parseSubmitFlags(['--add', 'yes', '--push', 'no', '--no-input'], { usageHint })).toEqual(
      {
        ok: true,
        noInput: true,
        add: true,
        push: false,
        protectMain: undefined,
      },
    );
  });

  it('rejects unknown options with the caller usage hint', () => {
    expect(parseSubmitFlags(['--bogus'], { usageHint })).toEqual({
      ok: false,
      reason: 'usage',
      message: 'Unknown option "--bogus". Run "example help" for usage.',
    });
  });

  it('rejects invalid yes/no values', () => {
    expect(parseSubmitFlags(['--add', 'maybe'], { usageHint })).toEqual({
      ok: false,
      reason: 'invalid',
      message: '--add must be "yes" or "no".',
    });
  });
});
