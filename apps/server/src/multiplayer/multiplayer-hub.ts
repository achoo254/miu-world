// Multiplayer hub (Master Plan §8 & §8b): one room per map for presence, movement, emotes and canned lines between
// players and companion bots; targeted interactions (wave, a line, block, report) and parties that outlive rooms.
//
// Who a player is comes from her session and her saved character, never from the client: the upgrade request must
// come from an allowed origin with a live session cookie, and her name, species, outfit and pet are read from the
// database (and re-sent to the others when she saves new ones). Others know her by a public id that is not her
// profile id. Blocked pairs never see each other, nor meet in a party.
import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Duplex } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import {
  ClientWsMessage,
  INTERACT_RANGE,
  PARTY_INVITE_TTL_MS,
  type MpNotice,
  type PartyMember,
  type PartyView,
  type PlayerAppearance,
  type PlayerPresence,
  type ReportReason,
  type SafeCannedChat,
  type SafeEmote,
  type ServerWsMessage,
} from '@miu/schema/multiplayer';
import type { CharacterDto } from '@miu/schema/game';
import type { Authenticate, MultiplayerStore } from './multiplayer-store';
import { PartyService, type PartyError } from './party-service';

export interface RoomMember {
  id: string;
  presence: PlayerPresence;
  send(message: ServerWsMessage): void;
  isBot: boolean;
}

type MoveUpdate = Pick<PlayerPresence, 'x' | 'y' | 'z' | 'yaw' | 'speed'> & { action?: PlayerPresence['action']; riding?: boolean };

/** Whether `viewer` may see `other` (false for a blocked pair, either way). */
type Sees = (viewer: string, other: string) => boolean;

export class MultiplayerRoom {
  readonly mapId: string;
  readonly members = new Map<string, RoomMember>();
  private readonly sees: Sees;

  constructor(mapId: string, sees: Sees = () => true) {
    this.mapId = mapId;
    this.sees = sees;
  }

  join(member: RoomMember): void {
    const existing = [...this.members.values()].filter((m) => this.sees(member.id, m.id)).map((m) => m.presence);
    member.send({ type: 'welcome', selfId: member.id, players: existing });
    this.members.set(member.id, member);
    this.broadcast({ type: 'spawn', player: member.presence }, member.id);
  }

  updatePresence(id: string, update: MoveUpdate): void {
    const member = this.members.get(id);
    if (!member) return;
    const { presence } = member;
    presence.x = update.x;
    presence.y = update.y;
    presence.z = update.z;
    presence.yaw = update.yaw;
    presence.speed = update.speed;
    if (update.action !== undefined) presence.action = update.action;
    if (update.riding !== undefined) presence.riding = update.riding;
    this.broadcast({ type: 'move', id, x: update.x, y: update.y, z: update.z, yaw: update.yaw, speed: update.speed, action: update.action, riding: update.riding }, id);
  }

  broadcastEmote(id: string, emote: SafeEmote, to?: string): void {
    if (!this.members.has(id)) return;
    this.broadcast({ type: 'emote', id, emote, ...(to ? { to } : {}) }, id, to);
  }

  broadcastChat(id: string, text: SafeCannedChat, to?: string): void {
    const member = this.members.get(id);
    if (!member) return;
    member.presence.bubble = { text, at: Date.now() };
    this.broadcast({ type: 'chat', id, text, ...(to ? { to } : {}) }, id, to);
  }

  leave(id: string): void {
    if (!this.members.delete(id)) return;
    this.broadcast({ type: 'despawn', id }, id);
  }

  /** To everyone in the room but `from`, who may see `from` (and `about`, the player a message is aimed at). */
  broadcast(message: ServerWsMessage, from: string, about?: string): void {
    for (const [memberId, member] of this.members) {
      if (memberId === from || !this.sees(memberId, from) || (about !== undefined && !this.sees(memberId, about))) continue;
      member.send(message);
    }
  }
}

export interface Transport {
  send(message: ServerWsMessage): void;
  close(code: number, reason: string): void;
  /** Whether the other end is still there (a tab closed while it was being let in takes no one's place). */
  alive?(): boolean;
  /** Whether the session it opened with still plays as this player (checked every few minutes). */
  stillValid?(): Promise<boolean>;
}

