import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerAppearanceInput, PlayerPresence, ServerWsMessage } from '@miu/schema/multiplayer';
import { FAR_MOVE_MS, MultiplayerHub, MultiplayerRoom, NEAR_MOVE_RANGE, WS_CLOSE, type Connection } from './multiplayer-hub';
import type { MultiplayerStore } from './multiplayer-store';
import { PartyService } from './party-service';

/** The database as the hub sees it: characters, blocks and reports in memory. */
function memoryStore() {
  const characters = new Map<string, PlayerAppearanceInput>();
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
  };
  return { store, characters, blocks, reports };
}

interface Client {
  conn: Connection;
  id: string;
  inbox: ServerWsMessage[];
  closed: number | null;
  send(message: object): void;
  last<T extends ServerWsMessage['type']>(type: T): Extract<ServerWsMessage, { type: T }> | undefined;
  all<T extends ServerWsMessage['type']>(type: T): Array<Extract<ServerWsMessage, { type: T }>>;
}

let hub: MultiplayerHub;
let db: ReturnType<typeof memoryStore>;
let now: number;

beforeEach(() => {
  vi.useFakeTimers();
  now = 1_000_000;
  db = memoryStore();
  hub = new MultiplayerHub(undefined, { store: db.store, now: () => now, partyGraceMs: 30_000, parties: new PartyService({ now: () => now, inviteGapMs: 0, isPlayer: (id) => id.startsWith('p-') }) });
});

afterEach(async () => {
  await hub.close();
  vi.useRealTimers();
});

async function connect(childId: string, look: Partial<PlayerAppearanceInput> = {}, valid: () => boolean = () => true): Promise<Client> {
  if (!db.characters.has(childId)) db.characters.set(childId, { displayName: `Bạn ${childId}`, species: 'cat', outfit: [], pet: null, ...look });
  const inbox: ServerWsMessage[] = [];
  const client = {
    inbox,
    closed: null as number | null,
  } as Client;
  const conn = await hub.connect(childId, {
    send: (m) => inbox.push(m),
    close: (code) => {
      client.closed = code;
    },
    stillValid: async () => valid(),
  });
  if (!conn) throw new Error('no connection');
  client.conn = conn;
  client.id = conn.publicId;
  client.send = (message) => conn.receive(JSON.stringify(message));
  client.last = (type) => inbox.filter((m) => m.type === type).at(-1) as never;
  client.all = (type) => inbox.filter((m) => m.type === type) as never;
  return client;
}

async function joined(childId: string, at: [number, number, number] = [10, 5, 10], mapId = 'trung-tam', look: Partial<PlayerAppearanceInput> = {}): Promise<Client> {
  const client = await connect(childId, look);
  client.send({ type: 'join', mapId, x: at[0], y: at[1], z: at[2], yaw: 0 });
  return client;
}

/** Lets the hub's database calls (block, report) finish. */
const settle = () => vi.advanceTimersByTimeAsync(0);

