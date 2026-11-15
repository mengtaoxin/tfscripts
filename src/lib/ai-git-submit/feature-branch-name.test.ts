import { describe, expect, it } from 'vitest';
import { createRandomAlphanumeric, formatFeatureBranchName } from './feature-branch-name.js';

describe('formatFeatureBranchName', () => {
  it('formats feature/yyyyMMdd-HHmmss-randomStr', () => {
    const date = new Date(2026, 10, 15, 15, 30, 45);
    expect(formatFeatureBranchName(date, 'ab12c')).toBe('feature/20261115-153045-ab12c');
  });
});

const fixedRandomBytes = () => Buffer.from([0, 10, 25, 26, 27]);

describe('createRandomAlphanumeric', () => {
  it('maps bytes to lowercase alphanumeric of the requested length', () => {
    expect(createRandomAlphanumeric(5, fixedRandomBytes)).toBe('akz01');
  });
});
