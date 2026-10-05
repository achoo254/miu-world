// The friends lists, kept between openings so the list shows at once: read in the background when the game is up,
// read again whenever friend news comes in, and shown from here while a fresh copy is on its way. One entry per
// list (the playing player's own, a player's for the account owner), so one player's list never shows for another.
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { SocialView } from '@miu/schema/friends';

export interface FriendsEntry {
  /** The last list read (null until the first read ends). */
  view: SocialView | null;
  /** The last read failed and nothing was kept before it. */
  failed: boolean;
}

const EMPTY: FriendsEntry = { view: null, failed: false };
const entries = new Map<string, FriendsEntry>();
/** Reads on their way, per list: a second ask while one runs waits for it instead of reading twice. */
const reading = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function put(key: string, entry: FriendsEntry): void {
  entries.set(key, entry);
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The playing player's own lists (keyed by her id: another player on the same device has her own). */
export const ownFriendsKey = (playerId: string): string => `own:${playerId}`;

export function friendsEntry(key: string): FriendsEntry {
  return entries.get(key) ?? EMPTY;
}

/**
 * Reads the list again; a failure keeps the list already shown (only an empty entry shows the failure). A read
 * already on its way is shared, unless `after` asks for one that starts after it (the list just changed).
 */
export function refreshFriends(key: string, load: () => Promise<SocialView>, after = false): Promise<void> {
  const running = reading.get(key);
  if (running) return after ? running.then(() => refreshFriends(key, load)) : running;
  const read = load().then(
    (view) => put(key, { view, failed: false }),
    () => {
      const kept = friendsEntry(key);
      if (!kept.view) put(key, { view: null, failed: true });
    },
  );
  const done = read.finally(() => reading.delete(key));
  reading.set(key, done);
  return done;
}

/** The list of `key`: what is kept shows at once and a fresh copy is read on mount. */
export function useFriendsList(key: string, load: () => Promise<SocialView>): FriendsEntry & { retry: () => void } {
  const entry = useSyncExternalStore(subscribe, () => friendsEntry(key));
  useEffect(() => {
    void refreshFriends(key, load);
  }, [key, load]);
  const retry = useCallback(() => {
    if (!friendsEntry(key).view) put(key, EMPTY);
    void refreshFriends(key, load, true);
  }, [key, load]);
  return { ...entry, retry };
}
