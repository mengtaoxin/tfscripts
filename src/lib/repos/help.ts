export const HELP_TEXT = `repos — manage multiple git repos from a settings file

Usage:
  repos
  repos --help
  repos help
  repos help <command>
  repos <command>
  repos <command> --help

Reads the repo list from ~/.tfscripts/repos/settings.json, for example:

  {
    "list.show-commit-count": 7,
    "repos": [
      { "path": "/exampleDir/repo-1" },
      { "path": "~/repos/repo-2" },
      {
        "path": "~/repos/repo-3",
        "environment": "ssh",
        "ssh-host": "devbox",
        "ai-git-submit-parameters": ["--add yes", "--push yes"]
      }
    ]
  }

Each entry needs "path". The display name is the folder name.
Optional top-level fields:
  list.show-commit-count   Positive integer; when set, repos check adds a COMMITS (Nd) column
Optional per-repo fields (siblings of path):
  environment               "local" (default) or "ssh"
  ssh-host                  Host alias from ~/.ssh/config (required when environment is ssh)
  ai-git-submit-parameters   Argv fragments for repos submit (ai-git-submit flags)

SSH mode runs git on the remote host with key-based auth only (no password
prompts). Unknown host fingerprints are not auto-accepted; that repo fails
with a warning row in the result table, and other repos still run.

Commands:
  update  Fetch and merge current-branch upstream updates
  check   Fetch and show a status table (no merge)
  list    Show configured repos as a REPO / PATH table
  submit  Run ai-git-submit for one configured repo

With no arguments, repos prints this help.

Examples:
  repos update
  repos check
  repos list
  repos submit --name repo-3
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

Entries may set environment/ssh-host next to path for remote repos over
SSH (key-based login only; fingerprint prompts are not auto-accepted).

Reads ~/.tfscripts/repos/settings.json.
`;

export const HELP_CHECK = `repos check — fetch and show status for configured repos

Usage:
  repos check
  repos help check
  repos check --help

Fetches and shows a status table: current branch, remote-behind commits,
local-ahead commits, and uncommitted dirty line counts. Does not merge.

When settings include top-level "list.show-commit-count" (a positive
integer N), the table also includes a COMMITS (Nd) column with commits
on HEAD in the last N days.

Entries may set environment/ssh-host next to path for remote repos over
SSH (key-based login only; fingerprint prompts are not auto-accepted).

Reads ~/.tfscripts/repos/settings.json.
`;

export const HELP_LIST = `repos list — list configured repos

Usage:
  repos list
  repos help list
  repos list --help

Shows configured repos as a REPO / PATH table. Does not touch git.

Reads ~/.tfscripts/repos/settings.json.

Examples:
  repos list
`;

export const HELP_SUBMIT = `repos submit — run ai-git-submit for one configured repo

Usage:
  repos submit --name <repo>
  repos help submit
  repos submit --help

Runs the ai-git-submit flow for the settings entry whose folder name
matches --name. Always non-interactive. Optional per-repo
ai-git-submit-parameters (argv fragments such as "--add yes") are parsed
like ai-git-submit flags; omitted --add/--push/--protect-main use
ai-git-submit defaults.

For environment ssh, git runs on the remote host (key-based auth only);
the LLM API uses AI_GIT_SUBMIT_* from the local process environment.

Reads ~/.tfscripts/repos/settings.json.

Examples:
  repos submit --name tfscripts
`;

export const HELP_BY_TOPIC = {
  update: HELP_UPDATE,
  check: HELP_CHECK,
  list: HELP_LIST,
  submit: HELP_SUBMIT,
} as const;

export function helpTextFor(topic: keyof typeof HELP_BY_TOPIC | undefined): string {
  if (topic === undefined) {
    return HELP_TEXT;
  }
  return HELP_BY_TOPIC[topic];
}
