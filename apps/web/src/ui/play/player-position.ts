// The child's last spot on each map, kept on the server so a reload, a closed tab or another device
// starts where the child left off instead of back at the spawn point.
import { z } from 'zod';
import { PlayerPositionList, type PlayerPosition } from '@miu/schema/player-position';
import { api } from '../api-client';

const SESSION_KEY = 'miu.spots';

/**
 * The spots of this browser session, newest per map. A child who leaves the game for the map or a lesson list and
 * picks a quest comes straight back, before the save made on leaving has reached the server: the server's spot
 * would be an older one (or none, so the chapter's first character), so the session's own wins (owner, 04/10/2026).
 */
function sessionSpots(): Record<string, PlayerPosition> {
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? '{}') as Record<string, PlayerPosition>;
  } catch {
    return {};
  }
}

export function rememberSpot(spot: PlayerPosition): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...sessionSpots(), [spot.map]: spot }));
  } catch {
    // No storage: the server's spot is used.
  }
}

/** The server's spots with this session's own laid over them (they are the newer). */
export function withSessionSpots(server: readonly PlayerPosition[]): PlayerPosition[] {
  const own = sessionSpots();
  const checked = Object.values(own).filter((p) => PlayerPositionList.safeParse({ positions: [p] }).success);
  return [...server.filter((p) => !checked.some((c) => c.map === p.map)), ...checked];
}

/** Saved spots, or none when they cannot be read: losing the spot must never keep a child from playing. */
export async function loadPlayerPositions(): Promise<PlayerPosition[]> {
  try {
    return withSessionSpots((await api('GET', '/player-positions', PlayerPositionList)).positions);
  } catch {
    return withSessionSpots([]);
  }
}

/** A step or a small turn is not worth a request. */
const MOVED_BLOCKS = 0.5;
const TURNED_RADIANS = 0.3;

function sameSpot(a: PlayerPosition, b: PlayerPosition): boolean {
  const [ax, ay, az] = a.position;
  const [bx, by, bz] = b.position;
  return a.map === b.map && Math.hypot(ax - bx, ay - by, az - bz) < MOVED_BLOCKS && Math.abs(a.facing - b.facing) < TURNED_RADIANS;
}

/** Sends the spot when it changed since the last save; a failed save is retried with the next one. */
export function createPositionSaver(initial: PlayerPosition | null): (spot: PlayerPosition | null, options?: { keepalive?: boolean }) => void {
  let saved = initial;
  return (spot, options = {}) => {
    if (!spot || (saved && sameSpot(saved, spot))) return;
    rememberSpot(spot);
    const previous = saved;
    saved = spot;
    api('PUT', '/player-positions', z.undefined(), spot, options).catch(() => {
      if (saved === spot) saved = previous;
    });
  };
}
