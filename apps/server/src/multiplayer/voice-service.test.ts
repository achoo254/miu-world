import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VoiceSignal } from '@miu/schema/voice';
import { VOICE_CALL_RING_MS } from '@miu/schema/voice';
import { hubHarness, settle, type Client } from '../../test/hub-harness';

let h: ReturnType<typeof hubHarness>;

beforeEach(() => {
  vi.useFakeTimers();
  h = hubHarness();
});

afterEach(async () => {
  await h.hub.close();
  vi.useRealTimers();
});

const OFFER: VoiceSignal = { kind: 'offer', sdp: 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n' };
const ICE: VoiceSignal = { kind: 'ice', candidate: 'candidate:1 1 udp 2122260223 192.0.2.1 54400 typ host', sdpMid: '0', sdpMLineIndex: 0 };

/** `a` invites `b` (standing next to her) and `b` joins: one party. */
async function party(a: Client, b: Client): Promise<void> {
  a.send({ type: 'party-invite', to: b.id });
  b.send({ type: 'party-reply', from: a.id, accept: true });
  await settle();
  expect(a.last('party-state')?.party?.members.map((m) => m.id)).toContain(b.id);
}

const voiceOf = (c: Client) => c.last('voice-state')?.channel ?? null;
const signalsFrom = (c: Client, from: string) => c.all('voice-signal').filter((m) => m.from === from);

describe('party voice', () => {
  it('joins with the microphone off until she turns it on; the party sees who is in it', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    await party(a, b);
    a.send({ type: 'voice-join', mic: false });
    await settle();
    expect(voiceOf(a)).toEqual({ kind: 'party', joined: true, members: [{ id: a.id, displayName: 'Bạn child-a', isBot: false, mic: false, voice: null }] });
    expect(voiceOf(b)).toMatchObject({ kind: 'party', joined: false, members: [{ id: a.id }] });
    a.send({ type: 'voice-mic', on: true });
    await settle();
    expect(voiceOf(b)?.members[0]?.mic).toBe(true);
    b.send({ type: 'voice-join', mic: true });
    await settle();
    expect(voiceOf(a)?.members.map((m) => m.id)).toEqual([a.id, b.id]);
    expect(voiceOf(b)?.joined).toBe(true);
  });

  it('passes setup messages between two members who joined, from the sender as the server knows her', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    await party(a, b);
    a.send({ type: 'voice-join', mic: true });
    // B has not joined yet: nothing reaches her.
    a.send({ type: 'voice-signal', to: b.id, signal: OFFER });
    await settle();
    expect(b.all('voice-signal')).toEqual([]);
    b.send({ type: 'voice-join', mic: true });
    a.send({ type: 'voice-signal', to: b.id, signal: OFFER });
    b.send({ type: 'voice-signal', to: a.id, signal: ICE });
    await settle();
    expect(b.all('voice-signal')).toEqual([{ type: 'voice-signal', from: a.id, signal: OFFER }]);
    expect(a.all('voice-signal')).toEqual([{ type: 'voice-signal', from: b.id, signal: ICE }]);
  });

  it('never reaches anyone outside the party, and an outsider reaches no member', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    const c = await h.joined('child-c');
    await party(a, b);
    for (const x of [a, b]) x.send({ type: 'voice-join', mic: true });
    c.send({ type: 'voice-join', mic: true });
    await settle();
    expect(voiceOf(c)).toBeNull();
    a.send({ type: 'voice-signal', to: c.id, signal: OFFER });
    c.send({ type: 'voice-signal', to: a.id, signal: OFFER });
    c.send({ type: 'voice-speaking', on: true });
    await settle();
    expect(c.all('voice-signal')).toEqual([]);
    expect(signalsFrom(a, c.id)).toEqual([]);
    expect(a.all('voice-speaking')).toEqual([]);
    // Another party's voice is its own: C and D talk, A and B never hear of it.
    const d = await h.joined('child-d');
    await party(c, d);
    for (const x of [c, d]) x.send({ type: 'voice-join', mic: true });
    c.send({ type: 'voice-signal', to: b.id, signal: OFFER });
    c.send({ type: 'voice-signal', to: d.id, signal: OFFER });
    await settle();
    expect(signalsFrom(b, c.id)).toEqual([]);
    expect(signalsFrom(d, c.id)).toHaveLength(1);
    expect(voiceOf(a)?.members.map((m) => m.id)).toEqual([a.id, b.id]);
  });

  it('relays her voice activity to the others in it, and only while her microphone is on', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    await party(a, b);
    a.send({ type: 'voice-join', mic: false });
    b.send({ type: 'voice-join', mic: true });
    a.send({ type: 'voice-speaking', on: true });
    await settle();
    expect(b.all('voice-speaking')).toEqual([]);
    a.send({ type: 'voice-mic', on: true });
    a.send({ type: 'voice-speaking', on: true });
    await settle();
    expect(b.last('voice-speaking')).toEqual({ type: 'voice-speaking', id: a.id, on: true });
    // Turning the microphone off ends her talking for the others.
    a.send({ type: 'voice-mic', on: false });
    await settle();
    expect(b.last('voice-speaking')).toEqual({ type: 'voice-speaking', id: a.id, on: false });
  });

  it('takes a member who leaves the party (or is removed) out of its voice at once', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    const c = await h.joined('child-c');
    await party(a, b);
    h.clock.now += 5_000;
    await party(a, c);
    for (const x of [a, b, c]) x.send({ type: 'voice-join', mic: true });
    await settle();
    b.send({ type: 'party-leave' });
    await settle();
    expect(voiceOf(b)).toBeNull();
    expect(voiceOf(a)?.members.map((m) => m.id)).toEqual([a.id, c.id]);
    a.send({ type: 'party-kick', id: c.id });
    await settle();
    expect(voiceOf(c)).toBeNull();
    // A party of one is no party: her voice is gone too.
    expect(voiceOf(a)).toBeNull();
    b.send({ type: 'voice-signal', to: a.id, signal: OFFER });
    await settle();
    expect(signalsFrom(a, b.id)).toEqual([]);
  });

  it('takes a blocked pair apart: no setup message passes between them again', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    await party(a, b);
    for (const x of [a, b]) x.send({ type: 'voice-join', mic: true });
    await settle();
    b.send({ type: 'block', id: a.id });
    await settle();
    expect(voiceOf(b)).toBeNull();
    a.send({ type: 'voice-signal', to: b.id, signal: OFFER });
    b.send({ type: 'voice-signal', to: a.id, signal: OFFER });
    await settle();
    expect(signalsFrom(b, a.id)).toEqual([]);
    expect(signalsFrom(a, b.id)).toEqual([]);
  });

  it('holds back a flood of setup messages and drops oversized ones', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    await party(a, b);
    for (const x of [a, b]) x.send({ type: 'voice-join', mic: true });
    for (let i = 0; i < 120; i += 1) a.send({ type: 'voice-signal', to: b.id, signal: ICE });
    await settle();
    expect(signalsFrom(b, a.id)).toHaveLength(80);
    h.clock.now += 10_000;
    a.send({ type: 'voice-signal', to: b.id, signal: { kind: 'offer', sdp: 'x'.repeat(12_001) } });
    await settle();
    expect(signalsFrom(b, a.id)).toHaveLength(80);
    a.send({ type: 'voice-signal', to: b.id, signal: { kind: 'offer', sdp: 'x'.repeat(8_000) } });
    await settle();
    expect(signalsFrom(b, a.id)).toHaveLength(81);
    // Anything else over the usual 4 KB is dropped as before.
    const before = b.inbox.length;
    a.send({ type: 'party-chat', text: 'Cố lên nào!', pad: 'x'.repeat(5_000) });
    await settle();
    expect(b.inbox.length).toBe(before);
  });

  it('keeps her place while a new map loads, and drops it when she does not come back', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    await party(a, b);
    for (const x of [a, b]) x.send({ type: 'voice-join', mic: true });
    await settle();
    a.conn.close();
    await vi.advanceTimersByTimeAsync(5_000);
    const back = await h.joined('child-a', [10, 5, 10], 'cho-phien');
    await settle();
    expect(voiceOf(back)?.joined).toBe(true);
    b.send({ type: 'voice-signal', to: back.id, signal: OFFER });
    await settle();
    expect(signalsFrom(back, b.id)).toHaveLength(1);
    back.conn.close();
    await vi.advanceTimersByTimeAsync(31_000);
    expect(voiceOf(b)?.members.map((m) => m.id) ?? []).not.toContain(back.id);
  });
});

