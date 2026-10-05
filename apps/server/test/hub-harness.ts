// A multiplayer hub over an in-memory database (characters, switches, blocks, friends), with players connected through fake transports and companion
// bots joined straight into rooms, for the hub's tests. Timers are the test's (vi.useFakeTimers).
import { vi } from 'vitest';
import type { PlayerSettings } from '@miu/schema/account';
import type { PlayerAppearance, PlayerPresence, ServerWsMessage } from '@miu/schema/multiplayer';
import { MultiplayerHub, type Connection, type HubOptions, type MultiplayerRoom } from '../src/multiplayer/multiplayer-hub';
import type { MultiplayerStore } from '../src/multiplayer/multiplayer-store';
import { PartyService } from '../src/multiplayer/party-service';
import { FriendRequestLimiter } from '../src/friend/friend-limiter';
import type { FriendStore } from '../src/friend/friend-store';

/** The database as the hub sees it: characters, switches, blocks and reports in memory. */
export function memoryStore() {
  const characters = new Map<string, PlayerAppearance>();
  const settings = new Map<string, PlayerSettings>();
  const blocks: Array<[string, string]> = [];
  const reports: Array<{ from: string; about: string; reason: string; map: string | null }> = [];
  const store: MultiplayerStore = {
    appearance: async (id) => characters.get(id) ?? null,
    blockedWith: async (id) => new Set(blocks.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a))),
    block: async (a, b) => {
      blocks.push([a, b]);
    },
    report: async (from, about, reason, map) => {
      reports.push({ from, about, reason, map });
    },
    settings: async (id) => settings.get(id) ?? { onlineEnabled: true, botsEnabled: true },
  };
  return { store, characters, settings, blocks, reports };
}

/** Friends as the hub sees them, in memory: pairs of players, players' bots, waiting requests. */
export function memoryFriends() {
  const pairs = new Set<string>();
  const bots = new Map<string, Set<string>>();
  const requests: Array<{ id: string; to: string; from: string }> = [];
  let seq = 0;
  const key = (a: string, b: string): string => [a, b].sort().join('|');
  const store: FriendStore = {
    async request(from, to) {
      if (pairs.has(key(from, to))) return { kind: 'already-friends' };
      const back = requests.findIndex((r) => r.to === from && r.from === to);
      if (back >= 0) {
        requests.splice(back, 1);
        pairs.add(key(from, to));
        return { kind: 'befriended' };
      }
      if (requests.some((r) => r.to === to && r.from === from)) return { kind: 'already-sent' };
      seq += 1;
      const id = `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`;
      requests.push({ id, to, from });
      return { kind: 'sent', requestId: id };
    },
    async botRequest(botId, childId) {
      if (bots.get(childId)?.has(botId)) return { kind: 'already-friends' };
      seq += 1;
      return { kind: 'sent', requestId: `00000000-0000-4000-9000-${String(seq).padStart(12, '0')}` };
    },
    async addBot(childId, botId) {
      const set = bots.get(childId) ?? new Set<string>();
      if (set.has(botId)) return 'already-friends';
      set.add(botId);
      bots.set(childId, set);
      return 'added';
    },
    areFriends: async (a, b) => pairs.has(key(a, b)),
    botFriends: async (childId) => new Set(bots.get(childId) ?? []),
  };
  return { store, pairs, bots, requests, befriend: (a: string, b: string) => pairs.add(key(a, b)) };
}

export interface Client {
  conn: Connection;
  id: string;
  inbox: ServerWsMessage[];
  closed: number | null;
  send(message: object): void;
  last<T extends ServerWsMessage['type']>(type: T): Extract<ServerWsMessage, { type: T }> | undefined;
  all<T extends ServerWsMessage['type']>(type: T): Array<Extract<ServerWsMessage, { type: T }>>;
}

export interface BotMember {
  id: string;
  inbox: ServerWsMessage[];
}

/** Lets the hub's database calls finish. */
export const settle = (): Promise<unknown> => vi.advanceTimersByTimeAsync(0);

export function hubHarness(options: Omit<HubOptions, 'store'> = {}) {
  const db = memoryStore();
  const friends = memoryFriends();
  const clock = { now: 1_000_000 };
  const hub = new MultiplayerHub(undefined, {
    store: db.store,
    now: () => clock.now,
    partyGraceMs: 30_000,
    parties: new PartyService({ now: () => clock.now, inviteGapMs: 0, isPlayer: (id) => id.startsWith('p-') }),
    friends: friends.store,
    friendLimiter: new FriendRequestLimiter({ now: () => clock.now }),
    ...options,
  });

  /** Connects a player (null when the hub refuses her); her character is made up when she has none yet. */
  async function tryConnect(childId: string, look: Partial<PlayerAppearance> = {}): Promise<Client | null> {
    if (!db.characters.has(childId)) db.characters.set(childId, { displayName: `Bạn ${childId}`, species: 'cat', outfit: [], pet: null, ...look });
    const inbox: ServerWsMessage[] = [];
    const client = { inbox, closed: null as number | null } as Client;
    const conn = await hub.connect(childId, {
      send: (m) => inbox.push(m),
      close: (code) => {
        client.closed = code;
      },
    });
    if (!conn) return null;
    client.conn = conn;
    client.id = conn.publicId;
    client.send = (message) => conn.receive(JSON.stringify(message));
    client.last = (type) => inbox.filter((m) => m.type === type).at(-1) as never;
    client.all = (type) => inbox.filter((m) => m.type === type) as never;
    return client;
  }

  async function connect(childId: string, look: Partial<PlayerAppearance> = {}): Promise<Client> {
    const client = await tryConnect(childId, look);
    if (!client) throw new Error(`no connection for ${childId}`);
    return client;
  }

  async function joined(childId: string, at: [number, number, number] = [10, 5, 10], mapId = 'trung-tam', extra: Record<string, unknown> = {}): Promise<Client> {
    const client = await connect(childId);
    client.send({ type: 'join', mapId, x: at[0], y: at[1], z: at[2], yaw: 0, ...extra });
    return client;
  }

  /** A companion bot standing in a room, keeping what the hub sends it. */
  function bot(room: MultiplayerRoom, id: string, at: [number, number, number] = [10, 5, 10]): BotMember {
    const inbox: ServerWsMessage[] = [];
    const presence: PlayerPresence = {
      id,
      displayName: `Bot ${id}`,
      isBot: true,
      species: 'fox',
      outfit: [],
      pet: null,
      x: at[0],
      y: at[1],
      z: at[2],
      yaw: 0,
      speed: 0,
      action: 'idle',
      riding: false,
      bubble: null,
    };
    room.join({ id, presence, isBot: true, send: (m) => inbox.push(m) });
    return { id, inbox };
  }

  return { hub, db, friends, clock, tryConnect, connect, joined, bot };
}
