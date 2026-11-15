import { EXIT_FAILURE } from './exit-codes.js';
import { PlatformNotSupportedError } from './platform.js';
import { RunLockError } from './run-lock.js';

/**
 * Run a CLI `main` and map cancel / platform-not-supported / run-lock to exit 1.
 * Other errors rethrow.
 */
export async function runCliMain(main: () => Promise<number>): Promise<never> {
  try {
    const exitCode = await main();
    process.exit(exitCode);
  } catch (error) {
    if (error instanceof Error && error.name === 'ExitPromptError') {
      console.error('Cancelled.');
      process.exit(1);
    }
    if (error instanceof PlatformNotSupportedError || error instanceof RunLockError) {
      console.error(error.message);
      process.exit(EXIT_FAILURE);
    }
    throw error;
  }
}
