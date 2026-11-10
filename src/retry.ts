import { EXIT_USAGE, exitCodeForParseFailure } from './lib/cli/exit-codes.js';
import { canPrompt } from './lib/cli/interactive.js';
import { HELP_TEXT } from './lib/retry/help.js';
import { parseArgs } from './lib/retry/parse-args.js';
import {
  applyRetryDefaults,
  formatRetryInvocation,
  promptRetryOptions,
} from './lib/retry/prompts.js';
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
    return exitCodeForParseFailure(parsed.reason);
  }

  if (parsed.command === 'help') {
    console.log(HELP_TEXT.trimEnd());
    return 0;
  }

  const presets = {
    command: parsed.shellCommand,
    times: parsed.times,
    intervalSeconds: parsed.intervalSeconds,
  };
  const needsPrompt =
    presets.command === undefined ||
    presets.times === undefined ||
    presets.intervalSeconds === undefined;

  let options;
  let prompted = false;
  if (needsPrompt && canPrompt({ noInput: parsed.noInput })) {
    options = await promptRetryOptions(presets);
    prompted = true;
  } else {
    const resolved = applyRetryDefaults(presets);
    if ('missing' in resolved) {
      console.error(
        `Missing required option${resolved.missing.length > 1 ? 's' : ''}: ${resolved.missing.join(', ')}.`,
      );
      console.error('Run "retry help" for usage.');
      return EXIT_USAGE;
    }
    options = resolved;
  }

  if (prompted) {
    console.error(`Run this again without prompts:\n  ${formatRetryInvocation(options)}`);
  }

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
