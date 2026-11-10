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
  const known = new Set(['--command', '--times', '--interval', '--no-input']);
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

function parsePositiveInt(raw: string, min: number): number | null {
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    return null;
  }
  return value;
}

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

  const unknown = hasUnknownFlags(argv);
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
