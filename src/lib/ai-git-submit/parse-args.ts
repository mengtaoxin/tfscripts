import { isHelpToken } from '../cli/help-args.js';
import { parseSubmitFlags } from '../submit-options/flags.js';

export type ParseSuccess =
  | { ok: true; command: 'help' }
  | {
      ok: true;
      command: 'submit';
      noInput: boolean;
      add: boolean | undefined;
      push: boolean | undefined;
      protectMain: boolean | undefined;
    };

export type ParseFailure = {
  ok: false;
  reason: 'usage' | 'invalid';
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

const USAGE_HINT = 'ai-git-submit help';

export function parseArgs(argv: readonly string[]): ParseResult {
  if (argv.length === 0) {
    return {
      ok: true,
      command: 'submit',
      noInput: false,
      add: undefined,
      push: undefined,
      protectMain: undefined,
    };
  }

  const [first] = argv;

  if (isHelpToken(first)) {
    return { ok: true, command: 'help' };
  }

  if (first !== undefined && !first.startsWith('-')) {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown command "${first}". Run "${USAGE_HINT}" for usage.`,
    };
  }

  const parsed = parseSubmitFlags(argv, { usageHint: USAGE_HINT });
  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    command: 'submit',
    noInput: parsed.noInput,
    add: parsed.add,
    push: parsed.push,
    protectMain: parsed.protectMain,
  };
}
