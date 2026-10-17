import { number, select } from '@inquirer/prompts';

export interface PromptedKeepAwakeOptions {
  hours: number;
  screen: boolean;
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
  deps: PromptKeepAwakeOptionsDeps = defaultDeps,
): Promise<PromptedKeepAwakeOptions> {
  const hours = await deps.askHours({
    message: 'How many hours should the Mac stay awake?',
    default: 4,
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

  const screen = await deps.askScreen({
    message: 'Keep the screen on?',
    choices: [
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ],
    default: false,
  });

  return { hours, screen };
}
