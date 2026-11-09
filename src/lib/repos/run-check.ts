import { defaultSettingsPath, loadSettings, type RepoSyncSettings } from './config.js';
import { checkOne, type CheckOneResult } from './check-one.js';
import { formatCheckTable, formatProgressLine } from './format.js';
import { mapPool } from './pool.js';
import { createStdoutProgress, type ProgressWriter } from './progress.js';

export const DEFAULT_CONCURRENCY = 3;

export interface RunRepoCheckDeps {
  settingsPath?: string;
  loadSettings?: (path: string) => RepoSyncSettings;
  checkOne?: (entry: { name: string; path: string }) => Promise<CheckOneResult>;
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

function resolveProgress(deps: RunRepoCheckDeps): ProgressWriter {
  if (deps.setProgress || deps.endProgress) {
    return {
      set: deps.setProgress ?? (() => undefined),
      end: deps.endProgress ?? (() => undefined),
    };
  }
  return createStdoutProgress();
}

export async function runRepoCheck(deps: RunRepoCheckDeps = {}): Promise<RunRepoCheckResult> {
  const log = deps.log ?? ((line) => console.log(line));
  const error = deps.error ?? ((line) => console.error(line));
  const progress = resolveProgress(deps);
  const settingsPath = deps.settingsPath ?? defaultSettingsPath();
  const load = deps.loadSettings ?? ((path) => loadSettings({ settingsPath: path }));
  const check = deps.checkOne ?? ((entry) => checkOne(entry));
  const concurrency = deps.concurrency ?? DEFAULT_CONCURRENCY;

  let settings: RepoSyncSettings;
  try {
    settings = load(settingsPath);
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    return { exitCode: 1, results: [] };
  }

  const total = settings.repos.length;
  progress.set(formatProgressLine(0, total));

  let completed = 0;
  const results = await mapPool(settings.repos, concurrency, async (entry) => {
    const result = await check(entry);
    completed += 1;
    progress.set(formatProgressLine(completed, total));
    return result;
  });

  progress.end();

  for (const line of formatCheckTable(results)) {
    log(line);
  }

  const failed = results.some((result) => result.status === 'failed');
  return { exitCode: failed ? 1 : 0, results };
}