/** One player's connection, as the WebSocket (or a test) drives it. */
export interface Connection {
  readonly publicId: string;
  receive(raw: string): void;
  close(): void;
}

export interface HubOptions {
  store?: MultiplayerStore;
  authenticate?: Authenticate;
  /** Origins allowed to open a connection (the same list as the API's CSRF check). */
  allowedOrigins?: readonly string[];
  now?: () => number;
  /** A member who drops out (a new map loads, a short network loss) keeps her party place this long. */
  partyGraceMs?: number;
  parties?: PartyService;
}

interface OnlinePlayer {
  publicId: string;
  childId: string;
  transport: Transport;
  appearance: PlayerAppearance;
  room: MultiplayerRoom | null;
  /** Flood limit: messages left in the bucket, refilled over time. */
  tokens: number;
  refilledAt: number;
}

/** Codes a WebSocket is closed with, so the client knows not to reconnect. */
export const WS_CLOSE = { replaced: 4001, noPlayer: 4401 } as const;

const BUCKET_SIZE = 40;
const BUCKET_REFILL_PER_S = 20;
const REPORT_COOLDOWN_MS = 10 * 60_000;
/** How often open connections re-check their session (sign-out, expiry, a deleted player, a new policy). */
const RECHECK_MS = 2 * 60_000;
const MAX_PAYLOAD_BYTES = 4096;

const PARTY_NOTICE: Record<PartyError, MpNotice> = {
  self: 'not-here',
  'party-full': 'party-full',
  'in-party': 'in-party',
  'not-leader': 'not-leader',
  'already-invited': 'already-invited',
  'rate-limited': 'rate-limited',
  'invite-expired': 'invite-expired',
  'not-in-party': 'not-here',
};

const near = (a: PlayerPresence, b: PlayerPresence): boolean => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= INTERACT_RANGE;

function refuse(socket: Duplex, status: number, text: string): void {
  socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  socket.destroy();
}

export class MultiplayerHub {
  readonly parties: PartyService;
  private readonly wss: WebSocketServer;
  private readonly rooms = new Map<string, MultiplayerRoom>();
  private readonly players = new Map<string, OnlinePlayer>();
  /** Profile id ↔ public id, stable while the server runs (a party knows her across maps and reconnects). */
  private readonly publicIds = new Map<string, string>();
  private readonly childIds = new Map<string, string>();
  /** Her look, kept after she drops out so her party still lists her. */
  private readonly appearances = new Map<string, PlayerAppearance>();
  /**
   * Public ids each player may not see (blocked either way), for players online or keeping a party place;
   * rebuilt from the database on every connection.
   */
  private readonly hidden = new Map<string, Set<string>>();
  /** Last report per reporter and reported player: a repeat within the cooldown files nothing new. */
  private readonly reports = new Map<string, number>();
  /** The newest connection attempt per player: an older one finishing later does not take her place. */
  private readonly attempts = new Map<string, number>();
  private attemptSeq = 0;
  private readonly recheck: NodeJS.Timeout;
  private readonly partyTimers = new Map<string, NodeJS.Timeout>();
  private readonly store: MultiplayerStore | null;
  private readonly authenticate: Authenticate | null;
  private readonly allowedOrigins: ReadonlySet<string>;
  private readonly now: () => number;
  private readonly partyGraceMs: number;
  private readonly sees: Sees = (viewer, other) => !this.hidden.get(viewer)?.has(other) && !this.hidden.get(other)?.has(viewer);

