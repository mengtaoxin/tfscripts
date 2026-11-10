const NETWORK_CODES = new Set([
  'ENOTFOUND',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
]);

const NETWORK_PATTERNS = [
  /ENOTFOUND/i,
  /ECONNRESET/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /EAI_AGAIN/i,
  /Could not resolve host/i,
  /Failed to connect/i,
  /Connection timed out/i,
  /network is unreachable/i,
  /SSL_ERROR_SYSCALL/i,
  /The remote end hung up/i,
  /unable to access/i,
  /fetch failed/i,
];

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const withStderr = error as Error & { stderr?: string };
    const stderr = typeof withStderr.stderr === 'string' ? withStderr.stderr.trim() : '';
    if (stderr) {
      return stderr;
    }
    return error.message;
  }
  return String(error);
}

function hasNetworkCode(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }
  return NETWORK_CODES.has(String((error as { code: unknown }).code));
}

/**
 * True for transient transport failures (DNS, connect, reset, hung-up remote).
 * False for application rejects such as non-fast-forward or HTTP 4xx from an LLM API.
 */
export function isNetworkError(error: unknown): boolean {
  const candidates: unknown[] = [error];
  if (error && typeof error === 'object' && 'cause' in error) {
    candidates.push((error as { cause: unknown }).cause);
  }

  for (const candidate of candidates) {
    if (hasNetworkCode(candidate)) {
      return true;
    }
    const message = errorMessage(candidate);
    if (NETWORK_PATTERNS.some((pattern) => pattern.test(message))) {
      return true;
    }
  }

  return false;
}
