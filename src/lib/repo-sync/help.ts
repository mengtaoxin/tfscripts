export const HELP_TEXT = `repo-sync — pull latest commits for multiple local repos on their current branches

Usage:
  repo-sync
  repo-sync help

Reads the repo list from ~/.tfscripts/repo-sync/settings.json, for example:

  {
    "repos": [
      { "path": "/exampleDir/repo-1" },
      { "path": "~/repos/repo-2" }
    ]
  }

Each entry needs only "path". The display name is the folder name. Does not
switch branches: fetches the current branch upstream and merges when behind.
Local uncommitted or unpushed changes are kept; only true conflicts fail.

Repos are synced in parallel (concurrency capped at 3). Network errors on
fetch retry up to 3 times with exponential backoff.

Examples:
  repo-sync
  repo-sync help
`;
