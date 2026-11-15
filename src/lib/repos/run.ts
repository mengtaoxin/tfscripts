import {
  runAfterUpdateCommands as defaultRunAfterUpdateCommands,
  type AfterUpdateOutcome,
} from './after-update.js';
import {
  defaultSettingsPath,
  loadSettings,
  type RepoEntry,
  type RepoSyncSettings,
} from './config.js';
import { formatProgressLine, formatResultTable, formatSummary } from './format.js';
import { mapPool } from './pool.js';
import { createStdoutProgress, type ProgressWriter } from './progress.js';
import { defaultStatePath } from './state.js';
import { syncOne, type SyncOneResult } from './sync-one.js';

export const DEFAULT_CONCURRENCY = 3;

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

function resolveProgress(deps: RunRepoSyncDeps): ProgressWriter {
  if (deps.setProgress || deps.endProgress) {
    return {
      set: deps.setProgress ?? (() => undefined),
      end: deps.endProgress ?? (() => undefined),
    };
  }
  return createStdoutProgress();
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
  const error = deps.error ?? ((line) => console.error(line));
  const progress = resolveProgress(deps);
  const settingsPath = deps.settingsPath ?? defaultSettingsPath();
  const statePath = deps.statePath ?? defaultStatePath();
  const load = deps.loadSettings ?? ((path) => loadSettings({ settingsPath: path }));
  const remoteHomeCache = new Map<string, string>();
  const concurrency = deps.concurrency ?? DEFAULT_CONCURRENCY;
  const runAfterUpdate = deps.runAfterUpdateCommands ?? defaultRunAfterUpdateCommands;

  let settings: RepoSyncSettings;
  try {
    settings = load(settingsPath);
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    return { exitCode: 1, results: [] };
  }

  const sync =
    deps.syncOne ??
    ((entry) =>
      syncOne(entry, {
        remoteHomeCache,
        remoteOperationThrottlingSeconds: settings.remoteOperationThrottlingSeconds,
        statePath,
      }));

  const total = settings.repos.length;
  progress.set(formatProgressLine(0, total));

  let completed = 0;
  const results = await mapPool(settings.repos, concurrency, async (entry) => {
    const synced = await sync(entry);
    const result = await withAfterUpdate(entry, synced, runAfterUpdate);
    completed += 1;
    progress.set(formatProgressLine(completed, total));
    return result;
  });

  progress.end();

  const showAfterUpdate = hasAfterUpdateCommands(settings.repos);
  for (const line of formatResultTable(
    results,
    showAfterUpdate ? { showAfterUpdate } : undefined,
  )) {
    log(line);
  }
  log(formatSummary(results));

  const failed = results.some((result) => result.status === 'failed');
  return { exitCode: failed ? 1 : 0, results };
}
