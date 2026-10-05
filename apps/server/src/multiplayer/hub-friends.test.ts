import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hubHarness, settle } from '../../test/hub-harness';
import { BotRunner, BOT_FRIEND_REPLY_MS } from './bot-runner';

let h: ReturnType<typeof hubHarness>;

beforeEach(() => {
  vi.useFakeTimers();
  h = hubHarness();
});

afterEach(async () => {
  await h.hub.close();
  vi.useRealTimers();
});

describe('friend requests between players', () => {
  it('reaches a player in the same room, by name only, and tells the sender it went', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b', [40, 5, 40]);
    a.send({ type: 'friend-request', to: b.id });
    await settle();
    const request = b.last('friend-request')?.request;
    expect(request?.from).toEqual({ displayName: 'Bạn child-a', species: 'cat', isBot: false });
    expect(Object.keys(request?.from ?? {}).sort()).toEqual(['displayName', 'isBot', 'species']);
    expect(a.last('notice')).toEqual({ type: 'notice', code: 'friend-sent', id: b.id });
    // Asked again before an answer: still waiting.
    h.clock.now += 11 * 60_000;
    a.send({ type: 'friend-request', to: b.id });
    await settle();
    expect(a.last('notice')?.code).toBe('friend-pending');
  });

  it('makes two players who ask each other friends at once', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    a.send({ type: 'friend-request', to: b.id });
    await settle();
    b.send({ type: 'friend-request', to: a.id });
    await settle();
    expect(a.last('friend-news')).toEqual({ type: 'friend-news', kind: 'added', who: { displayName: 'Bạn child-b', species: 'cat', isBot: false } });
    expect(b.last('friend-news')?.who.displayName).toBe('Bạn child-a');
    expect(h.friends.pairs.size).toBe(1);
  });

  it('only reaches someone in her room, never a player who blocked her or she blocked', async () => {
    const a = await h.joined('child-a');
    const far = await h.joined('child-far', [1, 5, 1], 'cho-phien');
    a.send({ type: 'friend-request', to: far.id });
    await settle();
    expect(a.last('notice')?.code).toBe('not-here');
    const b = await h.joined('child-b');
    b.send({ type: 'block', id: a.id });
    await settle();
    a.send({ type: 'friend-request', to: b.id });
    await settle();
    expect(a.last('notice')).toEqual({ type: 'notice', code: 'not-here', id: b.id });
    expect(b.all('friend-request')).toEqual([]);
  });

  it('holds back a player who sends too many requests', async () => {
    const a = await h.joined('child-a');
    const others = [];
    for (let i = 0; i < 11; i += 1) others.push(await h.joined(`child-${i}`));
    for (const other of others) a.send({ type: 'friend-request', to: other.id });
    await settle();
    expect(a.all('notice').filter((n) => n.code === 'friend-sent')).toHaveLength(10);
    expect(a.all('notice').filter((n) => n.code === 'rate-limited')).toHaveLength(1);
    expect(others.at(-1)?.all('friend-request')).toEqual([]);
  });

  it('tells the sender the answer given later through the API', async () => {
    const a = await h.joined('child-a');
    h.hub.playerEvent({ type: 'friend-answered', childId: 'child-b', who: { displayName: 'Thỏ Bông', species: 'rabbit' }, fromChildId: 'child-a', fromBotId: null, accepted: false });
    expect(a.last('friend-news')).toEqual({ type: 'friend-news', kind: 'declined', who: { displayName: 'Thỏ Bông', species: 'rabbit', isBot: false } });
  });

  it('lets a friend go to a friend on another map, not a stranger', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b', [7, 6, 8], 'cho-phien');
    a.send({ type: 'party-goto', id: b.id });
    await settle();
    expect(a.last('party-goto')).toBeUndefined();
    h.friends.befriend('child-a', 'child-b');
    a.send({ type: 'party-goto', id: b.id });
    await settle();
    expect(a.last('party-goto')).toEqual({ type: 'party-goto', id: b.id, mapId: 'cho-phien', x: 7, y: 6, z: 8 });
  });

  it('shows two players to each other again once a block is lifted', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    a.send({ type: 'block', id: b.id });
    await settle();
    h.db.blocks.length = 0;
    h.hub.playerEvent({ type: 'unblocked', childId: 'child-a', otherChildId: 'child-b' });
    await settle();
    expect(a.last('spawn')?.player.id).toBe(b.id);
    expect(b.last('spawn')?.player.id).toBe(a.id);
  });
});

describe('friends with companion bots', () => {
  it('a bot answers a request after a moment, mostly yes; then it is her friend', async () => {
    const runner = new BotRunner(h.hub, { random: () => 0 });
    runner.start();
    const a = await h.joined('child-a', [395, 13, 425]);
    a.send({ type: 'friend-request', to: 'bot-tt-1' });
    await settle();
    expect(a.last('notice')?.code).toBe('friend-sent');
    await vi.advanceTimersByTimeAsync(BOT_FRIEND_REPLY_MS + 10);
    expect(a.last('friend-news')).toEqual({ type: 'friend-news', kind: 'added', who: { displayName: 'Bé Bông', species: 'rabbit', isBot: true } });
    expect(h.friends.bots.get('child-a')?.has('bot-tt-1')).toBe(true);
    expect(h.hub.friendsOfBot('bot-tt-1')).toEqual([a.id]);
    a.send({ type: 'friend-request', to: 'bot-tt-1' });
    await settle();
    expect(a.last('notice')?.code).toBe('already-friends');
    runner.stop();
  });

  it('a busy bot says not now', async () => {
    const runner = new BotRunner(h.hub, { random: () => 0.99 });
    runner.start();
    const a = await h.joined('child-a', [395, 13, 425]);
    a.send({ type: 'friend-request', to: 'bot-tt-1' });
    await vi.advanceTimersByTimeAsync(BOT_FRIEND_REPLY_MS * 2 + 10);
    expect(a.last('friend-news')?.kind).toBe('declined');
    runner.stop();
  });

  it('a bot she keeps meeting asks her to be friends, labelled as a bot', async () => {
    const room = h.hub.getOrCreateRoom('trung-tam');
    h.bot(room, 'bot-tt-1');
    const a = await h.joined('child-a');
    await h.hub.botFriendRequest('bot-tt-1', a.id);
    expect(a.last('friend-request')?.request.from).toEqual({ displayName: 'Bot bot-tt-1', species: 'fox', isBot: true });
  });

  it('never asks a player who switched bots off', async () => {
    h.db.settings.set('child-a', { onlineEnabled: true, botsEnabled: false });
    const room = h.hub.getOrCreateRoom('trung-tam');
    h.bot(room, 'bot-tt-1');
    const a = await h.joined('child-a');
    await h.hub.botFriendRequest('bot-tt-1', a.id);
    expect(a.all('friend-request')).toEqual([]);
  });
});
