import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hubHarness } from '../../test/hub-harness';
import { WS_CLOSE } from './multiplayer-hub';

let h: ReturnType<typeof hubHarness>;

beforeEach(() => {
  vi.useFakeTimers();
  h = hubHarness();
});

afterEach(async () => {
  await h.hub.close();
  vi.useRealTimers();
});

describe('the online switch', () => {
  it('keeps a player who plays offline out, and tells her page not to try again', async () => {
    h.db.settings.set('child-a', { onlineEnabled: false, botsEnabled: true });
    h.db.characters.set('child-a', { displayName: 'Mèo Mây', species: 'cat', outfit: [], pet: null });
    const closed: number[] = [];
    const conn = await h.hub.connect('child-a', { send: () => {}, close: (code) => closed.push(code) });
    expect(conn).toBeNull();
    expect(closed).toEqual([WS_CLOSE.offline]);
  });

  it('switched off in a room: she is out at once, out of her party, and the others no longer see her', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    a.send({ type: 'party-invite', to: b.id });
    b.send({ type: 'party-reply', from: a.id, accept: true });
    expect(a.last('party-state')?.party?.members).toHaveLength(2);

    h.hub.playerEvent({ type: 'settings', childId: 'child-b', settings: { onlineEnabled: false, botsEnabled: true } });

    expect(b.closed).toBe(WS_CLOSE.offline);
    expect(a.last('despawn')).toEqual({ type: 'despawn', id: b.id });
    expect(a.last('party-state')?.party).toBeNull();
    // Her page does not get back in while the switch is off.
    h.db.settings.set('child-b', { onlineEnabled: false, botsEnabled: true });
    expect(await h.tryConnect('child-b')).toBeNull();
  });
});

describe('switching offline while connecting', () => {
  it('a switch-off that comes while her connection is being set up still keeps her out', async () => {
    h.db.characters.set('child-a', { displayName: 'Mèo Mây', species: 'cat', outfit: [], pet: null });
    const closed: number[] = [];
    const pending = h.hub.connect('child-a', { send: () => {}, close: (code) => closed.push(code) });
    h.hub.playerEvent({ type: 'settings', childId: 'child-a', settings: { onlineEnabled: false, botsEnabled: true } });
    expect(await pending).toBeNull();
    expect(closed).toEqual([WS_CLOSE.offline]);
    h.hub.playerEvent({ type: 'settings', childId: 'child-a', settings: { onlineEnabled: true, botsEnabled: true } });
    expect(await h.tryConnect('child-a')).not.toBeNull();
  });
});

describe('the companion bot switch', () => {
  it('hides the bots of the room from a player who switched them off, and only from her', async () => {
    h.db.settings.set('child-a', { onlineEnabled: true, botsEnabled: false });
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
    h.hub.playerEvent({ type: 'settings', childId: 'child-a', settings: { onlineEnabled: true, botsEnabled: false } });
    expect(a.last('despawn')).toEqual({ type: 'despawn', id: 'bot-tt-1' });
    room.broadcastEmote('bot-tt-1', 'wave');
    expect(a.all('emote')).toEqual([]);
    h.hub.playerEvent({ type: 'settings', childId: 'child-a', settings: { onlineEnabled: true, botsEnabled: true } });
    expect(a.last('spawn')?.player.id).toBe('bot-tt-1');
  });
});
