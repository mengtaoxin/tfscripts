import { number, select } from '@inquirer/prompts';

export const DEFAULT_HOURS = 4;
export const DEFAULT_SCREEN = false;

export interface PromptedKeepAwakeOptions {
  hours: number;
  screen: boolean;
}

export interface PromptKeepAwakePresets {
  readonly hours?: number | undefined;
  readonly screen?: boolean | undefined;
}

export interface PromptKeepAwakeOptionsDeps {
  askHours: typeof number;
  askScreen: typeof select;
}

const defaultDeps: PromptKeepAwakeOptionsDeps = {
  askHours: number,
  askScreen: select,
};

export async function promptKeepAwakeOptions(
  presets: PromptKeepAwakePresets = {},
  deps: PromptKeepAwakeOptionsDeps = defaultDeps,
): Promise<PromptedKeepAwakeOptions> {
  let hours = presets.hours;
  if (hours === undefined) {
    hours = await deps.askHours({
      message: 'How many hours to stay awake?',
      default: DEFAULT_HOURS,
      min: 1,
      max: 24,
      step: 1,
      required: true,
      validate: (value) => {
        if (value === undefined || !Number.isInteger(value)) {
          return 'Enter an integer from 1 to 24.';
        }
        return true;
      },
    });
    if (hours === undefined) {
      throw new Error('Hours is required.');
    }
  }

  let screen = presets.screen;
  if (screen === undefined) {
    screen = await deps.askScreen({
      message: 'Keep the screen on?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: DEFAULT_SCREEN,
    });
  }

  return { hours, screen };
}

export function formatKeepAwakeInvocation(options: PromptedKeepAwakeOptions): string {
  return `keep-awake --hours ${options.hours} --screen ${options.screen ? 'yes' : 'no'}`;
}

export function applyKeepAwakeDefaults(
  presets: PromptKeepAwakePresets,
): PromptedKeepAwakeOptions | { missing: string[] } {
  if (presets.hours === undefined || presets.screen === undefined) {
    const missing: string[] = [];
    if (presets.hours === undefined) {
      missing.push('--hours');
    }
    if (presets.screen === undefined) {
      missing.push('--screen');
    }
    return { missing };
  }
  return {
    hours: presets.hours,
    screen: presets.screen,
  };
}
