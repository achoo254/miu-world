import { z } from 'zod';

/** `GET /api/health` response. */
export const HealthResponse = z.object({ status: z.literal('ok') });
export type HealthResponse = z.infer<typeof HealthResponse>;
