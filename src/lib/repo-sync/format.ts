import type { SyncOneResult, SyncStatus } from './sync-one.js';

const HEADER_REPO = 'REPO';
const HEADER_BRANCH = 'BRANCH';
const HEADER_STATUS = 'STATUS';
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
  return `repo-sync processing: ${completed}/${total}`;
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
