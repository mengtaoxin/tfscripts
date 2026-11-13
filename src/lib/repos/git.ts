import { readFile as readFileFs } from 'node:fs/promises';
import { join } from 'node:path';
import { getBranchName } from '../git/branch.js';
import { isConflictError } from '../git/errors.js';
import { execGit, withGitDefaults, type ExecFileFn, type GitDeps } from '../git/exec.js';

export type { ExecFileFn, GitDeps };
export { getBranchName };
export { errorMessage, isNetworkError } from '../retry-policy/network-error.js';
export { isConflictError };

export async function getUpstreamRef(deps: GitDeps): Promise<string> {
  const { stdout } = await execGit(deps, ['rev-parse', '--abbrev-ref', '@{u}']);
  return stdout.trim();
}

export async function fetchUpstream(deps: GitDeps): Promise<void> {
  await execGit(deps, ['fetch', '--prune']);
}

export async function countBehindUpstream(deps: GitDeps): Promise<number> {
  const { stdout } = await execGit(deps, ['rev-list', '--count', 'HEAD..@{u}']);
  const count = Number.parseInt(stdout.trim(), 10);
  return Number.isFinite(count) ? count : 0;
}

export async function countAheadUpstream(deps: GitDeps): Promise<number> {
  const { stdout } = await execGit(deps, ['rev-list', '--count', '@{u}..HEAD']);
  const count = Number.parseInt(stdout.trim(), 10);
  return Number.isFinite(count) ? count : 0;
}

export async function countCommitsSince(deps: GitDeps, days: number): Promise<number> {
  const { stdout } = await execGit(deps, [
    'rev-list',
    '--count',
    `--since=${days} days ago`,
    'HEAD',
  ]);
  const count = Number.parseInt(stdout.trim(), 10);
  return Number.isFinite(count) ? count : 0;
}

function parseNumstatLines(stdout: string): number {
  let total = 0;
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') {
      continue;
    }
    const [addedRaw, deletedRaw] = trimmed.split('\t');
    const added = addedRaw === '-' ? 0 : Number.parseInt(addedRaw ?? '', 10);
    const deleted = deletedRaw === '-' ? 0 : Number.parseInt(deletedRaw ?? '', 10);
    if (Number.isFinite(added)) {
      total += added;
    }
    if (Number.isFinite(deleted)) {
      total += deleted;
    }
  }
  return total;
}

function countTextLines(contents: string): number {
  if (contents === '') {
    return 0;
  }
  const normalized = contents.endsWith('\n') ? contents.slice(0, -1) : contents;
  if (normalized === '') {
    return 0;
  }
  return normalized.split('\n').length;
}

export async function countDirtyLines(deps: GitDeps): Promise<number> {
  const resolved = withGitDefaults(deps);
  const readFile = deps.readFile ?? ((path) => readFileFs(path, 'utf8'));
  const cwd = resolved.cwd ?? process.cwd();

  const { stdout: numstat } = await execGit(deps, ['diff', '--numstat', 'HEAD']);
  let total = parseNumstatLines(numstat);

  const { stdout: untrackedStdout } = await execGit(deps, ['ls-files', '-o', '--exclude-standard']);
  const untracked = untrackedStdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const untrackedCounts = await Promise.all(
    untracked.map(async (relativePath) => {
      try {
        const contents = await readFile(join(cwd, relativePath));
        return countTextLines(contents);
      } catch {
        // skip unreadable untracked paths (e.g. directories)
        return 0;
      }
    }),
  );
  for (const count of untrackedCounts) {
    total += count;
  }

  return total;
}

export async function isWorkingTreeDirty(deps: GitDeps): Promise<boolean> {
  const { stdout } = await execGit(deps, ['status', '--porcelain']);
  return stdout.trim().length > 0;
}

export async function stashPush(deps: GitDeps, message: string): Promise<void> {
  await execGit(deps, ['stash', 'push', '--include-untracked', '-m', message]);
}

export async function stashPop(deps: GitDeps): Promise<void> {
  await execGit(deps, ['stash', 'pop']);
}

export async function mergeUpstream(deps: GitDeps): Promise<void> {
  await execGit(deps, ['merge', '--no-edit', '@{u}']);
}

export async function mergeAbort(deps: GitDeps): Promise<void> {
  await execGit(deps, ['merge', '--abort']);
}
