import { execGit, type GitDeps } from './exec.js';

/** Resolves the current branch; throws if git fails. */
export async function getBranchName(deps: GitDeps = {}): Promise<string> {
  const { stdout } = await execGit(deps, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return stdout.trim();
}

/** Resolves the current branch, or `''` when git fails (e.g. empty repo). */
export async function getBranchNameOrEmpty(deps: GitDeps = {}): Promise<string> {
  try {
    return await getBranchName(deps);
  } catch {
    return '';
  }
}
