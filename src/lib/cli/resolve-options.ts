import { canPrompt } from './interactive.js';

export type DefaultsResult<T> = T | { missing: readonly string[] };

function isMissingResult<T>(result: DefaultsResult<T>): result is { missing: readonly string[] } {
  return typeof result === 'object' && result !== null && 'missing' in result;
}

export type ResolveInteractiveResult<T> =
  | { ok: true; options: T }
  | { ok: false; missing: readonly string[] };

export interface ResolveInteractiveOptionsParams<T> {
  readonly noInput: boolean;
  readonly needsPrompt: boolean;
  readonly prompt: () => Promise<T>;
  readonly applyDefaults: () => DefaultsResult<T>;
  readonly formatInvocation?: (options: T) => string;
  /** Defaults to `console.error`. */
  readonly log?: (message: string) => void;
  /** Forwarded to `canPrompt`; defaults to stdin TTY detection. */
  readonly isTTY?: boolean;
}

/**
 * Hybrid CLI rule: when required pieces are missing and prompting is allowed,
 * run the prompt; otherwise apply defaults (which may report missing flags).
 * After a prompted run, print the equivalent non-interactive invocation.
 */
export async function resolveInteractiveOptions<T>(
  params: ResolveInteractiveOptionsParams<T>,
): Promise<ResolveInteractiveResult<T>> {
  const log = params.log ?? console.error;

  if (params.needsPrompt && canPrompt({ noInput: params.noInput, isTTY: params.isTTY })) {
    const options = await params.prompt();
    if (params.formatInvocation !== undefined) {
      log(`Run this again without prompts:\n  ${params.formatInvocation(options)}`);
    }
    return { ok: true, options };
  }

  const resolved = params.applyDefaults();
  if (isMissingResult(resolved)) {
    return { ok: false, missing: resolved.missing };
  }
  return { ok: true, options: resolved };
}
