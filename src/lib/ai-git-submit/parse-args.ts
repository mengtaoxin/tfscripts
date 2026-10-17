export type ParseSuccess =
  | { ok: true; command: 'help' }
  | { ok: true; command: 'submit'; mode: 'interactive' }
  | { ok: true; command: 'submit'; mode: 'direct'; add: boolean; push: boolean };

export type ParseFailure = {
  ok: false;
  reason: 'usage' | 'invalid';
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

function parseYesNo(raw: string): boolean | null {
  const normalized = raw.toLowerCase();
  if (normalized === 'yes') {
    return true;
  }
  if (normalized === 'no') {
    return false;
  }
  return null;
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
  const known = new Set(['--add', '--push']);
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
    return { ok: true, command: 'submit', mode: 'interactive' };
  }

  const [first] = argv;

  if (first === 'help' || first === '-h' || first === '--help') {
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

  const addFlag = readFlagValue(argv, '--add');
  const pushFlag = readFlagValue(argv, '--push');

  let add = false;
  let push = false;

  if (addFlag.present) {
    if (addFlag.value === undefined) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--add must be "yes" or "no".',
      };
    }
    const parsed = parseYesNo(addFlag.value);
    if (parsed === null) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--add must be "yes" or "no".',
      };
    }
    add = parsed;
  }

  if (pushFlag.present) {
    if (pushFlag.value === undefined) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--push must be "yes" or "no".',
      };
    }
    const parsed = parseYesNo(pushFlag.value);
    if (parsed === null) {
      return {
        ok: false,
        reason: 'invalid',
        message: '--push must be "yes" or "no".',
      };
    }
    push = parsed;
  }

  return { ok: true, command: 'submit', mode: 'direct', add, push };
}
