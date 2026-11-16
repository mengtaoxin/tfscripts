# Commands

Run from the repo root. Script names live in `package.json` `scripts`. Stack: [tech-stack.md](tech-stack.md).

## Setup

Node.js 22+. `@mengtaoxin/oxc-config` is on GitHub Packages — export `NODE_AUTH_TOKEN` (PAT with `read:packages`) before install so [`.npmrc`](../.npmrc) can authenticate.

```sh
npm install
npm run build
```

`build` runs `tsc`, then `scripts/generate-bin.mjs`, which writes executable `bin/<name>` wrappers for each top-level `dist/<name>.js`. `dist/` and `bin/` are gitignored. Add `bin/` to `PATH`, or run `./bin/<name>`.

Shell Tab completion (bash/zsh): [shell-completion.md](shell-completion.md).

## Common scripts

| Script                | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `build`               | Compile and generate `bin/`                        |
| `clean`               | Remove `dist/` and `bin/`                          |
| `format`              | Write formatting (`oxfmt`)                         |
| `format:check`        | Check formatting only                              |
| `lint`                | oxlint                                             |
| `lint:fix`            | oxlint with autofixes                              |
| `type-check`          | `tsc --noEmit` on production sources               |
| `check`               | `format:check` + `lint` + `type-check`             |
| `verify`              | `check` + `test` (finish command; does not format) |
| `test` / `test:watch` | See [testing.md](testing.md)                       |

When the tree needs formatting, run `npm run format` first, then `npm run verify` once.

## Runtime config

Paths and shapes live in source; do not duplicate them here.

| CLI              | Config / state source                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `ai-git-submit`  | Repo `.env` (keys in [`.env.example`](../.env.example)); loader `src/lib/ai-git-submit/config.ts`      |
| `repos`          | `~/.tfscripts/repos/settings.yml` (`infra/config.ts`); remote-op state `state.json` (`infra/state.ts`) |
| `open-in-vscode` | `~/.tfscripts/open-in-vscode/settings.yml` (`src/lib/open-in-vscode/config.ts`)                        |
| `keep-awake`     | `~/.tfscripts/keep-awake/status.json` (`src/lib/keep-awake/state.ts`)                                  |

CLIs that use `runCliMain` share `~/.tfscripts/run.lock` (`src/lib/cli/run-lock.ts`); help requests skip the lock. `hello` is a smoke entry and does not use `runCliMain`.

External OS tools and platform notes: [compatibility.md](compatibility.md).
