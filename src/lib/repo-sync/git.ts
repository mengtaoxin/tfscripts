import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type ExecFileFn = (
  file: string,
  args: readonly string[],
  options?: { cwd?: string; maxBuffer?: number },
) => Promise<{ stdout: string; stderr: string }>;

export interface GitDeps {
  execFile?: ExecFileFn;
  cwd?: string;
}

const defaultExecFile: ExecFileFn = async (file, args, options) =>
  execFileAsync(file, [...args], {
    cwd: options?.cwd,
    maxBuffer: options?.maxBuffer ?? 10 * 1024 * 1024,
    encoding: 'utf8',
  });

function withDefaults(deps: GitDeps = {}): Required<Pick<GitDeps, 'execFile'>> & GitDeps {
  return {
    ...deps,
    execFile: deps.execFile ?? defaultExecFile,
  };
}

async function git(
  deps: GitDeps,
  args: readonly string[],
): Promise<{ stdout: string; stderr: string }> {
  const resolved = withDefaults(deps);
  return resolved.execFile('git', args, { cwd: resolved.cwd });
}

export async function getBranchName(deps: GitDeps): Promise<string> {
  const { stdout } = await git(deps, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return stdout.trim();
}

export async function getUpstreamRef(deps: GitDeps): Promise<string> {
  const { stdout } = await git(deps, ['rev-parse', '--abbrev-ref', '@{u}']);
  return stdout.trim();
}

export async function fetchUpstream(deps: GitDeps): Promise<void> {
  await git(deps, ['fetch', '--prune']);
}

export async function countBehindUpstream(deps: GitDeps): Promise<number> {
  const { stdout } = await git(deps, ['rev-list', '--count', 'HEAD..@{u}']);
  const count = Number.parseInt(stdout.trim(), 10);
  return Number.isFinite(count) ? count : 0;
}

export async function isWorkingTreeDirty(deps: GitDeps): Promise<boolean> {
  const { stdout } = await git(deps, ['status', '--porcelain']);
  return stdout.trim().length > 0;
}

export async function stashPush(deps: GitDeps, message: string): Promise<void> {
  await git(deps, ['stash', 'push', '--include-untracked', '-m', message]);
}

export async function stashPop(deps: GitDeps): Promise<void> {
  await git(deps, ['stash', 'pop']);
}

export async function mergeUpstream(deps: GitDeps): Promise<void> {
  await git(deps, ['merge', '--no-edit', '@{u}']);
}

export async function mergeAbort(deps: GitDeps): Promise<void> {
  await git(deps, ['merge', '--abort']);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const withStderr = error as Error & { stderr?: string };
    const stderr = typeof withStderr.stderr === 'string' ? withStderr.stderr.trim() : '';
    if (stderr) {
      return stderr;
    }
    return error.message;
  }
  return String(error);
}

const NETWORK_PATTERNS = [
  /ENOTFOUND/i,
  /ECONNRESET/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /EAI_AGAIN/i,
  /Could not resolve host/i,
  /Failed to connect/i,
  /Connection timed out/i,
  /network is unreachable/i,
  /SSL_ERROR_SYSCALL/i,
  /The remote end hung up/i,
  /unable to access/i,
];

export function isNetworkError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    if (
      code === 'ENOTFOUND' ||
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'EAI_AGAIN'
    ) {
      return true;
    }
  }
  const message = errorMessage(error);
  return NETWORK_PATTERNS.some((pattern) => pattern.test(message));
}

export function isConflictError(error: unknown): boolean {
  const message = errorMessage(error);
  return (
    /conflict/i.test(message) ||
    /CONFLICT/i.test(message) ||
    /Automatic merge failed/i.test(message) ||
    /would be overwritten by merge/i.test(message) ||
    /needs merge/i.test(message) ||
    /unmerged files/i.test(message)
  );
}
