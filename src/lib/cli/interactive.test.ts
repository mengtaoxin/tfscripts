import { describe, expect, it } from 'vitest';
import { canPrompt } from './interactive.js';

describe('canPrompt', () => {
  it('is false when --no-input is set even on a TTY', () => {
    expect(canPrompt({ noInput: true, isTTY: true })).toBe(false);
  });

  it('is false when stdin is not a TTY', () => {
    expect(canPrompt({ noInput: false, isTTY: false })).toBe(false);
  });

  it('is true on a TTY without --no-input', () => {
    expect(canPrompt({ noInput: false, isTTY: true })).toBe(true);
  });
});
