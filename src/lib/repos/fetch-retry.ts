import { fetchUpstream, isNetworkError, type GitDeps } from './git.js';

export interface FetchWithRetryDeps {
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  maxRetries?: number;
  retryBaseMs?: number;
}

export async function fetchWithRetry(git: GitDeps, deps: FetchWithRetryDeps = {}): Promise<void> {
  const maxRetries = deps.maxRetries ?? 3;
  const baseMs = deps.retryBaseMs ?? 1000;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const random = deps.random ?? Math.random;

  const attemptOnce = async (attempt: number): Promise<void> => {
    try {
      await fetchUpstream(git);
    } catch (error) {
      if (!isNetworkError(error) || attempt >= maxRetries) {
        throw error;
      }
      const delayMs = baseMs * 2 ** attempt + Math.floor(random() * baseMs);
      await sleep(delayMs);
      await attemptOnce(attempt + 1);
    }
  };

  await attemptOnce(0);
}
