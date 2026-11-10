import { select } from '@inquirer/prompts';

export const DEFAULT_ADD = false;
export const DEFAULT_PUSH = false;

export interface PromptedSubmitOptions {
  add: boolean;
  push: boolean;
}

export interface PromptSubmitPresets {
  readonly add?: boolean | undefined;
  readonly push?: boolean | undefined;
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
  presets: PromptSubmitPresets = {},
  deps: PromptSubmitOptionsDeps = defaultDeps,
): Promise<PromptedSubmitOptions> {
  let add = presets.add;
  if (add === undefined) {
    add = await deps.askAdd({
      message: 'Run "git add ." before generating the commit message?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: DEFAULT_ADD,
    });
  }

  let push = presets.push;
  if (push === undefined) {
    push = await deps.askPush({
      message: 'Run "git push" after a successful commit?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: DEFAULT_PUSH,
    });
  }

  return { add, push };
}

export function applySubmitDefaults(presets: PromptSubmitPresets): PromptedSubmitOptions {
  return {
    add: presets.add ?? DEFAULT_ADD,
    push: presets.push ?? DEFAULT_PUSH,
  };
}

export function formatSubmitInvocation(options: PromptedSubmitOptions): string {
  const add = options.add ? 'yes' : 'no';
  const push = options.push ? 'yes' : 'no';
  return `ai-git-submit --add ${add} --push ${push}`;
}
