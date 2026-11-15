import { hasUnknownFlags, readFlagValue } from '../cli/flags.js';
import { isHelpToken } from '../cli/help-args.js';

export type RepoAction = 'update' | 'check' | 'list' | 'submit';

export type ParseSuccess =
  | { ok: true; command: 'help'; topic?: RepoAction }
  | { ok: true; command: 'update' | 'check' | 'list' }
  | { ok: true; command: 'submit'; name: string };

export type ParseFailure = {
  ok: false;
  reason: 'usage' | 'invalid';
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

const ACTIONS = new Set<string>(['update', 'check', 'list', 'submit']);

const SUBMIT_KNOWN_FLAGS = new Set(['--name']);

function isAction(token: string): token is RepoAction {
  return ACTIONS.has(token);
}

function parseSubmitOptions(args: readonly string[]): ParseResult {
  const unknown = hasUnknownFlags(args, SUBMIT_KNOWN_FLAGS);
  if (unknown !== undefined) {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown option "${unknown}". Run "repos submit --help" for usage.`,
    };
  }

  const nameFlag = readFlagValue(args, '--name');
  if (!nameFlag.present) {
    return {
      ok: false,
      reason: 'usage',
      message: 'Missing required option --name. Run "repos submit --help" for usage.',
    };
  }
  if (nameFlag.value === undefined || nameFlag.value.trim() === '') {
    return {
      ok: false,
      reason: 'usage',
      message: '--name requires a value. Run "repos submit --help" for usage.',
    };
  }

  if (args.length !== 2) {
    return {
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "repos --help" for usage.',
    };
  }

  return {
    ok: true,
    command: 'submit',
    name: nameFlag.value.trim(),
  };
}

export function parseArgs(argv: readonly string[]): ParseResult {
  if (argv.length === 0) {
    return { ok: true, command: 'help' };
  }

  const [first, second, ...rest] = argv;

  if (first !== undefined && isHelpToken(first)) {
    if (second === undefined) {
      return { ok: true, command: 'help' };
    }
    if (isAction(second) && rest.length === 0) {
      return { ok: true, command: 'help', topic: second };
    }
    return {
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "repos --help" for usage.',
    };
  }

  if (first !== undefined && first.startsWith('-')) {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown option "${first}". Run "repos --help" for usage.`,
    };
  }

  if (first !== undefined && isAction(first)) {
    if (second === undefined) {
      if (first === 'submit') {
        return parseSubmitOptions([]);
      }
      return { ok: true, command: first };
    }
    if (isHelpToken(second) && rest.length === 0) {
      return { ok: true, command: 'help', topic: first };
    }
    if (first === 'submit') {
      return parseSubmitOptions(argv.slice(1));
    }
    return {
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "repos --help" for usage.',
    };
  }

  return {
    ok: false,
    reason: 'usage',
    message: `Unknown command "${first}". Run "repos --help" for usage.`,
  };
}
