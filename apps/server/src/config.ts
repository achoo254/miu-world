import { z } from 'zod';
import { defineBrand } from '@shared-next/brand';
import { OnlineMode } from '@miu/schema/multiplayer';
import brandConfig from '../../../brand.config.json' with { type: 'json' };
import { APP_ORIGINS } from './auth/app-cors';
import { DEFAULT_SCRYPT, type ScryptParams } from './auth/secret-hashing';

const DEV_ORIGINS = [5173, 5174, 4173, 4174].flatMap((port) => [`http://localhost:${port}`, `http://127.0.0.1:${port}`]);

const brand = defineBrand(brandConfig);
/** The account service of the primary tenant (brand.config.json), where parents sign in. */
export const DEFAULT_IDP_ISSUER = brand.primaryTenant.issuer;
export const DEFAULT_WEB_CLIENT_ID = 'miu-web';
export const DEFAULT_MOBILE_CLIENT_ID = 'miu-mobile';
/** The app's private-use redirect (RFC 8252 §7.1), on the scheme of brand.config.json. */
export const DEFAULT_MOBILE_REDIRECT_URI = `${brand.urlScheme}:/auth/callback`;
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

const originList = z
  .string()
  .transform((raw) => raw.split(',').map((o) => o.trim()).filter(Boolean))
  .pipe(z.array(z.url()).min(1));

/** An env line with nothing after `=` counts as not set. */
const emptyIsUnset = (value: unknown): unknown => (value === '' ? undefined : value);

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  ALLOWED_ORIGINS: originList.optional(),
  DATABASE_URL: z.url().optional(),
  /** PGlite directory for dev; `memory` keeps it in RAM (E2E runs start from an empty database). */
  PGLITE_DIR: z.string().min(1).optional(),
  /** Issuer of the account service (auth-next). Default: the primary tenant's, https://auth.hoandat.com. */
  OIDC_ISSUER: z.preprocess(emptyIsUnset, z.url().optional()),
  OIDC_WEB_CLIENT_ID: z.preprocess(emptyIsUnset, z.string().min(1).optional()),
  /** Secret of the confidential web client (`miu-web`), from the IdP's MIU_WEB_CLIENT_SECRET. */
  OIDC_WEB_CLIENT_SECRET: z.preprocess(emptyIsUnset, z.string().min(32).optional()),
  /** Exact callback registered on the web client, e.g. https://<host>/api/auth/callback. */
  OIDC_REDIRECT_URI: z.preprocess(emptyIsUnset, z.url().optional()),
  OIDC_MOBILE_CLIENT_ID: z.preprocess(emptyIsUnset, z.string().min(1).optional()),
  /** Redirect of the app's public client (`miu-mobile`). Default: com.hoandat.miu:/auth/callback. */
  OIDC_MOBILE_REDIRECT_URI: z.preprocess(emptyIsUnset, z.string().regex(/^[a-z][a-z0-9+.-]*\.[a-z0-9+.-]+:\/[^/]/).optional()),
  /** `1` enables email+password sign-in: explicit opt-in for dev/test tooling; refused in production. */
  PASSWORD_LOGIN: z.enum(['0', '1']).optional(),
  /** Test-only folder of extra quest files (E2E plays fixture quests); refused in production. */
  EXTRA_QUEST_DIR: z.string().min(1).optional(),
  /**
   * JSON timetable every child starts from until her family saves its own (the owner's class; kept out of git
   * because it names a school and a teacher; see the deployment guide). Unset: the blank template.
   */
  TIMETABLE_DEFAULT_FILE: z.string().min(1).optional(),
  /**
   * Comma-separated sign-in emails of the accounts that see that timetable (the owner's family). Unset: every account
   * outside production, none in production, so a stranger never reads a real class.
   */
  TIMETABLE_DEFAULT_ACCOUNTS: z.string().optional(),
  /**
   * Comma-separated sign-in emails of the moderators (the owner): they see the report queue and the emergency
   * switch, and get the daily digest of new reports in their mailbox. Unset: nobody moderates.
   */
  MODERATOR_ACCOUNTS: z.string().optional(),
  /**
   * The emergency switch the server starts with (`on`, `interaction-off`, `off`); a moderator can flip it while the
   * server runs, and a restart goes back to this. Unset: `on`.
   */
  ONLINE_MODE: z.preprocess(emptyIsUnset, OnlineMode.optional()),
  /** Test-only cap on password sign-ups per IP per hour (E2E creates a parent per spec); refused in production. */
  REGISTER_LIMIT_PER_HOUR: z.coerce.number().int().min(1).optional(),
  /**
   * Cloudflare TURN key (voice relay when two players find no direct path; see the deployment guide). Unset: voice
   * uses the public STUN server only.
   */
  CF_TURN_KEY_ID: z.preprocess(emptyIsUnset, z.string().regex(/^[A-Za-z0-9]{8,64}$/).optional()),
  CF_TURN_API_TOKEN: z.preprocess(emptyIsUnset, z.string().min(16).max(256).optional()),
  /**
   * Google Analytics 4 property and Measurement Protocol secret: the server sends anonymous usage events (see the
   * deployment guide). Unset (dev, test, E2E, staging): nothing is sent.
   */
  GA4_MEASUREMENT_ID: z.preprocess(emptyIsUnset, z.string().regex(/^G-[A-Z0-9]{6,12}$/).optional()),
  GA4_API_SECRET: z.preprocess(emptyIsUnset, z.string().min(8).max(128).regex(/^\S+$/).optional()),
});

