// What the multiplayer hub reads and writes in the database: a player's look (from her saved character), her
// online switches, the blocks between players, reports and online locks. The hub only knows this interface, so
// its tests run without a database.
import { eq, or } from 'drizzle-orm';
import type { IncomingMessage } from 'node:http';
import type { PlayerSettings } from '@miu/schema/account';
import type { PlayerAppearanceInput, ReportReason } from '@miu/schema/multiplayer';
import { findActivePlayer } from '../auth/auth-context';
import { readSessionToken } from '../auth/session-cookie';
import { findSessionById, hashToken } from '../auth/session-store';
import type { ServerConfig } from '../config';
import type { Db } from '../db/client';
import { characters, childProfiles, playerBlocks } from '../db/schema';
import { blockPlayer } from '../friend/friend-store';
import { activeRestriction, fileReport, type IncidentInput } from '../moderation/moderation-store';
import type { WsTickets } from './online-tickets';

/** What filing a report did: `hidden`, the reported player is kept out of online play now (the safeguard). */
export interface ReportFiled {
  hidden: boolean;
}

export interface MultiplayerStore {
  /** Her saved character as the others see it; null when she has none. */
  appearance(childId: string): Promise<PlayerAppearanceInput | null>;
  /** Every player she blocked or who blocked her. */
  blockedWith(childId: string): Promise<Set<string>>;
  block(childId: string, blockedChildId: string): Promise<void>;
  /** Files a report with what was around it (who else was in the room, the canned lines sent). */
  report(childId: string, reportedChildId: string, reason: ReportReason, mapId: string | null, incident?: IncidentInput): Promise<ReportFiled | void>;
  /** Her companion bot switch (on when the store does not keep it). */
  settings?(childId: string): Promise<PlayerSettings>;
  /** Whether she is kept out of online play now (locked by a moderator, or hidden by the safeguard). */
  restricted?(childId: string): Promise<boolean>;
}

/** Who opened a multiplayer connection, and the re-check of it the hub runs while it stays open. */
export interface WsPlayer {
  childId: string;
  /** Whether her session still lives and still plays as her (signed out, consent changed, player switched). */
  stillPlays(): Promise<boolean>;
}

/** Who opens a multiplayer connection: the player her session plays as, or null (no session, no player, no consent). */
export type Authenticate = (req: Pick<IncomingMessage, 'headers'> & { url?: string }) => Promise<WsPlayer | null>;

export function dbMultiplayerStore(db: Db): MultiplayerStore {
  return {
    async appearance(childId) {
      const [row] = await db
        .select({ name: characters.name, species: characters.species, equipped: characters.equipped, pet: characters.pet, petGear: characters.petGear })
        .from(characters)
        .where(eq(characters.childId, childId));
      return row ? { displayName: row.name, species: row.species, outfit: row.equipped, pet: row.pet, petGear: row.petGear } : null;
    },
    async blockedWith(childId) {
      const rows = await db
        .select({ childId: playerBlocks.childId, blockedChildId: playerBlocks.blockedChildId })
        .from(playerBlocks)
        .where(or(eq(playerBlocks.childId, childId), eq(playerBlocks.blockedChildId, childId)));
      return new Set(rows.map((r) => (r.childId === childId ? r.blockedChildId : r.childId)));
    },
    // Blocked, they are no longer friends and their requests to each other are gone (one transaction).
    block: (childId, blockedChildId) => blockPlayer(db, childId, blockedChildId),
    async report(childId, reportedChildId, reason, mapId, incident) {
      const filed = await fileReport(db, { childId, reportedChildId, reason, mapId, incident }, new Date());
      return { hidden: filed.hidden };
    },
    restricted: async (childId) => (await activeRestriction(db, childId, new Date())) !== null,
    async settings(childId) {
      const [row] = await db
        .select({ botsEnabled: childProfiles.botsEnabled })
        .from(childProfiles)
        .where(eq(childProfiles.id, childId));
      return row ?? { botsEnabled: false };
    },
  };
}

/** The player session `sessionId` plays as now, checked like every game route (`findActivePlayer`); null when none. */
async function playerOfSession(db: Db, sessionId: string, policyVersion: string, now: Date): Promise<string | null> {
  const session = await findSessionById(db, sessionId, now);
  if (!session) return null;
  const player = await findActivePlayer(db, session, policyVersion);
  return player.ok ? player.childId : null;
}

/**
 * The upgrade request of a multiplayer connection: a one-use ticket (`?ticket=…`, from `POST /api/online-ticket`) of a
 * session that still plays as the ticket's player. A web session's ticket only counts together with that very
 * session's cookie. The app's WebSocket can send neither a cookie nor an `Authorization` header, so an app session's
 * ticket (asked for with its Bearer token, used once within seconds) is the proof on its own. While the connection is
 * open, the hub re-checks the same session by its id.
 */
export function ticketAuthenticator(db: Db, tickets: WsTickets, config: ServerConfig, policyVersion: string, clock: () => Date): Authenticate {
  return async (req) => {
    const raw = new URL(req.url ?? '/', 'http://localhost').searchParams.get('ticket');
    const ticket = raw ? tickets.take(raw) : null;
    if (!ticket) return null;
    const session = await findSessionById(db, ticket.sessionId, clock());
    if (!session) return null;
    if (session.kind === 'web') {
      const token = readSessionToken(req, config);
      if (!token || hashToken(token) !== ticket.sessionId) return null;
    }
    const childId = await playerOfSession(db, ticket.sessionId, policyVersion, clock());
    if (childId === null || childId !== ticket.childId) return null;
    return { childId, stillPlays: async () => (await playerOfSession(db, ticket.sessionId, policyVersion, clock())) === childId };
  };
}
