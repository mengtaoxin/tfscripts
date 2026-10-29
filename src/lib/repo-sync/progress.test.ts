import { describe, expect, it, vi } from 'vitest';
import { createStdoutProgress } from './progress.js';

describe('createStdoutProgress', () => {
  it('rewrites the same line on a TTY', () => {
    const write = vi.fn();
    const progress = createStdoutProgress({ isTTY: true, write });

    progress.set('repo-sync processing: 0/23');
    progress.set('repo-sync processing: 1/23');
    progress.end();

    expect(write.mock.calls).toEqual([
      ['\rrepo-sync processing: 0/23\x1b[K'],
      ['\rrepo-sync processing: 1/23\x1b[K'],
      ['\n'],
    ]);
  });

  it('skips live updates when not a TTY', () => {
    const write = vi.fn();
    const progress = createStdoutProgress({ isTTY: false, write });

    progress.set('repo-sync processing: 0/23');
    progress.set('repo-sync processing: 1/23');
    progress.end();

    expect(write).not.toHaveBeenCalled();
  });
});
