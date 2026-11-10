export const HELP_TEXT = `keep-awake — keep awake for a while

Usage:
  keep-awake [--hours <1-24>] [--screen <yes|no>] [--no-input]
  keep-awake status
  keep-awake stop
  keep-awake help
  keep-awake help <command>
  keep-awake <command> --help

Commands:
  (default) Start keeping awake (replaces any existing session)
  status    Show whether a managed keep-awake session is active
  stop      Stop the managed keep-awake session and restore defaults
  help      Show this help

Options:
  --hours <n>       Duration in hours (integer, 1–24)
  --screen <yes|no> Whether to keep the display awake
  --no-input        Never prompt; both --hours and --screen are required

Partial flags → prompt for the rest on a TTY (defaults: 4 hours, screen off).
Non-TTY or --no-input never prompts.

Examples:
  keep-awake --hours 4 --screen no
  keep-awake --hours 2 --screen yes
  keep-awake
  keep-awake status
  keep-awake stop
  keep-awake help status
`;

export const HELP_STATUS = `keep-awake status — show the managed keep-awake session

Usage:
  keep-awake status
  keep-awake help status
  keep-awake status --help

Prints whether a managed keep-awake session is active, including duration,
screen setting, start/end times, and remaining time. Does not change state.
`;

export const HELP_STOP = `keep-awake stop — stop the managed keep-awake session

Usage:
  keep-awake stop
  keep-awake help stop
  keep-awake stop --help

Stops the managed keep-awake session and restores system sleep defaults.
If no session is active, reports that defaults already apply.
`;

export const HELP_BY_TOPIC = {
  status: HELP_STATUS,
  stop: HELP_STOP,
} as const;

export function helpTextFor(topic: keyof typeof HELP_BY_TOPIC | undefined): string {
  if (topic === undefined) {
    return HELP_TEXT;
  }
  return HELP_BY_TOPIC[topic];
}

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
