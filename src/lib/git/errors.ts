import { errorMessage } from '../retry-policy/network-error.js';

export { errorMessage } from '../retry-policy/network-error.js';

export function isConflictError(error: unknown): boolean {
  const message = errorMessage(error);
  return (
    /conflict/i.test(message) ||
    /CONFLICT/i.test(message) ||
    /Automatic merge failed/i.test(message) ||
    /would be overwritten by merge/i.test(message) ||
    /needs merge/i.test(message) ||
    /unmerged files/i.test(message)
  );
}
