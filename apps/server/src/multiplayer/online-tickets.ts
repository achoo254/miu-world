// One-use tickets for the multiplayer connection. The web app asks for one (`POST /api/online-ticket`, a signed-in
// request with an allowed Origin) right before it opens `/api/ws?ticket=…`; the upgrade takes it back once, within
// TICKET_TTL_MS, and only together with the session cookie it was issued to. Only the sha256 of a ticket is kept, in
// memory (one server instance), so a ticket seen in a log line is spent or stale.
import { createHash, randomBytes } from 'node:crypto';

export const TICKET_TTL_MS = 30_000;
/** Tickets a session may hold at once (a page reconnecting a few times); the oldest makes way. */
const PER_SESSION = 8;

interface Ticket {
  sessionId: string;
  childId: string;
  expiresAt: number;
}

const digest = (ticket: string): string => createHash('sha256').update(ticket).digest('hex');

export class WsTickets {
  private readonly tickets = new Map<string, Ticket>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  /** A fresh ticket for this session (its stored id, the cookie's sha256) playing as `childId`. */
  issue(sessionId: string, childId: string): string {
    const now = this.now();
    this.prune(now);
    const held = [...this.tickets].filter(([, t]) => t.sessionId === sessionId);
    for (const [key] of held.slice(0, Math.max(0, held.length - PER_SESSION + 1))) this.tickets.delete(key);
    const ticket = randomBytes(32).toString('base64url');
    this.tickets.set(digest(ticket), { sessionId, childId, expiresAt: now + TICKET_TTL_MS });
    return ticket;
  }

  /** Spends a ticket: who it was issued to, or null when unknown, spent or expired. */
  take(ticket: string): { sessionId: string; childId: string } | null {
    const key = digest(ticket);
    const found = this.tickets.get(key);
    if (!found) return null;
    this.tickets.delete(key);
    return found.expiresAt > this.now() ? { sessionId: found.sessionId, childId: found.childId } : null;
  }

  private prune(now: number): void {
    for (const [key, ticket] of this.tickets) if (ticket.expiresAt <= now) this.tickets.delete(key);
  }
}
