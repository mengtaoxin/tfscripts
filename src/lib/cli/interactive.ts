export interface CanPromptOptions {
  readonly noInput: boolean;
  /** Defaults to `process.stdin.isTTY === true`. */
  readonly isTTY?: boolean | undefined;
}

export function canPrompt(options: CanPromptOptions): boolean {
  if (options.noInput) {
    return false;
  }
  const isTTY = options.isTTY ?? process.stdin.isTTY === true;
  return isTTY;
}
