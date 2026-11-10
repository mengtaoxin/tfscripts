# Change code steps

Ordered workflow for planning or changing code. Details live in the linked docs.

## Before finishing

Every change, however small (even a one-line config flag), is done only when each item is done or skipped for a reason its section allows:

- [ ] Tests: Red → Green with focused runs when in scope (step 2).
- [ ] `npm run verify` passes (step 3).
- [ ] Owning doc updated if a contract changed (step 4).

## 1. Orient

Read [file-structure.md](file-structure.md) only when adding or moving files, or when you do not yet know which file to change. Skip it when the entry file is already known.

## 2. Tests

Follow the [test-driven-development](../.agents/skills/test-driven-development/SKILL.md) skill; pick layer, location and commands from [testing.md](testing.md). Out-of-scope changes still finish with step 3 when they touched code or runtime-affecting config.

## 3. Verify

Run `npm run format` when the tree needs formatting, then `npm run verify` once at the end instead of separate `format:check` / `lint` / `type-check` / full-suite runs. What `verify` runs: [commands.md](commands.md#verify).

## 4. Docs

Update the page that owns the changed contract ([commands.md](commands.md), [testing.md](testing.md), [file-structure.md](file-structure.md), [compatibility.md](compatibility.md), or [README.md](../README.md)). Do not add lists that only mirror code; point to the source instead.
