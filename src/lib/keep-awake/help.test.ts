import { describe, expect, it } from 'vitest';
import { formatStatusActive } from './help.js';

describe('formatStatusActive', () => {
  it('reports an active session with remaining minutes', () => {
    const text = formatStatusActive({
      hours: 2,
      screen: true,
      startedAt: '2026-10-16T01:00:00.000Z',
      endsAt: '2026-10-16T03:00:00.000Z',
      now: new Date('2026-10-16T02:00:00.000Z'),
    });

    expect(text).toContain('Status: keeping awake (managed by keep-awake)');
    expect(text).toContain('Duration: 2 hour(s)');
    expect(text).toContain('Screen: on');
    expect(text).toContain('Remaining: about 60 minute(s)');
  });
});
