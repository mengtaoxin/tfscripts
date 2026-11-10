export const HELP_TOKENS = new Set(['help', '-h', '--help']);

export function isHelpToken(token: string | undefined): boolean {
  return token !== undefined && HELP_TOKENS.has(token);
}