describe('companion bots in party voice', () => {
  async function withBot(childId = 'child-a') {
    const a = await h.joined(childId);
    const room = h.hub.getOrCreateRoom('trung-tam');
    const bot = h.bot(room, 'bot-tt-2');
    const other = h.bot(room, 'bot-tt-3');
    a.send({ type: 'party-invite', to: bot.id });
    h.hub.answerPartyInvite(bot.id, a.id, true);
    h.clock.now += 5_000;
    a.send({ type: 'party-invite', to: other.id });
    h.hub.answerPartyInvite(other.id, a.id, true);
    await settle();
    return { a, bot, other };
  }

  it('are speakers of the voice, each with a voice of its own, and hear when a player talks', async () => {
    const { a, bot, other } = await withBot();
    a.send({ type: 'voice-join', mic: true });
    await settle();
    const members = voiceOf(a)?.members ?? [];
    const voices = members.filter((m) => m.isBot).map((m) => m.voice);
    expect(members.map((m) => m.id)).toEqual([a.id, bot.id, other.id]);
    expect(voices.every((v) => v !== null)).toBe(true);
    expect(Math.abs((voices[0]?.pitch ?? 0) - (voices[1]?.pitch ?? 0))).toBeGreaterThanOrEqual(0.2);
    a.send({ type: 'voice-speaking', on: true });
    await settle();
    expect(bot.inbox.filter((m) => m.type === 'voice-speaking')).toEqual([{ type: 'voice-speaking', id: a.id, on: true }]);
    h.hub.voiceBotSay(bot.id, { key: 'yes', variant: 2 });
    expect(a.last('voice-bot-say')).toEqual({ type: 'voice-bot-say', id: bot.id, line: { key: 'yes', variant: 2 } });
    expect(a.last('emote')).toMatchObject({ id: bot.id, emote: 'jump' });
  });

  it('say nothing to a player who is not in the voice or switched bots off', async () => {
    const { a, bot } = await withBot();
    h.hub.voiceBotSay(bot.id, { key: 'hello', variant: 0 });
    expect(a.all('voice-bot-say')).toEqual([]);
    a.send({ type: 'voice-join', mic: true });
    await settle();
    h.hub.settingsChanged('child-a', { botsEnabled: false });
    h.hub.voiceBotSay(bot.id, { key: 'hello', variant: 0 });
    expect(a.all('voice-bot-say')).toEqual([]);
  });
});