/** Sign-in through the account service: the web's confidential client and the app's public one. */
export interface IdpConfig {
  issuer: string;
  web: { clientId: string; clientSecret: string; redirectUri: string };
  mobile: { clientId: string; redirectUri: string };
}

/** The GA4 property and secret anonymous usage events are sent with (Measurement Protocol). */
export interface Ga4Config {
  measurementId: string;
  apiSecret: string;
}

/** The TURN key the server asks short-lived voice relay credentials with. */
export interface TurnConfig {
  keyId: string;
  apiToken: string;
}

export interface ServerConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  /** Origins of the web app allowed to make state-changing requests (CSRF check). */
  allowedOrigins: string[];
  /**
   * Origins of the iPhone/Android app: allowed by the CSRF and multiplayer checks too, and the only ones the API
   * answers cross-origin (CORS, without credentials). Always `APP_ORIGINS`; tests may inject.
   */
  appOrigins: readonly string[];
  /** Postgres connection; absent in dev/test, where embedded PGlite is used. */
  databaseUrl: string | undefined;
  /** PGlite location when no DATABASE_URL: a directory, or null for in-memory. */
  pgliteDir: string | null | undefined;
  /** Hash cost for passwords and PINs; tests lower it, production keeps the default. */
  scrypt: ScryptParams;
  /** Requests per window per IP for account creation. */
  registerLimitPerHour: number;
  /** Sign-in start/callback/exchange requests per 15 minutes per IP. */
  signInLimitPer15Min: number;
  /** Sign-in through the account service; null when not configured (the button reports it as unavailable). */
  idp: IdpConfig | null;
  /** Email+password routes; hidden in the UI and always off in production. */
  passwordLogin: boolean;
  /** Extra quest files loaded next to the shipped ones (tests only). */
  extraQuestDir: string | null;
  timetableDefaultFile: string | null;
  /** Lower-case emails that get the default timetable; null: every account (never in production). */
  timetableDefaultAccounts: ReadonlySet<string> | null;
  /** Lower-case sign-in emails of the moderators; empty: nobody moderates. */
  moderatorAccounts: ReadonlySet<string>;
  /** Online play as the server starts: on, interaction off (players still see each other), or off. */
  onlineMode: OnlineMode;
  /** Voice relay credentials come from this key; null: STUN only. */
  turn: TurnConfig | null;
  /** Usage events go to this GA4 property; null: none is sent. */
  ga4: Ga4Config | null;
  /** Analytics events the web app may post per minute per IP: wide, a school's pupils share one address. */
  analyticsLimitPerMinute: number;
  /** Analytics events per minute per GA client id (one browser): the narrow cap that stops one browser flooding. */
  analyticsClientLimitPerMinute: number;
}

/** A comma-separated email list, lower-cased (sign-in emails are stored lower-case). */
const emailSet = (list: string): Set<string> => new Set(list.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));

