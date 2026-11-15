# Platform compatibility

Primary target is **macOS**. Node.js 22+ is required everywhere. This page records what each CLI needs beyond Node; it does not claim Windows or Linux as supported product surfaces.

How to run scripts: [commands.md](commands.md). What each CLI does: [README.md](../README.md).

## Summary

| Script           | macOS | Linux | Windows (native) | External dependency                                              |
| ---------------- | ----- | ----- | ---------------- | ---------------------------------------------------------------- |
| `hello`          | Yes   | Yes   | Yes\*            | None                                                             |
| `ai-git-submit`  | Yes   | Yes   | Yes\*            | `git` on `PATH`; network for the LLM API                         |
| `repos`          | Yes   | Yes   | Yes\*            | `git` on `PATH`; `submit` also needs network + `AI_GIT_SUBMIT_*` |
| `open-in-vscode` | Yes   | Yes   | Yes\*            | VS Code shell command `code` on `PATH`                           |
| `retry`          | Yes   | Yes   | No               | POSIX `sh` (`spawn('sh', ['-c', …])`)                            |
| `keep-awake`     | Yes   | No    | No               | macOS `caffeinate`                                               |

\* Windows notes apply only if you invoke Node on the compiled `dist/<name>.js` (or an equivalent), with the same tools on `PATH`. Generated `bin/` wrappers and several root `package.json` scripts assume a Unix shell — see [Tooling](#tooling).

## Tooling

These constraints apply to **install / build / run wrappers**, not only to individual CLIs:

| Piece                      | macOS / Linux                                         | Windows (native)                                              |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| `npm run build` → `bin/`   | `#!/bin/bash` wrappers via `scripts/generate-bin.mjs` | Wrappers are bash; use WSL/Git Bash, or `node dist/<name>.js` |
| `npm run clean`            | `rm -rf dist bin`                                     | Needs a Unix-like shell or delete `dist/` and `bin/` yourself |
| Config / state under home  | `~/.tfscripts/…` via `os.homedir()`                   | Same layout under the user profile (`os.homedir()`)           |
| `~` / `~/…` path expansion | Supported                                             | `~/…` and `~\…` are expanded in settings loaders              |

Unit tests inject collaborators (`caffeinate`, `git`, `code`, fs). `npm test` does not require macOS or those binaries on the host ([testing.md](testing.md)).

## Per script

### `hello`

Pure Node (`console.log`). No OS tools. Works anywhere Node 22+ runs.

### `ai-git-submit`

Calls `git` through `execFile` (`src/lib/ai-git-submit/git.ts`) and an HTTPS LLM API. Needs `git` on `PATH` and network access. No macOS-only APIs. Repo `.env` loading is path-agnostic ([commands.md](commands.md#runtime-config)).

### `repos`

Calls `git` through `execFile` (`src/lib/repos/git.ts`). Settings live at `~/.tfscripts/repos/settings.json`. Paths in settings may use `~`. Per-repo `environment` / `ssh-host` (siblings of `path`) can run git over `ssh` with BatchMode key-only auth; that needs an `ssh` client on `PATH` and a matching `~/.ssh/config` host. Works on any OS where Node and `git` work; SSH mode additionally needs OpenSSH-compatible `ssh`.

`repos submit` reuses the ai-git-submit flow: LLM and `AI_GIT_SUBMIT_*` stay on the machine running `repos`; for `environment: "ssh"` git (including commit stdin) runs over SSH like `update` / `check`. Optional per-repo `ai-git-submit-parameters` are documented in `repos` help / `src/lib/repos/config.ts`.

### `open-in-vscode`

Spawns the `code` CLI (`src/lib/open-in-vscode/run.ts`). Optional aliases: `~/.tfscripts/open-in-vscode/settings.json`. Works on macOS, Linux, and Windows when the VS Code shell command is installed and on `PATH`. Failure when `code` is missing is an `ENOENT` message, not a platform check.

### `retry`

Runs the user command as `sh -c '<command>'` (`src/lib/retry/run.ts`). That requires a POSIX `sh` (macOS and typical Linux). Native Windows is rejected up front with `PlatformNotSupportedError` (`src/lib/cli/platform.ts`); help still works. WSL counts as Linux.

### `keep-awake`

Starts a detached `caffeinate` process (`src/lib/keep-awake/session.ts`) and stores session state under `~/.tfscripts/keep-awake/`. `caffeinate` exists only on macOS. Linux and Windows are rejected up front with `PlatformNotSupportedError` for all non-help commands (`status` / `stop` / `start`); help still works.

## Practical guidance

1. **Day-to-day use:** treat the suite as a macOS toolkit; that matches [README.md](../README.md).
2. **Cross-OS helpers:** `hello`, `ai-git-submit`, `repos`, and `open-in-vscode` are the ones most likely to work on Linux (and on Windows via Node + tools, without relying on `bin/`).
3. **Do not expect** `keep-awake` off macOS, or `retry` on native Windows — both fail fast with a not-supported error before prompts or spawn.
4. Prefer documenting a future port in this file when behavior changes; do not infer support from a green `npm test` alone.
