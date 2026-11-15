# Platform compatibility

Primary target is **macOS**. Node.js 22+ everywhere. This page lists each CLI’s platform surface and external tools. How to run: [commands.md](commands.md).

## CLIs

| Script           | Supported platforms   | External tools                                              |
| ---------------- | --------------------- | ----------------------------------------------------------- |
| `hello`          | Any Node 22+ host     | —                                                           |
| `ai-git-submit`  | Any with `git`        | `git` on `PATH`; network for the LLM API                    |
| `repos`          | Any with `git`        | `git` on `PATH`; optional `ssh` for remote repos; `submit` also needs network + `AI_GIT_SUBMIT_*` |
| `open-in-vscode` | Any with VS Code CLI  | `code` on `PATH`                                            |
| `retry`          | macOS, Linux          | POSIX `sh` (`spawn('sh', ['-c', …])`)                       |
| `keep-awake`     | macOS                 | `caffeinate`                                                |

Platform gates use `assertSupportedPlatform` in `src/lib/cli/platform.ts`. Help still runs on unsupported hosts.

`repos` settings may use `~` paths. Per-repo `environment` / `ssh-host` can run git over SSH (BatchMode); that needs OpenSSH-compatible `ssh` and a matching `~/.ssh/config` host. Optional fields (`ai-git-submit-parameters`, `after-update-commands`) are documented in `repos` help and `src/lib/repos/config.ts`.

## Tooling

| Piece                     | Expectation                                              |
| ------------------------- | -------------------------------------------------------- |
| `npm run build` → `bin/`  | `#!/bin/bash` wrappers (`scripts/generate-bin.mjs`)      |
| `npm run clean`           | Unix-like `rm -rf`                                       |
| Config / state under home | `~/.tfscripts/…` via `os.homedir()`                      |
| `~` path expansion        | Supported in settings loaders (`~/…`, `~\…`)             |

On Windows, run via WSL / Git Bash, or `node dist/<name>.js` with the same tools on `PATH`.

Unit tests inject OS-tool collaborators; see [testing.md](testing.md).
