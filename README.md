# tfscripts

Useful TypeScript CLI scripts for macOS.

## Scripts

| Script           | Description                                                                    |
| ---------------- | ------------------------------------------------------------------------------ |
| `hello`          | Simple greeting CLI (example / smoke test)                                     |
| `keep-awake`     | Keep awake for a set duration (optionally keep the display on)                 |
| `ai-git-submit`  | Generate a Conventional Commits message via LLM, commit, optionally add/push   |
| `repos`          | Multi-repo helper: `update` / `check` / `list` (optional recent commit counts) |
| `retry`          | Re-run a shell command until it exits 0, waiting a fixed interval              |
| `open-in-vscode` | Open a folder in VS Code by path or alias (`--reuse-window` defaults to yes)   |

## Requirements

- macOS (primary). Per-script Linux / Windows notes: [docs/compatibility.md](docs/compatibility.md)
- Node.js 22+

## Setup

```bash
npm install
npm run build
```

Add the `bin` directory to your `PATH`, or run scripts via:

```bash
./bin/hello
./bin/keep-awake help
```

## Development

Code changes follow [docs/change-code-steps.md](docs/change-code-steps.md) ([AGENTS.md](AGENTS.md)).

```bash
npm run verify
```
