import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadDotenv } from 'dotenv';

export interface AiGitSubmitConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxRetries: number;
  retryBaseMs: number;
}

export const CONFIG_DEFAULTS = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  maxInputTokens: 8000,
  maxOutputTokens: 1024,
  maxRetries: 3,
  retryBaseMs: 500,
} as const;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export interface ResolveConfigOptions {
  repoRoot: string;
  /** Mutable env map used for resolution (defaults to process.env). */
  env?: NodeJS.ProcessEnv;
  /** Load repo `.env` into `env` with project values winning (dotenv override). */
  loadEnvFile?: (envPath: string, env: NodeJS.ProcessEnv) => void;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  if (!/^\d+$/.test(raw.trim())) {
    throw new ConfigError(`Invalid integer config value: "${raw}"`);
  }
  const value = Number(raw.trim());
  if (!Number.isInteger(value) || value < 1) {
    throw new ConfigError(`Config value must be a positive integer: "${raw}"`);
  }
  return value;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export function defaultLoadEnvFile(envPath: string, env: NodeJS.ProcessEnv): void {
  if (!existsSync(envPath)) {
    return;
  }
  // Project `.env` must win over existing user/system env vars.
  loadDotenv({ path: envPath, override: true, processEnv: env });
}

export function resolveConfig(options: ResolveConfigOptions): AiGitSubmitConfig {
  const env = options.env ?? process.env;
  const loadEnvFile = options.loadEnvFile ?? defaultLoadEnvFile;

  loadEnvFile(join(options.repoRoot, '.env'), env);

  const apiKey = env.AI_GIT_SUBMIT_API_KEY?.trim() ?? '';
  if (apiKey === '') {
    throw new ConfigError(
      'Missing AI_GIT_SUBMIT_API_KEY. Set it in the repo .env or the environment.',
    );
  }

  const baseUrlRaw = env.AI_GIT_SUBMIT_BASE_URL?.trim() || CONFIG_DEFAULTS.baseUrl;
  const model = env.AI_GIT_SUBMIT_MODEL?.trim() || CONFIG_DEFAULTS.model;

  return {
    apiKey,
    baseUrl: normalizeBaseUrl(baseUrlRaw),
    model,
    maxInputTokens: parsePositiveInt(
      env.AI_GIT_SUBMIT_MAX_INPUT_TOKENS,
      CONFIG_DEFAULTS.maxInputTokens,
    ),
    maxOutputTokens: parsePositiveInt(
      env.AI_GIT_SUBMIT_MAX_OUTPUT_TOKENS,
      CONFIG_DEFAULTS.maxOutputTokens,
    ),
    maxRetries: parsePositiveInt(env.AI_GIT_SUBMIT_MAX_RETRIES, CONFIG_DEFAULTS.maxRetries),
    retryBaseMs: parsePositiveInt(env.AI_GIT_SUBMIT_RETRY_BASE_MS, CONFIG_DEFAULTS.retryBaseMs),
  };
}
