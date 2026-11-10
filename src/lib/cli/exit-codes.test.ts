import { describe, expect, it } from 'vitest';
import { EXIT_FAILURE, EXIT_OK, EXIT_USAGE, exitCodeForParseFailure } from './exit-codes.js';

describe('exit codes', () => {
  it('uses 0 / 1 / 2 for ok, failure, and usage', () => {
    expect(EXIT_OK).toBe(0);
    expect(EXIT_FAILURE).toBe(1);
    expect(EXIT_USAGE).toBe(2);
  });

  it('maps parse usage and invalid reasons to exit 2', () => {
    expect(exitCodeForParseFailure('usage')).toBe(EXIT_USAGE);
    expect(exitCodeForParseFailure('invalid')).toBe(EXIT_USAGE);
  });
});
