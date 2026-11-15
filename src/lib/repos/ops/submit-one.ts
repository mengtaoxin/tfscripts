import { EXIT_USAGE } from '../../cli/exit-codes.js';
import { executeSubmit, type ExecuteSubmitDeps } from '../../ai-git-submit/execute.js';
import type { RepoEntry } from '../infra/config.js';
import { errorMessage } from '../infra/git.js';
import { parseSubmitParameters } from '../cli/parse-submit-parameters.js';
import { resolveRepoTarget, type ResolveRepoTargetDeps } from '../infra/repo-target.js';

export interface SubmitOneDeps extends ResolveRepoTargetDeps {
  executeSubmitFn?: (
    input: Parameters<typeof executeSubmit>[0],
    deps?: ExecuteSubmitDeps,
  ) => Promise<number>;
  error?: (message: string) => void;
}

async function ensurePathExists(
  path: string,
  accessPath: (path: string) => Promise<void>,
): Promise<void> {
  try {
    await accessPath(path);
  } catch {
    throw new Error(`path does not exist: ${path}`);
  }
}

export async function submitOne(entry: RepoEntry, deps: SubmitOneDeps = {}): Promise<number> {
  const error = deps.error ?? console.error;
  const execute = deps.executeSubmitFn ?? executeSubmit;

  const parsed = parseSubmitParameters(entry.aiGitSubmitParameters);
  if (!parsed.ok) {
    error(parsed.message);
    return EXIT_USAGE;
  }

  let resolved;
  try {
    resolved = await resolveRepoTarget(entry, deps);
  } catch (err) {
    error(errorMessage(err));
    return 1;
  }

  try {
    await ensurePathExists(resolved.entry.path, resolved.accessPath);
  } catch (err) {
    error(errorMessage(err));
    return 1;
  }

  return execute(
    {
      add: parsed.add,
      push: parsed.push,
      protectMain: parsed.protectMain,
      noInput: true,
    },
    {
      git: resolved.git,
      error,
      isTTY: false,
    },
  );
}
