import { isHelpToken } from '../cli/help-args.js';
import { parseYesNo } from '../cli/yes-no.js';

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

function parseHours(raw: string): number | null {
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 24) {
    return null;
  }
  return value;
}

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
  const known = new Set(['--hours', '--screen', '--no-input']);
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

function parseStartOptions(args: readonly string[]): ParseResult {
  const unknown = hasUnknownFlags(args);
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
    const parsed = parseHours(hoursFlag.value);
    if (parsed === null) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--hours must be an integer from 1 to 24.',
      };
    }
    hours = parsed;
  }

  const screenFlag = readFlagValue(args, '--screen');
  let screen: boolean | undefined;
  if (screenFlag.present) {
    if (screenFlag.value === undefined) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--screen must be "yes" or "no".',
      };
    }
    const parsed = parseYesNo(screenFlag.value);
    if (parsed === null) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--screen must be "yes" or "no".',
      };
    }
    screen = parsed;
  }

  return {
    ok: true,
    command: 'start',
    noInput: args.includes('--no-input'),
    hours,
    screen,
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
