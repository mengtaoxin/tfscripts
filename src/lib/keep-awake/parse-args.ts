import { hasUnknownFlags, parsePositiveInt, parseYesNoFlag, readFlagValue } from '../cli/flags.js';
import { isHelpToken } from '../cli/help-args.js';

export type KeepAwakeTopic = 'status' | 'stop';

export type ParseSuccess =
  | { ok: true; command: 'help'; topic?: KeepAwakeTopic }
  | { ok: true; command: 'status' | 'stop' }
  | {
      ok: true;
      command: 'start';
      noInput: boolean;
      hours: number | undefined;
      screen: boolean | undefined;
    };

export type ParseFailure = {
  ok: false;
  reason: 'usage' | 'invalid';
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

const KNOWN_FLAGS = new Set(['--hours', '--screen', '--no-input']);
const VALUELESS_FLAGS = new Set(['--no-input']);

function parseStartOptions(args: readonly string[]): ParseResult {
  const unknown = hasUnknownFlags(args, KNOWN_FLAGS, { valueless: VALUELESS_FLAGS });
  if (unknown !== undefined) {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown option "${unknown}". Run "keep-awake help" for usage.`,
    };
  }

  const hoursFlag = readFlagValue(args, '--hours');
  let hours: number | undefined;
  if (hoursFlag.present) {
    if (hoursFlag.value === undefined) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--hours must be an integer from 1 to 24.',
      };
    }
    const parsed = parsePositiveInt(hoursFlag.value, 1, 24);
    if (parsed === null) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--hours must be an integer from 1 to 24.',
      };
    }
    hours = parsed;
  }

  const screen = parseYesNoFlag(args, '--screen');
  if (!screen.ok) {
    return { ok: false, reason: 'invalid', message: screen.message };
  }

  return {
    ok: true,
    command: 'start',
    noInput: args.includes('--no-input'),
    hours,
    screen: screen.value,
  };
}

function isTopic(token: string): token is KeepAwakeTopic {
  return token === 'status' || token === 'stop';
}

export function parseArgs(argv: readonly string[]): ParseResult {
  const first = argv[0];
  const second = argv[1];

  if (first === undefined || first.startsWith('-')) {
    if (isHelpToken(first) && argv.length === 1) {
      return { ok: true, command: 'help' };
    }
    if (isHelpToken(first)) {
      return {
        ok: false,
        reason: 'usage',
        message: 'Unexpected arguments. Run "keep-awake help" for usage.',
      };
    }
    return parseStartOptions(argv);
  }

  if (isHelpToken(first)) {
    if (second === undefined) {
      return { ok: true, command: 'help' };
    }
    if (isTopic(second) && argv.length === 2) {
      return { ok: true, command: 'help', topic: second };
    }
    return {
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "keep-awake help" for usage.',
    };
  }

  if (isTopic(first)) {
    if (second === undefined) {
      return { ok: true, command: first };
    }
    if (isHelpToken(second) && argv.length === 2) {
      return { ok: true, command: 'help', topic: first };
    }
    return {
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "keep-awake help" for usage.',
    };
  }

  return {
    ok: false,
    reason: 'usage',
    message: `Unknown command "${first}". Run "keep-awake help" for usage.`,
  };
}
