import { access } from 'node:fs/promises';
import type { RepoEntry } from './config.js';
import type { ExecFileFn, GitDeps } from '../../git/exec.js';
import {
  createSshAccessPath,
  createSshGitDeps,
  expandRemoteHome,
  resolveRemoteHome,
} from './ssh.js';

export interface ResolvedRepoTarget {
  entry: RepoEntry;
  git: GitDeps;
  accessPath: (path: string) => Promise<void>;
}

export interface ResolveRepoTargetDeps {
  git?: GitDeps;
  accessPath?: (path: string) => Promise<void>;
  execFile?: ExecFileFn;
  resolveRemoteHome?: (host: string) => Promise<string>;
  remoteHomeCache?: Map<string, string>;
}

async function remoteHomeFor(host: string, deps: ResolveRepoTargetDeps): Promise<string> {
  const cached = deps.remoteHomeCache?.get(host);
  if (cached !== undefined) {
    return cached;
  }
  const resolve =
    deps.resolveRemoteHome ??
    ((sshHost: string) =>
      resolveRemoteHome(sshHost, { execFile: deps.execFile ?? deps.git?.execFile }));
  const home = await resolve(host);
  deps.remoteHomeCache?.set(host, home);
  return home;
}

export async function resolveRepoTarget(
  entry: RepoEntry,
  deps: ResolveRepoTargetDeps = {},
): Promise<ResolvedRepoTarget> {
  if (entry.environment !== 'ssh') {
    return {
      entry,
      git: { ...deps.git, cwd: deps.git?.cwd ?? entry.path },
      accessPath: deps.accessPath ?? ((path) => access(path)),
    };
  }

  const host = entry.sshHost;
  if (host === undefined || host === '') {
    throw new Error('ssh-host is required when environment is "ssh"');
  }

  const remoteHome = await remoteHomeFor(host, deps);
  const path = expandRemoteHome(entry.path, remoteHome);
  const resolvedEntry: RepoEntry = { ...entry, path };
  const sshGit = createSshGitDeps(host, {
    execFile: deps.execFile ?? deps.git?.execFile,
    execFileWithStdin: deps.git?.execFileWithStdin,
  });

  return {
    entry: resolvedEntry,
    git: {
      ...sshGit,
      ...deps.git,
      cwd: deps.git?.cwd ?? path,
      execFile: deps.git?.execFile ?? sshGit.execFile,
      execFileWithStdin: deps.git?.execFileWithStdin ?? sshGit.execFileWithStdin,
      readFile: deps.git?.readFile ?? sshGit.readFile,
    },
    accessPath:
      deps.accessPath ??
      createSshAccessPath(host, { execFile: deps.execFile ?? deps.git?.execFile }),
  };
}
