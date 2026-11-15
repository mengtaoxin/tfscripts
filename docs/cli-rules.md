# CLI Rules

UX contract for every top-level command under `src/<name>.ts`. New behavior and refactors should match this page.

Background (optional): [clig.dev](https://clig.dev/), [cli.style](https://cli.style/), [Vercel CLI Design Guidelines](https://vercel.com/design/cli).

How to run: [commands.md](commands.md). Layout: [file-structure.md](file-structure.md).

## Scope

Applies to user-facing CLIs built into `bin/` (not root `package.json` npm scripts such as `verify`). `hello` is a smoke example and may stay minimal.

## Help

Every command accepts `-h`, `--help`, and `help` as a first-token command (same text as `--help`). Leaf subcommands also accept `<cmd> <sub> -h` / `--help` and `<cmd> help <sub>`.

`-h` is reserved for help. Once a help trigger is recognized, skip other validation and do no work.

**Root / group help**: what the tool does, how to invoke it, subcommand list, common flags, and one to three examples. **Leaf help**: usage, that leaf’s flags/args, defaults, and examples. Prefer examples early. One `HELP_TEXT` (or equivalent) per help surface.

| Situation                | Stream | Exit |
| ------------------------ | ------ | ---- |
| User asked for help      | stdout | `0`  |
| Usage error              | stderr | `2`  |
| Runtime / domain failure | stderr | `1`  |

On usage errors, print a short message plus a usage summary or `Run "<cmd> --help" for usage.`

## Bare invocation

Choose one documented default per command and state it in help.

| Command shape                                          | Bare `<cmd>`                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| Several subcommands, no single primary action          | Print root help (exit `0`) — e.g. `repos`                       |
| One primary action, interactive-friendly               | Start that action — e.g. `retry`, `keep-awake`, `ai-git-submit` |
| Primary action needs args; no side effect without them | Concise help (exit `0`) — e.g. `open-in-vscode`                 |

If there is a default action, say so under `Commands:` / `Usage:` in help.

## Arguments vs prompts

1. Every interactive prompt has a flag (or positional) equivalent.
2. Prompt only when stdin is a TTY; otherwise fail with exit `2` and name the missing flag(s).
3. Honor `--no-input` when the command can prompt (treat as non-TTY).
4. Do not re-ask values already supplied by flags or config.
5. After a multi-step interactive run, prefer printing the equivalent non-interactive invocation.

On a TTY, if required input is missing, prompt unless `--no-input` is set. Destructive work: confirm interactively; non-interactive requires an explicit `--yes` / `--force` (name it in the error if missing).

**Hybrid rule (default for new work):** partial flags → prompt for the rest. Document the rule in that command’s help.

## Subcommands and flags

Prefer subcommands for distinct actions (`update` / `check` / `list`). Reuse shared flag names and `yes` / `no` boolean spellings. Global-style flags when present: `-h` / `--help`, and `--no-input` where prompts exist. Unknown commands/flags → usage error `2` with a pointer to help.

## Implementation

Keep entries thin (`parseArgs` → dispatch → exit). Prefer `runCliMain` (`src/lib/cli/run-main.ts`). Put help in `src/lib/<name>/help.ts`, prompts in `prompts.ts` (injectable for tests — [testing.md](testing.md)). Reuse `src/lib/cli/flags.ts` and `resolveInteractiveOptions`. Lock help triggers, bare invocation, and flag↔prompt pairs in unit tests next to `parse-args` / `help`.

## Checklist

- [ ] `-h`, `--help`, and `help` work; asked-for help is stdout / `0`
- [ ] Each subcommand has its own help surface
- [ ] Bare invocation matches the table above and is written in help
- [ ] Usage errors → stderr / `2`; domain failures → `1`
- [ ] Every prompt has a flag equivalent; non-TTY / `--no-input` never hangs
- [ ] Hybrid rule documented when both flags and prompts exist
- [ ] Focused tests cover parse + help; `npm run verify` before finishing
