export type ParseSuccess = { ok: true; command: 'help' | 'update' | 'check' };

export type ParseFailure = {
  ok: false;
  reason: 'usage';
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

const HELP_ARGS = new Set(['help', '-h', '--help']);

export function parseArgs(argv: readonly string[]): ParseResult {
  if (argv.length === 0) {
    return { ok: true, command: 'help' };
  }

  const [first, ...rest] = argv;

  if (first !== undefined && HELP_ARGS.has(first)) {
    if (rest.length > 0) {
      return {
        ok: false,
        reason: 'usage',
        message: 'Unexpected arguments. Run "repos --help" for usage.',
      };
    }
    return { ok: true, command: 'help' };
  }

  if (first !== undefined && first.startsWith('-')) {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown option "${first}". Run "repos --help" for usage.`,
    };
  }

  if (first === 'update' || first === 'check') {
    if (rest.length > 0) {
      return {
        ok: false,
        reason: 'usage',
        message: 'Unexpected arguments. Run "repos --help" for usage.',
      };
    }
    return { ok: true, command: first };
  }

  return {
    ok: false,
    reason: 'usage',
    message: `Unknown command "${first}". Run "repos --help" for usage.`,
  };
}
