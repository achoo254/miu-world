// Where a visitor wanted to go before signing in. A page outside the game (a lesson page's "Chơi bài này", an invite
// link) saves it here on this device, and the game opens it once the visitor is in: signed in, consent given and the
// character made, i.e. when Home is first reached. Google's callback always returns to `/`, so the destination cannot
// ride along in the address. Nothing from storage is trusted: only a path of the allowlist below is ever opened (no
// address of another site, no path the game does not know), and one older than an hour is forgotten.
import { ContentId } from '@miu/schema/content';
import regions from '../../../content/world/regions.json';

const KEY = 'miu.postLogin';
/** A destination left this long without signing in is stale. */
export const POST_LOGIN_TTL_MS = 60 * 60_000;
/** An invite code's shape (a random code in an `/moi/<code>` link). */
const INVITE_CODE = /^[A-Za-z0-9_-]{1,64}$/;
/** A made-up origin: a path that resolves to anything else was not a plain path of this site. */
const PLACEHOLDER_ORIGIN = 'https://miu.invalid';

const REGION_IDS: ReadonlySet<string> = new Set((regions as { regions: Array<{ id: string }> }).regions.map((r) => r.id));
const isContentId = (value: string | null): value is string => value !== null && ContentId.safeParse(value).success;

export interface PostLoginTarget {
  /** A path of the game to open, one `isAllowedNext` accepts. */
  next?: string;
  /** The invite code of the link the visitor came by. */
  inviteCode?: string;
}

/** The game path that starts a quest: `/play?region=<region>&quest=<quest>`. */
export const playTarget = (region: string, quest: string): string => `/play?region=${encodeURIComponent(region)}&quest=${encodeURIComponent(quest)}`;

/**
 * Whether `next` is a path the game may open after sign-in: a quest in a known region (`/play?region=&quest=`, the
 * quest id by shape since quests are the server's) or a known region's screen (`/region/<id>`). Nothing else.
 */
export function isAllowedNext(next: unknown): next is string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.includes('\\') || next.length > 200) return false;
  let url: URL;
  try {
    url = new URL(next, PLACEHOLDER_ORIGIN);
  } catch {
    return false;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN || url.hash !== '') return false;
  if (url.pathname === '/play') {
    const region = url.searchParams.get('region');
    const quest = url.searchParams.get('quest');
    // Rebuilding the path from the two ids refuses a stray parameter, a different order and odd escapes in one step.
    return region !== null && REGION_IDS.has(region) && isContentId(quest) && next === playTarget(region, quest);
  }
  const [, section, id, ...rest] = url.pathname.split('/');
  return section === 'region' && rest.length === 0 && url.search === '' && id !== undefined && REGION_IDS.has(id);
}

/** The parts of `value` the game would act on; null when there are none. */
function allowedParts(value: { next?: unknown; inviteCode?: unknown }): PostLoginTarget | null {
  const kept: PostLoginTarget = {};
  if (isAllowedNext(value.next)) kept.next = value.next;
  if (typeof value.inviteCode === 'string' && INVITE_CODE.test(value.inviteCode)) kept.inviteCode = value.inviteCode;
  return kept.next === undefined && kept.inviteCode === undefined ? null : kept;
}

/** Remembers the allowed parts of `target` (with none, an older one is dropped too). Blocked storage keeps nothing. */
export function savePostLoginTarget(target: PostLoginTarget, nowMs: number = Date.now()): void {
  const kept = allowedParts(target);
  try {
    if (kept) window.localStorage.setItem(KEY, JSON.stringify({ ...kept, savedAt: nowMs }));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Blocked storage (private mode): the visitor signs in and lands on Home as usual.
  }
}

/** The saved destination, forgotten as it is read; null when there is none, it is stale, or nothing in it is allowed. */
export function takePostLoginTarget(nowMs: number = Date.now()): PostLoginTarget | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
    if (raw !== null) window.localStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof stored !== 'object' || stored === null) return null;
  const { savedAt, ...parts } = stored as Record<string, unknown>;
  // A time in the future (a clock set back, or made up) is as stale as an old one.
  if (typeof savedAt !== 'number' || !Number.isFinite(savedAt) || nowMs - savedAt > POST_LOGIN_TTL_MS || savedAt > nowMs + 60_000) return null;
  return allowedParts(parts);
}
