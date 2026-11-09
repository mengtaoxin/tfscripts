import { parseArgs } from './lib/repos/parse-args.js';
import { HELP_TEXT } from './lib/repos/help.js';
import { runRepoSync } from './lib/repos/run.js';
import { runRepoCheck } from './lib/repos/run-check.js';

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

  if (parsed.command === 'check') {
    const result = await runRepoCheck();
    return result.exitCode;
  }

  const result = await runRepoSync();
  return result.exitCode;
}

const exitCode = await main(process.argv.slice(2));
process.exit(exitCode);