/** The accounts that see the default timetable: the listed emails; unset, everyone in dev and test, nobody in production. */
function timetableAccounts(list: string | undefined, production: boolean): ReadonlySet<string> | null {
  if (list === undefined) return production ? new Set() : null;
  return emailSet(list);
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
      !e.OIDC_WEB_CLIENT_SECRET && 'OIDC_WEB_CLIENT_SECRET',
      !e.OIDC_REDIRECT_URI && 'OIDC_REDIRECT_URI',
    ].filter(Boolean);
    if (missing.length > 0) throw new Error(`Invalid server env: ${missing.join(', ')} required in production`);
    if (e.PASSWORD_LOGIN === '1') throw new Error('Invalid server env: PASSWORD_LOGIN is dev/test only');
    if (e.EXTRA_QUEST_DIR) throw new Error('Invalid server env: EXTRA_QUEST_DIR is test-only');
    if (e.REGISTER_LIMIT_PER_HOUR) throw new Error('Invalid server env: REGISTER_LIMIT_PER_HOUR is test-only');
  }
  const issuer = e.OIDC_ISSUER ?? DEFAULT_IDP_ISSUER;
  // https only; plain http only for a local fake IdP outside production (E2E).
  const issuerUrl = new URL(issuer);
  if (issuerUrl.protocol !== 'https:' && (production || issuerUrl.protocol !== 'http:' || !LOOPBACK_HOSTS.includes(issuerUrl.hostname))) {
    throw new Error('Invalid server env: OIDC_ISSUER must be https (http only on loopback outside production)');
  }
  // The code exchange and the IdP's keys are only as trustworthy as the TLS they come over.
  if (e.OIDC_WEB_CLIENT_SECRET && env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('Invalid server env: NODE_TLS_REJECT_UNAUTHORIZED=0 is not allowed with sign-in');
  }
  if (Boolean(e.OIDC_WEB_CLIENT_SECRET) !== Boolean(e.OIDC_REDIRECT_URI)) {
    throw new Error('Invalid server env: OIDC_WEB_CLIENT_SECRET and OIDC_REDIRECT_URI go together');
  }
  if (Boolean(e.CF_TURN_KEY_ID) !== Boolean(e.CF_TURN_API_TOKEN)) {
    throw new Error('Invalid server env: CF_TURN_KEY_ID and CF_TURN_API_TOKEN go together');
  }
  if (Boolean(e.GA4_MEASUREMENT_ID) !== Boolean(e.GA4_API_SECRET)) {
    throw new Error('Invalid server env: GA4_MEASUREMENT_ID and GA4_API_SECRET go together');
  }
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    allowedOrigins: e.ALLOWED_ORIGINS ?? DEV_ORIGINS,
    appOrigins: APP_ORIGINS,
    databaseUrl: e.DATABASE_URL,
    pgliteDir: e.PGLITE_DIR === 'memory' ? null : e.PGLITE_DIR,
    scrypt: DEFAULT_SCRYPT,
    registerLimitPerHour: e.REGISTER_LIMIT_PER_HOUR ?? 10,
    signInLimitPer15Min: 30,
    idp:
      e.OIDC_WEB_CLIENT_SECRET && e.OIDC_REDIRECT_URI
        ? {
            issuer,
            web: { clientId: e.OIDC_WEB_CLIENT_ID ?? DEFAULT_WEB_CLIENT_ID, clientSecret: e.OIDC_WEB_CLIENT_SECRET, redirectUri: e.OIDC_REDIRECT_URI },
            mobile: { clientId: e.OIDC_MOBILE_CLIENT_ID ?? DEFAULT_MOBILE_CLIENT_ID, redirectUri: e.OIDC_MOBILE_REDIRECT_URI ?? DEFAULT_MOBILE_REDIRECT_URI },
          }
        : null,
    // Off unless asked for: a public review build must not let anyone pre-register a parent's email.
    passwordLogin: !production && e.PASSWORD_LOGIN === '1',
    extraQuestDir: production ? null : (e.EXTRA_QUEST_DIR ?? null),
    timetableDefaultFile: e.TIMETABLE_DEFAULT_FILE ?? null,
    timetableDefaultAccounts: timetableAccounts(e.TIMETABLE_DEFAULT_ACCOUNTS, production),
    moderatorAccounts: emailSet(e.MODERATOR_ACCOUNTS ?? ''),
    onlineMode: e.ONLINE_MODE ?? 'on',
    turn: e.CF_TURN_KEY_ID && e.CF_TURN_API_TOKEN ? { keyId: e.CF_TURN_KEY_ID, apiToken: e.CF_TURN_API_TOKEN } : null,
    ga4: e.GA4_MEASUREMENT_ID && e.GA4_API_SECRET ? { measurementId: e.GA4_MEASUREMENT_ID, apiSecret: e.GA4_API_SECRET } : null,
    analyticsLimitPerMinute: 600,
    analyticsClientLimitPerMinute: 60,
  };
}
