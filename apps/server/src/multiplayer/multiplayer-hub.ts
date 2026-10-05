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
  HOME_MAP_ID,
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
import type { PlayerSettings } from '@miu/schema/account';
import type { FriendPerson } from '@miu/schema/friends';
import type { PlayerEvent } from '../player/player-events';
import type { CharacterDto } from '@miu/schema/game';
import type { Authenticate, MultiplayerStore } from './multiplayer-store';
import { PartyService, type PartyError } from './party-service';
import { FriendRequestLimiter } from '../friend/friend-limiter';
import type { FriendStore, RequestOutcome } from '../friend/friend-store';

export interface RoomMember {
  id: string;
  presence: PlayerPresence;
  send(message: ServerWsMessage): void;
  isBot: boolean;
}

type MoveUpdate = Pick<PlayerPresence, 'x' | 'y' | 'z' | 'yaw' | 'speed'> & { action?: PlayerPresence['action']; riding?: boolean };

/** Whether `viewer` may see `other` (false for a blocked pair, either way). */
type Sees = (viewer: string, other: string) => boolean;

/**
 * A companion bot in someone's home is its own instance there (`<bot>@<home owner>`), so one bot standing in several
 * homes and on its map is never mistaken for another; friendships and requests name the bot itself.
 */
export const homeBotId = (botId: string, host: string): string => `${botId}@${host}`;
export const botProfileId = (id: string): string => id.split('@')[0] ?? id;

/** One room per map, and on the home map one per player (`host`, her public id): her home. */
export const roomKey = (mapId: string, host: string | null): string => (host ? `${mapId}#${host}` : mapId);

export class MultiplayerRoom {
  readonly mapId: string;
  /** Whose home this room is (null: the map's one shared room). */
  readonly host: string | null;
  readonly key: string;
  readonly members = new Map<string, RoomMember>();
  private readonly sees: Sees;

