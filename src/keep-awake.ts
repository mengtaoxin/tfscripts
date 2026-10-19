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
import { promptKeepAwakeOptions } from './lib/keep-awake/prompts.js';
import {
  formatLocalDateTime,
  formatStatusActive,
  HELP_TEXT,
  STATUS_DEFAULT,
} from './lib/keep-awake/help.js';

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

  const statePath = defaultStatePath();

  if (parsed.command === 'help') {
    console.log(HELP_TEXT.trimEnd());
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

  // Default action: start a session (status/stop/help returned above).
  const options =
    parsed.command === 'start' && parsed.mode === 'direct'
      ? { hours: parsed.hours, screen: parsed.screen }
      : await promptKeepAwakeOptions();

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
