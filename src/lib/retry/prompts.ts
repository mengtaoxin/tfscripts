import { input, number } from '@inquirer/prompts';

export const DEFAULT_TIMES = 10;
export const DEFAULT_INTERVAL_SECONDS = 10;

export interface PromptedRetryOptions {
  command: string;
  times: number;
  intervalSeconds: number;
}

export interface PromptRetryPresets {
  readonly command?: string | undefined;
  readonly times?: number | undefined;
  readonly intervalSeconds?: number | undefined;
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
  presets: PromptRetryPresets = {},
  deps: PromptRetryOptionsDeps = defaultDeps,
): Promise<PromptedRetryOptions> {
  let command = presets.command;
  if (command === undefined) {
    const answered = await deps.askCommand({
      message: 'Command to run:',
      required: true,
      validate: (value) => {
        if (value.trim().length === 0) {
          return 'Enter a command.';
        }
        return true;
      },
    });
    command = answered.trim();
    if (command.length === 0) {
      throw new Error('Command is required.');
    }
  }

  let times = presets.times;
  if (times === undefined) {
    times = await deps.askTimes({
      message: 'How many times should the command run?',
      default: DEFAULT_TIMES,
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
  }

  let intervalSeconds = presets.intervalSeconds;
  if (intervalSeconds === undefined) {
    intervalSeconds = await deps.askInterval({
      message: 'How many seconds between retries?',
      default: DEFAULT_INTERVAL_SECONDS,
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
  }

  return { command, times, intervalSeconds };
}

export function formatRetryInvocation(options: PromptedRetryOptions): string {
  return (
    `retry --command ${JSON.stringify(options.command)}` +
    ` --times ${options.times}` +
    ` --interval ${options.intervalSeconds}`
  );
}

/** Fill defaults for optional flags; command remains required. */
export function applyRetryDefaults(
  presets: PromptRetryPresets,
): PromptedRetryOptions | { missing: string[] } {
  if (presets.command === undefined) {
    return { missing: ['--command'] };
  }
  return {
    command: presets.command,
    times: presets.times ?? DEFAULT_TIMES,
    intervalSeconds: presets.intervalSeconds ?? DEFAULT_INTERVAL_SECONDS,
  };
}
