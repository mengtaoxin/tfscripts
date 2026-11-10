import { describe, expect, it } from 'vitest';
import { parseYesNo } from './yes-no.js';

describe('parseYesNo', () => {
  it('accepts yes and no case-insensitively', () => {
    expect(parseYesNo('yes')).toBe(true);
    expect(parseYesNo('YES')).toBe(true);
    expect(parseYesNo('no')).toBe(false);
    expect(parseYesNo('No')).toBe(false);
  });

  it('rejects other values', () => {
    expect(parseYesNo('maybe')).toBeNull();
    expect(parseYesNo('')).toBeNull();
  });
});
