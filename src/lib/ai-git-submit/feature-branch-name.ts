import { randomBytes as defaultRandomBytes } from 'node:crypto';

const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local-time `feature/yyyyMMdd-HHmmss-${randomStr}`. */
export function formatFeatureBranchName(date: Date, randomStr: string): string {
  const yyyy = String(date.getFullYear());
  const MM = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const HH = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `feature/${yyyy}${MM}${dd}-${HH}${mm}${ss}-${randomStr}`;
}

export function createRandomAlphanumeric(
  length: number,
  randomBytes: (size: number) => Buffer = defaultRandomBytes,
): string {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i += 1) {
    const byte = bytes[i] ?? 0;
    result += ALPHANUMERIC[byte % ALPHANUMERIC.length];
  }
  return result;
}
