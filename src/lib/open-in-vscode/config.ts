import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export interface PathConfigEntry {
  path: string;
  alias: string;
}

export interface OpenInVscodeSettings {
  pathConfigs: readonly PathConfigEntry[];
}

export function defaultSettingsPath(home: string = homedir()): string {
  return join(home, '.tfscripts', 'open-in-vscode', 'settings.json');
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

export function tryLoadSettings(deps: LoadSettingsDeps): OpenInVscodeSettings | null {
  const home = deps.home ?? homedir();
  const readFile = deps.readFile ?? ((path) => readFileSync(path, 'utf8'));

  let raw: string;
  try {
    raw = readFile(deps.settingsPath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new ConfigError(`Invalid JSON in settings file: ${deps.settingsPath}`);
  }

  if (parsed === null || typeof parsed !== 'object' || !('path-configs' in parsed)) {
    throw new ConfigError('Settings must include a "path-configs" array.');
  }

  const pathConfigsRaw = (parsed as { 'path-configs': unknown })['path-configs'];
  if (!Array.isArray(pathConfigsRaw)) {
    throw new ConfigError('Settings "path-configs" must be an array.');
  }

  const pathConfigs: PathConfigEntry[] = [];
  const seenAliases = new Set<string>();

  for (let i = 0; i < pathConfigsRaw.length; i++) {
    const item = pathConfigsRaw[i];
    if (item === null || typeof item !== 'object') {
      throw new ConfigError(`path-configs[${i}] must be an object with "path" and "alias".`);
    }

    const record = item as { path?: unknown; alias?: unknown };
    if (typeof record.path !== 'string' || record.path.trim() === '') {
      throw new ConfigError(`path-configs[${i}].path must be a non-empty string.`);
    }
    if (typeof record.alias !== 'string' || record.alias.trim() === '') {
      throw new ConfigError(`path-configs[${i}].alias must be a non-empty string.`);
    }

    const alias = record.alias.trim();
    if (seenAliases.has(alias)) {
      throw new ConfigError(`Duplicate alias "${alias}" in path-configs.`);
    }
    seenAliases.add(alias);

    pathConfigs.push({
      path: expandHome(record.path.trim(), home),
      alias,
    });
  }

  return { pathConfigs };
}

export function resolveOpenPath(pathOrAlias: string, deps: LoadSettingsDeps): string {
  const home = deps.home ?? homedir();
  const settings = tryLoadSettings(deps);
  if (settings !== null) {
    const match = settings.pathConfigs.find((entry) => entry.alias === pathOrAlias);
    if (match !== undefined) {
      return match.path;
    }
  }
  return expandHome(pathOrAlias, home);
}
