import { EXIT_USAGE } from '../cli/exit-codes.js';
import { resolveInteractiveOptions } from '../cli/resolve-options.js';
import { resolveRepoRoot, type GitDeps } from './git.js';
import {
  applySubmitDefaults,
  formatSubmitInvocation,
  promptSubmitOptions,
  type PromptSubmitOptionsDeps,
  type PromptSubmitPresets,
} from './prompts.js';
import { runSubmit, type RunSubmitDeps, type RunSubmitResult, type SubmitOptions } from './run.js';

export interface ExecuteSubmitInput {
  readonly add?: boolean | undefined;
  readonly push?: boolean | undefined;
  readonly protectMain?: boolean | undefined;
  readonly noInput: boolean;
}

export interface ExecuteSubmitDeps {
  readonly git?: GitDeps;
  readonly resolveRepoRootFn?: (deps?: GitDeps) => Promise<string>;
  readonly promptSubmitOptionsFn?: (
    presets?: PromptSubmitPresets,
    promptDeps?: PromptSubmitOptionsDeps,
  ) => Promise<SubmitOptions>;
  readonly runSubmitFn?: (options: SubmitOptions, deps?: RunSubmitDeps) => Promise<RunSubmitResult>;
  readonly runSubmitDeps?: RunSubmitDeps;
  readonly error?: (message: string) => void;
  readonly isTTY?: boolean;
}

export async function executeSubmit(
  input: ExecuteSubmitInput,
  deps: ExecuteSubmitDeps = {},
): Promise<number> {
  const error = deps.error ?? console.error;
  const resolveRepoRootFn = deps.resolveRepoRootFn ?? resolveRepoRoot;
  const gitDeps = deps.git ?? {};

  try {
    await resolveRepoRootFn(gitDeps);
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    return 1;
  }

  const presets: PromptSubmitPresets = {
    add: input.add,
    push: input.push,
    protectMain: input.protectMain,
  };
  const promptFn = deps.promptSubmitOptionsFn ?? promptSubmitOptions;

  const resolved = await resolveInteractiveOptions({
    noInput: input.noInput,
    needsPrompt:
      presets.add === undefined || presets.push === undefined || presets.protectMain === undefined,
    prompt: () => promptFn(presets),
    applyDefaults: () => applySubmitDefaults(presets),
    formatInvocation: formatSubmitInvocation,
    isTTY: deps.isTTY,
  });

  if (!resolved.ok) {
    error(
      `Missing required option${resolved.missing.length > 1 ? 's' : ''}: ${resolved.missing.join(', ')}.`,
    );
    error('Run "ai-git-submit help" for usage.');
    return EXIT_USAGE;
  }

  const run = deps.runSubmitFn ?? runSubmit;
  const result = await run(resolved.options, {
    ...deps.runSubmitDeps,
    git: deps.git ?? deps.runSubmitDeps?.git,
  });
  return result.exitCode;
}
