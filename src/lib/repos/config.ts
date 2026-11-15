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
}

export interface RepoSyncSettings {
  repos: readonly RepoEntry[];
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

  const { repos } = parsed as { repos: unknown };
  if (!Array.isArray(repos)) {
    throw new ConfigError('Settings "repos" must be an array.');
  }
  if (repos.length === 0) {
    throw new ConfigError('Settings "repos" must contain at least one entry.');
  }

  const entries: RepoEntry[] = [];
  for (let i = 0; i < repos.length; i++) {
    const item = repos[i];
    if (item === null || typeof item !== 'object' || !('path' in item)) {
      throw new ConfigError(`repos[${i}] must have a string "path".`);
    }
    const record = item as {
      path: unknown;
      environment?: unknown;
      'ssh-host'?: unknown;
    };
    const { path } = record;
    if (typeof path !== 'string' || path.trim() === '') {
      throw new ConfigError(`repos[${i}].path must be a non-empty string.`);
    }

    const environment = parseEnvironment(record.environment, i);
    const sshHost = parseSshHost(record['ssh-host'], environment, i);
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
    entries.push(entry);
  }

  return { repos: entries };
}
