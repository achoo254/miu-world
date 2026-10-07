import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOT_LINE_VARIANTS, BOT_LINE_VOICES } from '@miu/schema/bot-lines';
import { INTERACT_RANGE, type ServerWsMessage } from '@miu/schema/multiplayer';
import { hubHarness, settle, type Client } from '../../test/hub-harness';
import { BotRunner } from './bot-runner';
import { personaOf } from './bot-persona';
import { BOT_MAP_CONFIGS } from './bot-profiles';
import { memoryBotStore, type BotStore } from './bot-store';
import { PAIR_GAP_MS, PLAYER_LINE_GAP_MS, RECENT_LINES } from './bot-social';
import type { BotQuest } from './bot-brain/quest-plan';
import { WalkStore } from './bot-brain/walk-store';

const CASTLE = 'lau-dai';
const walk = new WalkStore();
/** Only the castle has its grid here: its bots walk, the others stay at home. */
const castleOnly = { get: (mapId: string) => (mapId === CASTLE ? walk.get(mapId) : null) };
const castleBots = (BOT_MAP_CONFIGS[CASTLE] ?? []).map((b) => b.id);

let h: ReturnType<typeof hubHarness>;
let runner: BotRunner | null = null;

/** The bots of every map, the castle's on their feet, with seeded dice; `quests`: what the castle's bots play. */
function startBots(quests: readonly BotQuest[] = [], store?: BotStore): void {
  let seed = 5;
  const random = (): number => ((seed = (seed * 16_807) % 2_147_483_647) - 1) / 2_147_483_646;
  runner = new BotRunner(h.hub, { random, walk: castleOnly, quests: { questsOn: (mapId) => (mapId === CASTLE ? quests : []) }, ...(store ? { store } : {}) });
  runner.start();
}

beforeEach(() => {
  vi.useFakeTimers();
  h = hubHarness();
});

afterEach(async () => {
  runner?.stop();
  runner = null;
  await h.hub.close();
  vi.useRealTimers();
});

const botSays = (c: Client): Array<Extract<ServerWsMessage, { type: 'bot-say' }>> => c.all('bot-say');