describe('identity comes from the server', () => {
  it('shows each player with her saved name, species, outfit and pet, under a public id that is not her profile id', async () => {
    const a = await joined('child-a', [10, 5, 10], 'trung-tam', { displayName: 'Mèo Mây', species: 'fox', outfit: ['hat-witch-pink', 'backpack-green'], pet: 'pet-dog' });
    const b = await joined('child-b');
    const seen = b.last('welcome')?.players.find((p) => p.id === a.id);
    expect(seen).toMatchObject({ displayName: 'Mèo Mây', species: 'fox', outfit: ['hat-witch-pink', 'backpack-green'], pet: 'pet-dog', isBot: false });
    expect(a.id).toMatch(/^p-/);
    expect(a.id).not.toContain('child-a');
    expect(a.last('spawn')?.player.displayName).toBe('Bạn child-b');
  });

  it('ignores a join that claims a name or an outfit, and any text outside the canned lines', async () => {
    const a = await connect('child-a');
    a.send({ type: 'join', mapId: 'trung-tam', x: 1, y: 1, z: 1, yaw: 0, displayName: 'Người lạ', outfit: ['hat-witch-pink'] });
    expect(a.last('welcome')).toBeUndefined();
    const b = await joined('child-b', [1, 1, 1]);
    a.send({ type: 'join', mapId: 'trung-tam', x: 1, y: 1, z: 1, yaw: 0 });
    b.send({ type: 'chat', text: 'gặp tớ ở ngoài nhé' });
    b.send({ type: 'chat', text: 'Xin chào bạn!' });
    expect(a.all('chat').map((m) => m.text)).toEqual(['Xin chào bạn!']);
  });

  it('refuses a player without a character', async () => {
    expect(await hub.connect('nobody', { send: () => {}, close: () => {} })).toBeNull();
  });

  it('keeps one connection per player: a second tab takes over and the first is closed for good', async () => {
    const first = await joined('child-a');
    const watcher = await joined('child-w');
    const second = await joined('child-a');
    expect(first.closed).toBe(WS_CLOSE.replaced);
    expect(second.id).toBe(first.id);
    first.conn.close(); // the old socket's close event comes late: it must not take the new one out
    second.send({ type: 'emote', emote: 'heart' });
    expect(watcher.last('emote')?.id).toBe(second.id);
  });

  it('lets the newest of two overlapping tabs in, and a tab gone while being let in takes no one’s place', async () => {
    const closed: number[] = [];
    const tab = (code: number[]) => ({ send: () => {}, close: (c: number) => void code.push(c) });
    await connect('child-a');
    const first = hub.connect('child-a', tab(closed));
    const second = hub.connect('child-a', tab([]));
    expect(await first).toBeNull();
    expect(closed).toEqual([WS_CLOSE.replaced]);
    expect(await second).not.toBeNull();

    const watcher = await joined('child-w');
    const stays = await joined('child-s');
    expect(await hub.connect('child-s', { send: () => {}, close: () => {}, alive: () => false })).toBeNull();
    stays.send({ type: 'emote', emote: 'heart' });
    expect(watcher.last('emote')?.id).toBe(stays.id);
    expect(stays.closed).toBeNull();
  });

  it('closes a connection whose session no longer plays as her (signed out, expired, deleted)', async () => {
    let signedIn = true;
    const a = await connect('child-a', {}, () => signedIn);
    a.send({ type: 'join', mapId: 'trung-tam', x: 1, y: 1, z: 1, yaw: 0 });
    const b = await joined('child-b', [1, 1, 1]);
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    expect(a.closed).toBeNull();
    signedIn = false;
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    expect(a.closed).toBe(WS_CLOSE.noPlayer);
    expect(b.last('despawn')?.id).toBe(a.id);
  });

  it("shows the others what her pet wears, from her saved character and when she dresses it", async () => {
    const a = await joined('child-a', [10, 5, 10], 'trung-tam', { pet: 'meo-xam', petGear: ['pet-bow-pink'] });
    const b = await joined('child-b');
    expect(b.last('welcome')?.players.find((p) => p.id === a.id)?.petGear).toEqual(['pet-bow-pink']);
    hub.characterSaved('child-a', { name: 'Bạn child-a', species: 'cat', equipped: [], pet: 'meo-xam', petGear: ['pet-crown', 'pet-scarf'] });
    expect(b.last('appearance')?.appearance.petGear).toEqual(['pet-crown', 'pet-scarf']);
  });

  it('redresses a player for the others when she saves new clothes, without a new spawn', async () => {
    const a = await joined('child-a');
    const b = await joined('child-b');
    const spawns = b.all('spawn').length;
    hub.characterSaved('child-a', { name: 'Bạn child-a', species: 'cat', equipped: ['hat-cat-mint'], pet: 'pet-cat' });
    expect(b.last('appearance')).toEqual({ type: 'appearance', id: a.id, appearance: { displayName: 'Bạn child-a', species: 'cat', outfit: ['hat-cat-mint'], pet: 'pet-cat', petGear: [] } });
    expect(b.all('spawn')).toHaveLength(spawns);
    expect(a.last('appearance')).toBeUndefined();
    // Someone arriving later sees the new look too.
    const c = await joined('child-c');
    expect(c.last('welcome')?.players.find((p) => p.id === a.id)?.outfit).toEqual(['hat-cat-mint']);
  });

  it('drops a flood instead of passing it on', async () => {
    const a = await joined('child-a');
    const b = await joined('child-b');
    for (let i = 0; i < 200; i++) a.send({ type: 'emote', emote: 'heart' });
    expect(b.all('emote').length).toBeLessThan(50);
  });
});

