import { describe, expect, it } from 'vitest';
import { BOT_LINE_VOICES, type BotLine } from '@miu/schema/bot-lines';
import { hashOf, seeded } from './bot-persona';
import {
  APART_MS,
  BotSocial,
  FRIEND_ASK_CHANCE,
  FRIEND_ASK_GAP_MS,
  FRIEND_ASK_KNOWN_CHANCE,
  PAIR_GAP_MS,
  PLAYER_LINE_GAP_MS,
  RECENT_LINES,
  type MeetContext,
} from './bot-social';

const ctx = (over: Partial<MeetContext> = {}): MeetContext => ({ voice: 0, chat: 1, quest: null, friend: false, ...over });

/** A BotSocial on a clock the test moves (ms), with seeded dice (or dice that always roll `seed`). */
function social(seed: string | number = 'social', recall?: (botId: string, playerId: string) => Promise<boolean>) {
  const clock = { now: 0 };
  const random = typeof seed === 'number' ? () => seed : seeded(hashOf(seed));
  const s = new BotSocial({ now: () => clock.now, random, ...(recall ? { recall } : {}) });
  return { s, clock };
}

/** Lets a recall promise settle. */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

interface Said {
  at: number;
  bot: string;
  line: BotLine;
}

/**
 * Five bots of all three voices meet one player over ten minutes: `encounters` times one of them comes within reach
 * for 3–12 s, at random moments. Returns every line said to her.
 */
function crowd(seed: string, encounters = 200, minutes = 10): { said: Said[]; waves: number } {
  const { s, clock } = social(seed);
  const dice = seeded(hashOf(`${seed}:crowd`));
  const bots = ['bot-a', 'bot-b', 'bot-c', 'bot-d', 'bot-e'];
  const span = minutes * 60_000;
  const near = bots.map(() => [] as Array<[number, number]>);
  for (let i = 0; i < encounters; i++) {
    const from = Math.floor(dice() * span);
    near[Math.floor(dice() * bots.length)]?.push([from, from + 3_000 + dice() * 9_000]);
  }
  const said: Said[] = [];
  let waves = 0;
  for (let t = 0; t <= span; t += 100) {
    clock.now = t;
    bots.forEach((bot, i) => {
      if (!near[i]?.some(([a, b]) => t >= a && t <= b)) return;
      const action = s.meet(bot, 'p-1', ctx({ voice: i % BOT_LINE_VOICES, chat: 0.2 + 0.2 * i, quest: i % 2 === 0 ? 'bai-hoc' : null }));
      if (action?.emote) waves += 1;
      if (action?.say) said.push({ at: t, bot, line: action.say });
    });
  }
  return { said, waves };
}

