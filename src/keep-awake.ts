import { EXIT_USAGE, exitCodeForParseFailure } from './lib/cli/exit-codes.js';
import { canPrompt } from './lib/cli/interactive.js';
import {
  clearKeepAwakeState,
  defaultStatePath,
  readActiveKeepAwakeState,
  writeKeepAwakeState,
} from './lib/keep-awake/state.js';
import {
  defaultKill,
  defaultSpawn,
  startKeepAwakeSession,
  stopKeepAwakeSession,
} from './lib/keep-awake/session.js';
import { parseArgs } from './lib/keep-awake/parse-args.js';
import {
  applyKeepAwakeDefaults,
  formatKeepAwakeInvocation,
  promptKeepAwakeOptions,
} from './lib/keep-awake/prompts.js';
import {
  formatLocalDateTime,
  formatStatusActive,
  helpTextFor,
  STATUS_DEFAULT,
} from './lib/keep-awake/help.js';

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

  const statePath = defaultStatePath();

  if (parsed.command === 'help') {
    console.log(helpTextFor(parsed.topic).trimEnd());
    return 0;
  }

  if (parsed.command === 'status') {
    const state = readActiveKeepAwakeState({ statePath });
    if (state === null) {
      console.log(STATUS_DEFAULT);
    } else {
      console.log(formatStatusActive(state));
    }
    return 0;
  }

  if (parsed.command === 'stop') {
    const result = stopKeepAwakeSession({
      readActive: () => readActiveKeepAwakeState({ statePath }),
      kill: defaultKill,
      clearState: () => clearKeepAwakeState({ statePath }),
    });

    if (result.status === 'inactive') {
      console.log('No active keep-awake session. System defaults already apply.');
      return 0;
    }

    console.log('Stopped keep-awake session. System defaults restored.');
    return 0;
  }

  if (parsed.command !== 'start') {
    return EXIT_USAGE;
  }

  const presets = { hours: parsed.hours, screen: parsed.screen };
  const needsPrompt = presets.hours === undefined || presets.screen === undefined;

  let options;
  let prompted = false;
  if (needsPrompt && canPrompt({ noInput: parsed.noInput })) {
    options = await promptKeepAwakeOptions(presets);
    prompted = true;
  } else {
    const resolved = applyKeepAwakeDefaults(presets);
    if ('missing' in resolved) {
      console.error(
        `Missing required option${resolved.missing.length > 1 ? 's' : ''}: ${resolved.missing.join(', ')}.`,
      );
      console.error('Run "keep-awake help" for usage.');
      return EXIT_USAGE;
    }
    options = resolved;
  }

  if (prompted) {
    console.error(`Run this again without prompts:\n  ${formatKeepAwakeInvocation(options)}`);
  }

  const result = startKeepAwakeSession({
    hours: options.hours,
    screen: options.screen,
    stopExisting: () =>
      stopKeepAwakeSession({
        readActive: () => readActiveKeepAwakeState({ statePath }),
        kill: defaultKill,
        clearState: () => clearKeepAwakeState({ statePath }),
      }),
    spawn: defaultSpawn,
    writeState: (state) => writeKeepAwakeState({ statePath, state }),
    now: () => new Date(),
  });

  const screenLabel = result.screen ? 'on' : 'off';
  const replacedNote = result.replaced ? ' (replaced previous session)' : '';
  console.log(`Keeping awake for ${result.hours} hour(s); screen ${screenLabel}.${replacedNote}`);
  console.log(`Ends at ${formatLocalDateTime(new Date(result.endsAt))}`);
  return 0;
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