describe('companion bots meeting players', () => {
  it('walk over or pass by, turn to her and talk at a pace that never talks her over, then go back to their plans', { timeout: 30_000 }, async () => {
    // A little way off the castle bots' homes (around x 50…85, z 335…355): within their sight, out of their reach.
    const here = { x: 67, y: 17, z: 368 };
    startBots();
    const a = await h.joined('child-a', [here.x, here.y, here.z], CASTLE);
    const room = h.hub.getOrCreateRoom(CASTLE);
    const startAway = new Map(castleBots.map((id) => [id, Math.hypot((room.members.get(id)?.presence.x ?? 0) - here.x, (room.members.get(id)?.presence.z ?? 0) - here.z)]));
    expect(Math.min(...startAway.values())).toBeGreaterThan(INTERACT_RANGE);

    // When each line came, and how far from her its bot stood then.
    const heard: Array<{ at: number; away: number }> = [];
    for (let t = 0; t < 4 * 60 * 10; t++) {
      await vi.advanceTimersByTimeAsync(100);
      for (const line of botSays(a).slice(heard.length)) {
        const bot = room.members.get(line.id)?.presence;
        heard.push({ at: Date.now(), away: bot ? Math.hypot(bot.x - here.x, bot.y - here.y, bot.z - here.z) : Infinity });
      }
    }
    const said = botSays(a);
    expect(said.length).toBeGreaterThanOrEqual(2);
    // Every line to her, from a bot of the castle within her reach, in its own voice.
    for (const [i, line] of said.entries()) {
      expect(castleBots).toContain(line.id);
      expect(line.to).toBe(a.id);
      expect(line.variant).toBeLessThan(BOT_LINE_VARIANTS);
      expect(line.variant % BOT_LINE_VOICES).toBe(personaOf(line.id).voice);
      expect(heard[i]?.away).toBeLessThanOrEqual(INTERACT_RANGE);
    }
    // They walked over to her (none started within her reach) and stopped 3–5 blocks off before talking.
    expect(Math.min(...heard.map((l) => l.away))).toBeGreaterThanOrEqual(3);
    expect(Math.max(...heard.map((l) => l.away))).toBeLessThanOrEqual(5);
    expect(a.all('emote').filter((e) => castleBots.includes(e.id) && e.emote === 'wave').length).toBeGreaterThanOrEqual(said.length);
    // The pace: one line from all bots every 6 s at most, one bot every 25 s, nothing again among her last 12.
    for (let i = 1; i < heard.length; i++) expect((heard[i]?.at ?? 0) - (heard[i - 1]?.at ?? 0)).toBeGreaterThanOrEqual(PLAYER_LINE_GAP_MS);
    const lastBy = new Map<string, number>();
    for (const [i, line] of said.entries()) {
      const at = heard[i]?.at ?? 0;
      const last = lastBy.get(line.id);
      if (last !== undefined) expect(at - last).toBeGreaterThanOrEqual(PAIR_GAP_MS);
      lastBy.set(line.id, at);
    }
    const keys = said.map((l) => `${l.key}:${l.variant}`);
    for (let i = 0; i < keys.length; i++) expect(keys.slice(Math.max(0, i - RECENT_LINES), i)).not.toContain(keys[i]);

    // She walks off far across the castle grounds: nobody follows her.
    for (let x = here.x; x <= here.x + 90; x += 3) {
      a.send({ type: 'update', x, y: 17, z: here.z + 120, yaw: 0, speed: 4 });
      await vi.advanceTimersByTimeAsync(1_000);
    }
    await vi.advanceTimersByTimeAsync(30_000);
    const near = [...room.members.values()].filter((m) => m.isBot && Math.hypot(m.presence.x - (here.x + 90), m.presence.z - (here.z + 120)) <= 30);
    expect(near).toEqual([]);
  });

  it('talk only to players who see them: never to one who switched bots off, nor past a block', { timeout: 30_000 }, async () => {
    startBots();
    const at: [number, number, number] = [67, 17, 345];
    h.db.settings.set('child-off', { botsEnabled: false });
    const a = await h.joined('child-a', at, CASTLE);
    const off = await h.joined('child-off', at, CASTLE);
    const c = await h.joined('child-c', at, CASTLE);
    c.send({ type: 'block', id: a.id });
    await settle();
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    expect(botSays(a).length).toBeGreaterThan(0);
    expect(botSays(off)).toEqual([]);
    expect(off.all('spawn').filter((m) => castleBots.includes(m.player.id))).toEqual([]);
    // What a bot says to her never reaches a player she is blocked with; that player gets lines of her own.
    expect(botSays(c).filter((l) => l.to === a.id)).toEqual([]);
    expect(botSays(c).length).toBeGreaterThan(0);
  });

  it('tell a player who comes in later what quest each bot is on, unless she switched bots off', async () => {
    startBots([{ id: 'thu-thach-lau-dai', steps: [{ id: 's1', targets: [], question: false }] }]);
    await vi.advanceTimersByTimeAsync(5_000);
    const late = await h.joined('child-late', [600, 17, 600], CASTLE);
    const doing = late.all('bot-doing');
    expect(late.inbox[0]?.type).toBe('welcome');
    expect(new Set(doing.map((m) => m.id))).toEqual(new Set(castleBots));
    expect(doing.every((m) => m.quest === 'thu-thach-lau-dai')).toBe(true);
    h.db.settings.set('child-off', { botsEnabled: false });
    const off = await h.joined('child-off', [600, 17, 600], CASTLE);
    expect(off.all('bot-doing')).toEqual([]);
  });

  it('ask a player they won a challenge with to be friends, with a line of their own, labelled as bots', { timeout: 30_000 }, async () => {
    const store = memoryBotStore();
    for (const id of castleBots) await store.remember(id, 'child-a', 'thu-thach-lau-dai', new Date(0));
    startBots([], store);
    const a = await h.joined('child-a', [67, 17, 368], CASTLE);
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    const asks = a.all('friend-request');
    // One request in ten minutes at most, whichever bots remember her.
    expect(asks).toHaveLength(1);
    expect(asks[0]?.request.from.isBot).toBe(true);
    const line = botSays(a).find((l) => l.key === 'friend');
    expect(line?.to).toBe(a.id);
    // She was greeted as someone it knows, never as a stranger.
    expect(botSays(a).filter((l) => l.key === 'hello')).toEqual([]);
  });
});
