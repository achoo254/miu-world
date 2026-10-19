// The hub's safety limits: only canned lines, no oversized or flooding messages (a connection that keeps flooding is
// closed), the emergency switch (everything off, or interaction off while players still see each other), players
// locked out of online play, and what is kept around a report (who was in the room, the canned lines sent).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncidentInput } from '../moderation/moderation-store';
import { hubHarness, settle, type Client } from '../../test/hub-harness';
import { FLOOD_CLOSE_DROPS, WS_CLOSE } from './multiplayer-hub';
import { OnlineSwitch } from './online-switch';

let h: ReturnType<typeof hubHarness>;
let online: OnlineSwitch;
/** What the store was told of each report's incident, and who is locked out. */
let incidents: IncidentInput[];
let locked: Set<string>;
let hideOnReport: Set<string>;

beforeEach(() => {
  vi.useFakeTimers();
  online = new OnlineSwitch();
  h = hubHarness({ onlineSwitch: online });
  incidents = [];
  locked = new Set();
  hideOnReport = new Set();
  h.db.store.report = async (from, about, reason, map, incident) => {
    h.db.reports.push({ from, about, reason, map });
    if (incident) incidents.push(incident);
    return { hidden: hideOnReport.has(about) };
  };
  h.db.store.restricted = async (childId) => locked.has(childId);
});

afterEach(async () => {
  await h.hub.close();
  vi.useRealTimers();
});

async function partyOf(leader: Client, member: Client): Promise<void> {
  leader.send({ type: 'party-invite', to: member.id });
  member.send({ type: 'party-reply', from: leader.id, accept: true });
  expect(leader.last('party-state')?.party?.members).toHaveLength(2);
}

describe('message limits', () => {
  it('drops a line outside the canned list, an oversized message and a burst beyond the bucket', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    a.send({ type: 'chat', text: 'số điện thoại của tớ là…' });
    a.conn.receive(JSON.stringify({ type: 'chat', text: 'Xin chào bạn!', pad: 'x'.repeat(5000) }));
    a.conn.receive(`{"type":"emote","emote":"heart"${' '.repeat(5000)}}`);
    expect(b.all('chat')).toEqual([]);
    expect(b.all('emote')).toEqual([]);
    // The bucket holds 40; the join and the refused line took two (the oversized ones were dropped before it).
    for (let i = 0; i < 60; i++) a.send({ type: 'emote', emote: 'heart' });
    expect(b.all('emote').length).toBe(38);
    expect(a.closed).toBeNull();
  });

  it('closes a connection that keeps flooding (the client comes back later), and keeps one that slows down', async () => {
    const a = await h.joined('child-a');
    const calm = await h.joined('child-calm');
    // 39 messages fit what the join left of the bucket; every one after is dropped.
    for (let i = 0; i < 39 + FLOOD_CLOSE_DROPS - 1; i++) a.send({ type: 'emote', emote: 'heart' });
    expect(a.closed).toBeNull();
    a.send({ type: 'emote', emote: 'heart' });
    expect(a.closed).toBe(WS_CLOSE.flood);
    expect(calm.last('despawn')?.id).toBe(a.id);
    // Dropped messages spread out over time never add up to a close.
    for (let round = 0; round < 5; round++) {
      for (let i = 0; i < 60; i++) calm.send({ type: 'emote', emote: 'wave' });
      h.clock.now += 11_000;
    }
    expect(calm.closed).toBeNull();
  });
});

