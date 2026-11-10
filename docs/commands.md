# Commands

Run from the repo root. Script names are the `scripts` field in `package.json`. What each CLI does: [README.md](../README.md).

## Setup

Node.js 22+. `@mengtaoxin/oxc-config` is on GitHub Packages. Export `NODE_AUTH_TOKEN` (a PAT with `read:packages`) before install so [`.npmrc`](../.npmrc) can authenticate.

```sh
npm install
npm run build
```

`npm run build` runs `tsc`, then `scripts/generate-bin.mjs`, which writes an executable `bin/<name>` wrapper for each top-level `dist/<name>.js`. `dist/` and `bin/` are gitignored.

Add `bin/` to `PATH`, or run `./bin/<name>`.

## Verify

`npm run verify` is the finish command. It does not format files. It runs, in order:

1. `npm run check` — `format:check`, then `lint` (`oxlint`), then `type-check` (`tsc --noEmit`)
2. `npm test` — `vitest run`

When the tree needs formatting, run `npm run format` (`oxfmt`) first. Use `npm run lint:fix` only when a lint violation has an autofix. Then run `npm run verify` once.

| Script         | What it does                                  |
| -------------- | --------------------------------------------- |
| `format`       | Write oxfmt formatting                        |
| `format:check` | Check formatting only                         |
| `lint`         | oxlint                                        |
| `lint:fix`     | oxlint with fixes                             |
| `type-check`   | `tsc --noEmit` on production sources          |
| `test`         | Vitest once. A path after `--` runs that file |
| `test:watch`   | Vitest watch                                  |
| `check`        | `format:check` + `lint` + `type-check`        |
| `verify`       | `check` + `test`                              |
| `build`        | `tsc` and generate `bin/`                     |
| `clean`        | Remove `dist/` and `bin/`                     |

## Runtime config

These files live outside the repo, or are gitignored. The shape is in source; do not copy it into docs.

| Script           | Config                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `ai-git-submit`  | Repo `.env` (keys in [`.env.example`](../.env.example)). Loader: `src/lib/ai-git-submit/config.ts` |
| `repos`          | `~/.tfscripts/repos/settings.json` (`src/lib/repos/config.ts`)                                     |
| `open-in-vscode` | `~/.tfscripts/open-in-vscode/settings.json` (`src/lib/open-in-vscode/config.ts`)                   |
| `keep-awake`     | `~/.tfscripts/keep-awake/keep-awake.json` session state (`src/lib/keep-awake/state.ts`)            |

`keep-awake` uses `caffeinate`; `open-in-vscode` needs the `code` CLI. Platform notes: [compatibility.md](compatibility.md). Unit tests inject those collaborators, so `npm test` does not need the host binaries.
