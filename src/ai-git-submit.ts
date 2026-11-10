import { exitCodeForParseFailure } from './lib/cli/exit-codes.js';
import { canPrompt } from './lib/cli/interactive.js';
import { parseArgs } from './lib/ai-git-submit/parse-args.js';
import {
  applySubmitDefaults,
  formatSubmitInvocation,
  promptSubmitOptions,
} from './lib/ai-git-submit/prompts.js';
import { HELP_TEXT } from './lib/ai-git-submit/help.js';
import { runSubmit } from './lib/ai-git-submit/run.js';

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

  const presets = { add: parsed.add, push: parsed.push };
  const needsPrompt = presets.add === undefined || presets.push === undefined;

  let options;
  let prompted = false;
  if (needsPrompt && canPrompt({ noInput: parsed.noInput })) {
    options = await promptSubmitOptions(presets);
    prompted = true;
  } else {
    options = applySubmitDefaults(presets);
  }

  if (prompted) {
    console.error(`Run this again without prompts:\n  ${formatSubmitInvocation(options)}`);
  }

  const result = await runSubmit(options);
  return result.exitCode;
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
