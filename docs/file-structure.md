# File structure

Read this when adding or moving files. Where tests go: [testing.md](testing.md).

| Path                       | Role                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `src/<name>.ts`            | CLI entry. Parse argv, call lib, exit. One file per command                        |
| `src/lib/<name>/`          | Modules for that command (`parse-args`, `help`, `prompts`, `run`, smaller helpers) |
| `src/lib/greet.ts`         | Helper for `src/hello.ts`. `hello` has no `src/lib/hello/` directory               |
| `src/**/*.test.ts`         | Colocated unit tests                                                               |
| `scripts/generate-bin.mjs` | Writes `bin/<name>` from each top-level `dist/<name>.js`                           |
| `.agents/skills/`          | Installed agent skills (`skills-lock.json`)                                        |
| `docs/`                    | Workflow docs; OS matrix in [compatibility.md](compatibility.md)                   |

## Adding a command

1. Add `src/<name>.ts`. Put logic in `src/lib/<name>/`.
2. Import with the NodeNext `.js` suffix (`from './lib/<name>/run.js'`). There is no path alias.
3. Colocate `<module>.test.ts` next to the module it locks.
4. Keep the entry thin: `main(argv)` parses args, calls lib, returns an exit code. Match `src/repos.ts` or `src/retry.ts`.

`npm run build` compiles `src/` to `dist/` (`rootDir` is `src`). Only top-level `dist/*.js` files become `bin/` commands. Nested `dist/lib/**` is not wrapped. Test files are excluded from `tsc`, so they are not emitted.
