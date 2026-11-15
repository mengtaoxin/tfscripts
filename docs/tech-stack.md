# Tech stack

Runtime and tooling for this repo. Script names: [commands.md](commands.md). Layout: [file-structure.md](file-structure.md).

## Runtime

| Piece       | Choice                                                           |
| ----------- | ---------------------------------------------------------------- |
| Language    | TypeScript (`strict`, `module` / `moduleResolution`: `NodeNext`) |
| Module      | ESM (`"type": "module"`); imports use `.js` suffixes             |
| Node        | 22+ (`engines.node` in `package.json`)                           |
| CLI prompts | `@inquirer/prompts`                                              |
| Env loading | `dotenv` (repo `.env` for `ai-git-submit`)                       |

Compile with `tsc` (`tsconfig.json`: `rootDir` `src`, `outDir` `dist`). Test files are excluded from emit.

## Tooling

| Concern     | Tool                                |
| ----------- | ----------------------------------- |
| Test runner | Vitest (`vitest.config.ts`)         |
| Lint        | oxlint via `@mengtaoxin/oxc-config` |
| Format      | oxfmt via `@mengtaoxin/oxc-config`  |
| Types       | `typescript`, `@types/node`         |

Shared libraries (`cli/`, `git/`, `retry-policy/`) are listed under [file-structure.md](file-structure.md).
