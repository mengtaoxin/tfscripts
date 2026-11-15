# Testing

Process: [test-driven-development](../.agents/skills/test-driven-development/SKILL.md). Script names: [commands.md](commands.md).

## Running

```sh
npm run test -- src/lib/repos/cli/parse-args.test.ts
npm run test:watch
npm test
```

Use a focused file during Red / Green. The full suite runs once inside [`npm run verify`](commands.md#common-scripts).

Vitest (`vitest.config.ts`): `environment: 'node'`, include `src/**/*.{test,spec}.ts`, `passWithNoTests: true`. Import `describe`, `it`, `expect`, and `vi` from `vitest` (globals off).

`npm run type-check` covers production sources only; `tsconfig.json` excludes `*.test.ts` / `*.spec.ts`.

## Where tests go

Unit tests only. Lock behavior in the lowest unit that expresses it.

| Change                                            | Location                                              |
| ------------------------------------------------- | ----------------------------------------------------- |
| Parsing, help, config, formatting, pure helpers   | `<module>.test.ts` next to the module                 |
| Orchestration (`run`, prompts, session, progress) | Same folder; pass the deps the module already accepts |
| `hello` greeting                                  | `src/hello.test.ts` covers `src/lib/greet.ts`         |

Prefer `*.test.ts`. Inject collaborators (`execFile`, spawn, fs, log); do not shell out to host binaries or the network from a unit test.
