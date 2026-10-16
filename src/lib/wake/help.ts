export const HELP_TEXT = `wake — keep this Mac awake for a while

Usage:
  wake info
  wake start --hours <1-24> --screen <yes|no>
  wake stop
  wake help

Commands:
  info    Show whether a managed wake session is active
  start   Start keeping the Mac awake (replaces any existing session)
  stop    Stop the managed wake session and restore defaults
  help    Show this help

Start options:
  --hours <n>       Duration in hours (integer, 1–24)
  --screen <yes|no> Whether to keep the display awake

If either --hours or --screen is omitted, wake prompts interactively
(defaults: 4 hours, screen off). Partial flags are ignored in that mode.

Examples:
  wake start --hours 4 --screen no
  wake start --hours 2 --screen yes
  wake start
  wake info
  wake stop
`;

export function formatInfoActive(options: {
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
    'Status: keeping awake (managed by wake)',
    `Duration: ${options.hours} hour(s)`,
    `Screen: ${screenLabel}`,
    `Started: ${options.startedAt}`,
    `Ends: ${options.endsAt}`,
    `Remaining: about ${remainingMinutes} minute(s)`,
  ].join('\n');
}

export const INFO_DEFAULT = 'Status: following system default sleep settings.';
