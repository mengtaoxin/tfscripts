export const HELP_TEXT = `ai-git-submit — generate a Conventional Commits message and submit changes

Usage:
  ai-git-submit [--add <yes|no>] [--push <yes|no>]
  ai-git-submit help

Options:
  --add <yes|no>   Run "git add ." before generating the message (default: no)
  --push <yes|no>  Run "git push" after a successful commit (default: no)

With no arguments, ai-git-submit prompts interactively for --add and --push
(defaults: no for both).

With any flags present, omitted flags use their defaults.

The commit message follows Conventional Commits (type, optional scope,
optional body/footers). Configuration is loaded from the git repo root .env
(overrides process env). See .env.example for AI_GIT_SUBMIT_* variables.

Examples:
  ai-git-submit
  ai-git-submit --add yes --push no
  ai-git-submit --push yes
  ai-git-submit help
`;
