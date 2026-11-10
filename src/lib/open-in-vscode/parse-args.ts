import { hasUnknownFlags, parseYesNoFlag, readFlagValue } from '../cli/flags.js';
import { isHelpToken } from '../cli/help-args.js';

export type ParseSuccess =
  | { ok: true; command: 'help' }
  | { ok: true; command: 'open'; path: string; reuseWindow: boolean };

export type ParseFailure = {
  ok: false;
  reason: 'usage' | 'invalid';
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

const KNOWN_FLAGS = new Set(['--path', '--reuse-window']);

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

  const unknown = hasUnknownFlags(argv, KNOWN_FLAGS);
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

  const reuse = parseYesNoFlag(argv, '--reuse-window');
  if (!reuse.ok) {
    return { ok: false, reason: 'invalid', message: reuse.message };
  }

  return {
    ok: true,
    command: 'open',
    path: pathFlag.value,
    reuseWindow: reuse.value ?? true,
  };
}
