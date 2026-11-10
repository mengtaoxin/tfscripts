import { defaultSettingsPath, loadSettings, type RepoSyncSettings } from './config.js';
import { formatListTable } from './format.js';

export interface RunRepoListDeps {
  settingsPath?: string;
  loadSettings?: (path: string) => RepoSyncSettings;
  log?: (line: string) => void;
  error?: (line: string) => void;
}

export interface RunRepoListResult {
  exitCode: number;
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

  for (const line of formatListTable(settings.repos)) {
    log(line);
  }

  return { exitCode: 0 };
}
