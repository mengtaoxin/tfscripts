import { isHelpToken } from '../cli/help-args.js';
import { parseYesNo } from '../cli/yes-no.js';

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

function readFlagValue(
  args: readonly string[],
  name: string,
): { present: false } | { present: true; value: string | undefined } {
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

function hasUnknownFlags(args: readonly string[]): string | undefined {
  const known = new Set(['--add', '--push', '--no-input']);
  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === undefined || !token.startsWith('-')) {
      continue;
    }
    if (!known.has(token)) {
      return token;
    }
    if (token === '--no-input') {
      continue;
    }
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith('-')) {
      i += 1;
    }
  }
  return undefined;
}

function parseYesNoFlag(
  argv: readonly string[],
  name: '--add' | '--push',
): { ok: true; value: boolean | undefined } | { ok: false; message: string } {
  const flag = readFlagValue(argv, name);
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

  const unknown = hasUnknownFlags(argv);
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
