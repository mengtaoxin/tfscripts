import { describe, expect, it, vi } from 'vitest';
import { buildCaffeinateArgs, startWakeSession, stopWakeSession } from './session.js';
import type { WakeState } from './state.js';

describe('buildCaffeinateArgs', () => {
  it('builds idle-only args when screen is off', () => {
    expect(buildCaffeinateArgs({ hours: 2, screen: false })).toEqual(['-i', '-t', '7200']);
  });

  it('adds -d when screen stay-on is requested', () => {
    expect(buildCaffeinateArgs({ hours: 1, screen: true })).toEqual(['-i', '-d', '-t', '3600']);
  });
});

describe('stopWakeSession', () => {
  it('returns inactive when there is no live session', () => {
    const kill = vi.fn();
    const clearState = vi.fn();

    expect(
      stopWakeSession({
        readActive: () => null,
        kill,
        clearState,
      }),
    ).toEqual({ status: 'inactive' });
    expect(kill).not.toHaveBeenCalled();
    expect(clearState).not.toHaveBeenCalled();
  });

  it('kills the process and clears state when active', () => {
    const state: WakeState = {
      pid: 42,
      hours: 4,
      screen: false,
      startedAt: '2026-10-16T00:00:00.000Z',
      endsAt: '2026-10-16T04:00:00.000Z',
    };
    const kill = vi.fn();
    const clearState = vi.fn();

    expect(
      stopWakeSession({
        readActive: () => state,
        kill,
        clearState,
      }),
    ).toEqual({ status: 'stopped', state });
    expect(kill).toHaveBeenCalledWith(42);
    expect(clearState).toHaveBeenCalled();
  });
});

const fixedNow = () => new Date('2026-10-16T01:00:00.000Z');

describe('startWakeSession', () => {
  it('stops any previous session then starts a new detached caffeinate', () => {
    const previous: WakeState = {
      pid: 10,
      hours: 4,
      screen: false,
      startedAt: '2026-10-16T00:00:00.000Z',
      endsAt: '2026-10-16T04:00:00.000Z',
    };
    const stopExisting = vi.fn(() => ({ status: 'stopped' as const, state: previous }));
    const child = { pid: 99, unref: vi.fn() };
    const spawn = vi.fn(() => child);
    const writeState = vi.fn();

    const result = startWakeSession({
      hours: 2,
      screen: true,
      stopExisting,
      spawn,
      writeState,
      now: fixedNow,
    });

    expect(stopExisting).toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith('caffeinate', ['-i', '-d', '-t', '7200'], {
      detached: true,
      stdio: 'ignore',
    });
    expect(child.unref).toHaveBeenCalled();
    expect(writeState).toHaveBeenCalledWith({
      pid: 99,
      hours: 2,
      screen: true,
      startedAt: '2026-10-16T01:00:00.000Z',
      endsAt: '2026-10-16T03:00:00.000Z',
    });
    expect(result).toEqual({
      pid: 99,
      hours: 2,
      screen: true,
      startedAt: '2026-10-16T01:00:00.000Z',
      endsAt: '2026-10-16T03:00:00.000Z',
      replaced: true,
    });
  });
});
