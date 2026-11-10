import { execFile } from 'node:child_process';
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

export type ReadFileFn = (path: string) => Promise<string>;

export interface GitDeps {
  execFile?: ExecFileFn;
  execFileWithStdin?: ExecFileWithStdinFn;
  cwd?: string;
  readFile?: ReadFileFn;
}

export const defaultExecFile: ExecFileFn = async (file, args, options) =>
  execFileAsync(file, [...args], {
    cwd: options?.cwd,
    maxBuffer: options?.maxBuffer ?? 10 * 1024 * 1024,
    encoding: 'utf8',
  });

export const defaultExecFileWithStdin: ExecFileWithStdinFn = (file, args, stdin, options) =>
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

export function withGitDefaults(deps: GitDeps = {}): Required<Pick<GitDeps, 'execFile'>> & GitDeps {
  return {
    ...deps,
    execFile: deps.execFile ?? defaultExecFile,
    execFileWithStdin: deps.execFileWithStdin ?? defaultExecFileWithStdin,
  };
}

export async function execGit(
  deps: GitDeps,
  args: readonly string[],
): Promise<{ stdout: string; stderr: string }> {
  const resolved = withGitDefaults(deps);
  return resolved.execFile('git', args, { cwd: resolved.cwd });
}
