import { isHelpToken } from '../../cli/help-args.js';
import { flattenSubmitParameterFragments, parseSubmitFlags } from '../../submit-options/flags.js';

export type ParsedSubmitParameters =
  | {
      ok: true;
      add: boolean | undefined;
      push: boolean | undefined;
      protectMain: boolean | undefined;
    }
  | { ok: false; message: string };

export function flattenAiGitSubmitParameters(parameters: readonly string[] | undefined): string[] {
  return flattenSubmitParameterFragments(parameters);
}

const USAGE_HINT = 'repos submit --help';

export function parseSubmitParameters(
  parameters: readonly string[] | undefined,
): ParsedSubmitParameters {
  const argv = flattenSubmitParameterFragments(parameters);
  if (argv.length === 0) {
    return {
      ok: true,
      add: undefined,
      push: undefined,
      protectMain: undefined,
    };
  }

  const [first] = argv;
  if (isHelpToken(first)) {
    return {
      ok: false,
      message: `ai-git-submit-parameters must be ai-git-submit flags, not help. Run "${USAGE_HINT}" for usage.`,
    };
  }

  if (first !== undefined && !first.startsWith('-')) {
    return {
      ok: false,
      message: `Unexpected token "${first}" in ai-git-submit-parameters. Run "${USAGE_HINT}" for usage.`,
    };
  }

  const parsed = parseSubmitFlags(argv, { usageHint: USAGE_HINT });
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }

  return {
    ok: true,
    add: parsed.add,
    push: parsed.push,
    protectMain: parsed.protectMain,
  };
}
