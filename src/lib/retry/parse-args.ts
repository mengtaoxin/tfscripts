import { hasUnknownFlags, parsePositiveInt, readFlagValue } from '../cli/flags.js';
import { isHelpToken } from '../cli/help-args.js';

export type ParseSuccess =
  | { ok: true; command: 'help' }
  | {
      ok: true;
      command: 'retry';
      noInput: boolean;
      shellCommand: string | undefined;
      times: number | undefined;
      intervalSeconds: number | undefined;
    };

export type ParseFailure = {
  ok: false;
  reason: 'usage' | 'invalid';
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

const KNOWN_FLAGS = new Set(['--command', '--times', '--interval', '--no-input']);
const VALUELESS_FLAGS = new Set(['--no-input']);

export function parseArgs(argv: readonly string[]): ParseResult {
  if (argv.length === 0) {
    return {
      ok: true,
      command: 'retry',
      noInput: false,
      shellCommand: undefined,
      times: undefined,
      intervalSeconds: undefined,
    };
  }

  const [first] = argv;

  if (isHelpToken(first)) {
    if (argv.length > 1) {
      return {
        ok: false,
        reason: 'usage',
        message: 'Unexpected arguments. Run "retry help" for usage.',
      };
    }
    return { ok: true, command: 'help' };
  }

  if (first !== undefined && !first.startsWith('-')) {
    return {
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "retry help" for usage.',
    };
  }

  const unknown = hasUnknownFlags(argv, KNOWN_FLAGS, { valueless: VALUELESS_FLAGS });
  if (unknown !== undefined) {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown option "${unknown}". Run "retry help" for usage.`,
    };
  }

  const commandFlag = readFlagValue(argv, '--command');
  let shellCommand: string | undefined;
  if (commandFlag.present) {
    if (commandFlag.value === undefined || commandFlag.value.trim() === '') {
      return {
        ok: false,
        reason: 'invalid',
        message: '--command requires a value.',
      };
    }
    shellCommand = commandFlag.value;
  }

  const timesFlag = readFlagValue(argv, '--times');
  let times: number | undefined;
  if (timesFlag.present) {
    if (timesFlag.value === undefined) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--times must be an integer of at least 1.',
      };
    }
    const parsed = parsePositiveInt(timesFlag.value, 1);
    if (parsed === null) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--times must be an integer of at least 1.',
      };
    }
    times = parsed;
  }

  const intervalFlag = readFlagValue(argv, '--interval');
  let intervalSeconds: number | undefined;
  if (intervalFlag.present) {
    if (intervalFlag.value === undefined) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--interval must be an integer of at least 0.',
      };
    }
    const parsed = parsePositiveInt(intervalFlag.value, 0);
    if (parsed === null) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--interval must be an integer of at least 0.',
      };
    }
    intervalSeconds = parsed;
  }

  return {
    ok: true,
    command: 'retry',
    noInput: argv.includes('--no-input'),
    shellCommand,
    times,
    intervalSeconds,
  };
}
