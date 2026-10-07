import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOME_MAP_ID } from '@miu/schema/multiplayer';
import { hubHarness, settle, type Client } from '../../test/hub-harness';
import { decodeMemory } from './bot-brain/memory-codec';
import { WalkStore } from './bot-brain/walk-store';
import { BotRunner } from './bot-runner';
import { BOT_MAP_CONFIGS } from './bot-profiles';
import { memoryBotStore } from './bot-store';
import { homeBotId } from './multiplayer-hub';

let h: ReturnType<typeof hubHarness>;

beforeEach(() => {
  vi.useFakeTimers();
  h = hubHarness();
});

afterEach(async () => {
  await h.hub.close();
  vi.useRealTimers();
});

/** Into a home: her own, or `host`'s. */
async function home(client: Client, host?: string): Promise<void> {
  client.send({ type: 'join', mapId: HOME_MAP_ID, x: 75, y: 13, z: 25, yaw: 0, ...(host ? { host } : {}) });
  await settle();
}

const seen = (client: Client): string[] => client.last('welcome')?.players.map((p) => p.id) ?? [];

describe('a home of her own', () => {
  it('keeps every player in her own home: a stranger never shows up there', async () => {
    const a = await h.connect('child-a');
    const b = await h.connect('child-b');
    await home(a);
    await home(b);
    expect(seen(b)).toEqual([]);
    expect(a.all('spawn')).toEqual([]);
  });

  it('lets a stranger who asks for her home in only to his own, and tells him', async () => {
    const a = await h.connect('child-a');
    const b = await h.connect('child-b');
    await home(a);
    await home(b, a.id);
    expect(seen(b)).toEqual([]);
    expect(b.last('notice')).toEqual({ type: 'notice', code: 'not-here', id: a.id });
  });

  it('lets her friends and her party in', async () => {
    const a = await h.connect('child-a');
    const b = await h.connect('child-b');
    await home(a);
    h.friends.befriend('child-a', 'child-b');
    await home(b, a.id);
    expect(seen(b)).toEqual([a.id]);
    expect(a.last('spawn')?.player.id).toBe(b.id);
    // Party members (met somewhere else) come in too.
    const c = await h.joined('child-c');
    const d = await h.joined('child-d');
    d.send({ type: 'party-invite', to: c.id });
    c.send({ type: 'party-reply', from: d.id, accept: true });
    await home(d);
    await home(c, d.id);
    expect(seen(c)).toEqual([d.id]);
  });

  it('never lets in someone she blocked, friend or not', async () => {
    const a = await h.connect('child-a');
    const b = await h.joined('child-b');
    h.friends.befriend('child-a', 'child-b');
    a.send({ type: 'join', mapId: 'trung-tam', x: 10, y: 5, z: 10, yaw: 0 });
    a.send({ type: 'block', id: b.id });
    await settle();
    await home(a);
    await home(b, a.id);
    expect(seen(b)).toEqual([]);
  });

  it('sends a visitor back to her own home once she is no longer a friend or in the party', async () => {
    const a = await h.connect('child-a');
    const b = await h.connect('child-b');
    await home(a);
    h.friends.befriend('child-a', 'child-b');
    await home(b, a.id);
    expect(seen(b)).toEqual([a.id]);
    h.friends.pairs.clear();
    h.hub.playerEvent({ type: 'unfriended', childId: 'child-a', otherChildId: 'child-b', botId: null });
    await settle();
    expect(a.last('despawn')).toEqual({ type: 'despawn', id: b.id });
    expect(b.last('notice')).toEqual({ type: 'notice', code: 'not-here', id: a.id });
    expect(seen(b)).toEqual([]);
    // Out of the party: the same.
    const c = await h.joined('child-c');
    const d = await h.joined('child-d');
    d.send({ type: 'party-invite', to: c.id });
    c.send({ type: 'party-reply', from: d.id, accept: true });
    await home(d);
    await home(c, d.id);
    expect(seen(c)).toEqual([d.id]);
    d.send({ type: 'party-kick', id: c.id });
    await settle();
    expect(seen(c)).toEqual([]);
  });

  it('tells a friend going to her that she is at home, whose home it is', async () => {
    const a = await h.connect('child-a');
    const b = await h.joined('child-b');
    h.friends.befriend('child-a', 'child-b');
    await home(a);
    b.send({ type: 'party-goto', id: a.id });
    await settle();
    expect(b.last('party-goto')).toMatchObject({ id: a.id, mapId: HOME_MAP_ID, host: a.id });
  });
});

describe('the bots of a home', () => {
  it('come in with its first player, bot friends visit, and all go when the last player leaves', async () => {
    const runner = new BotRunner(h.hub, { random: () => 0.99 });
    runner.start();
    const a = await h.connect('child-a');
    // A bot friend of hers from another map.
    h.friends.bots.set('child-a', new Set(['bot-tt-3']));
    const a2 = await h.connect('child-a');
    await home(a2);
    // Each bot is its own instance in her home: never mistaken for the same bot elsewhere.
    const neighbours = (BOT_MAP_CONFIGS[HOME_MAP_ID] ?? []).map((b) => homeBotId(b.id, a2.id));
    expect(seen(a2).sort()).toEqual([...neighbours, homeBotId('bot-tt-3', a2.id)].sort());
    expect(h.hub.whereIsBot('bot-tt-3')).toEqual({ mapId: 'trung-tam' });
    expect(a.closed).not.toBeNull();
    const neighbour = neighbours[0] ?? '';
    expect(h.hub.whereIsBot(neighbour)).toEqual({ mapId: HOME_MAP_ID });
    a2.conn.close();
    expect(h.hub.whereIsBot(neighbour)).toBeNull();
    runner.stop();
  });

  it('a bot met in a home is the same bot to befriend', async () => {
    const runner = new BotRunner(h.hub, { random: () => 0 });
    runner.start();
    const a = await h.connect('child-a');
    await home(a);
    const neighbour = homeBotId('bot-ncb-1', a.id);
    a.send({ type: 'friend-request', to: neighbour });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(a.last('friend-news')?.kind).toBe('added');
    expect(h.friends.bots.get('child-a')).toEqual(new Set(['bot-ncb-1']));
    runner.stop();
  });

  it("learn the home map together: each home's instance of a bot writes into that bot's own memory as the home closes", async () => {
    const store = memoryBotStore();
    const walk = new WalkStore();
    const runner = new BotRunner(h.hub, { random: () => 0.99, store, walk: { get: (mapId) => (mapId === HOME_MAP_ID ? walk.get(mapId) : null) } });
    runner.start();
    const a = await h.connect('child-a');
    const b = await h.connect('child-b');
    await home(a);
    await home(b);
    await vi.advanceTimersByTimeAsync(60_000);
    a.conn.close();
    b.conn.close();
    await vi.advanceTimersByTimeAsync(100);
    await runner.flush();
    // One memory per bot, under its own id: never a home's instance, nothing of the players.
    const neighbours = (BOT_MAP_CONFIGS[HOME_MAP_ID] ?? []).map((n) => n.id);
    expect([...store.worlds.keys()].sort()).toEqual(neighbours.map((id) => `${id}|${HOME_MAP_ID}`).sort());
    for (const id of neighbours) {
      const row = store.worlds.get(`${id}|${HOME_MAP_ID}`);
      expect(row?.gridVersion).toBe(walk.get(HOME_MAP_ID)?.sources);
      expect(decodeMemory(JSON.parse(row?.memory ?? 'null')).graph.places.length).toBeGreaterThan(0);
    }
    runner.stop();
  });
});
