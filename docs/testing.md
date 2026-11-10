# Testing

How to run tests and where they live. Process: [test-driven-development](../.agents/skills/test-driven-development/SKILL.md). Command names: [commands.md](commands.md).

## Running

```sh
npm run test -- src/lib/repos/parse-args.test.ts
npm run test:watch
npm test
```

Use a focused file during Red / Green. The full suite runs once inside [`npm run verify`](commands.md#verify).

Vitest is configured in `vitest.config.ts`: `environment: 'node'`, include `src/**/*.{test,spec}.ts`, `passWithNoTests: true`. An empty suite still exits 0; a behavior change in scope still needs a failing test first.

Import `describe`, `it`, `expect`, and `vi` from `vitest`. Globals are off.

`npm run type-check` checks production sources only. `tsconfig.json` excludes `src/**/*.test.ts` and `src/**/*.spec.ts`.

## Where tests go

One layer: unit. There is no end-to-end suite. Lock behavior in the lowest unit test that expresses it.

| Change                                                | Location                                                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Parsing, help text, config, formatting, a pure helper | `<module>.test.ts` next to the module                                                                          |
| Orchestration (`run`, prompts, session, progress)     | Same folder. Pass the deps the module already accepts (`execFile`, spawn, fs, log)                             |
| `hello` greeting                                      | `src/hello.test.ts` covers `src/lib/greet.ts`. New scripts colocate the spec next to the module, not the entry |

Copy a nearby `*.test.ts` for naming and assertions. Prefer `*.test.ts`. Do not shell out to `caffeinate`, `git`, `code`, or the network from a unit test. Do not add an end-to-end test for a pure helper.
