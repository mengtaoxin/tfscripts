import { describe, expect, it } from 'vitest';
import { mapPool } from './pool.js';

describe('mapPool', () => {
  it('preserves input order in results', async () => {
    const results = await mapPool([1, 2, 3], 2, async (n) => n * 10);
    expect(results).toEqual([10, 20, 30]);
  });

  it('never runs more than the concurrency limit at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = [1, 2, 3, 4, 5];

    await mapPool(items, 2, async (n) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
      return n;
    });

    expect(maxInFlight).toBeLessThanOrEqual(2);
    expect(maxInFlight).toBe(2);
  });
});
