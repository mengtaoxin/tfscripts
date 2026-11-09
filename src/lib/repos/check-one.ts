import { access } from 'node:fs/promises';
import type { RepoEntry } from './config.js';
import { fetchWithRetry, type FetchWithRetryDeps } from './fetch-retry.js';
import {
  countAheadUpstream,
  countBehindUpstream,
  countDirtyLines,
  errorMessage,
  getBranchName,
  getUpstreamRef,
  isNetworkError,
  type GitDeps,
} from './git.js';

export type CheckStatus = 'ok' | 'failed';

export interface CheckOneResult {
  name: string;
  path: string;
  branch: string;
  status: CheckStatus;
  remoteBehind: number;
  localAhead: number;
  dirtyLines: number;
  reason?: string;
}

export interface CheckOneDeps extends FetchWithRetryDeps {
  git?: GitDeps;
  accessPath?: (path: string) => Promise<void>;
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

function failResult(entry: RepoEntry, branch: string, reason: string): CheckOneResult {
  return {
    name: entry.name,
    path: entry.path,
    branch,
    status: 'failed',
    remoteBehind: 0,
    localAhead: 0,
    dirtyLines: 0,
    reason,
  };
}

export async function checkOne(entry: RepoEntry, deps: CheckOneDeps = {}): Promise<CheckOneResult> {
  const accessPath = deps.accessPath ?? ((path) => access(path));
  const git: GitDeps = { ...deps.git, cwd: deps.git?.cwd ?? entry.path };
  let branch = '';

  try {
    await ensurePathExists(entry.path, accessPath);
  } catch (error) {
    return failResult(entry, branch, errorMessage(error));
  }

  try {
    branch = await getBranchName(git);
  } catch (error) {
    return failResult(entry, branch, `not a git repository: ${errorMessage(error)}`);
  }

  try {
    await getUpstreamRef(git);
  } catch {
    return failResult(entry, branch, 'current branch has no upstream');
  }

  try {
    await fetchWithRetry(git, deps);
  } catch (error) {
    return failResult(
      entry,
      branch,
      isNetworkError(error) ? `network error: ${errorMessage(error)}` : errorMessage(error),
    );
  }

  try {
    const [remoteBehind, localAhead, dirtyLines] = await Promise.all([
      countBehindUpstream(git),
      countAheadUpstream(git),
      countDirtyLines(git),
    ]);

    return {
      name: entry.name,
      path: entry.path,
      branch,
      status: 'ok',
      remoteBehind,
      localAhead,
      dirtyLines,
    };
  } catch (error) {
    return failResult(entry, branch, errorMessage(error));
  }
}
