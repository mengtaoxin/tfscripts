import { parseArgs } from './lib/ai-git-submit/parse-args.js';
import { promptSubmitOptions } from './lib/ai-git-submit/prompts.js';
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
    return 1;
  }

  if (parsed.command === 'help') {
    console.log(HELP_TEXT.trimEnd());
    return 0;
  }

  const options =
    parsed.mode === 'direct' ? { add: parsed.add, push: parsed.push } : await promptSubmitOptions();

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
