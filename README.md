# tfscripts

Useful TypeScript CLI scripts for macOS.

## Scripts

| Script          | Description                                                                  |
| --------------- | ---------------------------------------------------------------------------- |
| `hello`         | Simple greeting CLI (example / smoke test)                                   |
| `keep-awake`    | Keep the Mac awake for a set duration (optionally keep the display on)       |
| `ai-git-submit` | Generate a Conventional Commits message via LLM, commit, optionally add/push |
| `repo-sync`     | Pull current-branch updates for multiple local repos from a settings file    |
| `retry`         | Re-run a shell command until it exits 0, waiting a fixed interval            |

## Requirements

- macOS
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

```bash
npm run verify
```
