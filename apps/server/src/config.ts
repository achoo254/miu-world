import { z } from 'zod';
import { DEFAULT_SCRYPT, type ScryptParams } from './auth/secret-hashing';

const DEV_ORIGINS = [5173, 5174, 4173, 4174].flatMap((port) => [`http://localhost:${port}`, `http://127.0.0.1:${port}`]);

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

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
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  /** Exact callback URL registered on the Google OAuth client, e.g. https://<host>/api/auth/google/callback. */
  GOOGLE_REDIRECT_URI: z.url().optional(),
  /** Test-only endpoint overrides (E2E fake Google); refused in production. */
  GOOGLE_AUTH_URL: z.url().optional(),
  GOOGLE_TOKEN_URL: z.url().optional(),
  /** `1` enables email+password sign-in: explicit opt-in for dev/test tooling; refused in production. */
  PASSWORD_LOGIN: z.enum(['0', '1']).optional(),
  /** Test-only folder of extra quest files (E2E plays fixture quests); refused in production. */
  EXTRA_QUEST_DIR: z.string().min(1).optional(),
  /** Folder holding the primary-school model handwriting font (kept out of git; see the deployment guide). */
  HANDWRITING_FONT_DIR: z.string().min(1).optional(),
  /**
   * JSON timetable every child starts from until her family saves its own (the owner's class; kept out of git
   * because it names a school and a teacher; see the deployment guide). Unset: the blank template.
   */
  TIMETABLE_DEFAULT_FILE: z.string().min(1).optional(),
  /** Test-only cap on password sign-ups per IP per hour (E2E creates a parent per spec); refused in production. */
  REGISTER_LIMIT_PER_HOUR: z.coerce.number().int().min(1).optional(),
  /**
   * Cloudflare TURN key (voice relay when two players find no direct path; see the deployment guide). Unset: voice
   * uses the public STUN server only.
   */
  CF_TURN_KEY_ID: z.string().regex(/^[A-Za-z0-9]{8,64}$/).optional(),
  CF_TURN_API_TOKEN: z.string().min(16).max(256).optional(),
});

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
}

/** The TURN key the server asks short-lived voice relay credentials with. */
export interface TurnConfig {
  keyId: string;
  apiToken: string;
}

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
  /** Google start/callback requests per 15 minutes per IP. */
  googleLimitPer15Min: number;
  /** Google sign-in; null when not configured (the button reports it as unavailable). */
  google: GoogleConfig | null;
  /** Email+password routes; hidden in the UI and always off in production. */
  passwordLogin: boolean;
  /** Extra quest files loaded next to the shipped ones (tests only). */
  extraQuestDir: string | null;
  /** Override for where the handwriting font files live; null uses `.data/fonts` in the repo. */
  handwritingFontDir: string | null;
  timetableDefaultFile: string | null;
  /** Voice relay credentials come from this key; null: STUN only. */
  turn: TurnConfig | null;
}

/** Validates env once at startup; throws with the offending key so the process fails fast. */
export function loadConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid server env: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  }
  const e = parsed.data;
  const production = e.NODE_ENV === 'production';
  if (production) {
    const missing = [
      !e.ALLOWED_ORIGINS && 'ALLOWED_ORIGINS',
      !e.DATABASE_URL && 'DATABASE_URL',
      !e.GOOGLE_CLIENT_ID && 'GOOGLE_CLIENT_ID',
      !e.GOOGLE_CLIENT_SECRET && 'GOOGLE_CLIENT_SECRET',
      !e.GOOGLE_REDIRECT_URI && 'GOOGLE_REDIRECT_URI',
    ].filter(Boolean);
    if (missing.length > 0) throw new Error(`Invalid server env: ${missing.join(', ')} required in production`);
    if (e.GOOGLE_AUTH_URL || e.GOOGLE_TOKEN_URL) throw new Error('Invalid server env: Google endpoint overrides are test-only');
    if (e.PASSWORD_LOGIN === '1') throw new Error('Invalid server env: PASSWORD_LOGIN is dev/test only');
    if (e.EXTRA_QUEST_DIR) throw new Error('Invalid server env: EXTRA_QUEST_DIR is test-only');
    if (e.REGISTER_LIMIT_PER_HOUR) throw new Error('Invalid server env: REGISTER_LIMIT_PER_HOUR is test-only');
  }
  // Outside production the endpoints may point at a local fake Google, never at another host.
  for (const [key, value] of [['GOOGLE_AUTH_URL', e.GOOGLE_AUTH_URL], ['GOOGLE_TOKEN_URL', e.GOOGLE_TOKEN_URL]] as const) {
    if (value && !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value).hostname)) {
      throw new Error(`Invalid server env: ${key} may only point at loopback`);
    }
  }
  // The ID token is trusted because it comes straight from Google over verified TLS.
  if (e.GOOGLE_CLIENT_ID && env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('Invalid server env: NODE_TLS_REJECT_UNAUTHORIZED=0 is not allowed with Google sign-in');
  }
  const googleParts = [e.GOOGLE_CLIENT_ID, e.GOOGLE_CLIENT_SECRET, e.GOOGLE_REDIRECT_URI];
  if (googleParts.some(Boolean) && !googleParts.every(Boolean)) {
    throw new Error('Invalid server env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI go together');
  }
  if (Boolean(e.CF_TURN_KEY_ID) !== Boolean(e.CF_TURN_API_TOKEN)) {
    throw new Error('Invalid server env: CF_TURN_KEY_ID and CF_TURN_API_TOKEN go together');
  }
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    allowedOrigins: e.ALLOWED_ORIGINS ?? DEV_ORIGINS,
    databaseUrl: e.DATABASE_URL,
    pgliteDir: e.PGLITE_DIR === 'memory' ? null : e.PGLITE_DIR,
    scrypt: DEFAULT_SCRYPT,
    registerLimitPerHour: e.REGISTER_LIMIT_PER_HOUR ?? 10,
    googleLimitPer15Min: 30,
    google:
      e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET && e.GOOGLE_REDIRECT_URI
        ? {
            clientId: e.GOOGLE_CLIENT_ID,
            clientSecret: e.GOOGLE_CLIENT_SECRET,
            redirectUri: e.GOOGLE_REDIRECT_URI,
            authUrl: e.GOOGLE_AUTH_URL ?? GOOGLE_AUTH_URL,
            tokenUrl: e.GOOGLE_TOKEN_URL ?? GOOGLE_TOKEN_URL,
          }
        : null,
    // Off unless asked for: a public review build must not let anyone pre-register a parent's email.
    passwordLogin: !production && e.PASSWORD_LOGIN === '1',
    extraQuestDir: production ? null : (e.EXTRA_QUEST_DIR ?? null),
    handwritingFontDir: e.HANDWRITING_FONT_DIR ?? null,
    timetableDefaultFile: e.TIMETABLE_DEFAULT_FILE ?? null,
    turn: e.CF_TURN_KEY_ID && e.CF_TURN_API_TOKEN ? { keyId: e.CF_TURN_KEY_ID, apiToken: e.CF_TURN_API_TOKEN } : null,
  };
}
