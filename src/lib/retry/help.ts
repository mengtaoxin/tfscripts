export const HELP_TEXT = `retry — run a command until it exits 0

Usage:
  retry [--command <cmd>] [--times <n>] [--interval <seconds>] [--no-input]
  retry help

Options:
  --command <cmd>     Shell command passed to sh -c (required unless prompting)
  --times <n>         Max attempts (integer >= 1, default: 10)
  --interval <secs>   Seconds between attempts (integer >= 0, default: 10)
  --no-input          Never prompt; missing --command fails

Partial flags → prompt for the rest on a TTY. With no arguments, retry prompts
for command, times, and interval. Non-TTY or --no-input never prompts.

A run succeeds when its exit code is 0. Otherwise retry waits the fixed
interval and tries again, up to the given number of attempts. The interval
does not increase between attempts.

Examples:
  retry
  retry --command "npm test" --times 5 --interval 2
  retry --command "npm test" --no-input
  retry help
`;
