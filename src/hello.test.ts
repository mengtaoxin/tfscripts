import { describe, expect, it } from 'vitest';
import { greet } from './lib/greet.js';

describe('greet', () => {
  it('returns a greeting for the given name', () => {
    expect(greet('tfscripts')).toBe('Hello, tfscripts!');
  });
});
