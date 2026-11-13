import { access } from 'node:fs/promises';
import {
  defaultSettingsPath,
  loadSettings,
  type RepoEntry,
  type RepoSyncSettings,
} from './config.js';
import { formatListTable } from './format.js';
import { countCommitsSince as countCommitsSinceGit, type GitDeps } from './git.js';
import { mapPool } from './pool.js';

export const DEFAULT_LIST_CONCURRENCY = 3;

export interface RunRepoListDeps {
  settingsPath?: string;
  loadSettings?: (path: string) => RepoSyncSettings;
  showCommitCountDays?: number;
  countCommitsSince?: (entry: RepoEntry, days: number) => Promise<number | null>;
  concurrency?: number;
  git?: GitDeps;
  accessPath?: (path: string) => Promise<void>;
  log?: (line: string) => void;
  error?: (line: string) => void;
}

export interface RunRepoListResult {
  exitCode: number;
}

async function defaultCountCommitsSince(
  entry: RepoEntry,
  days: number,
  deps: { git?: GitDeps; accessPath?: (path: string) => Promise<void> },
): Promise<number | null> {
  const accessPath = deps.accessPath ?? ((path) => access(path));
  try {
    await accessPath(entry.path);
  } catch {
    return null;
  }

  try {
    return await countCommitsSinceGit({ ...deps.git, cwd: entry.path }, days);
  } catch {
    return null;
  }
}

export async function runRepoList(deps: RunRepoListDeps = {}): Promise<RunRepoListResult> {
  const log = deps.log ?? ((line) => console.log(line));
  const error = deps.error ?? ((line) => console.error(line));
  const settingsPath = deps.settingsPath ?? defaultSettingsPath();
  const load = deps.loadSettings ?? ((path) => loadSettings({ settingsPath: path }));

  let settings: RepoSyncSettings;
  try {
    settings = load(settingsPath);
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    return { exitCode: 1 };
  }

  const days = deps.showCommitCountDays;
  if (days === undefined) {
    for (const line of formatListTable(settings.repos)) {
      log(line);
    }
    return { exitCode: 0 };
  }

  const count =
    deps.countCommitsSince ??
    ((entry, showDays) =>
      defaultCountCommitsSince(entry, showDays, { git: deps.git, accessPath: deps.accessPath }));
  const concurrency = deps.concurrency ?? DEFAULT_LIST_CONCURRENCY;

  const commitCounts = await mapPool(settings.repos, concurrency, async (entry) =>
    count(entry, days),
  );

  for (const line of formatListTable(settings.repos, {
    showCommitCountDays: days,
    commitCounts,
  })) {
    log(line);
  }

  return { exitCode: 0 };
}
