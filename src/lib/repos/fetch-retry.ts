import { withExponentialBackoff } from '../retry-policy/backoff.js';
import { isNetworkError } from '../retry-policy/network-error.js';
import { fetchUpstream, type GitDeps } from './git.js';

export interface FetchWithRetryDeps {
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  maxRetries?: number;
  retryBaseMs?: number;
}

export async function fetchWithRetry(git: GitDeps, deps: FetchWithRetryDeps = {}): Promise<void> {
  const maxRetries = deps.maxRetries ?? 3;
  const baseMs = deps.retryBaseMs ?? 1000;

  await withExponentialBackoff(() => fetchUpstream(git), {
    maxRetries,
    baseMs,
    sleep: deps.sleep,
    random: deps.random,
    shouldRetry: isNetworkError,
  });
}
