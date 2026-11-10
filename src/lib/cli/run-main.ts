/**
 * Run a CLI `main` and map inquirer cancel (`ExitPromptError`) to exit 1.
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
    throw error;
  }
}
