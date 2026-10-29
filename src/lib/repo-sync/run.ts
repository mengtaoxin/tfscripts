import { defaultSettingsPath, loadSettings, type RepoSyncSettings } from './config.js';
import { formatResultLine, formatSummary } from './format.js';
import { mapPool } from './pool.js';
import { syncOne, type SyncOneResult } from './sync-one.js';

export const DEFAULT_CONCURRENCY = 3;

export interface RunRepoSyncDeps {
  settingsPath?: string;
  loadSettings?: (path: string) => RepoSyncSettings;
  syncOne?: (entry: { name: string; path: string }) => Promise<SyncOneResult>;
  concurrency?: number;
  log?: (line: string) => void;
  error?: (line: string) => void;
}

export interface RunRepoSyncResult {
  exitCode: number;
  results: readonly SyncOneResult[];
}

export async function runRepoSync(deps: RunRepoSyncDeps = {}): Promise<RunRepoSyncResult> {
  const log = deps.log ?? ((line) => console.log(line));
  const error = deps.error ?? ((line) => console.error(line));
  const settingsPath = deps.settingsPath ?? defaultSettingsPath();
  const load = deps.loadSettings ?? ((path) => loadSettings({ settingsPath: path }));
  const sync = deps.syncOne ?? ((entry) => syncOne(entry));
  const concurrency = deps.concurrency ?? DEFAULT_CONCURRENCY;

  let settings: RepoSyncSettings;
  try {
    settings = load(settingsPath);
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    return { exitCode: 1, results: [] };
  }

  const results = await mapPool(settings.repos, concurrency, (entry) => sync(entry));

  for (const result of results) {
    log(formatResultLine(result));
  }
  log(formatSummary(results));

  const failed = results.some((result) => result.status === 'failed');
  return { exitCode: failed ? 1 : 0, results };
}
