import { EXIT_USAGE, exitCodeForParseFailure } from './lib/cli/exit-codes.js';
import { resolveInteractiveOptions } from './lib/cli/resolve-options.js';
import { runCliMain } from './lib/cli/run-main.js';
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
  const resolved = await resolveInteractiveOptions({
    noInput: parsed.noInput,
    needsPrompt: presets.add === undefined || presets.push === undefined,
    prompt: () => promptSubmitOptions(presets),
    applyDefaults: () => applySubmitDefaults(presets),
    formatInvocation: formatSubmitInvocation,
  });

  if (!resolved.ok) {
    // applySubmitDefaults always fills; keep the branch for the shared contract.
    console.error(
      `Missing required option${resolved.missing.length > 1 ? 's' : ''}: ${resolved.missing.join(', ')}.`,
    );
    console.error('Run "ai-git-submit help" for usage.');
    return EXIT_USAGE;
  }

  const result = await runSubmit(resolved.options);
  return result.exitCode;
}

await runCliMain(() => main(process.argv.slice(2)));