describe('interactions between players', () => {
  it('a wave or a line aimed at a player nearby reaches her (marked for her); one too far gets "not here"', async () => {
    const a = await joined('child-a', [10, 5, 10]);
    const b = await joined('child-b', [13, 5, 10]);
    const far = await joined('child-far', [40, 5, 40]);
    a.send({ type: 'emote', emote: 'wave', to: b.id });
    a.send({ type: 'chat', text: 'Cùng chơi nhé!', to: b.id });
    expect(b.last('emote')).toEqual({ type: 'emote', id: a.id, emote: 'wave', to: b.id });
    expect(b.last('chat')).toEqual({ type: 'chat', id: a.id, text: 'Cùng chơi nhé!', to: b.id });
    a.send({ type: 'emote', emote: 'wave', to: far.id });
    expect(a.last('notice')).toEqual({ type: 'notice', code: 'not-here', id: far.id });
    expect(far.all('emote').filter((m) => m.to === far.id)).toEqual([]);
  });

  it('a block hides both from each other at once and on later visits, and is saved', async () => {
    const a = await joined('child-a');
    const b = await joined('child-b');
    a.send({ type: 'block', id: b.id });
    await settle();
    expect(db.blocks).toEqual([['child-a', 'child-b']]);
    expect(a.last('notice')).toEqual({ type: 'notice', code: 'blocked', id: b.id });
    expect(a.last('despawn')?.id).toBe(b.id);
    expect(b.last('despawn')?.id).toBe(a.id);

    b.send({ type: 'emote', emote: 'heart' });
    b.send({ type: 'update', x: 11, y: 5, z: 11, yaw: 0, speed: 1 });
    expect(a.all('emote')).toEqual([]);
    expect(a.all('move').filter((m) => m.id === b.id)).toEqual([]);
    b.send({ type: 'emote', emote: 'wave', to: a.id });
    expect(b.last('notice')?.code).toBe('not-here');

    // Next map, next connection: still unseen, both ways.
    const b2 = await joined('child-b', [10, 5, 10], 'cho-phien');
    const a2 = await joined('child-a', [10, 5, 10], 'cho-phien');
    expect(a2.last('welcome')?.players.map((p) => p.id)).not.toContain(b2.id);
    expect(b2.all('spawn').map((m) => m.player.id)).not.toContain(a2.id);
  });

  it('keeps the report cooldown across reconnects', async () => {
    const b = await joined('child-b');
    for (let i = 0; i < 3; i++) {
      const a = await joined('child-a');
      a.send({ type: 'report', id: b.id, reason: 'spam' });
      await settle();
    }
    expect(db.reports).toHaveLength(1);
  });

  it('does not show a wave aimed at a player to someone who blocked her', async () => {
    const a = await joined('child-a', [10, 5, 10]);
    const b = await joined('child-b', [12, 5, 10]);
    const c = await joined('child-c', [11, 5, 10]);
    c.send({ type: 'block', id: b.id });
    await settle();
    a.send({ type: 'emote', emote: 'wave', to: b.id });
    expect(b.last('emote')?.to).toBe(b.id);
    expect(c.all('emote')).toEqual([]);
  });

  it('a report is queued with a picked reason only, once per player within the cooldown; bots cannot be reported', async () => {
    const a = await joined('child-a');
    const b = await joined('child-b');
    a.send({ type: 'report', id: b.id, reason: 'name' });
    await settle();
    a.send({ type: 'report', id: b.id, reason: 'spam' });
    await settle();
    expect(db.reports).toEqual([{ from: 'child-a', about: 'child-b', reason: 'name', map: 'trung-tam' }]);
    expect(a.all('notice').map((n) => n.code)).toEqual(['reported', 'reported']);
    a.send({ type: 'report', id: 'bot-tt-1', reason: 'spam' });
    await settle();
    expect(a.last('notice')?.code).toBe('not-here');
    expect(db.reports).toHaveLength(1);
  });
});

