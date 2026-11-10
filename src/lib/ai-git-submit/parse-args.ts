import { hasUnknownFlags, parseYesNoFlag } from '../cli/flags.js';
import { isHelpToken } from '../cli/help-args.js';

export type ParseSuccess =
  | { ok: true; command: 'help' }
  | {
      ok: true;
      command: 'submit';
      noInput: boolean;
      add: boolean | undefined;
      push: boolean | undefined;
    };

export type ParseFailure = {
  ok: false;
  reason: 'usage' | 'invalid';
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

const KNOWN_FLAGS = new Set(['--add', '--push', '--no-input']);
const VALUELESS_FLAGS = new Set(['--no-input']);

export function parseArgs(argv: readonly string[]): ParseResult {
  if (argv.length === 0) {
    return {
      ok: true,
      command: 'submit',
      noInput: false,
      add: undefined,
      push: undefined,
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
      message: `Unknown command "${first}". Run "ai-git-submit help" for usage.`,
    };
  }

  const unknown = hasUnknownFlags(argv, KNOWN_FLAGS, { valueless: VALUELESS_FLAGS });
  if (unknown !== undefined) {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown option "${unknown}". Run "ai-git-submit help" for usage.`,
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

  return {
    ok: true,
    command: 'submit',
    noInput: argv.includes('--no-input'),
    add: add.value,
    push: push.value,
  };
}
