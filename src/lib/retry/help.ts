export const HELP_TEXT = `retry — run a command until it exits 0

Usage:
  retry
  retry help

With no arguments, retry prompts for:
  1. The command to run (passed to sh -c)
  2. How many times to run it (default: 10, at least 1)
  3. Seconds to wait between attempts (default: 10, at least 0)

A run succeeds when its exit code is 0. Otherwise retry waits the fixed
interval and tries again, up to the given number of attempts. The interval
does not increase between attempts.

Examples:
  retry
  retry help
`;
