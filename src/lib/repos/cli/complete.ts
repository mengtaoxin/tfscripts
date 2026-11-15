import { filterByPrefix } from '../../cli/completion.js';
import { defaultSettingsPath, loadSettings, type RepoSyncSettings } from '../infra/config.js';

const ROOT_ACTIONS = ['update', 'check', 'list', 'submit', 'help'] as const;
const HELP_TOPICS = ['update', 'check', 'list', 'submit'] as const;

export interface CompleteReposDeps {
  settingsPath?: string;
  loadSettings?: (path: string) => RepoSyncSettings;
}

function repoNames(settings: RepoSyncSettings): readonly string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const entry of settings.repos) {
    if (seen.has(entry.name)) {
      continue;
    }
    seen.add(entry.name);
    names.push(entry.name);
  }
  return names;
}

function loadRepoNames(deps: CompleteReposDeps): readonly string[] {
  const settingsPath = deps.settingsPath ?? defaultSettingsPath();
  const load = deps.loadSettings ?? ((path) => loadSettings({ settingsPath: path }));
  try {
    return repoNames(load(settingsPath));
  } catch {
    return [];
  }
}

/**
 * Candidates for `repos __complete -- <words...>`.
 * The last word is the active prefix (may be empty).
 */
export function completeRepos(
  words: readonly string[],
  deps: CompleteReposDeps = {},
): readonly string[] {
  if (words.length === 0) {
    return [...ROOT_ACTIONS];
  }

  const prefix = words[words.length - 1] ?? '';
  const prior = words.slice(0, -1);

  if (prior.length === 0) {
    return filterByPrefix(ROOT_ACTIONS, prefix);
  }

  if (prior.length === 1 && prior[0] === 'help') {
    return filterByPrefix(HELP_TOPICS, prefix);
  }

  if (prior.length === 1 && prior[0] === 'submit') {
    return filterByPrefix(['--name'], prefix);
  }

  if (prior.length === 2 && prior[0] === 'submit' && prior[1] === '--name') {
    return filterByPrefix(loadRepoNames(deps), prefix);
  }

  return [];
}
