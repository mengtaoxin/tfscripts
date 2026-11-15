import type { CheckOneResult } from '../ops/check-one.js';
import type { RepoEntry } from '../infra/config.js';
import type { SyncOneResult, SyncStatus } from '../ops/sync-one.js';

const HEADER_REPO = 'REPO';
const HEADER_PATH = 'PATH';
const HEADER_BRANCH = 'BRANCH';
const HEADER_STATUS = 'STATUS';
const HEADER_AFTER_UPDATE = 'AFTER UPDATE';
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

function branchText(result: { readonly branch: string }): string {
  return result.branch || '-';
}

function statusText(result: SyncOneResult): string {
  const label = statusLabel(result.status);
  if (result.status === 'failed' && result.reason) {
    return `${label}: ${result.reason}`;
  }
  return label;
}

function afterUpdateText(result: SyncOneResult): string {
  const outcome = result.afterUpdate;
  if (outcome === undefined) {
    return '-';
  }
  if (outcome.kind === 'success') {
    return 'success';
  }
  return `failed: ${outcome.shortMessage} (log: ${outcome.logPath})`;
}

function pad(value: string, width: number): string {
  return value.padEnd(width, ' ');
}

export interface FormatResultTableOptions {
  readonly showAfterUpdate: boolean;
}

export function formatResultTable(
  results: readonly SyncOneResult[],
  options?: FormatResultTableOptions,
): string[] {
  let nameWidth = HEADER_REPO.length;
  let branchWidth = HEADER_BRANCH.length;
  let statusWidth = HEADER_STATUS.length;

  for (const result of results) {
    nameWidth = Math.max(nameWidth, result.name.length);
    branchWidth = Math.max(branchWidth, branchText(result).length);
    statusWidth = Math.max(statusWidth, statusText(result).length);
  }

  const showAfterUpdate = options?.showAfterUpdate === true;

  const header = [
    pad(HEADER_REPO, nameWidth),
    pad(HEADER_BRANCH, branchWidth),
    showAfterUpdate ? pad(HEADER_STATUS, statusWidth) : HEADER_STATUS,
    ...(showAfterUpdate ? [HEADER_AFTER_UPDATE] : []),
  ].join(COLUMN_GAP);

  const rows = results.map((result) => {
    const status = statusText(result);
    return [
      pad(result.name, nameWidth),
      pad(branchText(result), branchWidth),
      showAfterUpdate ? pad(status, statusWidth) : status,
      ...(showAfterUpdate ? [afterUpdateText(result)] : []),
    ].join(COLUMN_GAP);
  });

  return [header, ...rows];
}

export function formatProgressLine(completed: number, total: number): string {
  return `repos processing: ${completed}/${total}`;
}

function countOrDash(value: number): string {
  return value === 0 ? '-' : String(value);
}

function commitCountHeader(days: number): string {
  return `COMMITS (${days}d)`;
}

function commitCountText(value: number | null | undefined): string {
  return value === null || value === undefined ? '-' : String(value);
}

export function formatListTable(repos: readonly RepoEntry[]): string[] {
  let nameWidth = HEADER_REPO.length;

  for (const entry of repos) {
    nameWidth = Math.max(nameWidth, entry.name.length);
  }

  const header = [pad(HEADER_REPO, nameWidth), HEADER_PATH].join(COLUMN_GAP);
  const rows = repos.map((entry) => [pad(entry.name, nameWidth), entry.path].join(COLUMN_GAP));
  return [header, ...rows];
}

export interface FormatCheckTableOptions {
  readonly showCommitCountDays: number;
}

export function formatCheckTable(
  results: readonly CheckOneResult[],
  options?: FormatCheckTableOptions,
): string[] {
  let nameWidth = HEADER_REPO.length;
  let branchWidth = HEADER_BRANCH.length;
  let remoteWidth = HEADER_REMOTE.length;
  let aheadWidth = HEADER_LOCAL_AHEAD.length;
  let dirtyWidth = HEADER_DIRTY_LINES.length;

  for (const result of results) {
    nameWidth = Math.max(nameWidth, result.name.length);
    branchWidth = Math.max(branchWidth, branchText(result).length);
    if (result.status === 'ok') {
      remoteWidth = Math.max(remoteWidth, countOrDash(result.remoteBehind).length);
      aheadWidth = Math.max(aheadWidth, countOrDash(result.localAhead).length);
      dirtyWidth = Math.max(dirtyWidth, countOrDash(result.dirtyLines).length);
    }
  }

  const showCommits = options !== undefined;
  const commitsHeader = showCommits ? commitCountHeader(options.showCommitCountDays) : undefined;

  const header = [
    pad(HEADER_REPO, nameWidth),
    pad(HEADER_BRANCH, branchWidth),
    pad(HEADER_REMOTE, remoteWidth),
    pad(HEADER_LOCAL_AHEAD, aheadWidth),
    showCommits ? pad(HEADER_DIRTY_LINES, dirtyWidth) : HEADER_DIRTY_LINES,
    ...(commitsHeader !== undefined ? [commitsHeader] : []),
  ].join(COLUMN_GAP);

  const rows = results.map((result) => {
    if (result.status === 'failed') {
      const reason = result.reason ? `: ${result.reason}` : '';
      return [
        pad(result.name, nameWidth),
        pad(branchText(result), branchWidth),
        `✗ failed${reason}`,
      ].join(COLUMN_GAP);
    }
    const dirtyText = countOrDash(result.dirtyLines);
    return [
      pad(result.name, nameWidth),
      pad(branchText(result), branchWidth),
      pad(countOrDash(result.remoteBehind), remoteWidth),
      pad(countOrDash(result.localAhead), aheadWidth),
      showCommits ? pad(dirtyText, dirtyWidth) : dirtyText,
      ...(showCommits ? [commitCountText(result.commitCount)] : []),
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