describe('parties', () => {
  async function partyOf(...children: string[]): Promise<Client[]> {
    const clients: Client[] = [];
    for (const [i, child] of children.entries()) clients.push(await joined(child, [10 + i, 5, 10]));
    const [leader, ...rest] = clients;
    if (!leader) throw new Error('no leader');
    for (const member of rest) {
      leader.send({ type: 'party-invite', to: member.id });
      member.send({ type: 'party-reply', from: leader.id, accept: true });
    }
    return clients;
  }

  it('invite then accept: both see the party with names, maps and pets', async () => {
    const a = await joined('child-a', [10, 5, 10], 'trung-tam', { pet: 'pet-dog' });
    const b = await joined('child-b', [12, 5, 10]);
    a.send({ type: 'party-invite', to: b.id });
    expect(a.last('notice')?.code).toBe('invite-sent');
    expect(b.last('party-invite')).toMatchObject({ from: { id: a.id, displayName: 'Bạn child-a', isBot: false }, expiresInMs: 60_000 });
    b.send({ type: 'party-reply', from: a.id, accept: true });
    for (const c of [a, b]) {
      const party = c.last('party-state')?.party;
      expect(party?.leader).toBe(a.id);
      expect(party?.members.map((m) => [m.id, m.mapId])).toEqual([
        [a.id, 'trung-tam'],
        [b.id, 'trung-tam'],
      ]);
      expect(party?.members[0]?.pet).toBe('pet-dog');
    }
  });

  it('a declined invite tells the inviter and makes no party', async () => {
    const a = await joined('child-a');
    const b = await joined('child-b');
    a.send({ type: 'party-invite', to: b.id });
    b.send({ type: 'party-reply', from: a.id, accept: false });
    expect(a.last('notice')).toEqual({ type: 'notice', code: 'invite-declined', id: b.id });
    expect(hub.parties.partyOf(a.id)).toBeNull();
  });

  it('an invite from a player who has left the game cannot be accepted', async () => {
    const a = await joined('child-a');
    const b = await joined('child-b');
    a.send({ type: 'party-invite', to: b.id });
    a.conn.close();
    b.send({ type: 'party-reply', from: a.id, accept: true });
    expect(b.last('notice')).toEqual({ type: 'notice', code: 'invite-expired', id: a.id });
    expect(hub.parties.partyOf(b.id)).toBeNull();
  });

  it('a party of four refuses a fifth', async () => {
    const [a] = await partyOf('child-a', 'child-b', 'child-c', 'child-d');
    const e = await joined('child-e', [11, 5, 11]);
    a?.send({ type: 'party-invite', to: e.id });
    expect(a?.last('notice')).toEqual({ type: 'notice', code: 'party-full', id: e.id });
    expect(a?.last('party-state')?.party?.members).toHaveLength(4);
  });

  it('hands the lead on when the leader leaves; the leader removes and hands over', async () => {
    const [a, b, c] = await partyOf('child-a', 'child-b', 'child-c');
    if (!a || !b || !c) throw new Error('party');
    b.send({ type: 'party-kick', id: c.id });
    expect(b.last('notice')?.code).toBe('not-leader');
    a.send({ type: 'party-promote', id: b.id });
    expect(c.last('party-state')?.party?.leader).toBe(b.id);
    b.send({ type: 'party-leave' });
    expect(b.last('party-state')?.party).toBeNull();
    expect(a.last('party-state')?.party?.leader).toBe(a.id);
    a.send({ type: 'party-kick', id: c.id });
    expect(c.last('party-state')?.party).toBeNull();
    expect(a.last('party-state')?.party).toBeNull();
  });

  it('stays together through a gate: the member reconnects on the next map within the grace', async () => {
    const [a, b] = await partyOf('child-a', 'child-b');
    if (!a || !b) throw new Error('party');
    b.conn.close();
    expect(a.last('party-state')?.party?.members.find((m) => m.id === b.id)?.mapId).toBeNull();
    await vi.advanceTimersByTimeAsync(5_000);
    const b2 = await joined('child-b', [3, 5, 3], 'cho-phien');
    expect(b2.id).toBe(b.id);
    expect(a.last('party-state')?.party?.members.find((m) => m.id === b.id)?.mapId).toBe('cho-phien');
    expect(b2.last('party-state')?.party?.leader).toBe(a.id);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(hub.parties.partyOf(a.id)?.members).toEqual([a.id, b.id]);
  });

  it('a member gone longer than the grace leaves the party', async () => {
    const [a, b] = await partyOf('child-a', 'child-b');
    if (!a || !b) throw new Error('party');
    b.conn.close();
    await vi.advanceTimersByTimeAsync(30_001);
    expect(a.last('party-state')?.party).toBeNull();
  });

  it('carries canned party lines to every member on any map, goes to a member, and asks the party along through a gate', async () => {
    const [a, b] = await partyOf('child-a', 'child-b');
    if (!a || !b) throw new Error('party');
    b.send({ type: 'join', mapId: 'cho-phien', x: 7, y: 6, z: 8, yaw: 0 });
    a.send({ type: 'party-chat', text: 'Cố lên nào!' });
    expect(b.last('party-chat')).toEqual({ type: 'party-chat', from: a.id, displayName: 'Bạn child-a', text: 'Cố lên nào!' });
    a.send({ type: 'party-chat', text: 'tự gõ' });
    expect(b.all('party-chat')).toHaveLength(1);
    a.send({ type: 'party-goto', id: b.id });
    await settle();
    expect(a.last('party-goto')).toEqual({ type: 'party-goto', id: b.id, mapId: 'cho-phien', x: 7, y: 6, z: 8 });
    b.send({ type: 'party-travel', region: 'lang-ven-song' });
    expect(a.last('party-travel')).toBeUndefined();
    a.send({ type: 'party-travel', region: 'lang-ven-song' });
    expect(b.last('party-travel')).toEqual({ type: 'party-travel', from: a.id, displayName: 'Bạn child-a', region: 'lang-ven-song' });
  });

  it('a block ends a shared party for the blocker and keeps the two out of one party', async () => {
    const [a, b, c] = await partyOf('child-a', 'child-b', 'child-c');
    if (!a || !b || !c) throw new Error('party');
    c.send({ type: 'block', id: a.id });
    await settle();
    expect(c.last('party-state')?.party).toBeNull();
    expect(a.last('party-state')?.party?.members.map((m) => m.id)).toEqual([a.id, b.id]);
    a.send({ type: 'party-invite', to: c.id });
    expect(a.last('notice')).toEqual({ type: 'notice', code: 'not-here', id: c.id });
  });
});

