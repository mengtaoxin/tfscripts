export type ParseSuccess =
  | { ok: true; command: 'help' }
  | { ok: true; command: 'retry'; mode: 'interactive' };

export type ParseFailure = {
  ok: false;
  reason: 'usage';
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

const HELP_ARGS = new Set(['help', '-h', '--help']);

export function parseArgs(argv: readonly string[]): ParseResult {
  if (argv.length === 0) {
    return { ok: true, command: 'retry', mode: 'interactive' };
  }

  const first = argv[0];
  if (argv.length === 1 && first !== undefined && HELP_ARGS.has(first)) {
    return { ok: true, command: 'help' };
  }

  return {
    ok: false,
    reason: 'usage',
    message: 'Unexpected arguments. Run "retry help" for usage.',
  };
}
