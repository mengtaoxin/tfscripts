import { describe, expect, it, vi } from 'vitest';
import { CONFIG_DEFAULTS, ConfigError, resolveConfig } from './config.js';

describe('resolveConfig', () => {
  it('applies hardcoded defaults when optional vars are unset', () => {
    const env: NodeJS.ProcessEnv = { AI_GIT_SUBMIT_API_KEY: 'secret' };
    const loadEnvFile = vi.fn();

    const config = resolveConfig({ repoRoot: '/repo', env, loadEnvFile });

    expect(loadEnvFile).toHaveBeenCalledWith('/repo/.env', env);
    expect(config).toEqual({
      apiKey: 'secret',
      baseUrl: CONFIG_DEFAULTS.baseUrl,
      model: CONFIG_DEFAULTS.model,
      maxInputTokens: CONFIG_DEFAULTS.maxInputTokens,
      maxOutputTokens: CONFIG_DEFAULTS.maxOutputTokens,
      maxRetries: CONFIG_DEFAULTS.maxRetries,
      retryBaseMs: CONFIG_DEFAULTS.retryBaseMs,
    });
  });

  it('lets project .env values override existing env vars', () => {
    const env: NodeJS.ProcessEnv = {
      AI_GIT_SUBMIT_API_KEY: 'from-system',
      AI_GIT_SUBMIT_MODEL: 'system-model',
      AI_GIT_SUBMIT_MAX_OUTPUT_TOKENS: '256',
    };
    const loadEnvFile = vi.fn((_path: string, target: NodeJS.ProcessEnv) => {
      target.AI_GIT_SUBMIT_API_KEY = 'from-dotenv';
      target.AI_GIT_SUBMIT_MODEL = 'dotenv-model';
      target.AI_GIT_SUBMIT_MAX_OUTPUT_TOKENS = '2048';
    });

    const config = resolveConfig({ repoRoot: '/repo', env, loadEnvFile });

    expect(config.apiKey).toBe('from-dotenv');
    expect(config.model).toBe('dotenv-model');
    expect(config.maxOutputTokens).toBe(2048);
  });

  it('normalizes trailing slashes on base URL', () => {
    const env: NodeJS.ProcessEnv = {
      AI_GIT_SUBMIT_API_KEY: 'secret',
      AI_GIT_SUBMIT_BASE_URL: 'https://example.com/v1///',
    };

    const config = resolveConfig({
      repoRoot: '/repo',
      env,
      loadEnvFile: vi.fn(),
    });

    expect(config.baseUrl).toBe('https://example.com/v1');
  });

  it('throws when API key is missing', () => {
    expect(() =>
      resolveConfig({
        repoRoot: '/repo',
        env: {},
        loadEnvFile: vi.fn(),
      }),
    ).toThrow(ConfigError);
  });

  it('throws on invalid integer config', () => {
    expect(() =>
      resolveConfig({
        repoRoot: '/repo',
        env: {
          AI_GIT_SUBMIT_API_KEY: 'secret',
          AI_GIT_SUBMIT_MAX_RETRIES: 'abc',
        },
        loadEnvFile: vi.fn(),
      }),
    ).toThrow(ConfigError);
  });
});
