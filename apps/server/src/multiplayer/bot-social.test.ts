import { describe, expect, it } from 'vitest';
import { BOT_LINE_VOICES, type BotLine } from '@miu/schema/bot-lines';
import { hashOf, seeded } from './bot-persona';
import {
  APART_MS,
  BotSocial,
  FRIEND_ASK_CHANCE,
  FRIEND_ASK_GAP_MS,
  FRIEND_ASK_KNOWN_CHANCE,
  INVITE_AROUND_MS,
  INVITE_GAP_MS,
  INVITE_LAPSE_MS,
  INVITE_PAUSE_MS,
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

  it('after playing a party\'s quest through with her: ask to be friends 70% of the time within the same pace, then greet her as known', async () => {
    let asks = 0;
    for (let i = 0; i < 2_000; i++) {
      // The store knew nothing of her before: what it says later does not undo the quest just played.
      const { s } = social(`played-${i}`, async () => false);
      const action = s.playedWith('bot-a', 'p-1', ctx());
      if (action?.friendAsk) {
        asks += 1;
        expect(action).toMatchObject({ say: { key: 'friend' }, emote: null, partyInvite: false });
      }
    }
    expect(asks / 2_000).toBeCloseTo(FRIEND_ASK_KNOWN_CHANCE, 1);

    const { s, clock } = social(0.1, async () => false);
    expect(s.playedWith('bot-a', 'p-1', ctx())?.friendAsk).toBe(true);
    // Within ten minutes of an ask no other bot asks her, a friend is never asked.
    clock.now = FRIEND_ASK_GAP_MS - 1;
    expect(s.playedWith('bot-b', 'p-1', ctx())).toBeNull();
    clock.now = FRIEND_ASK_GAP_MS;
    expect(s.playedWith('bot-c', 'p-1', ctx({ friend: true }))).toBeNull();
    // Its recall of her, still on its way as they finish, does not undo the quest just played: she is greeted as a
    // player it knows, never with "hello", though it is their first meeting.
    expect(s.meet('bot-d', 'p-2', ctx({ friend: true }))).toBeNull();
    expect(s.playedWith('bot-d', 'p-2', ctx({ friend: true }))).toBeNull();
    await settle();
    expect(s.meet('bot-d', 'p-2', ctx({ friend: true }))?.say?.key).toBe('again');
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

describe('companion bots asking a player into a party', () => {
  const MIN = 60_000;
  /** A friend already (no friend request in the way), and the runner and the hub letting it ask. */
  const asking = (over: Partial<MeetContext> = {}): MeetContext => ctx({ friend: true, mayInvite: () => true, ...over });

  it('ask only from their second meeting, once she has been around bots three minutes, and the hub lets them', () => {
    // Dice at zero: whenever it may ask, it does.
    const { s, clock } = social(0);
    s.keepOnly(new Set(['p-1']));
    let hubAsked = 0;
    const counted = asking({ mayInvite: () => (hubAsked += 1) > 0 });
    // Their first meeting, however long she has been around: a greeting, never an invite.
    clock.now = 4 * MIN;
    expect(s.meet('bot-a', 'p-1', counted)).toMatchObject({ say: { key: 'hello' }, partyInvite: false });
    clock.now += PAIR_GAP_MS + 1;
    expect(s.meet('bot-a', 'p-1', counted)).toBeNull();
    expect(hubAsked).toBe(0);
    // The second meeting: it asks her, with its line and a wave.
    clock.now += APART_MS + 1;
    expect(s.meet('bot-a', 'p-1', counted)).toEqual({ say: { key: 'invite', variant: expect.any(Number) }, emote: 'wave', friendAsk: false, partyInvite: true });
    expect(hubAsked).toBe(1);

    // Around bots less than three minutes: no invite yet, until she has been (still in the same meeting).
    const fresh = social(0);
    fresh.s.meet('bot-a', 'p-2', asking());
    fresh.clock.now = APART_MS + 1;
    expect(fresh.s.meet('bot-a', 'p-2', asking())?.partyInvite).toBe(false);
    fresh.clock.now = INVITE_AROUND_MS;
    expect(fresh.s.meet('bot-a', 'p-2', asking())?.partyInvite).toBe(true);

    // The runner or the hub says no (it plays a challenge, she is riding): no invite, and no dice rolled for it.
    const busy = social(0);
    busy.s.meet('bot-a', 'p-3', asking());
    busy.clock.now = INVITE_AROUND_MS;
    expect(busy.s.meet('bot-a', 'p-3', asking({ mayInvite: () => false }))?.partyInvite).toBe(false);
    expect(busy.s.meet('bot-a', 'p-3', ctx({ friend: true }))).toBeNull();
  });

  it('ask as often as their persona says: a quarter of the chances for the quietest, three quarters for the chattiest', () => {
    const rate = (chat: number): number => {
      let invites = 0;
      for (let i = 0; i < 2_000; i++) {
        const { s, clock } = social(`invite-${chat}-${i}`);
        s.meet('bot-a', 'p-1', asking({ chat }));
        clock.now = INVITE_AROUND_MS;
        if (s.meet('bot-a', 'p-1', asking({ chat }))?.partyInvite) invites += 1;
      }
      return invites / 2_000;
    };
    expect(rate(0)).toBeCloseTo(0.25, 1);
    expect(rate(1)).toBeCloseTo(0.75, 1);
  });

  it('one invite from any bot to a player every 5 minutes, 3 an hour, none for 15 minutes after a no or a lapse', () => {
    const { s, clock } = social(0);
    const bots = ['bot-a', 'bot-b', 'bot-c', 'bot-d', 'bot-e'];
    // Each bot met her once in her first minute.
    bots.forEach((bot, i) => {
      clock.now = i * 10_000;
      s.meet(bot, 'p-1', asking());
    });
    /** Bot `bot` comes by anew at `t` (each bot away more than a minute since it was last by): does it ask her? */
    const asks = (bot: string, t: number): boolean => {
      clock.now = t;
      return s.meet(bot, 'p-1', asking())?.partyInvite ?? false;
    };
    const T = 4 * MIN;
    expect(asks('bot-a', T)).toBe(true);
    s.invited('bot-a', 'p-1');
    expect(s.inviting('bot-a')).toBe('p-1');
    expect(s.answered('bot-a', true)).toBe('p-1');
    expect(s.inviting('bot-a')).toBeNull();
    expect(asks('bot-b', T + MIN)).toBe(false);
    expect(asks('bot-b', T + INVITE_GAP_MS)).toBe(true);
    expect(asks('bot-c', T + 2 * INVITE_GAP_MS)).toBe(true);
    // A fourth within the hour: no.
    expect(asks('bot-d', T + 3 * INVITE_GAP_MS)).toBe(false);
    expect(asks('bot-d', T + 60 * MIN + 1)).toBe(true);

    // She says no: no bot asks her for 15 minutes (a bot greeting her just before waits its turn after that line).
    s.invited('bot-d', 'p-1');
    clock.now = T + 61 * MIN;
    expect(s.answered('bot-d', false)).toBe('p-1');
    expect(asks('bot-e', T + 61 * MIN + INVITE_PAUSE_MS - PLAYER_LINE_GAP_MS)).toBe(false);
    expect(asks('bot-a', T + 61 * MIN + INVITE_PAUSE_MS)).toBe(true);

    // She lets it lapse: told once, a second after the card's time; then 15 minutes again.
    const sent = T + 61 * MIN + INVITE_PAUSE_MS;
    s.invited('bot-a', 'p-1');
    clock.now = sent + INVITE_LAPSE_MS - 1;
    expect(s.lapsed()).toEqual([]);
    clock.now = sent + INVITE_LAPSE_MS;
    expect(s.lapsed()).toEqual([{ botId: 'bot-a', playerId: 'p-1' }]);
    expect(s.lapsed()).toEqual([]);
    expect(s.inviting('bot-a')).toBeNull();
    expect(asks('bot-b', sent + INVITE_LAPSE_MS + INVITE_PAUSE_MS - PLAYER_LINE_GAP_MS)).toBe(false);
    expect(asks('bot-c', sent + INVITE_LAPSE_MS + INVITE_PAUSE_MS)).toBe(true);
    // An answer to an invite no longer waiting changes nothing.
    expect(s.answered('bot-a', false)).toBeNull();
  });

  it('answer her yes, no or goodbye in fresh lines of their own voice, whatever the pace', () => {
    const { s, clock } = social('answers');
    const said: string[] = [];
    for (let i = 0; i < 6; i++) {
      clock.now = i * 1_000;
      for (const key of ['yay', 'later'] as const) {
        const line = s.answer('bot-b', 'p-1', key, 1);
        if (!line) continue;
        expect(line.variant % BOT_LINE_VOICES).toBe(1);
        said.push(`${line.key}:${line.variant}`);
      }
    }
    // Four wordings of each kind in its voice, none twice among her last 12 lines: then it only waves.
    expect(said).toHaveLength(8);
    expect(new Set(said).size).toBe(8);
  });
});
