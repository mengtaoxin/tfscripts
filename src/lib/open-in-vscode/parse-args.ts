import { isHelpToken } from '../cli/help-args.js';
import { parseYesNo } from '../cli/yes-no.js';

export type ParseSuccess =
  | { ok: true; command: 'help' }
  | { ok: true; command: 'open'; path: string; reuseWindow: boolean };

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
  const known = new Set(['--path', '--reuse-window']);
  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === undefined || !token.startsWith('-')) {
      continue;
    }
    if (!known.has(token)) {
      return token;
    }
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith('-')) {
      i += 1;
    }
  }
  return undefined;
}

export function parseArgs(argv: readonly string[]): ParseResult {
  if (argv.length === 0) {
    return { ok: true, command: 'help' };
  }

  const [first] = argv;

  if (isHelpToken(first)) {
    return { ok: true, command: 'help' };
  }

  if (first !== undefined && !first.startsWith('-')) {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown command "${first}". Run "open-in-vscode help" for usage.`,
    };
  }

  const unknown = hasUnknownFlags(argv);
  if (unknown !== undefined) {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown option "${unknown}". Run "open-in-vscode help" for usage.`,
    };
  }

  const pathFlag = readFlagValue(argv, '--path');
  if (!pathFlag.present) {
    return {
      ok: false,
      reason: 'usage',
      message: 'Missing --path. Run "open-in-vscode help" for usage.',
    };
  }
  if (pathFlag.value === undefined || pathFlag.value.trim() === '') {
    return {
      ok: false,
      reason: 'invalid',
      message: '--path requires a value.',
    };
  }

  const reuseFlag = readFlagValue(argv, '--reuse-window');
  let reuseWindow = true;
  if (reuseFlag.present) {
    if (reuseFlag.value === undefined) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--reuse-window must be "yes" or "no".',
      };
    }
    const parsed = parseYesNo(reuseFlag.value);
    if (parsed === null) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--reuse-window must be "yes" or "no".',
      };
    }
    reuseWindow = parsed;
  }

  return {
    ok: true,
    command: 'open',
    path: pathFlag.value,
    reuseWindow,
  };
}