  constructor(server?: HttpServer, options: HubOptions = {}) {
    this.store = options.store ?? null;
    this.authenticate = options.authenticate ?? null;
    this.allowedOrigins = new Set(options.allowedOrigins ?? []);
    this.now = options.now ?? Date.now;
    this.partyGraceMs = options.partyGraceMs ?? 30_000;
    this.parties = options.parties ?? new PartyService({ now: this.now, isPlayer: (id) => this.childIds.has(id) });
    this.wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });
    server?.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => this.upgrade(req, socket, head));
    this.recheck = setInterval(() => void this.recheckSessions(), RECHECK_MS);
    this.recheck.unref();
  }

  getOrCreateRoom(mapId: string): MultiplayerRoom {
    let room = this.rooms.get(mapId);
    if (!room) {
      room = new MultiplayerRoom(mapId, this.sees);
      this.rooms.set(mapId, room);
    }
    return room;
  }

  /**
   * Opens a player's connection: her look and her blocks from the database. A second connection of the same
   * player (another tab) takes over and the first is closed. Null when she has no character.
   */
  async connect(childId: string, transport: Transport): Promise<Connection | null> {
    if (!this.store) return null;
    const attempt = ++this.attemptSeq;
    this.attempts.set(childId, attempt);
    const [appearance, blocked] = await Promise.all([this.store.appearance(childId), this.store.blockedWith(childId)]);
    const latest = this.attempts.get(childId) === attempt;
    if (latest) this.attempts.delete(childId);
    if (!appearance) return null;
    // A newer tab is on its way in, or this one already left: it takes no one's place.
    if (!latest || transport.alive?.() === false) {
      transport.close(WS_CLOSE.replaced, 'replaced');
      return null;
    }
    const publicId = this.publicIdOf(childId);
    const older = this.players.get(publicId);
    if (older) {
      this.leaveRoom(older);
      this.players.delete(publicId);
      older.transport.close(WS_CLOSE.replaced, 'replaced');
    }
    const hidden = new Set([...blocked].map((id) => this.publicIdOf(id)));
    this.hidden.set(publicId, hidden);
    for (const other of hidden) this.hidden.get(other)?.add(publicId);
    this.appearances.set(publicId, appearance);
    const timer = this.partyTimers.get(publicId);
    if (timer) clearTimeout(timer);
    this.partyTimers.delete(publicId);
    const player: OnlinePlayer = { publicId, childId, transport, appearance, room: null, tokens: BUCKET_SIZE, refilledAt: this.now() };
    this.players.set(publicId, player);
    return {
      publicId,
      receive: (raw) => this.receive(player, raw),
      close: () => this.disconnect(player),
    };
  }

  /** A player saved her character: the others see the new look where she stands, her party its new pet. */
  characterSaved(childId: string, character: CharacterDto): void {
    const publicId = this.publicIds.get(childId);
    if (!publicId) return;
    const appearance: PlayerAppearance = { displayName: character.name, species: character.species, outfit: [...character.equipped], pet: character.pet };
    this.appearances.set(publicId, appearance);
    const player = this.players.get(publicId);
    if (!player) return;
    player.appearance = appearance;
    const member = player.room?.members.get(publicId);
    if (member && player.room) {
      Object.assign(member.presence, appearance);
      player.room.broadcast({ type: 'appearance', id: publicId, appearance }, publicId);
    }
    this.pushParty(this.parties.partyOf(publicId)?.members ?? []);
  }

  /** A member answers a party invite: a player through her connection, a companion bot through its runner. */
  answerPartyInvite(memberId: string, from: string, accept: boolean): void {
    // An inviter who has left the game (not just changing maps) has no party to join.
    if (accept && this.childIds.has(from) && !this.players.has(from) && !this.parties.partyOf(from)) {
      this.parties.dropInvites(memberId, from);
      this.notice(memberId, 'invite-expired', from);
      return;
    }
    const inviters = this.parties.partyOf(from)?.members ?? [from];
    if (accept && inviters.some((m) => !this.sees(m, memberId))) {
      this.parties.dropInvites(memberId, from);
      this.notice(memberId, 'not-here', from);
      return;
    }
    const result = this.parties.reply(memberId, from, accept);
    if (!result.ok) {
      this.notice(memberId, PARTY_NOTICE[result.error], from);
      return;
    }
    if (!accept) this.notice(from, 'invite-declined', memberId);
    this.pushParty(result.value);
  }

  close(): Promise<void> {
    clearInterval(this.recheck);
    for (const timer of this.partyTimers.values()) clearTimeout(timer);
    this.partyTimers.clear();
    return new Promise((resolve) => {
      this.wss.close(() => resolve());
    });
  }

  private upgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (path !== '/api/ws' && path !== '/ws') {
      socket.destroy();
      return;
    }
    socket.on('error', () => socket.destroy());
    const origin = req.headers.origin;
    if (!origin || !this.allowedOrigins.has(origin)) return refuse(socket, 403, 'Forbidden');
    const authenticate = this.authenticate;
    if (!authenticate) return refuse(socket, 401, 'Unauthorized');
    authenticate(req).then(
      (childId) => {
        if (!childId) return refuse(socket, 401, 'Unauthorized');
        this.wss.handleUpgrade(req, socket, head, (ws) => void this.accept(ws, req, childId));
      },
      (err: unknown) => {
        console.error('multiplayer upgrade failed', err instanceof Error ? err.name : typeof err);
        refuse(socket, 500, 'Internal Server Error');
      },
    );
  }

  private async accept(ws: WebSocket, req: IncomingMessage, childId: string): Promise<void> {
    const early: string[] = [];
    let connection: Connection | null = null;
    let closed = false;
    ws.on('message', (raw: Buffer) => {
      const text = raw.toString();
      if (connection) connection.receive(text);
      else early.push(text);
    });
    ws.on('close', () => {
      closed = true;
      connection?.close();
    });
    ws.on('error', () => ws.terminate());
    // Only the cookie is kept for the re-checks, not the whole request.
    const cookie = { headers: { cookie: req.headers.cookie } };
    const authenticate = this.authenticate;
    const transport: Transport = {
      send: (message) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
      },
      close: (code, reason) => ws.close(code, reason),
      alive: () => !closed,
      stillValid: async () => (authenticate ? (await authenticate(cookie)) === childId : false),
    };
    try {
      connection = await this.connect(childId, transport);
    } catch (err) {
      console.error('multiplayer connect failed', err instanceof Error ? err.name : typeof err);
    }
    if (!connection) {
      ws.close(WS_CLOSE.noPlayer, 'no-player');
      return;
    }
    if (closed) {
      connection.close();
      return;
    }
    for (const text of early.splice(0)) connection.receive(text);
  }

  private publicIdOf(childId: string): string {
    let id = this.publicIds.get(childId);
    if (!id) {
      id = `p-${randomUUID().replaceAll('-', '').slice(0, 12)}`;
      this.publicIds.set(childId, id);
      this.childIds.set(id, childId);
    }
    return id;
  }

  /** A token bucket per connection: a flood is dropped, never queued. */
  private allow(player: OnlinePlayer): boolean {
    const now = this.now();
    player.tokens = Math.min(BUCKET_SIZE, player.tokens + ((now - player.refilledAt) / 1000) * BUCKET_REFILL_PER_S);
    player.refilledAt = now;
    if (player.tokens < 1) return false;
    player.tokens -= 1;
    return true;
  }

  private receive(player: OnlinePlayer, raw: string): void {
    if (this.players.get(player.publicId) !== player || !this.allow(player)) return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const parsed = ClientWsMessage.safeParse(data);
    if (!parsed.success) return;
    const message = parsed.data;
    const self = player.publicId;
    switch (message.type) {
      case 'join':
        return this.join(player, message);
      case 'update':
        player.room?.updatePresence(self, message);
        return;
      case 'emote':
        if (message.to && !this.reachable(player, message.to)) return this.notice(self, 'not-here', message.to);
        player.room?.broadcastEmote(self, message.emote, message.to);
        return;
      case 'chat':
        if (message.to && !this.reachable(player, message.to)) return this.notice(self, 'not-here', message.to);
        player.room?.broadcastChat(self, message.text, message.to);
        return;
      case 'block':
        void this.block(player, message.id);
        return;
      case 'report':
        void this.report(player, message.id, message.reason);
        return;
      case 'party-invite':
        return this.invite(player, message.to);
      case 'party-reply':
        return this.answerPartyInvite(self, message.from, message.accept);
      case 'party-leave':
        return this.pushParty(this.parties.leave(self));
      case 'party-kick':
      case 'party-promote': {
        const result = message.type === 'party-kick' ? this.parties.kick(self, message.id) : this.parties.promote(self, message.id);
        if (!result.ok) return this.notice(self, PARTY_NOTICE[result.error], message.id);
        return this.pushParty(result.value);
      }
      case 'party-chat': {
        const party = this.parties.partyOf(self);
        if (!party) return;
        for (const member of party.members) this.deliver(member, { type: 'party-chat', from: self, displayName: player.appearance.displayName, text: message.text });
        return;
      }
      case 'party-goto':
        return this.goto(player, message.id);
      case 'party-travel': {
        const party = this.parties.partyOf(self);
        if (party?.leader !== self) return;
        for (const member of party.members) {
          if (member !== self) this.deliver(member, { type: 'party-travel', from: self, displayName: player.appearance.displayName, region: message.region });
        }
        return;
      }
      case 'leave':
        this.leaveRoom(player);
        return;
    }
  }

  private join(player: OnlinePlayer, message: Extract<ClientWsMessage, { type: 'join' }>): void {
    this.leaveRoom(player);
    const room = this.getOrCreateRoom(message.mapId);
    player.room = room;
    room.join({
      id: player.publicId,
      isBot: false,
      send: (msg) => player.transport.send(msg),
      presence: {
        id: player.publicId,
        ...player.appearance,
        isBot: false,
        x: message.x,
        y: message.y,
        z: message.z,
        yaw: message.yaw,
        speed: 0,
        action: 'idle',
        riding: message.riding ?? false,
        bubble: null,
      },
    });
    // Her party learns her new map; she gets her party (null too: a fresh page knows nothing yet).
    const party = this.parties.partyOf(player.publicId);
    if (party) this.pushParty(party.members);
    else player.transport.send({ type: 'party-state', party: null });
  }

  private leaveRoom(player: OnlinePlayer): void {
    const room = player.room;
    if (!room) return;
    room.leave(player.publicId);
    player.room = null;
    if (room.members.size === 0) this.rooms.delete(room.mapId);
  }

  private disconnect(player: OnlinePlayer): void {
    if (this.players.get(player.publicId) !== player) return;
    this.leaveRoom(player);
    this.players.delete(player.publicId);
    const id = player.publicId;
    const party = this.parties.partyOf(id);
    if (!party) {
      this.forget(id);
      return;
    }
    this.pushParty(party.members);
    // Gone for good unless she is back within the grace (a gate loads the next map over a new connection).
    this.partyTimers.set(
      id,
      setTimeout(() => {
        this.partyTimers.delete(id);
        if (this.players.has(id)) return;
        this.parties.dropInvites(id);
        this.pushParty(this.parties.leave(id));
        this.forget(id);
      }, this.partyGraceMs),
    );
  }

  /**
   * Drops what is kept about a player who has left (her blocks and look are read again when she is back). Her
   * public id stays for the life of the server, so a party or an invite never mistakes her for someone else.
   */
  private forget(id: string): void {
    this.hidden.delete(id);
    this.appearances.delete(id);
  }

  /** Closes the connections whose session no longer plays as their player (signed out, expired, deleted). */
  private async recheckSessions(): Promise<void> {
    for (const player of [...this.players.values()]) {
      const check = player.transport.stillValid;
      if (!check) continue;
      let valid = true;
      try {
        valid = await check();
      } catch (err) {
        console.error('multiplayer session re-check failed', err instanceof Error ? err.name : typeof err);
      }
      if (!valid && this.players.get(player.publicId) === player) {
        this.disconnect(player);
        player.transport.close(WS_CLOSE.noPlayer, 'no-player');
      }
    }
  }

  /** The room member with `id` near her on her map, and visible to her. */
  private reachable(player: OnlinePlayer, id: string): RoomMember | null {
    const room = player.room;
    const self = room?.members.get(player.publicId);
    const other = room?.members.get(id);
    if (!self || !other || id === player.publicId || !this.sees(player.publicId, id)) return null;
    return near(self.presence, other.presence) ? other : null;
  }

  private invite(player: OnlinePlayer, to: string): void {
    const self = player.publicId;
    const target = this.reachable(player, to);
    const members = this.parties.partyOf(self)?.members ?? [self];
    if (!target || members.some((m) => !this.sees(m, to))) return this.notice(self, 'not-here', to);
    const result = this.parties.invite(self, to);
    if (!result.ok) return this.notice(self, PARTY_NOTICE[result.error], to);
    target.send({ type: 'party-invite', from: { id: self, displayName: player.appearance.displayName, isBot: false }, expiresInMs: PARTY_INVITE_TTL_MS });
    this.notice(self, 'invite-sent', to);
  }

  private goto(player: OnlinePlayer, id: string): void {
    const self = player.publicId;
    if (!this.parties.partyOf(self)?.members.includes(id) || id === self) return this.notice(self, 'not-here', id);
    const where = this.locate(id);
    if (!where) return this.notice(self, 'not-here', id);
    const { x, y, z } = where.member.presence;
    player.transport.send({ type: 'party-goto', id, mapId: where.room.mapId, x, y, z });
  }

  private async block(player: OnlinePlayer, id: string): Promise<void> {
    const self = player.publicId;
    const target = this.childIds.get(id);
    if (!this.store || !target || target === player.childId) return this.notice(self, 'not-here', id);
    try {
      await this.store.block(player.childId, target);
    } catch (err) {
      console.error('block failed', err instanceof Error ? err.name : typeof err);
      return this.notice(self, 'failed', id);
    }
    this.hide(self, id);
    // Her set is read again from the database when she connects; kept only while she is online or holds a place.
    if (this.hidden.has(id)) this.hide(id, self);
    // Out of each other's sight at once, and never in one party.
    for (const [a, b] of [
      [self, id],
      [id, self],
    ] as const) {
      const viewer = this.players.get(a);
      if (viewer?.room?.members.has(b)) viewer.transport.send({ type: 'despawn', id: b });
    }
    this.parties.dropInvites(self, id);
    if (this.parties.partyOf(self)?.members.includes(id)) this.pushParty(this.parties.leave(self));
    this.notice(self, 'blocked', id);
  }

  private async report(player: OnlinePlayer, id: string, reason: ReportReason): Promise<void> {
    const self = player.publicId;
    const target = this.childIds.get(id);
    if (!this.store || !target || target === player.childId) return this.notice(self, 'not-here', id);
    const now = this.now();
    const key = `${player.childId}>${target}`;
    if (now - (this.reports.get(key) ?? Number.NEGATIVE_INFINITY) < REPORT_COOLDOWN_MS) return this.notice(self, 'reported', id);
    // Taken before the write, so a burst of the same report files one row.
    this.reports.set(key, now);
    for (const [k, at] of this.reports) if (now - at >= REPORT_COOLDOWN_MS) this.reports.delete(k);
    try {
      await this.store.report(player.childId, target, reason, player.room?.mapId ?? null);
    } catch (err) {
      console.error('report failed', err instanceof Error ? err.name : typeof err);
      this.reports.delete(key);
      return this.notice(self, 'failed', id);
    }
    this.notice(self, 'reported', id);
  }

  private hide(viewer: string, other: string): void {
    const set = this.hidden.get(viewer) ?? new Set<string>();
    set.add(other);
    this.hidden.set(viewer, set);
  }

  /** Where a player or a companion bot stands now (null: not on any map). */
  private locate(id: string): { room: MultiplayerRoom; member: RoomMember } | null {
    const player = this.players.get(id);
    if (player) {
      const member = player.room?.members.get(id);
      return member && player.room ? { room: player.room, member } : null;
    }
    for (const room of this.rooms.values()) {
      const member = room.members.get(id);
      if (member) return { room, member };
    }
    return null;
  }

  /** To a player wherever she is, or to a companion bot (its runner listens). */
  private deliver(id: string, message: ServerWsMessage): void {
    const player = this.players.get(id);
    if (player) player.transport.send(message);
    else if (!this.childIds.has(id)) this.locate(id)?.member.send(message);
  }

  private notice(id: string, code: MpNotice, about?: string): void {
    this.deliver(id, { type: 'notice', code, ...(about ? { id: about } : {}) });
  }

  private memberView(id: string): PartyMember | null {
    const where = this.locate(id);
    const look = this.appearances.get(id) ?? where?.member.presence;
    if (!look) return null;
    return { id, displayName: look.displayName, isBot: !this.childIds.has(id), species: look.species, pet: look.pet, mapId: where?.room.mapId ?? null };
  }

  /** Sends each of `ids` her party as it is now (null once she is in none). */
  private pushParty(ids: readonly string[]): void {
    for (const id of ids) {
      const party = this.parties.partyOf(id);
      let view: PartyView | null = null;
      if (party) {
        const members = party.members.map((m) => this.memberView(m)).filter((m): m is PartyMember => m !== null);
        view = { id: party.id, leader: party.leader, members };
      }
      this.deliver(id, { type: 'party-state', party: view });
    }
  }
}