describe('calling a friend', () => {
  async function friends(): Promise<[Client, Client]> {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b', [1, 5, 1], 'cho-phien');
    h.friends.befriend('child-a', 'child-b');
    return [a, b];
  }

  it('rings the friend wherever she plays; accepted, both are in the call and their setup passes', async () => {
    const [a, b] = await friends();
    a.send({ type: 'voice-call', to: b.id });
    await settle();
    expect(b.last('voice-call-invite')).toEqual({ type: 'voice-call-invite', from: { id: a.id, displayName: 'Bạn child-a', species: 'cat' }, expiresInMs: VOICE_CALL_RING_MS });
    expect(a.last('voice-call-ringing')).toMatchObject({ to: b.id, displayName: 'Bạn child-b' });
    // Not before she accepts.
    a.send({ type: 'voice-signal', to: b.id, signal: OFFER });
    await settle();
    expect(b.all('voice-signal')).toEqual([]);
    b.send({ type: 'voice-call-reply', from: a.id, accept: true });
    await settle();
    expect(voiceOf(a)).toMatchObject({ kind: 'call', joined: true, members: [{ id: a.id }, { id: b.id }] });
    expect(voiceOf(b)?.kind).toBe('call');
    a.send({ type: 'voice-signal', to: b.id, signal: OFFER });
    await settle();
    expect(signalsFrom(b, a.id)).toHaveLength(1);
    b.send({ type: 'voice-leave' });
    await settle();
    expect(a.last('voice-call-end')).toEqual({ type: 'voice-call-end', id: b.id, reason: 'ended' });
    expect(voiceOf(a)).toBeNull();
    a.send({ type: 'voice-signal', to: b.id, signal: OFFER });
    await settle();
    expect(signalsFrom(b, a.id)).toHaveLength(1);
  });

  it('never rings a player who is not her friend, nor lets a stranger answer for someone else', async () => {
    const a = await h.joined('child-a');
    const s = await h.joined('child-s');
    a.send({ type: 'voice-call', to: s.id });
    await settle();
    expect(s.all('voice-call-invite')).toEqual([]);
    expect(a.last('voice-call-end')).toEqual({ type: 'voice-call-end', id: s.id, reason: 'not-here' });
    // A ringing call between two friends: a third player cannot accept it.
    const b = await h.joined('child-b');
    h.friends.befriend('child-a', 'child-b');
    h.clock.now += 5_000;
    a.send({ type: 'voice-call', to: b.id });
    await settle();
    s.send({ type: 'voice-call-reply', from: a.id, accept: true });
    await settle();
    expect(voiceOf(a)).toBeNull();
    expect(voiceOf(s)).toBeNull();
  });

  it('lapses unanswered, ends when declined, and says busy to a second caller', async () => {
    const [a, b] = await friends();
    a.send({ type: 'voice-call', to: b.id });
    await settle();
    await vi.advanceTimersByTimeAsync(VOICE_CALL_RING_MS);
    expect(a.last('voice-call-end')?.reason).toBe('timeout');
    expect(b.last('voice-call-end')?.reason).toBe('timeout');
    h.clock.now += 5_000;
    a.send({ type: 'voice-call', to: b.id });
    await settle();
    const c = await h.joined('child-c');
    h.friends.befriend('child-c', 'child-b');
    c.send({ type: 'voice-call', to: b.id });
    await settle();
    expect(c.last('voice-call-end')).toEqual({ type: 'voice-call-end', id: b.id, reason: 'busy' });
    b.send({ type: 'voice-call-reply', from: a.id, accept: false });
    await settle();
    expect(a.last('voice-call-end')?.reason).toBe('declined');
    expect(voiceOf(a)).toBeNull();
  });

  it('ends at once when either blocks the other or they are no longer friends', async () => {
    const [a, b] = await friends();
    a.send({ type: 'voice-call', to: b.id });
    await settle();
    b.send({ type: 'voice-call-reply', from: a.id, accept: true });
    await settle();
    expect(voiceOf(a)?.kind).toBe('call');
    h.hub.playerEvent({ type: 'unfriended', childId: 'child-a', otherChildId: 'child-b', botId: null });
    expect(a.last('voice-call-end')?.reason).toBe('ended');
    expect(voiceOf(b)).toBeNull();

    h.clock.now += 5_000;
    a.send({ type: 'voice-call', to: b.id });
    await settle();
    b.send({ type: 'voice-call-reply', from: a.id, accept: true });
    await settle();
    expect(voiceOf(a)?.kind).toBe('call');
    b.send({ type: 'block', id: a.id });
    await settle();
    expect(voiceOf(a)).toBeNull();
    a.send({ type: 'voice-signal', to: b.id, signal: OFFER });
    await settle();
    expect(signalsFrom(b, a.id)).toEqual([]);
  });

  it('holds back a player who calls again and again, and tells her the call did not go', async () => {
    const [a, b] = await friends();
    a.send({ type: 'voice-call', to: b.id });
    await settle();
    a.send({ type: 'voice-hangup' });
    a.send({ type: 'voice-call', to: b.id });
    await settle();
    expect(b.all('voice-call-invite')).toHaveLength(1);
    expect(a.last('voice-call-end')).toEqual({ type: 'voice-call-end', id: b.id, reason: 'failed' });
  });

  it('calling off a call keeps her party voice; leaving takes her out of both', async () => {
    const [a, b] = await friends();
    const mate = await h.joined('child-m');
    await party(a, mate);
    for (const x of [a, mate]) x.send({ type: 'voice-join', mic: true });
    await settle();
    a.send({ type: 'voice-call', to: b.id });
    await settle();
    a.send({ type: 'voice-hangup' });
    await settle();
    expect(b.last('voice-call-end')?.reason).toBe('ended');
    expect(voiceOf(a)).toMatchObject({ kind: 'party', joined: true });
    h.clock.now += 5_000;
    a.send({ type: 'voice-call', to: b.id });
    await settle();
    a.send({ type: 'voice-leave' });
    await settle();
    expect(b.last('voice-call-end')?.reason).toBe('ended');
    expect(voiceOf(a)).toMatchObject({ kind: 'party', joined: false });
    expect(voiceOf(mate)?.members.map((m) => m.id)).toEqual([mate.id]);
    mate.send({ type: 'voice-signal', to: a.id, signal: OFFER });
    await settle();
    expect(signalsFrom(a, mate.id)).toEqual([]);
  });

  it('does not start a call with someone who stopped being a friend while it rang', async () => {
    const [a, b] = await friends();
    a.send({ type: 'voice-call', to: b.id });
    await settle();
    h.friends.pairs.clear();
    b.send({ type: 'voice-call-reply', from: a.id, accept: true });
    await settle();
    expect(a.last('voice-call-end')?.reason).toBe('not-here');
    expect(voiceOf(a)).toBeNull();
  });

  it('keeps a call through a map change, and ends it when she does not come back', async () => {
    const [a, b] = await friends();
    a.send({ type: 'voice-call', to: b.id });
    await settle();
    b.send({ type: 'voice-call-reply', from: a.id, accept: true });
    await settle();
    a.conn.close();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(voiceOf(b)?.kind).toBe('call');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(b.last('voice-call-end')).toEqual({ type: 'voice-call-end', id: a.id, reason: 'ended' });
  });
});
