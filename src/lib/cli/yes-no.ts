export function parseYesNo(raw: string): boolean | null {
  const normalized = raw.toLowerCase();
  if (normalized === 'yes') {
    return true;
  }
  if (normalized === 'no') {
    return false;
  }
  return null;
}
