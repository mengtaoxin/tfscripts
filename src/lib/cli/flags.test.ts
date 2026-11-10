import { describe, expect, it } from 'vitest';
import { hasUnknownFlags, parsePositiveInt, parseYesNoFlag, readFlagValue } from './flags.js';

describe('readFlagValue', () => {
  it('reports absent flags', () => {
    expect(readFlagValue(['--times', '3'], '--interval')).toEqual({ present: false });
  });

  it('reads the following non-flag token as the value', () => {
    expect(readFlagValue(['--times', '3'], '--times')).toEqual({
      present: true,
      value: '3',
    });
  });

  it('treats a following flag-like token as a missing value', () => {
    expect(readFlagValue(['--times', '--interval'], '--times')).toEqual({
      present: true,
      value: undefined,
    });
  });
});

describe('hasUnknownFlags', () => {
  const known = new Set(['--hours', '--screen', '--no-input']);
  const valueless = new Set(['--no-input']);

  it('returns undefined when every flag is known', () => {
    expect(hasUnknownFlags(['--hours', '4', '--no-input'], known, { valueless })).toBeUndefined();
  });

  it('returns the first unknown flag', () => {
    expect(hasUnknownFlags(['--hours', '4', '--bogus'], known, { valueless })).toBe('--bogus');
  });

  it('does not treat a valueless flag value slot as unknown', () => {
    expect(hasUnknownFlags(['--no-input', '--hours', '2'], known, { valueless })).toBeUndefined();
  });

  it('consumes values for flags that take them', () => {
    const openKnown = new Set(['--path', '--reuse-window']);
    expect(hasUnknownFlags(['--path', '/tmp', '--reuse-window', 'yes'], openKnown)).toBeUndefined();
  });
});

describe('parsePositiveInt', () => {
  it('parses integers at or above min', () => {
    expect(parsePositiveInt('0', 0)).toBe(0);
    expect(parsePositiveInt('3', 1)).toBe(3);
  });

  it('rejects non-digits, fractions, and values below min', () => {
    expect(parsePositiveInt('1.5', 1)).toBeNull();
    expect(parsePositiveInt('-1', 0)).toBeNull();
    expect(parsePositiveInt('0', 1)).toBeNull();
  });

  it('rejects values above max when max is set', () => {
    expect(parsePositiveInt('24', 1, 24)).toBe(24);
    expect(parsePositiveInt('25', 1, 24)).toBeNull();
  });
});

describe('parseYesNoFlag', () => {
  it('returns undefined when the flag is absent', () => {
    expect(parseYesNoFlag([], '--add')).toEqual({ ok: true, value: undefined });
  });

  it('parses yes and no', () => {
    expect(parseYesNoFlag(['--add', 'yes'], '--add')).toEqual({ ok: true, value: true });
    expect(parseYesNoFlag(['--add', 'no'], '--add')).toEqual({ ok: true, value: false });
  });

  it('rejects missing or invalid values', () => {
    expect(parseYesNoFlag(['--add'], '--add')).toEqual({
      ok: false,
      message: '--add must be "yes" or "no".',
    });
    expect(parseYesNoFlag(['--add', 'maybe'], '--add')).toEqual({
      ok: false,
      message: '--add must be "yes" or "no".',
    });
  });
});
