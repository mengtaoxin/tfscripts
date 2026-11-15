export const COMPLETION_TOKEN = '__complete';

export type ParseCompletionSuccess = { ok: true; words: readonly string[] };
export type ParseCompletionFailure = { ok: false };
export type ParseCompletionResult = ParseCompletionSuccess | ParseCompletionFailure;

/**
 * Parse `<cmd> __complete -- <words...>` argv (without the command name).
 * Words are tokens after the command, including the current (possibly empty) word.
 */
export function parseCompletionArgv(argv: readonly string[]): ParseCompletionResult {
  if (argv[0] !== COMPLETION_TOKEN || argv[1] !== '--') {
    return { ok: false };
  }
  return { ok: true, words: argv.slice(2) };
}

export function isCompletionArgv(argv: readonly string[]): boolean {
  return parseCompletionArgv(argv).ok;
}

export function filterByPrefix(candidates: readonly string[], prefix: string): readonly string[] {
  if (prefix === '') {
    return [...candidates];
  }
  return candidates.filter((candidate) => candidate.startsWith(prefix));
}

/** Print candidates one per line; print nothing when empty. */
export function writeCompletionCandidates(
  candidates: readonly string[],
  write: (text: string) => void = (text) => console.log(text),
): void {
  if (candidates.length === 0) {
    return;
  }
  write(candidates.join('\n'));
}
