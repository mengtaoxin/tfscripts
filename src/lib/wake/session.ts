import { spawn, type ChildProcess } from 'node:child_process';
import type { WakeState } from './state.js';

export interface WakeOptions {
  hours: number;
  screen: boolean;
}

export function buildCaffeinateArgs(options: WakeOptions): string[] {
  const seconds = String(options.hours * 3600);
  if (options.screen) {
    return ['-i', '-d', '-t', seconds];
  }
  return ['-i', '-t', seconds];
}

export type StopResult = { status: 'inactive' } | { status: 'stopped'; state: WakeState };

export interface StopWakeSessionDeps {
  readActive: () => WakeState | null;
  kill: (pid: number) => void;
  clearState: () => void;
}

export function stopWakeSession(deps: StopWakeSessionDeps): StopResult {
  const state = deps.readActive();
  if (state === null) {
    return { status: 'inactive' };
  }

  try {
    deps.kill(state.pid);
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH')) {
      throw error;
    }
  }

  deps.clearState();
  return { status: 'stopped', state };
}

export interface StartWakeSessionDeps {
  hours: number;
  screen: boolean;
  stopExisting: () => StopResult;
  spawn: (
    command: string,
    args: readonly string[],
    options: { detached: boolean; stdio: 'ignore' },
  ) => Pick<ChildProcess, 'pid' | 'unref'>;
  writeState: (state: WakeState) => void;
  now: () => Date;
}

export interface StartWakeSessionResult extends WakeState {
  replaced: boolean;
}

export function startWakeSession(deps: StartWakeSessionDeps): StartWakeSessionResult {
  const stopResult = deps.stopExisting();
  const args = buildCaffeinateArgs({ hours: deps.hours, screen: deps.screen });
  const child = deps.spawn('caffeinate', args, { detached: true, stdio: 'ignore' });
  child.unref();

  if (child.pid === undefined) {
    throw new Error('Failed to start caffeinate: no PID returned.');
  }

  const started = deps.now();
  const ends = new Date(started.getTime() + deps.hours * 3600 * 1000);
  const state: WakeState = {
    pid: child.pid,
    hours: deps.hours,
    screen: deps.screen,
    startedAt: started.toISOString(),
    endsAt: ends.toISOString(),
  };

  deps.writeState(state);

  return {
    ...state,
    replaced: stopResult.status === 'stopped',
  };
}

export function defaultKill(pid: number): void {
  process.kill(pid, 'SIGTERM');
}

export function defaultSpawn(
  command: string,
  args: readonly string[],
  options: { detached: boolean; stdio: 'ignore' },
): ChildProcess {
  return spawn(command, [...args], options);
}
