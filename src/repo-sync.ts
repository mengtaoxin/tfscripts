import { parseArgs } from './lib/repo-sync/parse-args.js';
import { HELP_TEXT } from './lib/repo-sync/help.js';
import { runRepoSync } from './lib/repo-sync/run.js';

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

  const result = await runRepoSync();
  return result.exitCode;
}

const exitCode = await main(process.argv.slice(2));
process.exit(exitCode);
