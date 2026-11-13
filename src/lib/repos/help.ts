export const HELP_TEXT = `repos — manage multiple local git repos from a settings file

Usage:
  repos
  repos --help
  repos help
  repos help <command>
  repos <command>
  repos <command> --help

Reads the repo list from ~/.tfscripts/repos/settings.json, for example:

  {
    "repos": [
      { "path": "/exampleDir/repo-1" },
      { "path": "~/repos/repo-2" }
    ]
  }

Each entry needs only "path". The display name is the folder name.

Commands:
  update  Fetch and merge current-branch upstream updates
  check   Fetch and show a status table (no merge)
  list    Show configured repos as a REPO / PATH table

With no arguments, repos prints this help.

Examples:
  repos update
  repos check
  repos list
  repos list --show-commit-count
  repos help update
`;

export const HELP_UPDATE = `repos update — fetch and merge upstream for configured repos

Usage:
  repos update
  repos help update
  repos update --help

Fetches and merges current-branch upstream updates (does not switch
branches). Local uncommitted or unpushed changes are kept; only true
conflicts fail. Concurrency capped at 3; fetch network errors retry
up to 3 times with exponential backoff.

Reads ~/.tfscripts/repos/settings.json.
`;

export const HELP_CHECK = `repos check — fetch and show status for configured repos

Usage:
  repos check
  repos help check
  repos check --help

Fetches and shows a status table: remote-behind commits, local-ahead
commits, and uncommitted dirty line counts. Does not merge.

Reads ~/.tfscripts/repos/settings.json.
`;

export const HELP_LIST = `repos list — list configured repos

Usage:
  repos list
  repos list --show-commit-count [days]
  repos list -scc [days]
  repos help list
  repos list --help

Shows configured repos as a REPO / PATH table. Without flags, does not
touch git.

Options:
  --show-commit-count [days], -scc [days]
      Add a COMMITS (Nd) column with commits on HEAD in the last N days
      (default N=7). Failed repos show "-".

Reads ~/.tfscripts/repos/settings.json.

Examples:
  repos list
  repos list --show-commit-count
  repos list -scc 14
`;

export const HELP_BY_TOPIC = {
  update: HELP_UPDATE,
  check: HELP_CHECK,
  list: HELP_LIST,
} as const;

export function helpTextFor(topic: keyof typeof HELP_BY_TOPIC | undefined): string {
  if (topic === undefined) {
    return HELP_TEXT;
  }
  return HELP_BY_TOPIC[topic];
}
