import { execFile } from 'node:child_process';
import { basename } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type ExecFileFn = (
  file: string,
  args: readonly string[],
  options?: { cwd?: string; maxBuffer?: number },
) => Promise<{ stdout: string; stderr: string }>;

export type ExecFileWithStdinFn = (
  file: string,
  args: readonly string[],
  stdin: string,
  options?: { cwd?: string },
) => Promise<void>;

export interface GitDeps {
  execFile?: ExecFileFn;
  execFileWithStdin?: ExecFileWithStdinFn;
  cwd?: string;
}

const defaultExecFile: ExecFileFn = async (file, args, options) =>
  execFileAsync(file, [...args], {
    cwd: options?.cwd,
    maxBuffer: options?.maxBuffer ?? 10 * 1024 * 1024,
    encoding: 'utf8',
  });

const defaultExecFileWithStdin: ExecFileWithStdinFn = (file, args, stdin, options) =>
  new Promise((resolve, reject) => {
    const child = execFile(
      file,
      [...args],
      { cwd: options?.cwd, maxBuffer: 10 * 1024 * 1024 },
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      },
    );
    child.stdin?.write(stdin);
    child.stdin?.end();
  });

const defaultDeps: GitDeps = {
  execFile: defaultExecFile,
  execFileWithStdin: defaultExecFileWithStdin,
};

function withDefaults(deps: GitDeps = {}): Required<Pick<GitDeps, 'execFile'>> & GitDeps {
  return {
    ...deps,
    execFile: deps.execFile ?? defaultExecFile,
    execFileWithStdin: deps.execFileWithStdin ?? defaultExecFileWithStdin,
  };
}

async function git(
  deps: GitDeps,
  args: readonly string[],
): Promise<{ stdout: string; stderr: string }> {
  const resolved = withDefaults(deps);
  return resolved.execFile('git', args, { cwd: resolved.cwd });
}

export async function resolveRepoRoot(deps: GitDeps = defaultDeps): Promise<string> {
  try {
    const { stdout } = await git(deps, ['rev-parse', '--show-toplevel']);
    return stdout.trim();
  } catch {
    throw new Error('Not a git repository (or any of the parent directories).');
  }
}

export async function getBranchName(deps: GitDeps = defaultDeps): Promise<string> {
  try {
    const { stdout } = await git(deps, ['rev-parse', '--abbrev-ref', 'HEAD']);
    return stdout.trim();
  } catch {
    return '';
  }
}

export function getRepoName(repoRoot: string): string {
  return basename(repoRoot);
}

export async function gitAddAll(deps: GitDeps = defaultDeps): Promise<void> {
  await git(deps, ['add', '.']);
}

export async function getStagedDiff(deps: GitDeps = defaultDeps): Promise<string> {
  const { stdout } = await git(deps, ['diff', '--cached']);
  return stdout;
}

export async function getStagedStat(deps: GitDeps = defaultDeps): Promise<string> {
  const { stdout } = await git(deps, ['diff', '--cached', '--stat']);
  return stdout;
}

export async function gitCommitWithMessage(
  message: string,
  deps: GitDeps = defaultDeps,
): Promise<void> {
  const execWithStdin = deps.execFileWithStdin ?? defaultExecFileWithStdin;
  await execWithStdin('git', ['commit', '-F', '-'], message, { cwd: deps.cwd });
}

export async function gitPush(deps: GitDeps = defaultDeps): Promise<void> {
  await git(deps, ['push']);
}
