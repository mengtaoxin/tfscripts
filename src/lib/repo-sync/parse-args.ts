export type ParseSuccess = { ok: true; command: 'sync' | 'help' };

export type ParseFailure = {
  ok: false;
  reason: 'usage';
  message: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

export function parseArgs(argv: readonly string[]): ParseResult {
  if (argv.length === 0) {
    return { ok: true, command: 'sync' };
  }

  const [first] = argv;

  if (first === 'help' || first === '-h' || first === '--help') {
    return { ok: true, command: 'help' };
  }

  if (first !== undefined && first.startsWith('-')) {
    return {
      ok: false,
      reason: 'usage',
      message: `Unknown option "${first}". Run "repo-sync help" for usage.`,
    };
  }

  return {
    ok: false,
    reason: 'usage',
    message: `Unknown command "${first}". Run "repo-sync help" for usage.`,
  };
}