describe('companion bots meeting a player', () => {
  it('never talk her over: one line from all bots every 6 s at most, one bot every 25 s, no line again among her last 12', () => {
    // 200 times a bot comes within her reach: within ten minutes (the bots stay about her, a few meetings each), and
    // over an hour (most of them meetings anew, so the most lines).
    for (const [seed, minutes, least] of [['a', 10, 5], ['b', 10, 5], ['c', 60, 50], ['d', 60, 50]] as const) {
      const { said, waves } = crowd(seed, 200, minutes);
      expect(said.length).toBeGreaterThanOrEqual(least);
      expect(waves).toBeGreaterThanOrEqual(said.length / 2);
      for (let i = 1; i < said.length; i++) expect((said[i]?.at ?? 0) - (said[i - 1]?.at ?? 0)).toBeGreaterThanOrEqual(PLAYER_LINE_GAP_MS);
      const lastBy = new Map<string, number>();
      for (const line of said) {
        const last = lastBy.get(line.bot);
        if (last !== undefined) expect(line.at - last).toBeGreaterThanOrEqual(PAIR_GAP_MS);
        lastBy.set(line.bot, line.at);
      }
      const keys = said.map((l) => `${l.line.key}:${l.line.variant}`);
      for (let i = 0; i < keys.length; i++) expect(keys.slice(Math.max(0, i - RECENT_LINES), i)).not.toContain(keys[i]);
    }
  });

  it('speak each in its own voice, with the line that fits: hello first, then again or what it is busy with', () => {
    const { said } = crowd('voices');
    const voiceOf = new Map(['bot-a', 'bot-b', 'bot-c', 'bot-d', 'bot-e'].map((b, i) => [b, i % BOT_LINE_VOICES]));
    for (const line of said) expect(line.line.variant % BOT_LINE_VOICES).toBe(voiceOf.get(line.bot));
    // Hello once, at their first meeting; "doing" only from the bots busy with a quest (a, c, e).
    for (const bot of voiceOf.keys()) expect(said.filter((l) => l.bot === bot && l.line.key === 'hello').length).toBeLessThanOrEqual(1);
    expect(said.filter((l) => l.line.key === 'doing').every((l) => ['bot-a', 'bot-c', 'bot-e'].includes(l.bot))).toBe(true);
    const kinds = new Set(said.map((l) => l.line.key));
    for (const key of ['hello', 'again', 'doing']) expect(kinds).toContain(key);
    for (const key of kinds) expect(['hello', 'again', 'doing', 'friend']).toContain(key);
  });

  it('say "again" only to a player they met before or remember from a challenge won together', async () => {
    // Dice at one half: always talkative, no friend request from a second meeting, one after a challenge won together.
    const plain = social(0.5);
    expect(plain.s.meet('bot-a', 'p-1', ctx())?.say?.key).toBe('hello');
    // Within reach all along: the same meeting, nothing more to say (no quest).
    plain.clock.now = PAIR_GAP_MS + 1;
    expect(plain.s.meet('bot-a', 'p-1', ctx())).toBeNull();
    // Away more than a minute, then back: a second meeting.
    plain.clock.now += APART_MS + 1;
    expect(plain.s.meet('bot-a', 'p-1', ctx())?.say?.key).toBe('again');

    const remembered = social(0.5, async (botId, playerId) => botId === 'bot-a' && playerId === 'p-1');
    // Still recalling her: it waits.
    expect(remembered.s.meet('bot-a', 'p-1', ctx())).toBeNull();
    await settle();
    // It remembers her: glad to see her, and asks her to be friends.
    expect(remembered.s.meet('bot-a', 'p-1', ctx())).toMatchObject({ say: { key: 'friend' }, emote: 'wave', friendAsk: true });
    remembered.clock.now = PLAYER_LINE_GAP_MS;
    expect(remembered.s.meet('bot-b', 'p-1', ctx())).toBeNull();
    await settle();
    expect(remembered.s.meet('bot-b', 'p-1', ctx())?.say?.key).toBe('hello');
  });

  it('a quiet bot sometimes only waves; a bot about to talk waits while another one just spoke to her', () => {
    const { s, clock } = social('quiet');
    let lines = 0;
    let wavesOnly = 0;
    for (let i = 0; i < 400; i++) {
      clock.now = i * (PAIR_GAP_MS + APART_MS + 1);
      const action = s.meet('bot-a', `p-${i}`, ctx({ chat: 0 }));
      if (action?.say) lines += 1;
      else if (action?.emote === 'wave') wavesOnly += 1;
    }
    expect(lines / 400).toBeGreaterThan(0.25);
    expect(lines / 400).toBeLessThan(0.45);
    expect(wavesOnly + lines).toBe(400);

    const busy = social(0.5);
    expect(busy.s.meet('bot-a', 'p-1', ctx())?.say).toBeTruthy();
    busy.clock.now = 2_000;
    expect(busy.s.meet('bot-b', 'p-1', ctx())).toBeNull();
    busy.clock.now = PLAYER_LINE_GAP_MS;
    expect(busy.s.meet('bot-b', 'p-1', ctx())?.say?.key).toBe('hello');
  });

  it('ask her to be friends 35% of meetings from the second, 70% when they won a challenge together, never a friend', async () => {
    const trial = async (known: boolean, meetings: number, friend = false): Promise<number> => {
      let asks = 0;
      for (let i = 0; i < 2_000; i++) {
        const { s, clock } = social(`ask-${known}-${meetings}-${i}`, async () => known);
        let asked = false;
        for (let m = 0; m < meetings; m++) {
          clock.now = m * (APART_MS + PAIR_GAP_MS + 1);
          // The first time, it recalls her before it greets.
          const first = s.meet('bot-a', 'p-1', ctx({ friend }));
          await settle();
          const then = s.meet('bot-a', 'p-1', ctx({ friend }));
          asked ||= Boolean(first?.friendAsk || then?.friendAsk);
        }
        if (asked) asks += 1;
      }
      return asks / 2_000;
    };
    expect(await trial(false, 1)).toBe(0);
    expect(await trial(false, 2)).toBeCloseTo(FRIEND_ASK_CHANCE, 1);
    expect(await trial(true, 1)).toBeCloseTo(FRIEND_ASK_KNOWN_CHANCE, 1);
    expect(await trial(true, 3, true)).toBe(0);
  });

  it('one friend request from any bot to a player per 10 minutes, and each bot asks her once', async () => {
    // Every bot remembers her: each meeting is a 70% chance.
    const { s, clock } = social('cap', async () => true);
    const asks: Array<{ at: number; bot: string; line: string | undefined }> = [];
    for (let t = 0; t <= 60 * 60_000; t += 1_000) {
      // They come and go: within her reach the first 30 s of every three minutes (a new meeting each time).
      if (t % 180_000 > 30_000) continue;
      clock.now = t;
      for (const bot of ['bot-a', 'bot-b', 'bot-c']) {
        const action = s.meet(bot, 'p-1', ctx());
        if (action?.friendAsk) asks.push({ at: t, bot, line: action.say?.key });
      }
      await settle();
    }
    expect(asks.length).toBeGreaterThan(0);
    for (let i = 1; i < asks.length; i++) expect((asks[i]?.at ?? 0) - (asks[i - 1]?.at ?? 0)).toBeGreaterThanOrEqual(FRIEND_ASK_GAP_MS);
    expect(new Set(asks.map((a) => a.bot)).size).toBe(asks.length);
    expect(asks.filter((a) => a.line !== undefined).every((a) => a.line === 'friend')).toBe(true);
  });

  it('cheer to a player who sees it when it finds or finishes its quest, at the same pace', () => {
    const { s, clock } = social(0.5);
    expect(s.cheer('bot-a', 'p-1', 'found', ctx())?.key).toBe('found');
    clock.now = 10_000;
    expect(s.cheer('bot-a', 'p-1', 'done', ctx())).toBeNull();
    expect(s.cheer('bot-b', 'p-1', 'done', ctx())?.key).toBe('done');
    clock.now = 12_000;
    expect(s.meet('bot-c', 'p-1', ctx())?.say ?? null).toBeNull();
  });

  it('keep nothing of a player once she is in no room with bots', () => {
    const { s } = social(0.5);
    s.meet('bot-a', 'p-1', ctx());
    s.meet('bot-a', 'p-2', ctx());
    s.keepOnly(new Set(['p-2']));
    expect(s.playersKept).toBe(1);
    // Back later, she is met anew.
    expect(s.meet('bot-a', 'p-1', ctx())?.say?.key).toBe('hello');
  });
});
