import { defaultExecFile, type ExecFileFn, type GitDeps, type ReadFileFn } from '../git/exec.js';
import { errorMessage } from '../retry-policy/network-error.js';

export const SSH_FINGERPRINT_REASON =
  'SSH host fingerprint verification failed (host key not trusted; not auto-accepted)';

export const SSH_AUTH_REASON = 'SSH authentication failed (key-based login required)';

const SSH_OPTIONS = [
  '-o',
  'BatchMode=yes',
  '-o',
  'StrictHostKeyChecking=yes',
  '-o',
  'PasswordAuthentication=no',
  '-o',
  'KbdInteractiveAuthentication=no',
  '-o',
  'PreferredAuthentications=publickey',
  '-o',
  'NumberOfPasswordPrompts=0',
] as const;

export interface SshExecDeps {
  execFile?: ExecFileFn;
}

export function sshInvocationArgs(host: string, remoteArgs: readonly string[]): string[] {
  return [...SSH_OPTIONS, host, '--', ...remoteArgs];
}

export function createSshExecEnv(baseEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return {
    ...baseEnv,
    SSH_ASKPASS_REQUIRE: 'never',
    GIT_TERMINAL_PROMPT: '0',
  };
}

function execOptions(maxBuffer?: number): {
  maxBuffer: number;
  env: NodeJS.ProcessEnv;
} {
  return {
    maxBuffer: maxBuffer ?? 10 * 1024 * 1024,
    env: createSshExecEnv(),
  };
}

export function classifySshFailureReason(error: unknown): string {
  const message = errorMessage(error);
  if (
    /Host key verification failed/i.test(message) ||
    /REMOTE HOST IDENTIFICATION HAS CHANGED/i.test(message) ||
    /No ED25519 host key is known/i.test(message) ||
    /not found in known_hosts/i.test(message)
  ) {
    return SSH_FINGERPRINT_REASON;
  }
  if (/Permission denied/i.test(message) || /Too many authentication failures/i.test(message)) {
    return SSH_AUTH_REASON;
  }
  return message;
}

function rethrowAsSshFailure(error: unknown): never {
  throw new Error(classifySshFailureReason(error));
}

async function runSsh(
  host: string,
  remoteArgs: readonly string[],
  deps: SshExecDeps,
  maxBuffer?: number,
): Promise<{ stdout: string; stderr: string }> {
  const execFile = deps.execFile ?? defaultExecFile;
  try {
    return await execFile('ssh', sshInvocationArgs(host, remoteArgs), execOptions(maxBuffer));
  } catch (error) {
    rethrowAsSshFailure(error);
  }
}

export function expandRemoteHome(path: string, remoteHome: string): string {
  if (path === '~') {
    return remoteHome;
  }
  if (path.startsWith('~/')) {
    return `${remoteHome.replace(/\/$/, '')}/${path.slice(2)}`;
  }
  return path;
}

export async function resolveRemoteHome(host: string, deps: SshExecDeps = {}): Promise<string> {
  const { stdout } = await runSsh(host, ['printenv', 'HOME'], deps);
  const home = stdout.trim();
  if (home === '') {
    throw new Error(`SSH host "${host}" returned an empty HOME`);
  }
  return home;
}

export function createSshAccessPath(
  host: string,
  deps: SshExecDeps = {},
): (path: string) => Promise<void> {
  return async (path) => {
    await runSsh(host, ['test', '-e', path], deps);
  };
}

export function createSshReadFile(host: string, deps: SshExecDeps = {}): ReadFileFn {
  return async (path) => {
    const { stdout } = await runSsh(host, ['cat', '--', path], deps);
    return stdout;
  };
}

export function createSshGitDeps(host: string, deps: SshExecDeps = {}): GitDeps {
  const execFile: ExecFileFn = async (file, args, options) => {
    if (file !== 'git') {
      throw new Error(`SSH environment only supports git, got: ${file}`);
    }
    const remoteCwd = options?.cwd;
    if (remoteCwd === undefined || remoteCwd === '') {
      throw new Error('SSH git requires cwd (remote repo path)');
    }
    return runSsh(host, ['git', '-C', remoteCwd, ...args], deps, options?.maxBuffer);
  };

  return {
    execFile,
    readFile: createSshReadFile(host, deps),
  };
}
