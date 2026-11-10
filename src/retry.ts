import { EXIT_USAGE, exitCodeForParseFailure } from './lib/cli/exit-codes.js';
import { resolveInteractiveOptions } from './lib/cli/resolve-options.js';
import { runCliMain } from './lib/cli/run-main.js';
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
  const resolved = await resolveInteractiveOptions({
    noInput: parsed.noInput,
    needsPrompt:
      presets.command === undefined ||
      presets.times === undefined ||
      presets.intervalSeconds === undefined,
    prompt: () => promptRetryOptions(presets),
    applyDefaults: () => applyRetryDefaults(presets),
    formatInvocation: formatRetryInvocation,
  });

  if (!resolved.ok) {
    console.error(
      `Missing required option${resolved.missing.length > 1 ? 's' : ''}: ${resolved.missing.join(', ')}.`,
    );
    console.error('Run "retry help" for usage.');
    return EXIT_USAGE;
  }

  const options = resolved.options;
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

await runCliMain(() => main(process.argv.slice(2)));
