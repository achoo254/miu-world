import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadContentCatalog } from '../content/content-catalog';
import type { PlayerPresence } from '@miu/schema/multiplayer';
import { BOT_REPLY_MS, BotRunner } from './bot-runner';
import { BOT_MAP_CONFIGS } from './bot-profiles';
import { WalkStore, type Spot } from './bot-brain/walk-store';
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

describe('companion bots walk on their own', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const store = new WalkStore();
  /** Only the castle has its grid here: one map's bots are enough, and the others stay at home. */
  const castleOnly = { get: (mapId: string) => (mapId === 'lau-dai' ? store.get(mapId) : null) };

  function player(id: string): PlayerPresence {
    return { id, displayName: 'Bé', isBot: false, species: 'fox', outfit: [], pet: null, petGear: [], x: 600, y: 17, z: 600, yaw: 0, speed: 0, action: 'idle', riding: false, bubble: null };
  }

  it('walk the map on their own feet: every step one the child could take, never through a wall', async () => {
    vi.useFakeTimers();
    const map = store.get('lau-dai');
    if (!map) throw new Error('no walk grid for lau-dai');
    const hub = new MultiplayerHub();
    let seed = 7;
    const random = (): number => ((seed = (seed * 16_807) % 2_147_483_647) - 1) / 2_147_483_646;
    const bots = new BotRunner(hub, { random, walk: castleOnly });
    bots.start();
    const room = hub.getOrCreateRoom('lau-dai');
    const last = new Map<string, Spot>();
    const start = new Map<string, Spot>();
    let steps = 0;
    for (let t = 0; t < 600; t++) {
      await vi.advanceTimersByTimeAsync(100);
      for (const m of room.members.values()) {
        const at = { x: Math.floor(m.presence.x), y: m.presence.y, z: Math.floor(m.presence.z) };
        expect(map.standAt(at.x, at.y, at.z), `${m.id} at ${at.x},${at.y},${at.z}`).not.toBe(0);
        const before = last.get(m.id);
        if (!start.has(m.id)) start.set(m.id, at);
        if (before && (before.x !== at.x || before.z !== at.z) && !m.presence.riding && Math.max(Math.abs(before.x - at.x), Math.abs(before.z - at.z)) <= 1) {
          expect(map.steps(before, at), `${m.id} ${before.x},${before.y},${before.z} -> ${at.x},${at.y},${at.z}`).toBe(true);
          steps += 1;
        }
        last.set(m.id, at);
      }
    }
    expect(steps).toBeGreaterThan(200);
    const wandered = [...room.members.values()].filter((m) => {
      const from = start.get(m.id);
      return from && Math.hypot(m.presence.x - from.x, m.presence.z - from.z) > 5;
    });
    expect(wandered.length).toBeGreaterThanOrEqual(Math.ceil((BOT_MAP_CONFIGS['lau-dai']?.length ?? 0) / 2));
    bots.stop();
    await hub.close();
  });

  it('follow nobody: a player far from them keeps to herself however long she walks', async () => {
    vi.useFakeTimers();
    const hub = new MultiplayerHub();
    const bots = new BotRunner(hub, { random: () => 0.3, walk: castleOnly });
    bots.start();
    const room = hub.getOrCreateRoom('lau-dai');
    const me = player('child-1');
    room.join({ id: me.id, presence: me, send: () => {}, isBot: false });
    // Across the castle grounds from the bots' homes (around x 65, z 345).
    for (let x = 600; x <= 660; x += 2) {
      room.updatePresence(me.id, { x, y: 17, z: 600, yaw: 0, speed: 4, action: 'walk' });
      await vi.advanceTimersByTimeAsync(1_000);
    }
    const near = [...room.members.values()].filter((m) => m.isBot && Math.hypot(m.presence.x - me.x, m.presence.z - me.z) <= 45);
    expect(near).toEqual([]);
    bots.stop();
    await hub.close();
  });

  it('stay at their homes on a map without a walk grid', async () => {
    vi.useFakeTimers();
    const hub = new MultiplayerHub();
    const bots = new BotRunner(hub, { walk: { get: () => null } });
    bots.start();
    await vi.advanceTimersByTimeAsync(3_000);
    const room = hub.getOrCreateRoom('lau-dai');
    for (const profile of BOT_MAP_CONFIGS['lau-dai'] ?? []) {
      const at = room.members.get(profile.id)?.presence;
      expect(at && { x: at.x, y: at.y, z: at.z }).toEqual(profile.home);
    }
    bots.stop();
    await hub.close();
  });
});
