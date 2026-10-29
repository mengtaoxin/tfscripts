export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, concurrency);
  const results: R[] = Array.from({ length: items.length });
  let nextIndex = 0;

  async function worker(): Promise<void> {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= items.length) {
      return;
    }
    const item = items[index];
    if (item === undefined) {
      return;
    }
    results[index] = await mapper(item, index);
    await worker();
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
