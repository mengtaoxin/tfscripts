export const HELP_TEXT = `keep-awake — keep this Mac awake for a while

Usage:
  keep-awake [--hours <1-24> --screen <yes|no>]
  keep-awake status
  keep-awake stop
  keep-awake help

Commands:
  (default) Start keeping the Mac awake (replaces any existing session)
  status    Show whether a managed keep-awake session is active
  stop      Stop the managed keep-awake session and restore defaults
  help      Show this help

Options:
  --hours <n>       Duration in hours (integer, 1–24)
  --screen <yes|no> Whether to keep the display awake

If either --hours or --screen is omitted, keep-awake prompts interactively
(defaults: 4 hours, screen off). Partial flags are ignored in that mode.

Examples:
  keep-awake --hours 4 --screen no
  keep-awake --hours 2 --screen yes
  keep-awake
  keep-awake status
  keep-awake stop
`;

/** Local wall-clock time, no timezone suffix (e.g. `2026-10-20 01:30:22`). */
export function formatLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export function formatStatusActive(options: {
  hours: number;
  screen: boolean;
  startedAt: string;
  endsAt: string;
  now?: Date;
}): string {
  const now = options.now ?? new Date();
  const endsMs = Date.parse(options.endsAt);
  const remainingMs = Math.max(0, endsMs - now.getTime());
  const remainingMinutes = Math.ceil(remainingMs / 60_000);
  const screenLabel = options.screen ? 'on' : 'off';

  return [
    'Status: keeping awake (managed by keep-awake)',
    `Duration: ${options.hours} hour(s)`,
    `Screen: ${screenLabel}`,
    `Started: ${formatLocalDateTime(new Date(options.startedAt))}`,
    `Ends: ${formatLocalDateTime(new Date(options.endsAt))}`,
    `Remaining: about ${remainingMinutes} minute(s)`,
  ].join('\n');
}

export const STATUS_DEFAULT = 'Status: following system default sleep settings.';
