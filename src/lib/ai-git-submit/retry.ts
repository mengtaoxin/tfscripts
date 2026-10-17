export interface RetryOptions {
  maxRetries: number;
  baseMs: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  onRetry?: (info: { attempt: number; error: unknown; delayMs: number }) => void;
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelayMs(baseMs: number, attempt: number, random: () => number): number {
  const exponential = baseMs * 2 ** attempt;
  const jitter = Math.floor(random() * baseMs);
  return exponential + jitter;
}

/**
 * Run `fn`, retrying on failure up to `maxRetries` times after the first try.
 * Delay between attempts: `baseMs * 2^attempt + jitter` (attempt starts at 0 after first failure).
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;

  const attemptOnce = async (attempt: number): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= options.maxRetries) {
        throw error;
      }
      const delayMs = computeDelayMs(options.baseMs, attempt, random);
      options.onRetry?.({ attempt, error, delayMs });
      await sleep(delayMs);
      return attemptOnce(attempt + 1);
    }
  };

  return attemptOnce(0);
}
