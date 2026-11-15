import { exitCodeForParseFailure } from './lib/cli/exit-codes.js';
import { runCliMain } from './lib/cli/run-main.js';
import { executeSubmit } from './lib/ai-git-submit/execute.js';
import { parseArgs } from './lib/ai-git-submit/parse-args.js';
import { HELP_TEXT } from './lib/ai-git-submit/help.js';

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

  return executeSubmit({
    add: parsed.add,
    push: parsed.push,
    noInput: parsed.noInput,
  });
}

await runCliMain(() => main(process.argv.slice(2)));
