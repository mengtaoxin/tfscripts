import {
  getLastRemoteOperationTime,
  readReposState,
  setLastRemoteOperationTime,
  type SetLastRemoteOperationTimeDeps,
} from './state.js';

export const REMOTE_OPERATION_THROTTLED_REASON = 'remote operation throttled; try again later';

export function isRemoteOperationThrottled(
  lastIso: string | undefined,
  nowMs: number,
  throttlingSeconds: number,
): boolean {
  if (lastIso === undefined) {
    return false;
  }
  const lastMs = Date.parse(lastIso);
  if (Number.isNaN(lastMs)) {
    return false;
  }
  return nowMs - lastMs < throttlingSeconds * 1000;
}

export type TryBeginRemoteOperationResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: typeof REMOTE_OPERATION_THROTTLED_REASON };

export interface TryBeginRemoteOperationDeps extends Omit<
  SetLastRemoteOperationTimeDeps,
  'isoTime' | 'key'
> {
  key: string;
  throttlingSeconds: number;
  now?: () => Date;
}

export function tryBeginRemoteOperation(
  deps: TryBeginRemoteOperationDeps,
): TryBeginRemoteOperationResult {
  const now = deps.now ?? (() => new Date());
  const nowDate = now();
  const state = readReposState({
    statePath: deps.statePath,
    ...(deps.readFile !== undefined ? { readFile: deps.readFile } : {}),
  });
  const lastIso = getLastRemoteOperationTime(state, deps.key);
  if (isRemoteOperationThrottled(lastIso, nowDate.getTime(), deps.throttlingSeconds)) {
    return { allowed: false, reason: REMOTE_OPERATION_THROTTLED_REASON };
  }

  setLastRemoteOperationTime({
    statePath: deps.statePath,
    key: deps.key,
    isoTime: nowDate.toISOString(),
    ...(deps.readFile !== undefined ? { readFile: deps.readFile } : {}),
    ...(deps.mkdir !== undefined ? { mkdir: deps.mkdir } : {}),
    ...(deps.writeFile !== undefined ? { writeFile: deps.writeFile } : {}),
  });
  return { allowed: true };
}
