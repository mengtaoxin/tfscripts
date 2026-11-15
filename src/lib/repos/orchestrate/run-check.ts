import type { RepoEntry, RepoSyncSettings } from '../infra/config.js';
import { checkOne, type CheckOneResult } from '../ops/check-one.js';
import { formatCheckTable } from './format.js';
import { DEFAULT_CONCURRENCY, runRepoBatch } from './run-batch.js';
import { defaultStatePath } from '../infra/state.js';

export { DEFAULT_CONCURRENCY };

export interface RunRepoCheckDeps {
  settingsPath?: string;
  statePath?: string;
  loadSettings?: (path: string) => RepoSyncSettings;
  checkOne?: (
    entry: RepoEntry,
    options?: { showCommitCountDays?: number },
  ) => Promise<CheckOneResult>;
  concurrency?: number;
  log?: (line: string) => void;
  error?: (line: string) => void;
  setProgress?: (text: string) => void;
  endProgress?: () => void;
}

export interface RunRepoCheckResult {
  exitCode: number;
  results: readonly CheckOneResult[];
}

export async function runRepoCheck(deps: RunRepoCheckDeps = {}): Promise<RunRepoCheckResult> {
  const log = deps.log ?? ((line) => console.log(line));
  const statePath = deps.statePath ?? defaultStatePath();

  const batch = await runRepoBatch(deps, async (entry, ctx) => {
    const showCommitCountDays = ctx.settings.showCommitCountDays;
    const checkOptions = showCommitCountDays === undefined ? undefined : { showCommitCountDays };
    if (deps.checkOne) {
      return deps.checkOne(entry, checkOptions);
    }
    return checkOne(entry, {
      remoteHomeCache: ctx.remoteHomeCache,
      remoteOperationThrottlingSeconds: ctx.settings.remoteOperationThrottlingSeconds,
      statePath,
      ...(showCommitCountDays !== undefined ? { showCommitCountDays } : {}),
    });
  });

  if (!batch.ok) {
    return { exitCode: batch.exitCode, results: batch.results };
  }

  const showCommitCountDays = batch.settings.showCommitCountDays;
  for (const line of formatCheckTable(
    batch.results,
    showCommitCountDays === undefined ? undefined : { showCommitCountDays },
  )) {
    log(line);
  }

  const failed = batch.results.some((result) => result.status === 'failed');
  return { exitCode: failed ? 1 : 0, results: batch.results };
}
