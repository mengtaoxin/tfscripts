import { exitCodeForParseFailure } from './lib/cli/exit-codes.js';
import { runCliMain } from './lib/cli/run-main.js';
import { helpTextFor } from './lib/repos/cli/help.js';
import { parseArgs } from './lib/repos/cli/parse-args.js';
import { runRepoSync } from './lib/repos/orchestrate/run.js';
import { runRepoCheck } from './lib/repos/orchestrate/run-check.js';
import { runRepoList } from './lib/repos/orchestrate/run-list.js';
import { runRepoSubmit } from './lib/repos/orchestrate/run-submit.js';

async function main(argv: readonly string[]): Promise<number> {
  const parsed = parseArgs(argv);

  if (!parsed.ok) {
    console.error(parsed.message);
    if (parsed.reason === 'usage') {
      console.error('');
      console.error(helpTextFor(undefined).trimEnd());
    }
    return exitCodeForParseFailure(parsed.reason);
  }

  if (parsed.command === 'help') {
    console.log(helpTextFor(parsed.topic).trimEnd());
    return 0;
  }

  if (parsed.command === 'check') {
    const result = await runRepoCheck();
    return result.exitCode;
  }

  if (parsed.command === 'list') {
    const result = await runRepoList();
    return result.exitCode;
  }

  if (parsed.command === 'submit') {
    const result = await runRepoSubmit({ name: parsed.name });
    return result.exitCode;
  }

  const result = await runRepoSync();
  return result.exitCode;
}

await runCliMain(() => main(process.argv.slice(2)));
