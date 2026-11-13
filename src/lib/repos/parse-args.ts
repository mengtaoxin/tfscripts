import { hasUnknownFlags, parsePositiveInt, readFlagValue } from '../cli/flags.js';
import { isHelpToken } from '../cli/help-args.js';

export type RepoAction = 'update' | 'check' | 'list';

export type ParseSuccess =
  | { ok: true; command: 'help'; topic?: RepoAction }
  | { ok: true; command: 'update' | 'check' }
  | { ok: true; command: 'list'; showCommitCountDays?: number };

export type ParseFailure = {
  ok: false;
  reason: 'usage' | 'invalid';
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

const ACTIONS = new Set<string>(['update', 'check', 'list']);

const LIST_KNOWN_FLAGS = new Set(['--show-commit-count', '-scc']);
const DEFAULT_SHOW_COMMIT_COUNT_DAYS = 7;

function isAction(token: string): token is RepoAction {
  return ACTIONS.has(token);
}

function parseListOptions(args: readonly string[]): ParseResult {
  const unknown = hasUnknownFlags(args, LIST_KNOWN_FLAGS);
  if (unknown !== undefined) {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown option "${unknown}". Run "repos list --help" for usage.`,
    };
  }

  const longFlag = readFlagValue(args, '--show-commit-count');
  const shortFlag = readFlagValue(args, '-scc');

  if (longFlag.present && shortFlag.present) {
    return {
      ok: false,
      reason: 'usage',
      message:
        'Use either --show-commit-count or -scc, not both. Run "repos list --help" for usage.',
    };
  }

  if (!longFlag.present && !shortFlag.present) {
    if (args.length === 0) {
      return { ok: true, command: 'list' };
    }
    return {
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "repos list --help" for usage.',
    };
  }

  const activeFlag = longFlag.present
    ? { name: '--show-commit-count' as const, value: longFlag.value }
    : { name: '-scc' as const, value: shortFlag.present ? shortFlag.value : undefined };

  let days = DEFAULT_SHOW_COMMIT_COUNT_DAYS;
  if (activeFlag.value !== undefined) {
    const parsed = parsePositiveInt(activeFlag.value, 1);
    if (parsed === null) {
      return {
        ok: false,
        reason: 'invalid',
        message: `${activeFlag.name} must be a positive integer.`,
      };
    }
    days = parsed;
  }

  const expectedLength = activeFlag.value === undefined ? 1 : 2;
  if (args.length !== expectedLength) {
    return {
      ok: false,
      reason: 'usage',
      message: 'Unexpected arguments. Run "repos list --help" for usage.',
    };
  }

  return {
    ok: true,
    command: 'list',
    showCommitCountDays: days,
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
      if (first === 'list') {
        return { ok: true, command: 'list' };
      }
      return { ok: true, command: first };
    }
    if (isHelpToken(second) && rest.length === 0) {
      return { ok: true, command: 'help', topic: first };
    }
    if (first === 'list') {
      return parseListOptions(argv.slice(1));
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
