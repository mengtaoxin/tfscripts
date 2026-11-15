import { hasUnknownFlags, parseYesNoFlag } from '../cli/flags.js';

export interface ParseSubmitFlagsOptions {
  /** Shown in usage errors, e.g. `ai-git-submit help` or `repos submit --help`. */
  readonly usageHint: string;
}

export type ParseSubmitFlagsSuccess = {
  ok: true;
  noInput: boolean;
  add: boolean | undefined;
  push: boolean | undefined;
  protectMain: boolean | undefined;
};

export type ParseSubmitFlagsFailure = {
  ok: false;
  reason: 'usage' | 'invalid';
  message: string;
};

export type ParseSubmitFlagsResult = ParseSubmitFlagsSuccess | ParseSubmitFlagsFailure;

const KNOWN_FLAGS = new Set(['--add', '--push', '--protect-main', '--no-input']);
const VALUELESS_FLAGS = new Set(['--no-input']);

/**
 * Parse `--add` / `--push` / `--protect-main` / `--no-input` from argv.
 * Callers handle help tokens and non-flag commands themselves.
 */
export function parseSubmitFlags(
  argv: readonly string[],
  options: ParseSubmitFlagsOptions,
): ParseSubmitFlagsResult {
  const unknown = hasUnknownFlags(argv, KNOWN_FLAGS, { valueless: VALUELESS_FLAGS });
  if (unknown !== undefined) {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown option "${unknown}". Run "${options.usageHint}" for usage.`,
    };
  }

  const add = parseYesNoFlag(argv, '--add');
  if (!add.ok) {
    return { ok: false, reason: 'invalid', message: add.message };
  }
  const push = parseYesNoFlag(argv, '--push');
  if (!push.ok) {
    return { ok: false, reason: 'invalid', message: push.message };
  }
  const protectMain = parseYesNoFlag(argv, '--protect-main');
  if (!protectMain.ok) {
    return { ok: false, reason: 'invalid', message: protectMain.message };
  }

  return {
    ok: true,
    noInput: argv.includes('--no-input'),
    add: add.value,
    push: push.value,
    protectMain: protectMain.value,
  };
}

/** Split settings fragments like `["--add yes", "--push no"]` into argv tokens. */
export function flattenSubmitParameterFragments(
  parameters: readonly string[] | undefined,
): string[] {
  if (parameters === undefined || parameters.length === 0) {
    return [];
  }
  return parameters.flatMap((item) => item.split(/\s+/).filter((token) => token.length > 0));
}
