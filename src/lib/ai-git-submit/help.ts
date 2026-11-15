export const HELP_TEXT = `ai-git-submit — generate a Conventional Commits message and submit changes

Usage:
  ai-git-submit [--add <yes|no>] [--push <yes|no>] [--protect-main <yes|no>] [--no-input]
  ai-git-submit help

Options:
  --add <yes|no>            Run "git add ." before generating the message (default: no)
  --push <yes|no>           Run "git push" after a successful commit (default: no)
  --protect-main <yes|no>   On main/master, create a feature branch before commit/push (default: yes)
  --no-input                Never prompt; omitted flags use their defaults

Must be run inside a git repository (or a subdirectory of one). Exits with an
error before prompting if the current directory is not in a git work tree.

When --protect-main is yes and the current branch is main or master, creates
and checks out feature/yyyyMMdd-HHmmss-<5 chars>, commits there, and if
pushing uses "git push -u origin HEAD".

Partial flags → prompt for the rest on a TTY. With no arguments, ai-git-submit
prompts for --add, --push, and --protect-main. Non-TTY or --no-input never
prompts; omitted flags use defaults (no/no/yes).

The commit message follows Conventional Commits (type, optional scope,
optional body/footers). Configuration is loaded from the git repo root .env
(overrides process env). See .env.example for AI_GIT_SUBMIT_* variables.

Examples:
  ai-git-submit
  ai-git-submit --add yes --push no
  ai-git-submit --push yes --protect-main yes
  ai-git-submit --protect-main no --push yes
  ai-git-submit --no-input
  ai-git-submit help
`;
