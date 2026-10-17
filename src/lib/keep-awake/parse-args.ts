export type ParseSuccess =
  | { ok: true; command: 'status' | 'stop' | 'help' }
  | { ok: true; command: 'start'; mode: 'interactive' }
  | { ok: true; command: 'start'; mode: 'direct'; hours: number; screen: boolean };

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

function parseScreen(raw: string): boolean | null {
  const normalized = raw.toLowerCase();
  if (normalized === 'yes') {
    return true;
  }
  if (normalized === 'no') {
    return false;
  }
  return null;
}

function readFlag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

export function parseArgs(argv: readonly string[]): ParseResult {
  const [command, ...rest] = argv;

  if (command === undefined) {
    return {
      ok: false,
      reason: 'usage',
      message: 'Missing command. Run "keep-awake help" for usage.',
    };
  }

  if (command === 'status' || command === 'stop' || command === 'help') {
    return { ok: true, command };
  }

  if (command !== 'start') {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown command "${command}". Run "keep-awake help" for usage.`,
    };
  }

  const hoursRaw = readFlag(rest, '--hours');
  const screenRaw = readFlag(rest, '--screen');
  const hasHours = hoursRaw !== undefined;
  const hasScreen = screenRaw !== undefined;

  if (!hasHours || !hasScreen) {
    return { ok: true, command: 'start', mode: 'interactive' };
  }

  const hours = parseHours(hoursRaw);
  if (hours === null) {
    return {
      ok: false,
      reason: 'invalid',
      message: '--hours must be an integer from 1 to 24.',
    };
  }

  const screen = parseScreen(screenRaw);
  if (screen === null) {
    return {
      ok: false,
      reason: 'invalid',
      message: '--screen must be "yes" or "no".',
    };
  }

  return { ok: true, command: 'start', mode: 'direct', hours, screen };
}
