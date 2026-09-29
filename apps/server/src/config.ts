import { z } from 'zod';
import { DEFAULT_SCRYPT, type ScryptParams } from './auth/secret-hashing';

const DEV_ORIGINS = [5173, 5174, 4173, 4174].flatMap((port) => [`http://localhost:${port}`, `http://127.0.0.1:${port}`]);

const originList = z
  .string()
  .transform((raw) => raw.split(',').map((o) => o.trim()).filter(Boolean))
  .pipe(z.array(z.url()).min(1));

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  ALLOWED_ORIGINS: originList.optional(),
  DATABASE_URL: z.url().optional(),
  /** PGlite directory for dev; `memory` keeps it in RAM (E2E runs start from an empty database). */
  PGLITE_DIR: z.string().min(1).optional(),
});

export interface ServerConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  /** Origins allowed to make state-changing requests (CSRF check). */
  allowedOrigins: string[];
  /** Postgres connection; absent in dev/test, where embedded PGlite is used. */
  databaseUrl: string | undefined;
  /** PGlite location when no DATABASE_URL: a directory, or null for in-memory. */
  pgliteDir: string | null | undefined;
  /** Hash cost for passwords and PINs; tests lower it, production keeps the default. */
  scrypt: ScryptParams;
  /** Requests per window per IP for account creation. */
  registerLimitPerHour: number;
}

/** Validates env once at startup; throws with the offending key so the process fails fast. */
export function loadConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid server env: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  }
  const { NODE_ENV, PORT, ALLOWED_ORIGINS, DATABASE_URL, PGLITE_DIR } = parsed.data;
  if (NODE_ENV === 'production') {
    const missing = [!ALLOWED_ORIGINS && 'ALLOWED_ORIGINS', !DATABASE_URL && 'DATABASE_URL'].filter(Boolean);
    if (missing.length > 0) throw new Error(`Invalid server env: ${missing.join(', ')} required in production`);
  }
  return {
    nodeEnv: NODE_ENV,
    port: PORT,
    allowedOrigins: ALLOWED_ORIGINS ?? DEV_ORIGINS,
    databaseUrl: DATABASE_URL,
    pgliteDir: PGLITE_DIR === 'memory' ? null : PGLITE_DIR,
    scrypt: DEFAULT_SCRYPT,
    registerLimitPerHour: 10,
  };
}
