# tfscripts

TypeScript CLI toolkit for everyday macOS chores. Each command is `src/<name>.ts`; logic lives under `src/lib/`. `npm run build` emits `dist/` and `bin/` wrappers.

## Core rules

- Plan and change code via [docs/change-code-steps.md](docs/change-code-steps.md); its "Before finishing" checklist applies to every change.
- Run from the repo root with root `package.json` scripts. Node.js 22+.
- Inject OS-tool collaborators in tests; do not shell out to them ([docs/testing.md](docs/testing.md)).

## Doc routing

| Need                                         | Doc                                                    |
| -------------------------------------------- | ------------------------------------------------------ |
| Change workflow / finish checklist           | [docs/change-code-steps.md](docs/change-code-steps.md) |
| Layout / new commands                        | [docs/file-structure.md](docs/file-structure.md)       |
| Setup, scripts, verify, runtime config paths | [docs/commands.md](docs/commands.md)                   |
| Tests                                        | [docs/testing.md](docs/testing.md)                     |
| Tech stack                                   | [docs/tech-stack.md](docs/tech-stack.md)               |
| Help / bare / flags / prompts                | [docs/cli-rules.md](docs/cli-rules.md)                 |
| OS tools and platform surface                | [docs/compatibility.md](docs/compatibility.md)         |
