import { select } from '@inquirer/prompts';

export const DEFAULT_ADD = false;
export const DEFAULT_PUSH = false;
export const DEFAULT_PROTECT_MAIN = true;

export interface PromptedSubmitOptions {
  add: boolean;
  push: boolean;
  protectMain: boolean;
}

export interface PromptSubmitPresets {
  readonly add?: boolean | undefined;
  readonly push?: boolean | undefined;
  readonly protectMain?: boolean | undefined;
}

export interface PromptSubmitOptionsDeps {
  askAdd: typeof select;
  askPush: typeof select;
  askProtectMain: typeof select;
}

const defaultDeps: PromptSubmitOptionsDeps = {
  askAdd: select,
  askPush: select,
  askProtectMain: select,
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

  let protectMain = presets.protectMain;
  if (protectMain === undefined) {
    protectMain = await deps.askProtectMain({
      message: 'Protect main/master by committing on a new feature branch?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: DEFAULT_PROTECT_MAIN,
    });
  }

  return { add, push, protectMain };
}

export function applySubmitDefaults(presets: PromptSubmitPresets): PromptedSubmitOptions {
  return {
    add: presets.add ?? DEFAULT_ADD,
    push: presets.push ?? DEFAULT_PUSH,
    protectMain: presets.protectMain ?? DEFAULT_PROTECT_MAIN,
  };
}

export function formatSubmitInvocation(options: PromptedSubmitOptions): string {
  const add = options.add ? 'yes' : 'no';
  const push = options.push ? 'yes' : 'no';
  const protectMain = options.protectMain ? 'yes' : 'no';
  return `ai-git-submit --add ${add} --push ${push} --protect-main ${protectMain}`;
}
