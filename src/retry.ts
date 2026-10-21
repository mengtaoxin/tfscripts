import { HELP_TEXT } from './lib/retry/help.js';
import { parseArgs } from './lib/retry/parse-args.js';
import { promptRetryOptions } from './lib/retry/prompts.js';
import { formatRetryNotice, runRetry, runShellCommand } from './lib/retry/run.js';

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main(argv: readonly string[]): Promise<number> {
  const parsed = parseArgs(argv);

  if (!parsed.ok) {
    console.error(parsed.message);
    if (parsed.reason === 'usage') {
      console.error('');
      console.error(HELP_TEXT.trimEnd());
    }
    return 1;
  }

  if (parsed.command === 'help') {
    console.log(HELP_TEXT.trimEnd());
    return 0;
  }

  const options = await promptRetryOptions();
  return runRetry({
    command: options.command,
    times: options.times,
    intervalSeconds: options.intervalSeconds,
    run: runShellCommand,
    sleep,
    onRetry: (info) => {
      console.error(formatRetryNotice(info));
    },
  });
}

try {
  const exitCode = await main(process.argv.slice(2));
  process.exit(exitCode);
} catch (error) {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    console.error('Cancelled.');
    process.exit(1);
  }
  throw error;
}
