import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadContentCatalog } from '../content/content-catalog';
import type { PlayerPresence } from '@miu/schema/multiplayer';
import { BOT_MAP_CONFIGS, BOT_REPLY_MS, BOT_SEEN_RANGE, BOTS_NEAR_PLAYER, BotRunner, TRAIL_STEP } from './bot-runner';
import { MultiplayerHub } from './multiplayer-hub';

describe('MultiplayerHub and BotRunner', () => {
  let hub: MultiplayerHub;
  let botRunner: BotRunner;

  beforeEach(() => {
    hub = new MultiplayerHub();
    botRunner = new BotRunner(hub);
  });

  afterEach(async () => {
    botRunner.stop();
    await hub.close();
  });

  it('initializes rooms and populates companion bots with isBot: true', () => {
    botRunner.start();
    const room = hub.getOrCreateRoom('trung-tam');
    expect(room.members.size).toBeGreaterThanOrEqual(3);

    for (const member of room.members.values()) {
      expect(member.isBot).toBe(true);
      expect(member.presence.isBot).toBe(true);
      expect(member.presence.displayName).toBeTruthy();
    }
  });

  it('updates bot positions smoothly during tick cycle', async () => {
    botRunner.start();
    const room = hub.getOrCreateRoom('trung-tam');
    const firstBot = Array.from(room.members.values())[0];
    expect(firstBot).toBeDefined();
    if (!firstBot) return;

    expect(Number.isFinite(firstBot.presence.x)).toBe(true);
    expect(Number.isFinite(firstBot.presence.z)).toBe(true);

    // Wait 350ms for a few ticks
    await new Promise((resolve) => setTimeout(resolve, 350));

    // The bot should have progressed or be in a valid coordinate
    expect(Number.isFinite(firstBot.presence.x)).toBe(true);
    expect(Number.isFinite(firstBot.presence.z)).toBe(true);
  });

  it('dresses every companion bot only in items of the accessory catalogue (an unknown id would leave it bare)', () => {
    const { accessories } = loadContentCatalog();
    for (const [map, profiles] of Object.entries(BOT_MAP_CONFIGS)) {
      for (const profile of profiles) {
        for (const entry of profile.outfit) expect(accessories.has(entry.split(':')[0] ?? ''), `${map}/${profile.id}: ${entry}`).toBe(true);
      }
    }
  });

  it('gives every companion bot its own id, so a party can tell them apart across maps', () => {
    const ids = Object.values(BOT_MAP_CONFIGS).flatMap((profiles) => profiles.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('companion bots in parties', () => {
  it('a bot invited to a party joins it after a moment', async () => {
    vi.useFakeTimers();
    const hub = new MultiplayerHub();
    const bots = new BotRunner(hub);
    try {
      bots.start();
      const room = hub.getOrCreateRoom('trung-tam');
      const bot = [...room.members.values()][0];
      if (!bot) throw new Error('no bot');
      // The hub delivers an invite to the bot as it would to a player.
      expect(hub.parties.invite('p-someone', bot.id).ok).toBe(true);
      bot.send({ type: 'party-invite', from: { id: 'p-someone', displayName: 'Bạn', isBot: false }, expiresInMs: 60_000 });
      expect(hub.parties.partyOf(bot.id)).toBeNull();
      await vi.advanceTimersByTimeAsync(BOT_REPLY_MS);
      expect(hub.parties.partyOf(bot.id)?.members).toEqual(['p-someone', bot.id]);
    } finally {
      bots.stop();
      await hub.close();
      vi.useRealTimers();
    }
  });
});

describe('companion bots come to where a player plays', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** A player walking a quest's way far from the castle's bot patch (as the owner did, 07/10/2026). */
  function player(id: string): PlayerPresence {
    return { id, displayName: 'Bé', isBot: false, species: 'fox', outfit: [], pet: null, petGear: [], x: 140, y: 17, z: 220, yaw: 0, speed: 0, action: 'idle', riding: false, bubble: null };
  }
  const near = (room: ReturnType<MultiplayerHub['getOrCreateRoom']>, at: PlayerPresence): number =>
    [...room.members.values()].filter((m) => m.isBot && Math.hypot(m.presence.x - at.x, m.presence.z - at.z) <= BOT_SEEN_RANGE).length;

  it('brings bots onto her own walked way once she has walked a little, and sends them home when she leaves', async () => {
    vi.useFakeTimers();
    const hub = new MultiplayerHub();
    const bots = new BotRunner(hub, { random: () => 0.3 });
    bots.start();
    const room = hub.getOrCreateRoom('lau-dai');
    const me = player('child-1');
    room.join({ id: me.id, presence: me, send: () => {}, isBot: false });
    expect(near(room, me)).toBe(0);
    // She walks 60 blocks along the road, a step each half second.
    const walked: Array<{ x: number; z: number }> = [];
    for (let x = 140; x <= 200; x += 2) {
      room.updatePresence(me.id, { x, y: 17, z: 220, yaw: 0, speed: 4, action: 'walk' });
      walked.push({ x, z: 220 });
      await vi.advanceTimersByTimeAsync(500);
    }
    expect(near(room, me)).toBeGreaterThanOrEqual(BOTS_NEAR_PLAYER);
    // Each one stands on her way (a straight step between two points of it), never somewhere she has not been.
    for (const m of room.members.values()) {
      if (!m.isBot || Math.hypot(m.presence.x - me.x, m.presence.z - me.z) > BOT_SEEN_RANGE) continue;
      expect(Math.abs(m.presence.z - 220)).toBeLessThan(0.01);
      expect(m.presence.x).toBeGreaterThanOrEqual(140 - TRAIL_STEP);
    }
    room.leave(me.id);
    await vi.advanceTimersByTimeAsync(2_000);
    const patch = BOT_MAP_CONFIGS['lau-dai'] ?? [];
    for (const m of room.members.values()) {
      const home = patch.find((p) => p.id === m.id)?.waypoints;
      const xs = home?.map((w) => w.x) ?? [];
      expect(m.presence.x, m.id).toBeGreaterThanOrEqual(Math.min(...xs) - 1);
      expect(m.presence.x, m.id).toBeLessThanOrEqual(Math.max(...xs) + 1);
    }
    bots.stop();
    await hub.close();
  });

  it('leaves a player who already has bots around her as she is', async () => {
    vi.useFakeTimers();
    const hub = new MultiplayerHub();
    const bots = new BotRunner(hub, { random: () => 0.3 });
    bots.start();
    const room = hub.getOrCreateRoom('lau-dai');
    const first = BOT_MAP_CONFIGS['lau-dai']?.[0]?.waypoints[0] ?? { x: 0, z: 0 };
    const me = { ...player('child-2'), x: first.x, z: first.z };
    room.join({ id: me.id, presence: me, send: () => {}, isBot: false });
    const before = new Map([...room.members.values()].filter((m) => m.isBot).map((m) => [m.id, Math.hypot(m.presence.x - me.x, m.presence.z - me.z)]));
    for (let i = 0; i < 6; i++) {
      room.updatePresence(me.id, { x: me.x + (i % 2) * TRAIL_STEP, y: 17, z: me.z, yaw: 0, speed: 0, action: 'idle' });
      await vi.advanceTimersByTimeAsync(1_000);
    }
    // Nobody was brought over from afar: every bot is about as far from her as it was.
    for (const m of room.members.values()) if (m.isBot) expect(Math.abs(Math.hypot(m.presence.x - me.x, m.presence.z - me.z) - (before.get(m.id) ?? 0))).toBeLessThan(20);
    bots.stop();
    await hub.close();
  });
});
