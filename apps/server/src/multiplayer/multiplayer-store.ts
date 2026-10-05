// What the multiplayer hub reads and writes in the database: a player's look (from her saved character), the
// blocks between players, and reports. The hub only knows this interface, so its tests run without a database.
import { randomUUID } from 'node:crypto';
import { eq, or } from 'drizzle-orm';
import type { IncomingMessage } from 'node:http';
import type { PlayerAppearance, ReportReason } from '@miu/schema/multiplayer';
import { findActivePlayer } from '../auth/auth-context';
import { readSessionToken } from '../auth/session-cookie';
import { findSession } from '../auth/session-store';
import type { ServerConfig } from '../config';
import type { Db } from '../db/client';
import { characters, playerBlocks, playerReports } from '../db/schema';

export interface MultiplayerStore {
  /** Her saved character as the others see it; null when she has none. */
  appearance(childId: string): Promise<PlayerAppearance | null>;
  /** Every player she blocked or who blocked her. */
  blockedWith(childId: string): Promise<Set<string>>;
  block(childId: string, blockedChildId: string): Promise<void>;
  report(childId: string, reportedChildId: string, reason: ReportReason, mapId: string | null): Promise<void>;
}

/** Who opens a multiplayer connection: the player her session plays as, or null (no session, no player, no consent). */
export type Authenticate = (req: Pick<IncomingMessage, 'headers'>) => Promise<string | null>;

export function dbMultiplayerStore(db: Db): MultiplayerStore {
  return {
    async appearance(childId) {
      const [row] = await db
        .select({ name: characters.name, species: characters.species, equipped: characters.equipped, pet: characters.pet })
        .from(characters)
        .where(eq(characters.childId, childId));
      return row ? { displayName: row.name, species: row.species, outfit: row.equipped, pet: row.pet } : null;
    },
    async blockedWith(childId) {
      const rows = await db
        .select({ childId: playerBlocks.childId, blockedChildId: playerBlocks.blockedChildId })
        .from(playerBlocks)
        .where(or(eq(playerBlocks.childId, childId), eq(playerBlocks.blockedChildId, childId)));
      return new Set(rows.map((r) => (r.childId === childId ? r.blockedChildId : r.childId)));
    },
    async block(childId, blockedChildId) {
      await db.insert(playerBlocks).values({ childId, blockedChildId }).onConflictDoNothing();
    },
    async report(childId, reportedChildId, reason, mapId) {
      await db.insert(playerReports).values({ id: randomUUID(), childId, reportedChildId, reason, mapId });
    },
  };
}

/** The session cookie of the upgrade request, checked like every game route (`findActivePlayer`). */
export function sessionAuthenticator(db: Db, config: ServerConfig, policyVersion: string, clock: () => Date): Authenticate {
  return async (req) => {
    const token = readSessionToken(req, config);
    if (!token) return null;
    const session = await findSession(db, token, clock());
    if (!session) return null;
    const player = await findActivePlayer(db, session, policyVersion);
    return player.ok ? player.childId : null;
  };
}
