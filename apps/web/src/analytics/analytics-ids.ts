// The browser's anonymous GA ids. The client id (ten random digits and the first visit's time, GA's own shape) stays in
// localStorage and counts returning visitors; the session id (the visit's start in Unix seconds) stays in
// sessionStorage and changes after 30 minutes without activity, like a GA visit. Neither is tied to the account. Storage
// can be blocked (private mode, site data off): the ids then last as long as the page.
import { GA_CLIENT_ID, GaSessionId, formatAnalyticsHeader, type GaIds } from '@miu/schema/analytics';

const CLIENT_KEY = 'miu.ga.client';
const SESSION_KEY = 'miu.ga.session';
/** A visit ends after this long without activity. */
export const SESSION_IDLE_MS = 30 * 60_000;

let memoryClient: string | null = null;
let memorySession: { id: number; seenAt: number } | null = null;

function newClientId(nowMs: number): string {
  // A 32-bit random number plus a billion: always ten digits.
  const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return `${1_000_000_000 + random}.${Math.floor(nowMs / 1000)}`;
}

function readClientId(nowMs: number): string {
  try {
    const stored = window.localStorage.getItem(CLIENT_KEY);
    if (stored && GA_CLIENT_ID.test(stored)) return stored;
    const created = memoryClient ?? newClientId(nowMs);
    window.localStorage.setItem(CLIENT_KEY, created);
    memoryClient = created;
    return created;
  } catch {
    memoryClient ??= newClientId(nowMs);
    return memoryClient;
  }
}

function parseSession(raw: string | null): { id: number; seenAt: number } | null {
  if (!raw) return null;
  const [id, seenAt] = raw.split(':').map(Number);
  const valid = GaSessionId.safeParse(id);
  return valid.success && seenAt !== undefined && Number.isFinite(seenAt) ? { id: valid.data, seenAt } : null;
}

/** The visit's id; a visit idle for 30 minutes gives way to a new one. Marks the visit active. */
function touchSession(nowMs: number): number {
  let stored: { id: number; seenAt: number } | null = memorySession;
  try {
    stored = parseSession(window.sessionStorage.getItem(SESSION_KEY)) ?? memorySession;
  } catch {
    // Blocked storage: the in-memory visit.
  }
  const id = stored && nowMs - stored.seenAt <= SESSION_IDLE_MS ? stored.id : Math.max(1, Math.floor(nowMs / 1000));
  memorySession = { id, seenAt: nowMs };
  try {
    window.sessionStorage.setItem(SESSION_KEY, `${id}:${nowMs}`);
  } catch {
    // Blocked storage: kept in memory only.
  }
  return id;
}

/** This browser's GA ids, marking the visit active. */
export function currentGaIds(nowMs: number = Date.now()): GaIds {
  return { clientId: readClientId(nowMs), sessionId: touchSession(nowMs) };
}

/** The header every API request carries, so the server's events join this browser's GA user and visit. */
export function analyticsHeaderValue(): string {
  return formatAnalyticsHeader(currentGaIds());
}

/** Forgets the in-memory ids (tests). */
export function resetGaIdsForTest(): void {
  memoryClient = null;
  memorySession = null;
}
