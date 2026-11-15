import { parseArgs as parseAiGitSubmitArgs } from '../ai-git-submit/parse-args.js';

export type ParsedSubmitParameters =
  | { ok: true; add: boolean | undefined; push: boolean | undefined }
  | { ok: false; message: string };

export function flattenAiGitSubmitParameters(parameters: readonly string[] | undefined): string[] {
  if (parameters === undefined || parameters.length === 0) {
    return [];
  }
  return parameters.flatMap((item) => item.split(/\s+/).filter((token) => token.length > 0));
}

export function parseSubmitParameters(
  parameters: readonly string[] | undefined,
): ParsedSubmitParameters {
  const argv = flattenAiGitSubmitParameters(parameters);
  const parsed = parseAiGitSubmitArgs(argv);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }
  if (parsed.command === 'help') {
    return {
      ok: false,
      message:
        'ai-git-submit-parameters must be ai-git-submit flags, not help. Run "repos submit --help" for usage.',
    };
  }
  return {
    ok: true,
    add: parsed.add,
    push: parsed.push,
  };
}
