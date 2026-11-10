/** Asked-for help and successful work. */
export const EXIT_OK = 0;

/** Runtime / domain failure. */
export const EXIT_FAILURE = 1;

/** Usage error: unknown command/flag, bad flag values, missing required input. */
export const EXIT_USAGE = 2;

export function exitCodeForParseFailure(_reason: 'usage' | 'invalid'): number {
  return EXIT_USAGE;
}
