# Shell completion

Tab completion for tfscripts CLIs. Empty prefix lists candidates (like `ls`); a typed prefix filters or fills a unique match. Shell scripts call a hidden `__complete` hook; candidate logic lives in TypeScript.

## Prerequisites

1. Build so `bin/` exists: `npm run build` ([commands.md](commands.md)).
2. Put `bin/` on `PATH` (or invoke via `./bin/<cmd>` with the same path the completion function resolves).

## Enable (bash)

```sh
source /path/to/tfscripts/completions/tfscripts.bash
```

Add that line to `~/.bashrc` (or equivalent) to keep it across sessions.

## Enable (zsh)

```sh
source /path/to/tfscripts/completions/tfscripts.zsh
```

Add that line to `~/.zshrc`. Ensure `compinit` has run (Oh My Zsh and most configs already do).

## What works today

`repos` is registered in both scripts:

| Input                       | Tab result                                         |
| --------------------------- | -------------------------------------------------- |
| `repos <Tab>`               | `update` `check` `list` `submit` `help`            |
| `repos help <Tab>`          | action topics                                      |
| `repos submit <Tab>`        | `--name`                                           |
| `repos submit --name <Tab>` | repo names from `~/.tfscripts/repos/settings.json` |

## Protocol (for new commands)

1. **CLI**: On argv matching `__complete -- <words...>`, print matching candidates (one per line) and exit `0`. On errors, print nothing and still exit `0`. Use helpers in `src/lib/cli/completion.ts`. Keep `__complete` out of user-facing help. `runCliMain` skips the shared run lock for this token.
2. **Provider**: Add a `complete*.ts` module under that command’s `lib/` that maps `<words...>` (including the current, possibly empty, word) to candidates. Prefix-filter in TypeScript.
3. **Shell**: Register the command with the shared function:

```bash
# bash — in completions/tfscripts.bash
complete -F _tfscripts_complete <cmd>
```

```zsh
# zsh — in completions/tfscripts.zsh
compdef _tfscripts_complete <cmd>
```

Wire the entry early (before normal `parseArgs`), same pattern as `src/repos.ts`.