  constructor(mapId: string, sees: Sees = () => true, host: string | null = null) {
    this.mapId = mapId;
    this.host = host;
    this.key = roomKey(mapId, host);
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

/** Told when a home room opens (its first player comes in) and closes (its last player leaves): its bots come and go. */
export interface HomeRoomHooks {
  opened(room: MultiplayerRoom): void;
  closed(room: MultiplayerRoom): void;
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
  /** Friends in the database; without it, friend requests answer `failed`. */
  friends?: FriendStore;
  friendLimiter?: FriendRequestLimiter;
}

interface OnlinePlayer {
  publicId: string;
  childId: string;
  transport: Transport;
  appearance: PlayerAppearance;
  room: MultiplayerRoom | null;
  /** Her companion bot switch: off, no bot shows up around her. */
  bots: boolean;
  /** The companion bots she is friends with (they come by more often). */
  botFriends: Set<string>;
  /** Her joins so far: a home visit checked after a later join does not take her back. */
  joins: number;
  /** Flood limit: messages left in the bucket, refilled over time. */
  tokens: number;
  refilledAt: number;
}

/** Codes a WebSocket is closed with, so the client knows not to reconnect. */
export const WS_CLOSE = { replaced: 4001, offline: 4403, noPlayer: 4401 } as const;

const BUCKET_SIZE = 40;
const BUCKET_REFILL_PER_S = 20;
const REPORT_COOLDOWN_MS = 10 * 60_000;
/** How often open connections re-check their session (sign-out, expiry, a deleted player, a new policy). */
const RECHECK_MS = 2 * 60_000;
const MAX_PAYLOAD_BYTES = 4096;
/** A friend request to a companion bot is forgotten after this long (its runner answers within seconds). */
const BOT_ASK_TTL_MS = 60_000;

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
  /** Friend requests on their way to a companion bot: request id → who asked which bot. */
  private readonly botAsks = new Map<string, { publicId: string; botId: string; at: number }>();
  private readonly friends: FriendStore | null;
  private readonly friendLimiter: FriendRequestLimiter;
  private homeHooks: HomeRoomHooks | null = null;
  /** Players switched offline by the API, so a connection still being set up does not let her in. */
  private readonly offline = new Set<string>();
  private readonly store: MultiplayerStore | null;
  private readonly authenticate: Authenticate | null;
  private readonly allowedOrigins: ReadonlySet<string>;
  private readonly now: () => number;
  private readonly partyGraceMs: number;
  private readonly sees: Sees = (viewer, other) => !this.hidden.get(viewer)?.has(other) && !this.hidden.get(other)?.has(viewer);
  /** What a room shows: the pairs who see each other, and no companion bot to a player who switched bots off. */
  private readonly roomSees: Sees = (viewer, other) => this.sees(viewer, other) && !(this.isBot(other) && this.players.get(viewer)?.bots === false);

  constructor(server?: HttpServer, options: HubOptions = {}) {
    this.store = options.store ?? null;
    this.authenticate = options.authenticate ?? null;
    this.allowedOrigins = new Set(options.allowedOrigins ?? []);
    this.now = options.now ?? Date.now;
    this.partyGraceMs = options.partyGraceMs ?? 30_000;
    this.parties = options.parties ?? new PartyService({ now: this.now, isPlayer: (id) => this.childIds.has(id) });
    this.friends = options.friends ?? null;
    this.friendLimiter = options.friendLimiter ?? new FriendRequestLimiter({ now: this.now });
    this.wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });
    server?.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => this.upgrade(req, socket, head));
    this.recheck = setInterval(() => void this.recheckSessions(), RECHECK_MS);
    this.recheck.unref();
  }

  /** The map's room, or on the home map the home of `host` (made when first needed). */
  getOrCreateRoom(mapId: string, host: string | null = null): MultiplayerRoom {
    const key = roomKey(mapId, host);
    let room = this.rooms.get(key);
    if (!room) {
      room = new MultiplayerRoom(mapId, this.roomSees, host);
      this.rooms.set(key, room);
      if (host) this.homeHooks?.opened(room);
    }
    return room;
  }

  /** The bot runner fills each home with its bots while players are in it. */
  setHomeRoomHooks(hooks: HomeRoomHooks): void {
    this.homeHooks = hooks;
  }

  /** The companion bots a player is friends with (none while she has bots switched off). */
  botFriendsOf(publicId: string): string[] {
    const player = this.players.get(publicId);
    return player?.bots ? [...player.botFriends] : [];
  }

  /**
   * Opens a player's connection: her look, her switches and her blocks from the database. A second connection of
   * the same player (another tab) takes over and the first is closed. Null when she has no character, or plays
   * offline (closed with `offline`, so her page does not try again).
   */
  async connect(childId: string, transport: Transport): Promise<Connection | null> {
    if (!this.store) return null;
    const attempt = ++this.attemptSeq;
    this.attempts.set(childId, attempt);
    const [appearance, blocked, settings, botFriends] = await Promise.all([
      this.store.appearance(childId),
      this.store.blockedWith(childId),
      this.store.settings?.(childId) ?? { onlineEnabled: true, botsEnabled: true },
      this.friends?.botFriends(childId) ?? new Set<string>(),
    ]);
    const latest = this.attempts.get(childId) === attempt;
    if (latest) this.attempts.delete(childId);
    if (!appearance) return null;
    if (!settings.onlineEnabled || this.offline.has(childId)) {
      transport.close(WS_CLOSE.offline, 'offline');
      return null;
    }
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
    const player: OnlinePlayer = { publicId, childId, transport, appearance, room: null, bots: settings.botsEnabled, botFriends, joins: 0, tokens: BUCKET_SIZE, refilledAt: this.now() };
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

  /** News from the API about a player (her switches, friends, blocks), applied at once. */
  playerEvent(event: PlayerEvent): void {
    switch (event.type) {
      case 'settings':
        return this.settingsChanged(event.childId, event.settings);
      case 'friend-answered':
        return this.friendAnswered(event);
      case 'unfriended': {
        if (event.botId) this.onlinePlayer(event.childId)?.botFriends.delete(event.botId);
        const ids = [event.childId, event.otherChildId].flatMap((id) => (id ? (this.publicIds.get(id) ?? []) : []));
        this.recheckHomes(ids);
        return;
      }
      case 'unblocked':
        void this.unblocked(event.childId, event.otherChildId);
        return;
    }
  }

  private onlinePlayer(childId: string): OnlinePlayer | undefined {
    const publicId = this.publicIds.get(childId);
    return publicId ? this.players.get(publicId) : undefined;
  }

  /** She answered a request: a bot she accepted comes by more often; a player who asked hears the answer. */
  private friendAnswered(event: Extract<PlayerEvent, { type: 'friend-answered' }>): void {
    if (event.accepted && event.fromBotId) this.onlinePlayer(event.childId)?.botFriends.add(event.fromBotId);
    const sender = event.fromChildId ? this.onlinePlayer(event.fromChildId) : undefined;
    sender?.transport.send({ type: 'friend-news', kind: event.accepted ? 'added' : 'declined', who: { ...event.who, isBot: false } });
  }

  /**
   * A block was lifted: what each of the two may see is read again (another block may remain), and if they now see
   * each other in one room they appear to each other at once.
   */
  private async unblocked(childId: string, otherChildId: string): Promise<void> {
    if (!this.store) return;
    const ids = [childId, otherChildId].flatMap((id) => {
      const publicId = this.publicIds.get(id);
      return publicId && this.hidden.has(publicId) ? [{ id, publicId }] : [];
    });
    try {
      for (const { id, publicId } of ids) this.hidden.set(publicId, new Set([...(await this.store.blockedWith(id))].map((other) => this.publicIdOf(other))));
    } catch (err) {
      console.error('unblock refresh failed', err instanceof Error ? err.name : typeof err);
      return;
    }
    const a = this.onlinePlayer(childId);
    const b = this.onlinePlayer(otherChildId);
    if (!a?.room || a.room !== b?.room || !this.sees(a.publicId, b.publicId)) return;
    for (const [viewer, other] of [
      [a, b],
      [b, a],
    ] as const) {
      const member = other.room?.members.get(other.publicId);
      if (member) viewer.transport.send({ type: 'spawn', player: member.presence });
    }
  }

  /**
   * Her switches changed: switched off-line, she leaves her party and her room at once and her page is told not to
   * come back; companion bots vanish or appear around her as her bot switch says.
   */
  settingsChanged(childId: string, settings: PlayerSettings): void {
    if (settings.onlineEnabled) this.offline.delete(childId);
    else this.offline.add(childId);
    const publicId = this.publicIds.get(childId);
    const player = publicId ? this.players.get(publicId) : undefined;
    if (!publicId || !player) return;
    if (!settings.onlineEnabled) {
      this.parties.dropInvites(publicId);
      this.pushParty(this.parties.leave(publicId));
      this.disconnect(player);
      player.transport.close(WS_CLOSE.offline, 'offline');
      return;
    }
    if (player.bots === settings.botsEnabled) return;
    player.bots = settings.botsEnabled;
    for (const member of player.room?.members.values() ?? []) {
      if (!member.isBot || !this.sees(publicId, member.id)) continue;
      player.transport.send(settings.botsEnabled ? { type: 'spawn', player: member.presence } : { type: 'despawn', id: member.id });
    }
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

  /** Companion bots have no profile: every id the hub did not give a player is a bot's. */
  private isBot(id: string): boolean {
    return !this.childIds.has(id);
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
      case 'friend-request':
        void this.befriend(player, message.to);
        return;
      case 'party-reply':
        return this.answerPartyInvite(self, message.from, message.accept);
      case 'party-leave': {
        const left = this.parties.leave(self);
        this.pushParty(left);
        return this.recheckHomes([self, ...left]);
      }
      case 'party-kick':
      case 'party-promote': {
        const result = message.type === 'party-kick' ? this.parties.kick(self, message.id) : this.parties.promote(self, message.id);
        if (!result.ok) return this.notice(self, PARTY_NOTICE[result.error], message.id);
        this.pushParty(result.value);
        if (message.type === 'party-kick') this.recheckHomes([self, message.id, ...result.value]);
        return;
      }
      case 'party-chat': {
        const party = this.parties.partyOf(self);
        if (!party) return;
        for (const member of party.members) this.deliver(member, { type: 'party-chat', from: self, displayName: player.appearance.displayName, text: message.text });
        return;
      }
      case 'party-goto':
        void this.goto(player, message.id);
        return;
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
    const seq = ++player.joins;
    if (message.mapId === HOME_MAP_ID) {
      void this.joinHome(player, message, seq);
      return;
    }
    this.enter(player, message.mapId, null, message);
  }

  /**
   * Her own home, or the home of a player whose party she is in or who is her friend (and neither blocked the
   * other). Anyone else's: her own, and she is told.
   */
  private async joinHome(player: OnlinePlayer, message: Extract<ClientWsMessage, { type: 'join' }>, seq: number): Promise<void> {
    const self = player.publicId;
    const asked = message.host && message.host !== self ? message.host : null;
    const allowed = asked !== null && this.childIds.has(asked) && this.sees(self, asked) && (await this.mayGoTo(player, asked));
    // Joined somewhere else meanwhile, or gone.
    if (player.joins !== seq || this.players.get(self) !== player) return;
    if (asked && !allowed) this.notice(self, 'not-here', asked);
    this.enter(player, HOME_MAP_ID, allowed ? asked : self, message);
  }

  /**
   * Visitors of these players' homes who may no longer be there (no longer friends, out of the party, blocked) go
   * back to their own homes where they stand, and are told.
   */
  private recheckHomes(hosts: readonly string[]): void {
    for (const host of new Set(hosts)) {
      const room = this.rooms.get(roomKey(HOME_MAP_ID, host));
      if (!room) continue;
      for (const member of [...room.members.values()]) {
        const visitor = member.isBot || member.id === host ? undefined : this.players.get(member.id);
        if (visitor) void this.recheckVisitor(visitor, room);
      }
    }
  }

  private async recheckVisitor(visitor: OnlinePlayer, room: MultiplayerRoom): Promise<void> {
    const host = room.host;
    if (!host) return;
    const seq = visitor.joins;
    const stays = this.sees(visitor.publicId, host) && (await this.mayGoTo(visitor, host));
    // Moved on meanwhile (another join, gone): nothing to do.
    if (stays || visitor.room !== room || visitor.joins !== seq || this.players.get(visitor.publicId) !== visitor) return;
    const at = room.members.get(visitor.publicId)?.presence;
    if (!at) return;
    visitor.joins += 1;
    this.notice(visitor.publicId, 'not-here', host);
    this.enter(visitor, HOME_MAP_ID, visitor.publicId, { type: 'join', mapId: HOME_MAP_ID, x: at.x, y: at.y, z: at.z, yaw: at.yaw, riding: at.riding });
  }

  /** Into the room of `mapId` (and `host`, at a home), where the join says she stands. */
  private enter(player: OnlinePlayer, mapId: string, host: string | null, message: Extract<ClientWsMessage, { type: 'join' }>): void {
    // Out first: a home she leaves as its last player closes before the next room is found or made.
    this.leaveRoom(player);
    const room = this.getOrCreateRoom(mapId, host);
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
    // A home closes with its last player (its bots go too); a map's room once nobody is left.
    const playersLeft = [...room.members.values()].some((m) => !m.isBot);
    if (room.host && !playersLeft) {
      this.homeHooks?.closed(room);
      this.rooms.delete(room.key);
    } else if (room.members.size === 0) this.rooms.delete(room.key);
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
    if (!self || !other || id === player.publicId || !this.roomSees(player.publicId, id)) return null;
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

  /** Where a party member or a friend is now, for her to go there (walk on this map, or the gate to hers). */
  private async goto(player: OnlinePlayer, id: string): Promise<void> {
    const self = player.publicId;
    if (id === self || !(await this.mayGoTo(player, id))) return this.notice(self, 'not-here', id);
    const where = this.locate(id);
    if (!where || !this.sees(self, id)) return this.notice(self, 'not-here', id);
    const { x, y, z } = where.member.presence;
    player.transport.send({ type: 'party-goto', id, mapId: where.room.mapId, x, y, z, ...(where.room.host ? { host: where.room.host } : {}) });
  }

  /** Party members and friends (players or bots) can be gone to. */
  private async mayGoTo(player: OnlinePlayer, id: string): Promise<boolean> {
    if (this.parties.partyOf(player.publicId)?.members.includes(id)) return true;
    if (this.isBot(id)) return player.botFriends.has(botProfileId(id));
    const other = this.childIds.get(id);
    if (!other || !this.friends) return false;
    try {
      return await this.friends.areFriends(player.childId, other);
    } catch (err) {
      console.error('friend check failed', err instanceof Error ? err.name : typeof err);
      return false;
    }
  }

  /**
   * She asks someone in her room to be friends. A player gets the request (saved: she can answer it later from her
   * friends list); a companion bot answers by itself after a moment, as its runner decides.
   */
  private async befriend(player: OnlinePlayer, to: string): Promise<void> {
    const self = player.publicId;
    const target = player.room?.members.get(to);
    if (!target || to === self || !this.roomSees(self, to)) return this.notice(self, 'not-here', to);
    if (!this.friends) return this.notice(self, 'failed', to);
    if (target.isBot && player.botFriends.has(botProfileId(to))) return this.notice(self, 'already-friends', to);
    if (!this.friendLimiter.allow(self, to)) return this.notice(self, 'rate-limited', to);
    const from: FriendPerson = { displayName: player.appearance.displayName, species: player.appearance.species, isBot: false };
    if (target.isBot) {
      const id = randomUUID();
      const now = this.now();
      for (const [key, ask] of this.botAsks) if (now - ask.at > BOT_ASK_TTL_MS) this.botAsks.delete(key);
      this.botAsks.set(id, { publicId: self, botId: to, at: now });
      target.send({ type: 'friend-request', request: { id, from } });
      return this.notice(self, 'friend-sent', to);
    }
    const toChild = this.childIds.get(to);
    if (!toChild) return this.notice(self, 'not-here', to);
    let outcome: RequestOutcome;
    try {
      outcome = await this.friends.request(player.childId, toChild);
    } catch (err) {
      console.error('friend request failed', err instanceof Error ? err.name : typeof err);
      return this.notice(self, 'failed', to);
    }
    switch (outcome.kind) {
      case 'sent':
        this.deliver(to, { type: 'friend-request', request: { id: outcome.requestId, from } });
        return this.notice(self, 'friend-sent', to);
      case 'befriended': {
        this.deliver(to, { type: 'friend-news', kind: 'added', who: from });
        const look = this.lookOf(to);
        if (look) player.transport.send({ type: 'friend-news', kind: 'added', who: { ...look, isBot: false } });
        return;
      }
      case 'already-friends':
      case 'friends-full':
      case 'friend-limit':
        return this.notice(self, outcome.kind, to);
      case 'already-sent':
        return this.notice(self, 'friend-pending', to);
      case 'blocked':
        return this.notice(self, 'not-here', to);
    }
  }

  /** A companion bot answers a friend request (its runner decides, as a player would). */
  async answerBotFriendRequest(botId: string, requestId: string, accept: boolean): Promise<void> {
    const ask = this.botAsks.get(requestId);
    if (!ask || ask.botId !== botId) return;
    this.botAsks.delete(requestId);
    const player = this.players.get(ask.publicId);
    const look = this.lookOf(botId);
    if (!player || !look || !this.friends) return;
    const who: FriendPerson = { ...look, isBot: true };
    if (!accept) return player.transport.send({ type: 'friend-news', kind: 'declined', who });
    try {
      const result = await this.friends.addBot(player.childId, botProfileId(botId));
      if (result === 'friends-full') return this.notice(player.publicId, 'friends-full', botId);
      player.botFriends.add(botProfileId(botId));
      player.transport.send({ type: 'friend-news', kind: 'added', who });
    } catch (err) {
      console.error('bot friend failed', err instanceof Error ? err.name : typeof err);
      this.notice(player.publicId, 'failed', botId);
    }
  }

  /** A companion bot asks a player it keeps meeting to be friends (saved, answered from her friends list). */
  async botFriendRequest(botId: string, publicId: string): Promise<void> {
    const player = this.players.get(publicId);
    const room = player?.room;
    const bot = room?.members.get(botId);
    if (!player || !room || !bot?.isBot || !this.friends || player.botFriends.has(botProfileId(botId)) || !this.roomSees(publicId, botId)) return;
    try {
      const outcome = await this.friends.botRequest(botProfileId(botId), player.childId);
      if (outcome.kind !== 'sent') return;
      player.transport.send({ type: 'friend-request', request: { id: outcome.requestId, from: { displayName: bot.presence.displayName, species: bot.presence.species, isBot: true } } });
    } catch (err) {
      console.error('bot friend request failed', err instanceof Error ? err.name : typeof err);
    }
  }

  /** The players online who are friends with a companion bot. */
  friendsOfBot(botId: string): string[] {
    return [...this.players.values()].filter((p) => p.botFriends.has(botId) && p.bots).map((p) => p.publicId);
  }

  /** Where a player is now (her public id and map), null while she is not in a room. */
  whereIsPlayer(childId: string): { publicId: string; mapId: string } | null {
    const publicId = this.publicIds.get(childId);
    const room = publicId ? this.players.get(publicId)?.room : null;
    return publicId && room ? { publicId, mapId: room.mapId } : null;
  }

  /** The map a companion bot walks now, null when it is in no room. */
  whereIsBot(botId: string): { mapId: string } | null {
    const where = this.isBot(botId) ? this.locate(botId) : null;
    return where ? { mapId: where.room.mapId } : null;
  }

  /** Name and species of a player or bot the hub knows now. */
  private lookOf(id: string): { displayName: string; species: string } | null {
    const look = this.appearances.get(id) ?? this.locate(id)?.member.presence;
    return look ? { displayName: look.displayName, species: look.species } : null;
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
    this.recheckHomes([self, id]);
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
