import { select } from '@inquirer/prompts';

export interface PromptedSubmitOptions {
  add: boolean;
  push: boolean;
}

export interface PromptSubmitOptionsDeps {
  askAdd: typeof select;
  askPush: typeof select;
}

const defaultDeps: PromptSubmitOptionsDeps = {
  askAdd: select,
  askPush: select,
};

export async function promptSubmitOptions(
  deps: PromptSubmitOptionsDeps = defaultDeps,
): Promise<PromptedSubmitOptions> {
  const add = await deps.askAdd({
    message: 'Run "git add ." before generating the commit message?',
    choices: [
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ],
    default: false,
  });

  const push = await deps.askPush({
    message: 'Run "git push" after a successful commit?',
    choices: [
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ],
    default: false,
  });

  return { add, push };
}
