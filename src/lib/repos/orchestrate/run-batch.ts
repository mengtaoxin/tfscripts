import {
  defaultSettingsPath,
  loadSettings,
  type RepoEntry,
  type RepoSyncSettings,
} from '../infra/config.js';
import { formatProgressLine } from './format.js';
import { mapPool } from '../infra/pool.js';
import { createStdoutProgress, type ProgressWriter } from '../infra/progress.js';

export const DEFAULT_CONCURRENCY = 3;

export interface RunRepoBatchProgressDeps {
  setProgress?: (text: string) => void;
  endProgress?: () => void;
}

export interface RunRepoBatchDeps extends RunRepoBatchProgressDeps {
  settingsPath?: string;
  loadSettings?: (path: string) => RepoSyncSettings;
  concurrency?: number;
  error?: (line: string) => void;
}

export interface RunRepoBatchContext {
  readonly settings: RepoSyncSettings;
  readonly remoteHomeCache: Map<string, string>;
}

export type RunRepoBatchResult<T> =
  | { ok: false; exitCode: 1; results: readonly [] }
  | { ok: true; settings: RepoSyncSettings; results: readonly T[] };

function resolveProgress(deps: RunRepoBatchProgressDeps): ProgressWriter {
  if (deps.setProgress || deps.endProgress) {
    return {
      set: deps.setProgress ?? (() => undefined),
      end: deps.endProgress ?? (() => undefined),
    };
  }
  return createStdoutProgress();
}

/**
 * Load settings, then map each repo concurrently with shared progress output.
 * Callers own formatting and exit-code policy for domain failures.
 */
export async function runRepoBatch<T>(
  deps: RunRepoBatchDeps,
  processEntry: (entry: RepoEntry, ctx: RunRepoBatchContext) => Promise<T>,
): Promise<RunRepoBatchResult<T>> {
  const error = deps.error ?? ((line) => console.error(line));
  const progress = resolveProgress(deps);
  const settingsPath = deps.settingsPath ?? defaultSettingsPath();
  const load = deps.loadSettings ?? ((path) => loadSettings({ settingsPath: path }));
  const concurrency = deps.concurrency ?? DEFAULT_CONCURRENCY;
  const remoteHomeCache = new Map<string, string>();

  let settings: RepoSyncSettings;
  try {
    settings = load(settingsPath);
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    return { ok: false, exitCode: 1, results: [] };
  }

  const ctx: RunRepoBatchContext = { settings, remoteHomeCache };
  const total = settings.repos.length;
  progress.set(formatProgressLine(0, total));

  let completed = 0;
  const results = await mapPool(settings.repos, concurrency, async (entry) => {
    const result = await processEntry(entry, ctx);
    completed += 1;
    progress.set(formatProgressLine(completed, total));
    return result;
  });

  progress.end();
  return { ok: true, settings, results };
}
