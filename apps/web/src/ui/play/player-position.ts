// The child's last spot on each map, kept on the server so a reload, a closed tab or another device
// starts where the child left off instead of back at the spawn point.
import { z } from 'zod';
import { PlayerPositionList, type PlayerPosition } from '@miu/schema/player-position';
import { api } from '../api-client';

/** Saved spots, or none when they cannot be read: losing the spot must never keep a child from playing. */
export async function loadPlayerPositions(): Promise<PlayerPosition[]> {
  try {
    return (await api('GET', '/player-positions', PlayerPositionList)).positions;
  } catch {
    return [];
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
    const previous = saved;
    saved = spot;
    api('PUT', '/player-positions', z.undefined(), spot, options).catch(() => {
      if (saved === spot) saved = previous;
    });
  };
}
