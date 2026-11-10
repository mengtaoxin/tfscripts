import { describe, expect, it } from 'vitest';
import { isHelpToken } from './help-args.js';

describe('isHelpToken', () => {
  it('recognizes help, -h, and --help', () => {
    expect(isHelpToken('help')).toBe(true);
    expect(isHelpToken('-h')).toBe(true);
    expect(isHelpToken('--help')).toBe(true);
  });

  it('rejects other tokens', () => {
    expect(isHelpToken(undefined)).toBe(false);
    expect(isHelpToken('status')).toBe(false);
    expect(isHelpToken('--no-input')).toBe(false);
  });
});
