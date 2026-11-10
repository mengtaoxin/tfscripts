import { EXIT_USAGE, exitCodeForParseFailure } from './lib/cli/exit-codes.js';
import { resolveInteractiveOptions } from './lib/cli/resolve-options.js';
import { runCliMain } from './lib/cli/run-main.js';
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
  const resolved = await resolveInteractiveOptions({
    noInput: parsed.noInput,
    needsPrompt: presets.hours === undefined || presets.screen === undefined,
    prompt: () => promptKeepAwakeOptions(presets),
    applyDefaults: () => applyKeepAwakeDefaults(presets),
    formatInvocation: formatKeepAwakeInvocation,
  });

  if (!resolved.ok) {
    console.error(
      `Missing required option${resolved.missing.length > 1 ? 's' : ''}: ${resolved.missing.join(', ')}.`,
    );
    console.error('Run "keep-awake help" for usage.');
    return EXIT_USAGE;
  }

  const options = resolved.options;
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

await runCliMain(() => main(process.argv.slice(2)));
