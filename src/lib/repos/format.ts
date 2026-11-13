import type { CheckOneResult } from './check-one.js';
import type { RepoEntry } from './config.js';
import type { SyncOneResult, SyncStatus } from './sync-one.js';

const HEADER_REPO = 'REPO';
const HEADER_PATH = 'PATH';
const HEADER_BRANCH = 'BRANCH';
const HEADER_STATUS = 'STATUS';
const HEADER_REMOTE = 'REMOTE';
const HEADER_LOCAL_AHEAD = 'LOCAL AHEAD';
const HEADER_DIRTY_LINES = 'DIRTY LINES';
const COLUMN_GAP = '  ';

export function statusLabel(status: SyncStatus): string {
  switch (status) {
    case 'up-to-date':
      return '✓ up to date';
    case 'updated':
      return '↑ updated';
    case 'failed':
      return '✗ failed';
  }
}

function branchText(result: SyncOneResult): string {
  return result.branch || '-';
}

function statusText(result: SyncOneResult): string {
  const label = statusLabel(result.status);
  if (result.status === 'failed' && result.reason) {
    return `${label}: ${result.reason}`;
  }
  return label;
}

function pad(value: string, width: number): string {
  return value.padEnd(width, ' ');
}

export function formatResultTable(results: readonly SyncOneResult[]): string[] {
  let nameWidth = HEADER_REPO.length;
  let branchWidth = HEADER_BRANCH.length;

  for (const result of results) {
    nameWidth = Math.max(nameWidth, result.name.length);
    branchWidth = Math.max(branchWidth, branchText(result).length);
  }

  const header = [pad(HEADER_REPO, nameWidth), pad(HEADER_BRANCH, branchWidth), HEADER_STATUS].join(
    COLUMN_GAP,
  );

  const rows = results.map((result) =>
    [pad(result.name, nameWidth), pad(branchText(result), branchWidth), statusText(result)].join(
      COLUMN_GAP,
    ),
  );

  return [header, ...rows];
}

export function formatProgressLine(completed: number, total: number): string {
  return `repos processing: ${completed}/${total}`;
}

function countOrDash(value: number): string {
  return value === 0 ? '-' : String(value);
}

export interface FormatListTableOptions {
  readonly showCommitCountDays: number;
  readonly commitCounts: readonly (number | null)[];
}

function commitCountHeader(days: number): string {
  return `COMMITS (${days}d)`;
}

function commitCountText(value: number | null): string {
  return value === null ? '-' : String(value);
}

export function formatListTable(
  repos: readonly RepoEntry[],
  options?: FormatListTableOptions,
): string[] {
  let nameWidth = HEADER_REPO.length;
  let pathWidth = HEADER_PATH.length;

  for (const entry of repos) {
    nameWidth = Math.max(nameWidth, entry.name.length);
    pathWidth = Math.max(pathWidth, entry.path.length);
  }

  if (options === undefined) {
    const header = [pad(HEADER_REPO, nameWidth), HEADER_PATH].join(COLUMN_GAP);
    const rows = repos.map((entry) => [pad(entry.name, nameWidth), entry.path].join(COLUMN_GAP));
    return [header, ...rows];
  }

  const commitsHeader = commitCountHeader(options.showCommitCountDays);
  const header = [pad(HEADER_REPO, nameWidth), pad(HEADER_PATH, pathWidth), commitsHeader].join(
    COLUMN_GAP,
  );

  const rows = repos.map((entry, index) => {
    const count = options.commitCounts[index] ?? null;
    return [pad(entry.name, nameWidth), pad(entry.path, pathWidth), commitCountText(count)].join(
      COLUMN_GAP,
    );
  });

  return [header, ...rows];
}

export function formatCheckTable(results: readonly CheckOneResult[]): string[] {
  let nameWidth = HEADER_REPO.length;
  let remoteWidth = HEADER_REMOTE.length;
  let aheadWidth = HEADER_LOCAL_AHEAD.length;

  for (const result of results) {
    nameWidth = Math.max(nameWidth, result.name.length);
    if (result.status === 'ok') {
      remoteWidth = Math.max(remoteWidth, countOrDash(result.remoteBehind).length);
      aheadWidth = Math.max(aheadWidth, countOrDash(result.localAhead).length);
    }
  }

  const header = [
    pad(HEADER_REPO, nameWidth),
    pad(HEADER_REMOTE, remoteWidth),
    pad(HEADER_LOCAL_AHEAD, aheadWidth),
    HEADER_DIRTY_LINES,
  ].join(COLUMN_GAP);

  const rows = results.map((result) => {
    if (result.status === 'failed') {
      const reason = result.reason ? `: ${result.reason}` : '';
      return `${pad(result.name, nameWidth)}${COLUMN_GAP}✗ failed${reason}`;
    }
    return [
      pad(result.name, nameWidth),
      pad(countOrDash(result.remoteBehind), remoteWidth),
      pad(countOrDash(result.localAhead), aheadWidth),
      countOrDash(result.dirtyLines),
    ].join(COLUMN_GAP);
  });

  return [header, ...rows];
}

export function formatSummary(results: readonly SyncOneResult[]): string {
  let upToDate = 0;
  let updated = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === 'up-to-date') {
      upToDate += 1;
    } else if (result.status === 'updated') {
      updated += 1;
    } else {
      failed += 1;
    }
  }
  return `Summary: ${results.length} repos / ${upToDate} up to date / ${updated} updated / ${failed} failed`;
}
