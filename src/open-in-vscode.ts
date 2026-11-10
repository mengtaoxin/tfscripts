import { exitCodeForParseFailure } from './lib/cli/exit-codes.js';
import { runCliMain } from './lib/cli/run-main.js';
import { HELP_TEXT } from './lib/open-in-vscode/help.js';
import { parseArgs } from './lib/open-in-vscode/parse-args.js';
import { runOpen } from './lib/open-in-vscode/run.js';

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

  const result = await runOpen({
    path: parsed.path,
    reuseWindow: parsed.reuseWindow,
  });
  return result.exitCode;
}

await runCliMain(() => main(process.argv.slice(2)));