describe('moves in a room', () => {
  it("tells a player every move of a bot near her, a far one's only now and then or when what it does changes, and a bot nobody's", () => {
    let clock = 0;
    const room = new MultiplayerRoom('trung-tam', () => true, null, () => clock);
    const presence = (id: string, isBot: boolean, x: number): PlayerPresence => ({
      id,
      displayName: id,
      isBot,
      species: 'fox',
      outfit: [],
      pet: null,
      petGear: [],
      x,
      y: 5,
      z: 0,
      yaw: 0,
      speed: 0,
      action: 'idle',
      riding: false,
      bubble: null,
    });
    const inbox = new Map<string, ServerWsMessage[]>();
    const join = (id: string, isBot: boolean, x: number): void => {
      inbox.set(id, []);
      room.join({ id, isBot, presence: presence(id, isBot, x), send: (m) => inbox.get(id)?.push(m) });
    };
    join('p-1', false, 0);
    join('bot-near', true, NEAR_MOVE_RANGE - 1);
    join('bot-far', true, NEAR_MOVE_RANGE + 50);
    const movesOf = (to: string, id: string): number => (inbox.get(to) ?? []).filter((m) => m.type === 'move' && m.id === id).length;
    const walk = (id: string, x: number, action: 'walk' | 'idle' = 'walk'): void => room.updatePresence(id, { x, y: 5, z: 0, yaw: 0, speed: action === 'walk' ? 3 : 0, action });

    // Ten ticks of walking: the near bot's ten moves, the far bot's first one only.
    for (let t = 0; t < 10; t++) {
      clock += 100;
      walk('bot-near', NEAR_MOVE_RANGE - 1 - t * 0.3);
      walk('bot-far', NEAR_MOVE_RANGE + 50 + t * 0.3);
    }
    expect(movesOf('p-1', 'bot-near')).toBe(10);
    expect(movesOf('p-1', 'bot-far')).toBe(1);
    // It stops: she is told at once (never left walking on the spot), then FAR_MOVE_MS after the last one.
    clock += 100;
    walk('bot-far', NEAR_MOVE_RANGE + 53, 'idle');
    expect(movesOf('p-1', 'bot-far')).toBe(2);
    clock += FAR_MOVE_MS - 100;
    walk('bot-far', NEAR_MOVE_RANGE + 53, 'idle');
    expect(movesOf('p-1', 'bot-far')).toBe(2);
    clock += 100;
    walk('bot-far', NEAR_MOVE_RANGE + 53, 'idle');
    expect(movesOf('p-1', 'bot-far')).toBe(3);
    // Its presence is the latest either way.
    expect(room.members.get('bot-far')?.presence.x).toBe(NEAR_MOVE_RANGE + 53);
    // No bot is told of anyone's move, a player's included.
    walk('p-1', 1);
    expect([...inbox.entries()].filter(([id]) => id.startsWith('bot-')).flatMap(([, list]) => list.filter((m) => m.type === 'move'))).toEqual([]);
    // She leaves and comes back: what she was told is forgotten, the far bot's next move reaches her.
    room.leave('p-1');
    join('p-1', false, 0);
    walk('bot-far', NEAR_MOVE_RANGE + 53, 'idle');
    expect(movesOf('p-1', 'bot-far')).toBe(1);
  });
});
