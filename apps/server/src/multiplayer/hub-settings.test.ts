import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hubHarness, settle } from '../../test/hub-harness';
import { RECHECK_MS, WS_CLOSE } from './multiplayer-hub';

let h: ReturnType<typeof hubHarness>;

beforeEach(() => {
  vi.useFakeTimers();
  h = hubHarness();
});

afterEach(async () => {
  await h.hub.close();
  vi.useRealTimers();
});

describe('online by default', () => {
  it('lets every player with a character in while the account owner keeps her online play on (the default)', async () => {
    h.db.characters.set('child-a', { displayName: 'Mèo Mây', species: 'cat', outfit: [], pet: null });
    const closed: number[] = [];
    const conn = await h.hub.connect('child-a', { send: () => {}, close: (code) => closed.push(code) });
    expect(conn).not.toBeNull();
    expect(closed).toEqual([]);
  });

  it('keeps her in her room and her party when her bot switch changes', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    a.send({ type: 'party-invite', to: b.id });
    b.send({ type: 'party-reply', from: a.id, accept: true });
    h.hub.playerEvent({ type: 'settings', childId: 'child-b', settings: { botsEnabled: false } });
    expect(b.closed).toBeNull();
    expect(a.last('party-state')?.party?.members).toHaveLength(2);
  });
});

describe('the account owner’s online switch', () => {
  it('keeps a player whose online play is off out of the rooms: she plays alone, and is not told to retry', async () => {
    h.db.characters.set('child-a', { displayName: 'Mèo Mây', species: 'cat', outfit: [], pet: null });
    h.db.controls.set('child-a', { voiceChatAllowed: true, onlineAllowed: false });
    const closed: number[] = [];
    const conn = await h.hub.connect('child-a', { send: () => {}, close: (code) => closed.push(code) });
    expect(conn).toBeNull();
    expect(closed).toEqual([WS_CLOSE.ownerOff]);
  });

  it('turned off while she plays: out of her party and her room at once, and the others no longer see her', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    a.send({ type: 'party-invite', to: b.id });
    b.send({ type: 'party-reply', from: a.id, accept: true });
    await settle();
    h.hub.playerEvent({ type: 'controls', childId: 'child-b', controls: { voiceChatAllowed: true, onlineAllowed: false } });
    expect(b.closed).toBe(WS_CLOSE.ownerOff);
    expect(a.last('despawn')).toEqual({ type: 'despawn', id: b.id });
    expect(a.last('party-state')?.party ?? null).toBeNull();
  });
});

describe('the account owner’s switches, read again after she came in', () => {
  it('turned off while she was connecting: she is closed out as soon as she is in', async () => {
    h.db.characters.set('child-a', { displayName: 'Mèo Mây', species: 'cat', outfit: [], pet: null });
    // The owner turns online play off between the read at the door and her arrival.
    let reads = 0;
    h.db.store.controls = async () => (reads++ === 0 ? { voiceChatAllowed: true, onlineAllowed: true } : { voiceChatAllowed: true, onlineAllowed: false });
    const closed: number[] = [];
    const conn = await h.hub.connect('child-a', { send: () => {}, close: (code) => closed.push(code) });
    expect(conn).not.toBeNull();
    await settle();
    expect(closed).toEqual([WS_CLOSE.ownerOff]);
  });

  it('changed with no news reaching the hub: the periodic re-check applies it', async () => {
    const a = await h.joined('child-a');
    h.db.controls.set('child-a', { voiceChatAllowed: true, onlineAllowed: false });
    await vi.advanceTimersByTimeAsync(RECHECK_MS);
    expect(a.closed).toBe(WS_CLOSE.ownerOff);
  });
});

describe('the companion bot switch', () => {
  it('hides the bots of the room from a player who switched them off, and only from her', async () => {
    h.db.settings.set('child-a', { botsEnabled: false });
    const room = h.hub.getOrCreateRoom('trung-tam');
    const bot = h.bot(room, 'bot-tt-1');
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    expect(a.last('welcome')?.players.map((p) => p.id)).toEqual([]);
    expect(b.last('welcome')?.players.map((p) => p.id).sort()).toEqual([a.id, 'bot-tt-1'].sort());
    room.broadcastEmote(bot.id, 'wave');
    expect(a.all('emote')).toEqual([]);
    expect(b.last('emote')?.id).toBe('bot-tt-1');
    // Out of reach for her menus too.
    a.send({ type: 'emote', emote: 'wave', to: bot.id });
    expect(a.last('notice')).toEqual({ type: 'notice', code: 'not-here', id: bot.id });
  });

  it('applies a change at once: the bots vanish, then come back', async () => {
    const room = h.hub.getOrCreateRoom('trung-tam');
    h.bot(room, 'bot-tt-1');
    const a = await h.joined('child-a');
    expect(a.last('welcome')?.players.map((p) => p.id)).toEqual(['bot-tt-1']);
    h.hub.playerEvent({ type: 'settings', childId: 'child-a', settings: { botsEnabled: false } });
    expect(a.last('despawn')).toEqual({ type: 'despawn', id: 'bot-tt-1' });
    room.broadcastEmote('bot-tt-1', 'wave');
    expect(a.all('emote')).toEqual([]);
    h.hub.playerEvent({ type: 'settings', childId: 'child-a', settings: { botsEnabled: true } });
    expect(a.last('spawn')?.player.id).toBe('bot-tt-1');
  });
});
