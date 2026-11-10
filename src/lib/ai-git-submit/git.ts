import { basename } from 'node:path';
import { getBranchNameOrEmpty } from '../git/branch.js';
import {
  defaultExecFileWithStdin,
  execGit,
  type ExecFileFn,
  type ExecFileWithStdinFn,
  type GitDeps,
} from '../git/exec.js';

export type { ExecFileFn, ExecFileWithStdinFn, GitDeps };

const defaultDeps: GitDeps = {};

/** Prefer empty string over throw when HEAD has no branch (matches prior submit UX). */
export async function getBranchName(deps: GitDeps = defaultDeps): Promise<string> {
  return getBranchNameOrEmpty(deps);
}

export async function resolveRepoRoot(deps: GitDeps = defaultDeps): Promise<string> {
  try {
    const { stdout } = await execGit(deps, ['rev-parse', '--show-toplevel']);
    return stdout.trim();
  } catch {
    throw new Error('Not a git repository (or any of the parent directories).');
  }
}

export function getRepoName(repoRoot: string): string {
  return basename(repoRoot);
}

export async function gitAddAll(deps: GitDeps = defaultDeps): Promise<void> {
  await execGit(deps, ['add', '.']);
}

export async function getStagedDiff(deps: GitDeps = defaultDeps): Promise<string> {
  const { stdout } = await execGit(deps, ['diff', '--cached']);
  return stdout;
}

export async function getStagedStat(deps: GitDeps = defaultDeps): Promise<string> {
  const { stdout } = await execGit(deps, ['diff', '--cached', '--stat']);
  return stdout;
}

export async function gitCommitWithMessage(
  message: string,
  deps: GitDeps = defaultDeps,
): Promise<void> {
  const execWithStdin = deps.execFileWithStdin ?? defaultExecFileWithStdin;
  await execWithStdin('git', ['commit', '-F', '-'], message, { cwd: deps.cwd });
}

export async function gitPush(deps: GitDeps = defaultDeps): Promise<void> {
  await execGit(deps, ['push']);
}
