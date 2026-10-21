import { input, number } from '@inquirer/prompts';

export interface PromptedRetryOptions {
  command: string;
  times: number;
  intervalSeconds: number;
}

export interface PromptRetryOptionsDeps {
  askCommand: typeof input;
  askTimes: typeof number;
  askInterval: typeof number;
}

const defaultDeps: PromptRetryOptionsDeps = {
  askCommand: input,
  askTimes: number,
  askInterval: number,
};

export async function promptRetryOptions(
  deps: PromptRetryOptionsDeps = defaultDeps,
): Promise<PromptedRetryOptions> {
  const command = await deps.askCommand({
    message: 'Command to run:',
    required: true,
    validate: (value) => {
      if (value.trim().length === 0) {
        return 'Enter a command.';
      }
      return true;
    },
  });

  const trimmed = command.trim();
  if (trimmed.length === 0) {
    throw new Error('Command is required.');
  }

  const times = await deps.askTimes({
    message: 'How many times should the command run?',
    default: 10,
    min: 1,
    step: 1,
    required: true,
    validate: (value) => {
      if (!Number.isInteger(value) || value < 1) {
        return 'Enter an integer of at least 1.';
      }
      return true;
    },
  });

  const intervalSeconds = await deps.askInterval({
    message: 'How many seconds between retries?',
    default: 10,
    min: 0,
    step: 1,
    required: true,
    validate: (value) => {
      if (!Number.isInteger(value) || value < 0) {
        return 'Enter an integer of at least 0.';
      }
      return true;
    },
  });

  return { command: trimmed, times, intervalSeconds };
}
