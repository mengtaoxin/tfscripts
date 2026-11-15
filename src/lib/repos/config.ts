import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { homedir } from 'node:os';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export type RepoEnvironment = 'local' | 'ssh';

export interface RepoEntry {
  path: string;
  name: string;
  /** Defaults to local when omitted (e.g. in tests). */
  environment?: RepoEnvironment;
  sshHost?: string;
  /** Optional argv fragments for `repos submit` (ai-git-submit flags). */
  aiGitSubmitParameters?: readonly string[];
}

export const DEFAULT_REMOTE_OPERATION_THROTTLING_SECONDS = 10;

export interface RepoSyncSettings {
  repos: readonly RepoEntry[];
  /** When set, `repos check` shows a COMMITS (Nd) column for the last N days. */
  showCommitCountDays?: number;
  /**
   * Minimum seconds between remote operations per repo (`remote-operation.throttling`).
   * Defaults to {@link DEFAULT_REMOTE_OPERATION_THROTTLING_SECONDS}.
   */
  remoteOperationThrottlingSeconds: number;
}

export function defaultSettingsPath(home: string = homedir()): string {
  return join(home, '.tfscripts', 'repos', 'settings.json');
}

function expandHome(path: string, home: string): string {
  if (path === '~') {
    return home;
  }
  if (path.startsWith('~/') || path.startsWith('~\\')) {
    return join(home, path.slice(2));
  }
  return path;
}

export interface LoadSettingsDeps {
  settingsPath: string;
  home?: string;
  readFile?: (path: string) => string;
}

function parseEnvironment(raw: unknown, index: number): RepoEnvironment {
  if (raw === undefined) {
    return 'local';
  }
  if (raw !== 'local' && raw !== 'ssh') {
    throw new ConfigError(`repos[${index}].environment must be "local" or "ssh".`);
  }
  return raw;
}

function parseSshHost(
  raw: unknown,
  environment: RepoEnvironment,
  index: number,
): string | undefined {
  if (raw === undefined) {
    if (environment === 'ssh') {
      throw new ConfigError(`repos[${index}].ssh-host is required when environment is "ssh".`);
    }
    return undefined;
  }
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new ConfigError(`repos[${index}].ssh-host must be a non-empty string.`);
  }
  if (environment !== 'ssh') {
    throw new ConfigError(`repos[${index}].ssh-host is only valid when environment is "ssh".`);
  }
  return raw.trim();
}

function parseAiGitSubmitParameters(raw: unknown, index: number): readonly string[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    throw new ConfigError(
      `repos[${index}].ai-git-submit-parameters must be an array of non-empty strings.`,
    );
  }
  const values: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new ConfigError(
        `repos[${index}].ai-git-submit-parameters must be an array of non-empty strings.`,
      );
    }
    values.push(item.trim());
  }
  return values;
}

const SHOW_COMMIT_COUNT_KEY = 'list.show-commit-count';
const REMOTE_OPERATION_THROTTLING_KEY = 'remote-operation.throttling';

function parseShowCommitCountDays(raw: unknown): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
    throw new ConfigError(`${SHOW_COMMIT_COUNT_KEY} must be a positive integer.`);
  }
  return raw;
}

function parseRemoteOperationThrottlingSeconds(raw: unknown): number {
  if (raw === undefined) {
    return DEFAULT_REMOTE_OPERATION_THROTTLING_SECONDS;
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
    throw new ConfigError(`${REMOTE_OPERATION_THROTTLING_KEY} must be a positive integer.`);
  }
  return raw;
}

export function loadSettings(deps: LoadSettingsDeps): RepoSyncSettings {
  const home = deps.home ?? homedir();
  const readFile = deps.readFile ?? ((path) => readFileSync(path, 'utf8'));

  let raw: string;
  try {
    raw = readFile(deps.settingsPath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new ConfigError(
        `Settings file not found: ${deps.settingsPath}. Create ~/.tfscripts/repos/settings.json with a "repos" list.`,
      );
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new ConfigError(`Invalid JSON in settings file: ${deps.settingsPath}`);
  }

  if (parsed === null || typeof parsed !== 'object' || !('repos' in parsed)) {
    throw new ConfigError('Settings must include a "repos" array.');
  }

  const record = parsed as {
    repos: unknown;
    [SHOW_COMMIT_COUNT_KEY]?: unknown;
    [REMOTE_OPERATION_THROTTLING_KEY]?: unknown;
  };
  const { repos } = record;
  if (!Array.isArray(repos)) {
    throw new ConfigError('Settings "repos" must be an array.');
  }
  if (repos.length === 0) {
    throw new ConfigError('Settings "repos" must contain at least one entry.');
  }

  const showCommitCountDays = parseShowCommitCountDays(record[SHOW_COMMIT_COUNT_KEY]);
  const remoteOperationThrottlingSeconds = parseRemoteOperationThrottlingSeconds(
    record[REMOTE_OPERATION_THROTTLING_KEY],
  );

  const entries: RepoEntry[] = [];
  for (let i = 0; i < repos.length; i++) {
    const item = repos[i];
    if (item === null || typeof item !== 'object' || !('path' in item)) {
      throw new ConfigError(`repos[${i}] must have a string "path".`);
    }
    const repoRecord = item as {
      path: unknown;
      environment?: unknown;
      'ssh-host'?: unknown;
      'ai-git-submit-parameters'?: unknown;
    };
    const { path } = repoRecord;
    if (typeof path !== 'string' || path.trim() === '') {
      throw new ConfigError(`repos[${i}].path must be a non-empty string.`);
    }

    const environment = parseEnvironment(repoRecord.environment, i);
    const sshHost = parseSshHost(repoRecord['ssh-host'], environment, i);
    const aiGitSubmitParameters = parseAiGitSubmitParameters(
      repoRecord['ai-git-submit-parameters'],
      i,
    );
    const trimmedPath = path.trim();
    const resolvedPath = environment === 'ssh' ? trimmedPath : expandHome(trimmedPath, home);

    const entry: RepoEntry = {
      path: resolvedPath,
      name: basename(resolvedPath),
      environment,
    };
    if (sshHost !== undefined) {
      entry.sshHost = sshHost;
    }
    if (aiGitSubmitParameters !== undefined) {
      entry.aiGitSubmitParameters = aiGitSubmitParameters;
    }
    entries.push(entry);
  }

  const settings: RepoSyncSettings = {
    repos: entries,
    remoteOperationThrottlingSeconds,
  };
  if (showCommitCountDays !== undefined) {
    settings.showCommitCountDays = showCommitCountDays;
  }
  return settings;
}
