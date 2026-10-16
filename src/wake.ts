import {
  clearWakeState,
  defaultStatePath,
  readActiveWakeState,
  writeWakeState,
} from './lib/wake/state.js';
import {
  defaultKill,
  defaultSpawn,
  startWakeSession,
  stopWakeSession,
} from './lib/wake/session.js';
import { parseArgs } from './lib/wake/parse-args.js';
import { promptWakeOptions } from './lib/wake/prompts.js';
import { formatInfoActive, HELP_TEXT, INFO_DEFAULT } from './lib/wake/help.js';

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

  if (parsed.command === 'info') {
    const state = readActiveWakeState({ statePath });
    if (state === null) {
      console.log(INFO_DEFAULT);
    } else {
      console.log(formatInfoActive(state));
    }
    return 0;
  }

  if (parsed.command === 'stop') {
    const result = stopWakeSession({
      readActive: () => readActiveWakeState({ statePath }),
      kill: defaultKill,
      clearState: () => clearWakeState({ statePath }),
    });

    if (result.status === 'inactive') {
      console.log('No active wake session. System defaults already apply.');
      return 0;
    }

    console.log('Stopped wake session. System defaults restored.');
    return 0;
  }

  // Remaining command is start (info/stop/help returned above).
  const options =
    parsed.command === 'start' && parsed.mode === 'direct'
      ? { hours: parsed.hours, screen: parsed.screen }
      : await promptWakeOptions();

  const result = startWakeSession({
    hours: options.hours,
    screen: options.screen,
    stopExisting: () =>
      stopWakeSession({
        readActive: () => readActiveWakeState({ statePath }),
        kill: defaultKill,
        clearState: () => clearWakeState({ statePath }),
      }),
    spawn: defaultSpawn,
    writeState: (state) => writeWakeState({ statePath, state }),
    now: () => new Date(),
  });

  const screenLabel = result.screen ? 'on' : 'off';
  const replacedNote = result.replaced ? ' (replaced previous session)' : '';
  console.log(`Keeping awake for ${result.hours} hour(s); screen ${screenLabel}.${replacedNote}`);
  console.log(`Ends at ${result.endsAt}`);
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
