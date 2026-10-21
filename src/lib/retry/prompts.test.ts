import { describe, expect, it, vi } from 'vitest';
import { promptRetryOptions } from './prompts.js';

describe('promptRetryOptions', () => {
  it('asks for the command, attempt count, and interval with defaults', async () => {
    const askCommand = vi.fn().mockResolvedValue('  echo ok  ');
    const askTimes = vi.fn().mockResolvedValue(10);
    const askInterval = vi.fn().mockResolvedValue(4);

    const result = await promptRetryOptions({ askCommand, askTimes, askInterval });

    expect(askCommand).toHaveBeenCalledWith({
      message: 'Command to run:',
      required: true,
      validate: expect.any(Function),
    });
    expect(askTimes).toHaveBeenCalledWith({
      message: 'How many times should the command run?',
      default: 10,
      min: 1,
      step: 1,
      required: true,
      validate: expect.any(Function),
    });
    expect(askInterval).toHaveBeenCalledWith({
      message: 'How many seconds between retries?',
      default: 10,
      min: 0,
      step: 1,
      required: true,
      validate: expect.any(Function),
    });
    expect(result).toEqual({ command: 'echo ok', times: 10, intervalSeconds: 4 });
  });

  it('rejects a blank command and non-integer counts or intervals', async () => {
    const askCommand = vi.fn().mockResolvedValue('echo ok');
    const askTimes = vi.fn().mockResolvedValue(10);
    const askInterval = vi.fn().mockResolvedValue(10);

    await promptRetryOptions({ askCommand, askTimes, askInterval });

    const commandValidate = askCommand.mock.calls[0]?.[0].validate as (
      value: string,
    ) => boolean | string;
    expect(commandValidate('')).toBe('Enter a command.');
    expect(commandValidate('   ')).toBe('Enter a command.');
    expect(commandValidate('echo ok')).toBe(true);

    const timesValidate = askTimes.mock.calls[0]?.[0].validate as (
      value: number,
    ) => boolean | string;
    expect(timesValidate(0)).toBe('Enter an integer of at least 1.');
    expect(timesValidate(1.5)).toBe('Enter an integer of at least 1.');
    expect(timesValidate(10)).toBe(true);

    const intervalValidate = askInterval.mock.calls[0]?.[0].validate as (
      value: number,
    ) => boolean | string;
    expect(intervalValidate(-1)).toBe('Enter an integer of at least 0.');
    expect(intervalValidate(1.5)).toBe('Enter an integer of at least 0.');
    expect(intervalValidate(0)).toBe(true);
  });

  it('rejects a whitespace-only command returned by the prompt', async () => {
    const askCommand = vi.fn().mockResolvedValue('   ');
    const askTimes = vi.fn().mockResolvedValue(10);
    const askInterval = vi.fn().mockResolvedValue(10);

    await expect(promptRetryOptions({ askCommand, askTimes, askInterval })).rejects.toThrow(
      'Command is required.',
    );
  });
});
