// What a companion bot notices around itself: only what lies within its sight (a radius from its persona, no
// walls in the way counted), never the whole map. Places come from the map's walk grid; players are the ones in its
// room who may see it (a blocked pair, or a player who switched bots off, is not someone it goes to).
import type { PlayerPresence } from '@miu/schema/multiplayer';
import type { WalkPlace } from '@miu/voxel/walk-cells';
import type { WalkMap } from './walk-store';

/** Where a bot stands, horizontally (blocks). */
export interface Here {
  readonly x: number;
  readonly z: number;
}

/** A member of a room as a bot's eyes need it. */
export interface SeenMember {
  readonly id: string;
  readonly isBot: boolean;
  readonly presence: PlayerPresence;
}

/** The members of a room as a bot's eyes need them (`MultiplayerRoom` fits). */
export interface SeenRoom {
  readonly members: ReadonlyMap<string, SeenMember>;
  canSee(viewer: string, other: string): boolean;
}

/** The map's places within `sight` of `at`, nearest first. */
export function seePlaces(map: WalkMap, at: Here, sight: number): WalkPlace[] {
  const away = (p: WalkPlace): number => Math.hypot(p.at[0] - at.x, p.at[2] - at.z);
  return map.placesNear(at.x, at.z, sight).sort((a, b) => away(a) - away(b));
}

/** The players in its room within `sight` of `at` who see bot `self`, nearest first. */
export function seePlayers(room: SeenRoom, self: string, at: Here, sight: number): SeenMember[] {
  const out: Array<{ member: SeenMember; away: number }> = [];
  for (const member of room.members.values()) {
    if (member.isBot || !room.canSee(member.id, self)) continue;
    const away = Math.hypot(member.presence.x - at.x, member.presence.z - at.z);
    if (away <= sight) out.push({ member, away });
  }
  return out.sort((a, b) => a.away - b.away).map((seen) => seen.member);
}
