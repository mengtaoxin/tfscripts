import {
  runAfterUpdateCommands as defaultRunAfterUpdateCommands,
  type AfterUpdateOutcome,
} from '../ops/after-update.js';
import type { RepoEntry, RepoSyncSettings } from '../infra/config.js';
import { formatResultTable, formatSummary } from './format.js';
import { DEFAULT_CONCURRENCY, runRepoBatch } from './run-batch.js';
import { defaultStatePath } from '../infra/state.js';
import { syncOne, type SyncOneResult } from '../ops/sync-one.js';

export { DEFAULT_CONCURRENCY };

export interface RunRepoSyncDeps {
  settingsPath?: string;
  statePath?: string;
  loadSettings?: (path: string) => RepoSyncSettings;
  syncOne?: (entry: RepoEntry) => Promise<SyncOneResult>;
  runAfterUpdateCommands?: (entry: RepoEntry) => Promise<AfterUpdateOutcome>;
  concurrency?: number;
  log?: (line: string) => void;
  error?: (line: string) => void;
  setProgress?: (text: string) => void;
  endProgress?: () => void;
}

export interface RunRepoSyncResult {
  exitCode: number;
  results: readonly SyncOneResult[];
}

function hasAfterUpdateCommands(repos: readonly RepoEntry[]): boolean {
  return repos.some(
    (entry) => entry.afterUpdateCommands !== undefined && entry.afterUpdateCommands.length > 0,
  );
}

async function withAfterUpdate(
  entry: RepoEntry,
  result: SyncOneResult,
  runAfterUpdate: (entry: RepoEntry) => Promise<AfterUpdateOutcome>,
): Promise<SyncOneResult> {
  if (
    result.status !== 'updated' ||
    entry.afterUpdateCommands === undefined ||
    entry.afterUpdateCommands.length === 0
  ) {
    return result;
  }

  const target: RepoEntry = { ...entry, path: result.path };
  try {
    const afterUpdate = await runAfterUpdate(target);
    return { ...result, afterUpdate };
  } catch (error) {
    const shortMessage = error instanceof Error ? error.message : String(error);
    return {
      ...result,
      afterUpdate: {
        kind: 'failed',
        shortMessage: shortMessage.slice(0, 80) || 'command failed',
        logPath: '-',
      },
    };
  }
}

export async function runRepoSync(deps: RunRepoSyncDeps = {}): Promise<RunRepoSyncResult> {
  const log = deps.log ?? ((line) => console.log(line));
  const statePath = deps.statePath ?? defaultStatePath();
  const runAfterUpdate = deps.runAfterUpdateCommands ?? defaultRunAfterUpdateCommands;

  const batch = await runRepoBatch(deps, async (entry, ctx) => {
    const synced = deps.syncOne
      ? await deps.syncOne(entry)
      : await syncOne(entry, {
          remoteHomeCache: ctx.remoteHomeCache,
          remoteOperationThrottlingSeconds: ctx.settings.remoteOperationThrottlingSeconds,
          statePath,
        });
    return withAfterUpdate(entry, synced, runAfterUpdate);
  });

  if (!batch.ok) {
    return { exitCode: batch.exitCode, results: batch.results };
  }

  const showAfterUpdate = hasAfterUpdateCommands(batch.settings.repos);
  for (const line of formatResultTable(
    batch.results,
    showAfterUpdate ? { showAfterUpdate } : undefined,
  )) {
    log(line);
  }
  log(formatSummary(batch.results));

  const failed = batch.results.some((result) => result.status === 'failed');
  return { exitCode: failed ? 1 : 0, results: batch.results };
}
