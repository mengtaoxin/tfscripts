# tfscripts

Useful TypeScript CLI scripts for macOS. Each command is a top-level `src/<name>.ts` entry; logic lives under `src/lib/`. `npm run build` compiles to `dist/` and writes `bin/` wrappers.

## Rules

- Plan and change code by [docs/change-code-steps.md](docs/change-code-steps.md); its "Before finishing" checklist applies to every change.
- Run commands from the repo root via root `package.json` scripts.
- Node.js 22+. Scripts that call macOS tools are still tested by injecting those collaborators ([docs/testing.md](docs/testing.md)).

## Read when

- Running scripts or verify → [docs/commands.md](docs/commands.md)
- macOS / Linux / Windows support → [docs/compatibility.md](docs/compatibility.md)
- Running or writing tests → [docs/testing.md](docs/testing.md)
- Adding or moving files → [docs/file-structure.md](docs/file-structure.md)
