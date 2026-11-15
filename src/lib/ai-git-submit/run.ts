import type { AiGitSubmitConfig } from './config.js';
import { resolveConfig } from './config.js';
import { createRandomAlphanumeric, formatFeatureBranchName } from './feature-branch-name.js';
import {
  getBranchName,
  getRepoName,
  getStagedDiff,
  getStagedStat,
  gitAddAll,
  gitCheckoutNewBranch,
  gitCommitWithMessage,
  gitPush,
  resolveRepoRoot,
  type GitDeps,
} from './git.js';
import { generateCommitMessage, type GenerateCommitMessageDeps } from './llm.js';
import { withExponentialBackoff } from '../retry-policy/backoff.js';
import { isNetworkError } from '../retry-policy/network-error.js';

const PROTECTED_BRANCHES = new Set(['main', 'master']);

export interface SubmitOptions {
  add: boolean;
  push: boolean;
  protectMain: boolean;
}

export interface RunSubmitDeps {
  git?: GitDeps;
  resolveConfigFn?: typeof resolveConfig;
  generateCommitMessageFn?: typeof generateCommitMessage;
  llm?: GenerateCommitMessageDeps;
  log?: (message: string) => void;
  error?: (message: string) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  randomBytes?: (size: number) => Buffer;
}

export interface RunSubmitResult {
  exitCode: number;
  commitMessage?: string;
}

export async function runSubmit(
  options: SubmitOptions,
  deps: RunSubmitDeps = {},
): Promise<RunSubmitResult> {
  const log = deps.log ?? console.log;
  const error = deps.error ?? console.error;
  const gitDeps = deps.git ?? {};
  const resolveConfigFn = deps.resolveConfigFn ?? resolveConfig;
  const generateFn = deps.generateCommitMessageFn ?? generateCommitMessage;

  let repoRoot: string;
  try {
    repoRoot = await resolveRepoRoot(gitDeps);
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    return { exitCode: 1 };
  }

  const git: GitDeps = { ...gitDeps, cwd: gitDeps.cwd ?? repoRoot };

  let config: AiGitSubmitConfig;
  try {
    config = resolveConfigFn({ repoRoot });
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    return { exitCode: 1 };
  }

  if (options.add) {
    log('Running git add . ...');
    try {
      await gitAddAll(git);
    } catch (err) {
      error(`git add failed: ${err instanceof Error ? err.message : String(err)}`);
      return { exitCode: 1 };
    }
  }

  let stagedDiff: string;
  let stagedStat: string;
  let branchName: string;
  try {
    [stagedDiff, stagedStat, branchName] = await Promise.all([
      getStagedDiff(git),
      getStagedStat(git),
      getBranchName(git),
    ]);
  } catch (err) {
    error(`Failed to read git state: ${err instanceof Error ? err.message : String(err)}`);
    return { exitCode: 1 };
  }

  let createdProtectBranch = false;
  if (options.protectMain && PROTECTED_BRANCHES.has(branchName)) {
    const now = deps.now?.() ?? new Date();
    const randomStr = createRandomAlphanumeric(5, deps.randomBytes);
    const featureBranch = formatFeatureBranchName(now, randomStr);
    log(`Protecting ${branchName}: creating branch ${featureBranch}...`);
    try {
      await gitCheckoutNewBranch(featureBranch, git);
    } catch (err) {
      error(`git checkout failed: ${err instanceof Error ? err.message : String(err)}`);
      return { exitCode: 1 };
    }
    branchName = featureBranch;
    createdProtectBranch = true;
  }

  if (stagedDiff.trim() === '') {
    error('No staged changes to commit.');
    return { exitCode: 1 };
  }

  const context = {
    repositoryName: getRepoName(repoRoot),
    branchName,
    stagedStat,
    stagedDiff,
  };

  log('Generating commit message...');
  let commitMessage: string;
  try {
    commitMessage = await withExponentialBackoff(() => generateFn(context, config, deps.llm), {
      maxRetries: config.maxRetries,
      baseMs: config.retryBaseMs,
      sleep: deps.sleep,
      shouldRetry: isNetworkError,
      onRetry: ({ attempt, delayMs }) => {
        log(`LLM request failed (attempt ${attempt + 1}); retrying in ${delayMs}ms...`);
      },
    });
  } catch (err) {
    error(`Failed to generate commit message: ${err instanceof Error ? err.message : String(err)}`);
    return { exitCode: 1 };
  }

  log('');
  log('Commit message:');
  log(commitMessage);
  log('');

  try {
    await gitCommitWithMessage(commitMessage, git);
    log('Commit created.');
  } catch (err) {
    error(`git commit failed: ${err instanceof Error ? err.message : String(err)}`);
    return { exitCode: 1 };
  }

  if (options.push) {
    log('Pushing...');
    try {
      await withExponentialBackoff(
        () => gitPush(git, createdProtectBranch ? { setUpstream: true } : {}),
        {
          maxRetries: config.maxRetries,
          baseMs: config.retryBaseMs,
          sleep: deps.sleep,
          shouldRetry: isNetworkError,
          onRetry: ({ attempt, delayMs }) => {
            log(`git push failed (attempt ${attempt + 1}); retrying in ${delayMs}ms...`);
          },
        },
      );
      log('Push succeeded.');
    } catch (err) {
      error(`git push failed: ${err instanceof Error ? err.message : String(err)}`);
      return { exitCode: 1 };
    }
  }

  return { exitCode: 0, commitMessage };
}