describe('the emergency switch', () => {
  it('off: closes every connection within the call and lets nobody in; back on, players connect again', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    online.set('off');
    expect([a.closed, b.closed]).toEqual([WS_CLOSE.paused, WS_CLOSE.paused]);
    const refused = await h.tryConnect('child-c');
    expect(refused).toBeNull();
    online.set('on');
    const c = await h.joined('child-c');
    const a2 = await h.joined('child-a');
    expect(c.closed).toBeNull();
    expect(a2.last('welcome')?.players.map((p) => p.id)).toContain(c.id);
  });

  it('interaction off: players still see each other move, but lines, waves, invites and voice stop; parties end', async () => {
    const a = await h.joined('child-a', [10, 5, 10]);
    const b = await h.joined('child-b', [12, 5, 10]);
    await partyOf(a, b);
    const invitesBefore = b.all('party-invite').length;
    online.set('interaction-off');
    expect(a.last('online-mode')).toEqual({ type: 'online-mode', mode: 'interaction-off' });
    expect(b.last('party-state')?.party).toBeNull();
    a.send({ type: 'chat', text: 'Xin chào bạn!' });
    a.send({ type: 'emote', emote: 'wave', to: b.id });
    a.send({ type: 'party-invite', to: b.id });
    a.send({ type: 'friend-request', to: b.id });
    a.send({ type: 'voice-join', mic: false });
    await settle();
    expect(b.all('chat')).toEqual([]);
    expect(b.all('emote')).toEqual([]);
    expect(b.all('party-invite')).toHaveLength(invitesBefore);
    expect(b.all('friend-request')).toEqual([]);
    a.send({ type: 'update', x: 11, y: 5, z: 10, yaw: 0, speed: 2 });
    expect(b.last('move')).toMatchObject({ id: a.id, x: 11 });
    // Blocking and reporting still work, and someone who joins now is told at once.
    a.send({ type: 'report', id: b.id, reason: 'spam' });
    await settle();
    expect(h.db.reports).toHaveLength(1);
    const c = await h.joined('child-c');
    expect(c.last('online-mode')?.mode).toBe('interaction-off');
    // Companion bots stop asking too.
    const room = h.hub.getOrCreateRoom('trung-tam');
    const bot = h.bot(room, 'bot-tt-1', [11, 5, 10]);
    expect(h.hub.botMayInvite(bot.id, a.id)).toBe(false);
    online.set('on');
    expect(a.last('online-mode')?.mode).toBe('on');
    a.send({ type: 'chat', text: 'Cùng chơi nhé!' });
    expect(b.last('chat')?.text).toBe('Cùng chơi nhé!');
  });
});

describe('players locked out of online play', () => {
  it('a locked player is not let in (she plays on alone)', async () => {
    locked.add('child-a');
    expect(await h.tryConnect('child-a')).toBeNull();
    const b = await h.joined('child-b');
    expect(b.closed).toBeNull();
  });

  it('a lock from a moderator closes her connection and takes her out of her party at once', async () => {
    const a = await h.joined('child-a', [10, 5, 10]);
    const b = await h.joined('child-b', [12, 5, 10]);
    await partyOf(a, b);
    h.hub.playerEvent({ type: 'restricted', childId: 'child-b' });
    expect(b.closed).toBe(WS_CLOSE.restricted);
    expect(a.last('despawn')?.id).toBe(b.id);
    expect(a.last('party-state')?.party).toBeNull();
  });

  it('the reports safeguard: when a report hides a player, she is closed out at once', async () => {
    const a = await h.joined('child-a');
    const b = await h.joined('child-b');
    hideOnReport.add('child-b');
    a.send({ type: 'report', id: b.id, reason: 'harassment' });
    await settle();
    expect(a.last('notice')).toEqual({ type: 'notice', code: 'reported', id: b.id });
    expect(b.closed).toBe(WS_CLOSE.restricted);
  });
});

describe('what is kept around a report', () => {
  it('the other players in the room and the canned lines the two sent lately, never positions', async () => {
    const reporter = await h.joined('child-a', [10, 5, 10]);
    const reported = await h.joined('child-b', [12, 5, 10]);
    await h.joined('child-c', [40, 5, 40]);
    await h.joined('child-elsewhere', [10, 5, 10], 'cho-phien');
    h.bot(h.hub.getOrCreateRoom('trung-tam'), 'bot-tt-1');
    reported.send({ type: 'chat', text: 'Hẹn gặp lại nhé!' });
    h.clock.now += 5_000;
    reporter.send({ type: 'chat', text: 'Xin chào bạn!', to: reported.id });
    h.clock.now += 2_000;
    reporter.send({ type: 'report', id: reported.id, reason: 'harassment' });
    await settle();
    expect(incidents).toEqual([
      {
        witnesses: ['child-c'],
        lines: [
          { by: 'reported', text: 'Hẹn gặp lại nhé!', secondsBefore: 7 },
          { by: 'reporter', text: 'Xin chào bạn!', secondsBefore: 2 },
        ],
      },
    ]);
    expect(JSON.stringify(incidents)).not.toMatch(/"x"|"z"/);
  });

  it('forgets lines older than ten minutes', async () => {
    const reporter = await h.joined('child-a');
    const reported = await h.joined('child-b');
    reported.send({ type: 'chat', text: 'Cố lên nào!' });
    h.clock.now += 11 * 60_000;
    reporter.send({ type: 'report', id: reported.id, reason: 'spam' });
    await settle();
    expect(incidents[0]?.lines).toEqual([]);
  });
});
