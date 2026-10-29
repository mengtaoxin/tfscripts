import type { SyncOneResult, SyncStatus } from './sync-one.js';

export function statusLabel(status: SyncStatus): string {
  switch (status) {
    case 'up-to-date':
      return '✓ 无需更新';
    case 'updated':
      return '↑ 成功拉取更新';
    case 'failed':
      return '✗ 拉取失败';
  }
}

export function formatResultLine(result: SyncOneResult): string {
  const label = statusLabel(result.status);
  const branch = result.branch || '-';
  if (result.status === 'failed' && result.reason) {
    return `${result.name}    ${branch}    ${label}: ${result.reason}`;
  }
  return `${result.name}    ${branch}    ${label}`;
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
  return `汇总: ${upToDate} 无需更新 / ${updated} 已更新 / ${failed} 失败`;
}
