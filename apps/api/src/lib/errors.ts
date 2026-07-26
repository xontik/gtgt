export class NotFoundError extends Error {}

export function isNotFoundError(err: unknown): err is NotFoundError {
  return err instanceof NotFoundError;
}
