import { describe, expect, it, vi } from 'vitest';
import { promptSubmitOptions } from './prompts.js';

describe('promptSubmitOptions', () => {
  it('asks for add and push with No as default', async () => {
    const askAdd = vi.fn().mockResolvedValue(false);
    const askPush = vi.fn().mockResolvedValue(true);

    const result = await promptSubmitOptions({ askAdd, askPush });

    expect(askAdd).toHaveBeenCalledWith({
      message: 'Run "git add ." before generating the commit message?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: false,
    });
    expect(askPush).toHaveBeenCalledWith({
      message: 'Run "git push" after a successful commit?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: false,
    });
    expect(result).toEqual({ add: false, push: true });
  });
});
