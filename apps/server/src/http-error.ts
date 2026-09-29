import type { z } from 'zod';

/** An error whose status and stable code are safe to send to the client. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'HttpError';
  }
}

/** Validates input; any schema failure becomes a 400 without echoing the offending values. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new HttpError(400, 'invalid-input');
  return result.data;
}
