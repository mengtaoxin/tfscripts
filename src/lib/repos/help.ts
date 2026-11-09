export const HELP_TEXT = `repos — manage multiple local git repos from a settings file

Usage:
  repos
  repos --help
  repos help
  repos update
  repos check

Reads the repo list from ~/.tfscripts/repos/settings.json, for example:

  {
    "repos": [
      { "path": "/exampleDir/repo-1" },
      { "path": "~/repos/repo-2" }
    ]
  }

Each entry needs only "path". The display name is the folder name.

Commands:
  update  Fetch and merge current-branch upstream updates (does not switch
          branches). Local uncommitted or unpushed changes are kept; only true
          conflicts fail. Concurrency capped at 3; fetch network errors retry
          up to 3 times with exponential backoff.
  check   Fetch and show a status table: remote-behind commits, local-ahead
          commits, and uncommitted dirty line counts. Does not merge.

Examples:
  repos --help
  repos update
  repos check
`;
