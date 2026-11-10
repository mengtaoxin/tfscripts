# CLI Rules

Target UX contract for every top-level command under `src/<name>.ts`. Existing commands may not match yet; new behavior and refactors should move toward this doc.

Inspired by [Command Line Interface Guidelines](https://clig.dev/), [CLI Style](https://cli.style/), and [Vercel CLI Design Guidelines](https://vercel.com/design/cli). This page is the repo contract; those links are background reading.

How to run scripts: [commands.md](commands.md). Where CLI files live: [file-structure.md](file-structure.md).

## Scope

Applies to user-facing CLIs built into `bin/` (not root `package.json` npm scripts such as `verify`).

`hello` is a smoke example and may stay minimal until it grows real options or subcommands.

## Help

### Triggers

Every command must accept all of:

- `-h`
- `--help`
- `help` as a first-token command (same text as `--help`)

If the CLI has subcommands, each leaf must also accept:

- `<cmd> <sub> -h` / `<cmd> <sub> --help`
- `<cmd> help <sub>` (same text as `<cmd> <sub> --help`)

`-h` is reserved for help. Do not overload it.

Once a help trigger is recognized, skip other validation and do no work (no network, no mutation, no prompts).

### Content

- **Root / group help**: what the tool does, how to invoke it, the subcommand list (if any), the most common flags, and one to three examples. Point to `--help` on a leaf when detail belongs there.
- **Leaf / subcommand help**: usage line, that leaf’s flags and args, defaults, and examples for that action.

Prefer examples early. Keep one `HELP_TEXT` (or equivalent) per help surface; do not invent a second narrative in the entry file.

### Streams and exit codes

| Situation                                                                          | Stream | Exit |
| ---------------------------------------------------------------------------------- | ------ | ---- |
| User asked for help (`help` / `-h` / `--help`)                                     | stdout | `0`  |
| Usage error (unknown command/flag, missing required input in non-interactive mode) | stderr | `2`  |
| Runtime / domain failure                                                           | stderr | `1`  |

On usage errors, print a short message and either a concise usage summary or a pointer such as `Run "<cmd> --help" for usage.` Do not treat “I printed help because you made a mistake” as exit `0`.

## Bare invocation (`<cmd>` with no args)

Choose one documented default per command. Do not leave it ambiguous in help text.

| Command shape                                             | Bare `<cmd>` does                         | Exit                                                   |
| --------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| Several subcommands, no single primary action             | Print root help                           | `0`                                                    |
| One primary action, interactive-friendly by design        | Start that action (may prompt on a TTY)   | action’s code                                          |
| Primary action needs required args and is not interactive | Concise usage / help (not a silent no-op) | `0` if intentional help; `2` if treated as usage error |

Rules of thumb for this repo:

- Multi-subcommand tools such as `repos` → bare = help.
- Single-purpose tools that already use prompts (`retry`, `keep-awake`, `ai-git-submit`) → bare may start the primary action.
- Flag-required tools without prompts (`open-in-vscode`) → bare = usage error (`2`) or concise help (`0`); pick one and document it in that command’s help. Prefer concise help + exit `0` when the tool has no side effect without args.

Do not invent a hidden default subcommand that swallows arbitrary first tokens (clig “no catch-all subcommand”). If there is a default action, say so under `Commands:` / `Usage:` in help.

## Arguments vs prompts

### Non-negotiable

1. **Every interactive prompt has a flag (or positional) equivalent.** A workflow that works in a TTY must also work as one non-interactive command line (scripts, CI, agents).
2. **Never require a prompt.** Interactive-only CLIs are not allowed for production commands.
3. **Prompt only when stdin is a TTY.** If stdin is not a TTY, do not block on input; fail with exit `2` and name the missing flag(s).
4. **Honor an explicit non-interactive switch** when the command can prompt: prefer `--no-input` (clig). When it is set, behave as non-TTY even if a terminal is attached.
5. **Do not re-ask** values already supplied by flags or config.
6. After a multi-step interactive run, prefer printing the equivalent non-interactive invocation (so the user can script it next time).

### When to prompt

On a TTY, if required input is missing, prompt for the missing pieces instead of failing—unless `--no-input` is set or the command documents that it never prompts.

Confirmations for destructive or hard-to-undo work:

- Interactive: confirm (severity-scaled; catastrophic actions may require typing a name).
- Non-interactive: require an explicit flag such as `--yes` / `--force` (name it in the error if missing).

### Hybrid flag rules

If a command supports both flags and prompts, document one rule and stick to it:

- **Partial flags → prompt for the rest** (recommended default), or
- **Any flag present → non-interactive; omitted flags use defaults** (also fine if help says so clearly).

Do not mix both rules across commands without calling out the difference in each help text. Prefer converging on “partial flags → prompt for the rest” for new work.

## Subcommands and flags

- Prefer subcommands for distinct actions (`update` / `check` / `list`), not mode flags that change the verb.
- Reuse the same flag names and yes/no value spellings across commands when they mean the same thing (this repo already uses `yes` / `no` for booleans in several CLIs—keep that).
- Global-style flags that every command should understand when present: `-h` / `--help`, and `--no-input` where prompts exist.
- Unknown commands and unknown flags are usage errors (`2`), with a pointer to help.

## Implementation sketch

Keep the entry thin (`parseArgs` → dispatch → exit). Put help strings in `src/lib/<name>/help.ts` (or equivalent). Put prompts in `src/lib/<name>/prompts.ts` and keep them injectable for tests ([testing.md](testing.md)).

Lock conventions that users rely on in unit tests next to `parse-args` and `help` (help triggers, bare invocation, exit-oriented parse results, “flag equivalent exists for each prompt”).

## Checklist for a new or revised command

- [ ] `-h`, `--help`, and `help` work; asked-for help is stdout / `0`
- [ ] Each subcommand has its own help surface
- [ ] Bare invocation behavior is chosen from the table above and written in help
- [ ] Usage errors use stderr / `2`; domain failures use `1`
- [ ] Every prompt has a flag equivalent; non-TTY / `--no-input` never hangs
- [ ] Hybrid partial-flag vs all-or-nothing rule is documented if both modes exist
- [ ] Focused tests cover parse + help triggers; `npm run verify` before finishing
