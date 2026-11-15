# File structure

Read this when adding or moving files. Tests: [testing.md](testing.md). Stack: [tech-stack.md](tech-stack.md).

## Layout

```
tfscripts/
├── src/
│   ├── <name>.ts              # CLI entry (one per command)
│   ├── hello.test.ts          # exception: hello tests sit next to the entry
│   └── lib/
│       ├── <name>/            # logic for that command
│       ├── repos/             # repos command (split by layer)
│       │   ├── cli/           # parse-args, help, submit-parameter parse
│       │   ├── orchestrate/   # batch runners, format, update/check/list/submit
│       │   ├── ops/           # per-repo sync/check/submit/after-update
│       │   └── infra/         # config, git/ssh, pool, progress, state, throttle
│       ├── submit-options/    # shared --add/--push/--protect-main flag contract
│       ├── cli/               # shared CLI helpers
│       ├── git/               # shared git process helpers
│       ├── retry-policy/      # shared backoff / network-error helpers
│       └── greet.ts           # hello helper (no lib/hello/)
├── scripts/generate-bin.mjs   # dist/*.js → bin/<name> wrappers
├── completions/               # bash/zsh Tab completion (see shell-completion.md)
├── docs/                      # agent / contributor workflow docs
└── .agents/skills/            # installed agent skills
```

`npm run build` compiles `src/` → `dist/`. Only top-level `dist/*.js` become `bin/` commands; nested `dist/lib/**` is not wrapped.

## Adding a command

1. Add `src/<name>.ts`; put logic in `src/lib/<name>/`.
2. Import with NodeNext `.js` suffixes (no path aliases).
3. Colocate `<module>.test.ts` next to the module it locks.
4. Keep the entry thin: parse argv → call lib → exit code. Mirror `src/repos.ts` or `src/retry.ts`.
5. Follow [cli-rules.md](cli-rules.md) for help, bare invocation, flags, and prompts.
