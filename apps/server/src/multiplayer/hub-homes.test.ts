import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOME_MAP_ID } from '@miu/schema/multiplayer';
import { hubHarness, settle, type Client } from '../../test/hub-harness';
import { BOT_MAP_CONFIGS, BotRunner } from './bot-runner';

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
    const neighbours = (BOT_MAP_CONFIGS[HOME_MAP_ID] ?? []).map((b) => b.id);
    expect(seen(a2).sort()).toEqual([...neighbours, 'bot-tt-3'].sort());
    expect(a.closed).not.toBeNull();
    a2.conn.close();
    expect(h.hub.whereIsBot('bot-ncb-1')).toBeNull();
    runner.stop();
  });
});
