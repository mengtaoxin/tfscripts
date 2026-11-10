import { isHelpToken } from '../cli/help-args.js';

export type RepoAction = 'update' | 'check' | 'list';

export type ParseSuccess =
  | { ok: true; command: 'help'; topic?: RepoAction }
  | { ok: true; command: RepoAction };

export type ParseFailure = {
  ok: false;
  reason: 'usage';
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

const ACTIONS = new Set<string>(['update', 'check', 'list']);

function isAction(token: string): token is RepoAction {
  return ACTIONS.has(token);
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
      return { ok: true, command: first };
    }
    if (isHelpToken(second) && rest.length === 0) {
      return { ok: true, command: 'help', topic: first };
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
