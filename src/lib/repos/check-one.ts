import type { RepoEntry } from './config.js';
import { fetchWithRetry, type FetchWithRetryDeps } from './fetch-retry.js';
import {
  countAheadUpstream,
  countBehindUpstream,
  countCommitsSince,
  countDirtyLines,
  errorMessage,
  getBranchName,
  getUpstreamRef,
  isNetworkError,
  type GitDeps,
} from './git.js';
import { tryBeginRemoteOperation } from './remote-operation-throttle.js';
import { resolveRepoTarget, type ResolveRepoTargetDeps } from './repo-target.js';
import { defaultStatePath, repoStateKey } from './state.js';

export type CheckStatus = 'ok' | 'failed';

export interface CheckOneResult {
  name: string;
  path: string;
  branch: string;
  status: CheckStatus;
  remoteBehind: number;
  localAhead: number;
  dirtyLines: number;
  /** Present when `showCommitCountDays` was set on a successful check. */
  commitCount?: number;
  reason?: string;
}

export interface CheckOneDeps extends FetchWithRetryDeps, ResolveRepoTargetDeps {
  git?: GitDeps;
  accessPath?: (path: string) => Promise<void>;
  showCommitCountDays?: number;
  /** When set, enforces per-repo remote-operation throttling before any remote work. */
  remoteOperationThrottlingSeconds?: number;
  statePath?: string;
  now?: () => Date;
  readStateFile?: (path: string) => string;
  writeStateFile?: (path: string, data: string, encoding: 'utf8') => void;
  mkdirState?: (path: string, options: { recursive: boolean }) => void;
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
  let branch = '';
  let working = entry;
  let git: GitDeps;
  let accessPath: (path: string) => Promise<void>;

  if (deps.remoteOperationThrottlingSeconds !== undefined) {
    const gate = tryBeginRemoteOperation({
      statePath: deps.statePath ?? defaultStatePath(),
      key: repoStateKey(entry),
      throttlingSeconds: deps.remoteOperationThrottlingSeconds,
      ...(deps.now !== undefined ? { now: deps.now } : {}),
      ...(deps.readStateFile !== undefined ? { readFile: deps.readStateFile } : {}),
      ...(deps.writeStateFile !== undefined ? { writeFile: deps.writeStateFile } : {}),
      ...(deps.mkdirState !== undefined ? { mkdir: deps.mkdirState } : {}),
    });
    if (!gate.allowed) {
      return failResult(entry, branch, gate.reason);
    }
  }

  try {
    const resolved = await resolveRepoTarget(entry, deps);
    working = resolved.entry;
    git = resolved.git;
    accessPath = resolved.accessPath;
  } catch (error) {
    return failResult(entry, branch, errorMessage(error));
  }

  try {
    await ensurePathExists(working.path, accessPath);
  } catch (error) {
    return failResult(working, branch, errorMessage(error));
  }

  try {
    branch = await getBranchName(git);
  } catch (error) {
    return failResult(working, branch, `not a git repository: ${errorMessage(error)}`);
  }

  try {
    await getUpstreamRef(git);
  } catch {
    return failResult(working, branch, 'current branch has no upstream');
  }

  try {
    await fetchWithRetry(git, deps);
  } catch (error) {
    return failResult(
      working,
      branch,
      isNetworkError(error) ? `network error: ${errorMessage(error)}` : errorMessage(error),
    );
  }

  try {
    const days = deps.showCommitCountDays;
    const [remoteBehind, localAhead, dirtyLines, commitCount] = await Promise.all([
      countBehindUpstream(git),
      countAheadUpstream(git),
      countDirtyLines(git),
      days === undefined ? Promise.resolve(undefined) : countCommitsSince(git, days),
    ]);

    const result: CheckOneResult = {
      name: working.name,
      path: working.path,
      branch,
      status: 'ok',
      remoteBehind,
      localAhead,
      dirtyLines,
    };
    if (commitCount !== undefined) {
      result.commitCount = commitCount;
    }
    return result;
  } catch (error) {
    return failResult(working, branch, errorMessage(error));
  }
}
