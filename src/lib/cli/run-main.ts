import { COMPLETION_TOKEN } from './completion.js';
import { EXIT_FAILURE } from './exit-codes.js';
import { isHelpToken } from './help-args.js';
import { PlatformNotSupportedError } from './platform.js';
import { acquireRunLock, RunLockError, type RunLockHandle } from './run-lock.js';

export interface RunCliMainDeps {
  acquireLock?: () => RunLockHandle;
  argv?: readonly string[];
}

function shouldSkipRunLock(argv: readonly string[]): boolean {
  if (argv[0] === COMPLETION_TOKEN) {
    return true;
  }
  return argv.some((token) => isHelpToken(token));
}

/**
 * Run a CLI `main` under the shared tfscripts run lock, and map cancel /
 * platform-not-supported / run-lock to exit 1. Other errors rethrow.
 * Help requests (`help` / `-h` / `--help`) skip the lock.
 */
export async function runCliMain(
  main: () => Promise<number>,
  deps: RunCliMainDeps = {},
): Promise<never> {
  const argv = deps.argv ?? process.argv.slice(2);
  const acquireLock = deps.acquireLock ?? acquireRunLock;
  let lock: RunLockHandle | undefined;
  let exitCode = EXIT_FAILURE;

  try {
    if (!shouldSkipRunLock(argv)) {
      lock = acquireLock();
    }
    exitCode = await main();
  } catch (error) {
    if (error instanceof Error && error.name === 'ExitPromptError') {
      console.error('Cancelled.');
      exitCode = 1;
    } else if (error instanceof PlatformNotSupportedError || error instanceof RunLockError) {
      console.error(error.message);
      exitCode = EXIT_FAILURE;
    } else {
      throw error;
    }
  } finally {
    lock?.release();
  }

  process.exit(exitCode);
}
