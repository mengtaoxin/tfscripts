import {
  defaultSettingsPath,
  loadSettings,
  type RepoEntry,
  type RepoSyncSettings,
} from '../infra/config.js';
import { submitOne, type SubmitOneDeps } from '../ops/submit-one.js';

export interface RunRepoSubmitOptions {
  name: string;
}

export interface RunRepoSubmitDeps extends SubmitOneDeps {
  settingsPath?: string;
  loadSettings?: (path: string) => RepoSyncSettings;
  submitOne?: (entry: RepoEntry, deps?: SubmitOneDeps) => Promise<number>;
  error?: (line: string) => void;
}

export interface RunRepoSubmitResult {
  exitCode: number;
}

export async function runRepoSubmit(
  options: RunRepoSubmitOptions,
  deps: RunRepoSubmitDeps = {},
): Promise<RunRepoSubmitResult> {
  const error = deps.error ?? ((line) => console.error(line));
  const settingsPath = deps.settingsPath ?? defaultSettingsPath();
  const load = deps.loadSettings ?? ((path) => loadSettings({ settingsPath: path }));
  const submit = deps.submitOne ?? submitOne;

  let settings: RepoSyncSettings;
  try {
    settings = load(settingsPath);
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    return { exitCode: 1 };
  }

  const matches = settings.repos.filter((entry) => entry.name === options.name);
  if (matches.length === 0) {
    error(`No repo named "${options.name}" in settings.`);
    return { exitCode: 1 };
  }
  if (matches.length > 1) {
    error(`Multiple repos named "${options.name}" in settings; names must be unique.`);
    return { exitCode: 1 };
  }

  const entry = matches[0]!;
  const remoteHomeCache = deps.remoteHomeCache ?? new Map<string, string>();
  const exitCode = await submit(entry, {
    ...deps,
    remoteHomeCache,
    error,
  });
  return { exitCode };
}
