import { describe, expect, it, vi } from 'vitest';
import { promptKeepAwakeOptions } from './prompts.js';

describe('promptKeepAwakeOptions', () => {
  it('offers Yes/No select for screen with No as default', async () => {
    const askHours = vi.fn().mockResolvedValue(4);
    const askScreen = vi.fn().mockResolvedValue(false);

    const result = await promptKeepAwakeOptions({ askHours, askScreen });

    expect(askScreen).toHaveBeenCalledWith({
      message: 'Keep the screen on?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: false,
    });
    expect(result).toEqual({ hours: 4, screen: false });
  });
});
