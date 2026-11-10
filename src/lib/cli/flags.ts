import { parseYesNo } from './yes-no.js';

export type FlagValue = { present: false } | { present: true; value: string | undefined };

export function readFlagValue(args: readonly string[], name: string): FlagValue {
  const index = args.indexOf(name);
  if (index === -1) {
    return { present: false };
  }
  const value = args[index + 1];
  if (value === undefined || value.startsWith('-')) {
    return { present: true, value: undefined };
  }
  return { present: true, value };
}

export interface HasUnknownFlagsOptions {
  /** Flags that never take a value (e.g. `--no-input`). */
  readonly valueless?: ReadonlySet<string>;
}

/**
 * Returns the first unknown `-…` token, or `undefined` if all flags are known.
 * Known flags that are not in `valueless` consume the next non-flag token as a value.
 */
export function hasUnknownFlags(
  args: readonly string[],
  known: ReadonlySet<string>,
  options: HasUnknownFlagsOptions = {},
): string | undefined {
  const valueless = options.valueless ?? new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === undefined || !token.startsWith('-')) {
      continue;
    }
    if (!known.has(token)) {
      return token;
    }
    if (valueless.has(token)) {
      continue;
    }
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith('-')) {
      i += 1;
    }
  }
  return undefined;
}

export function parsePositiveInt(raw: string, min: number, max?: number): number | null {
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    return null;
  }
  if (max !== undefined && value > max) {
    return null;
  }
  return value;
}

export function parseYesNoFlag(
  args: readonly string[],
  name: string,
): { ok: true; value: boolean | undefined } | { ok: false; message: string } {
  const flag = readFlagValue(args, name);
  if (!flag.present) {
    return { ok: true, value: undefined };
  }
  if (flag.value === undefined) {
    return { ok: false, message: `${name} must be "yes" or "no".` };
  }
  const parsed = parseYesNo(flag.value);
  if (parsed === null) {
    return { ok: false, message: `${name} must be "yes" or "no".` };
  }
  return { ok: true, value: parsed };
}
