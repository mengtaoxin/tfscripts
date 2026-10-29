import { describe, expect, it } from 'vitest';
import { formatLocalDateTime, formatStatusActive } from './help.js';

describe('formatLocalDateTime', () => {
  it('formats a date as local wall-clock time without a timezone suffix', () => {
    const date = new Date('2026-10-19T17:30:22.658Z');
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected =
      [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-') +
      ' ' +
      [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join(':');

    expect(formatLocalDateTime(date)).toBe(expected);
    expect(formatLocalDateTime(date)).not.toMatch(/Z|[+-]\d{2}:\d{2}$/);
  });
});

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

  it('shows started and ends as local system time without a timezone', () => {
    const startedAt = '2026-10-19T17:30:22.658Z';
    const endsAt = '2026-10-19T21:30:22.658Z';
    const text = formatStatusActive({
      hours: 4,
      screen: false,
      startedAt,
      endsAt,
      now: new Date('2026-10-19T17:32:00.000Z'),
    });

    expect(text).toContain(`Started: ${formatLocalDateTime(new Date(startedAt))}`);
    expect(text).toContain(`Ends: ${formatLocalDateTime(new Date(endsAt))}`);
    expect(text).not.toMatch(/Started: .*Z/);
    expect(text).not.toMatch(/Ends: .*Z/);
  });
});
