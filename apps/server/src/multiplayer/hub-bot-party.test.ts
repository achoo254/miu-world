import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PARTY_INVITE_TTL_MS, type ServerWsMessage } from '@miu/schema/multiplayer';
import { hubHarness, settle, type Client } from '../../test/hub-harness';
import { PARTY_QUEST } from '../coop/party-quest-fixtures';
import type { PartyQuestBotMoves } from '../coop/bot-party-quest';
import { BOT_QUEST_PROPOSE_MS, BOT_TEAM_LEAVE_MS, BotRunner } from './bot-runner';
import { BOT_MAP_CONFIGS } from './bot-profiles';
import { PartyService } from './party-service';
import { INVITE_LAPSE_MS } from './bot-social';
import { WalkStore } from './bot-brain/walk-store';
import { memoryBotStore, type BotStore } from './bot-store';

let h: ReturnType<typeof hubHarness>;
let runner: BotRunner | null = null;

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

describe('a companion bot asking a player into a party', () => {
  it('sends her the usual invite card, labelled as a bot\'s; said yes, she leads the party and the bot is a member', async () => {
    const a = await h.joined('child-a', [10, 5, 10]);
    const bot = h.bot(h.hub.getOrCreateRoom('trung-tam'), 'bot-tt-1', [12, 5, 10]);
    expect(h.hub.botMayInvite('bot-tt-1', a.id)).toBe(true);
    expect(h.hub.botPartyInvite('bot-tt-1', a.id)).toBe(true);
    expect(a.last('party-invite')).toEqual({ type: 'party-invite', from: { id: 'bot-tt-1', displayName: 'Bot bot-tt-1', isBot: true }, expiresInMs: PARTY_INVITE_TTL_MS });
    // One invite waits for her: no bot asks again meanwhile.
    expect(h.hub.botMayInvite('bot-tt-1', a.id)).toBe(false);

    a.send({ type: 'party-reply', from: 'bot-tt-1', accept: true });
    await settle();
    const view = a.last('party-state')?.party;
    expect(view?.leader).toBe(a.id);
    expect(view?.members.map((m) => [m.id, m.isBot])).toEqual([
      [a.id, false],
      ['bot-tt-1', true],
    ]);
    const botView = bot.inbox.filter((m) => m.type === 'party-state').at(-1);
    expect(botView?.type === 'party-state' && botView.party?.leader).toBe(a.id);
    // In a party now, neither is asked again.
    expect(h.hub.botMayInvite('bot-tt-1', a.id)).toBe(false);

    // The bot leaves: a party of two ends, for both.
    h.hub.botLeaveParty('bot-tt-1');
    expect(a.last('party-state')?.party).toBeNull();
    expect(bot.inbox.filter((m) => m.type === 'party-state').at(-1)).toEqual({ type: 'party-state', party: null });
    expect(h.hub.parties.partyOf(a.id)).toBeNull();
  });

  it('never asks a player who switched bots off, is in a party, stands far off or on another map, or rides', async () => {
    const room = h.hub.getOrCreateRoom('trung-tam');
    h.bot(room, 'bot-tt-1', [10, 5, 10]);
    h.db.settings.set('child-off', { botsEnabled: false });
    const off = await h.joined('child-off', [11, 5, 10]);
    expect(h.hub.botPartyInvite('bot-tt-1', off.id)).toBe(false);
    expect(off.all('party-invite')).toEqual([]);

    const far = await h.joined('child-far', [40, 5, 40]);
    expect(h.hub.botPartyInvite('bot-tt-1', far.id)).toBe(false);
    const elsewhere = await h.joined('child-elsewhere', [10, 5, 10], 'cho-phien');
    expect(h.hub.botPartyInvite('bot-tt-1', elsewhere.id)).toBe(false);
    const riding = await h.joined('child-riding', [11, 5, 10], 'trung-tam', { riding: true });
    expect(h.hub.botPartyInvite('bot-tt-1', riding.id)).toBe(false);

    const a = await h.joined('child-a', [11, 5, 10]);
    const b = await h.joined('child-b', [11, 5, 11]);
    a.send({ type: 'party-invite', to: b.id });
    await settle();
    // An invite from a player waits for her: the bot does not pile another on.
    expect(h.hub.botPartyInvite('bot-tt-1', b.id)).toBe(false);
    b.send({ type: 'party-reply', from: a.id, accept: true });
    await settle();
    expect(h.hub.botPartyInvite('bot-tt-1', a.id)).toBe(false);
    expect(h.hub.botPartyInvite('bot-tt-1', b.id)).toBe(false);
    for (const c of [far, elsewhere, riding, a, b]) expect(c.all('party-invite').filter((i) => i.from.isBot)).toEqual([]);
  });

  it('tells the bot when she says no, and makes no party', async () => {
    const a = await h.joined('child-a', [10, 5, 10]);
    const bot = h.bot(h.hub.getOrCreateRoom('trung-tam'), 'bot-tt-1', [12, 5, 10]);
    expect(h.hub.botPartyInvite('bot-tt-1', a.id)).toBe(true);
    a.send({ type: 'party-reply', from: 'bot-tt-1', accept: false });
    await settle();
    expect(bot.inbox.at(-1)).toEqual({ type: 'notice', code: 'invite-declined', id: a.id });
    expect(h.hub.parties.partyOf(a.id)).toBeNull();
  });

  it('lets an invite lapse after its time, and a yes to a bot gone from every map joins nothing', async () => {
    const room = h.hub.getOrCreateRoom('trung-tam');
    const a = await h.joined('child-a', [10, 5, 10]);
    h.bot(room, 'bot-tt-1', [12, 5, 10]);
    expect(h.hub.botPartyInvite('bot-tt-1', a.id)).toBe(true);
    h.clock.now += PARTY_INVITE_TTL_MS + 1;
    a.send({ type: 'party-reply', from: 'bot-tt-1', accept: true });
    await settle();
    expect(a.last('notice')).toEqual({ type: 'notice', code: 'invite-expired', id: 'bot-tt-1' });

    h.bot(room, 'bot-tt-2', [12, 5, 11]);
    expect(h.hub.botPartyInvite('bot-tt-2', a.id)).toBe(true);
    room.leave('bot-tt-2');
    a.send({ type: 'party-reply', from: 'bot-tt-2', accept: true });
    await settle();
    expect(a.last('notice')).toEqual({ type: 'notice', code: 'invite-expired', id: 'bot-tt-2' });
    expect(h.hub.parties.partyOf(a.id)).toBeNull();
  });

  it('knows which room each one stands in', async () => {
    const a = await h.joined('child-a', [10, 5, 10], 'cho-phien');
    h.bot(h.hub.getOrCreateRoom('trung-tam'), 'bot-tt-1');
    expect(h.hub.roomKeyOf(a.id)).toBe('cho-phien');
    expect(h.hub.roomKeyOf('bot-tt-1')).toBe('trung-tam');
    expect(h.hub.roomKeyOf('bot-nowhere')).toBeNull();
  });
});

const CASTLE = 'lau-dai';
const walk = new WalkStore();
const castleBots = (BOT_MAP_CONFIGS[CASTLE] ?? []).map((b) => b.id);

describe('companion bots inviting players they keep meeting, with their runner', () => {
  // The hub and its parties on the test's clock (fake timers): invites lapse and a player's flood limit refills.
  beforeEach(async () => {
    await h.hub.close();
    h = hubHarness({ now: () => Date.now(), parties: new PartyService({ now: () => Date.now(), inviteGapMs: 0, isPlayer: (id) => id.startsWith('p-') }) });
  });

  /**
   * The castle's bots on their feet (seeded dice), with a quest of the castle to play together; its step's place is
   * not on their walk grid, so they do not play it on their own (nor cheer at finishing it all the time).
   */
  function startBots(store?: BotStore): void {
    let seed = 11;
    const random = (): number => ((seed = (seed * 16_807) % 2_147_483_647) - 1) / 2_147_483_646;
    const quests = [{ id: 'thu-thach-lau-dai', steps: [{ id: 's1', targets: ['noi-khong-co'], question: false }] }];
    runner = new BotRunner(h.hub, { random, store, walk: { get: (mapId) => (mapId === CASTLE ? walk.get(mapId) : null) }, quests: { questsOn: (mapId) => (mapId === CASTLE ? quests : []) } });
    runner.start();
  }

  /** A player friends with every castle bot (no friend request in the way), standing in the castle. */
  async function player(): Promise<Client> {
    h.friends.bots.set('child-a', new Set(castleBots));
    return h.joined('child-a', [600, 17, 600], CASTLE);
  }

  const room = () => h.hub.getOrCreateRoom(CASTLE);
  const lines = (a: Client, key: string): Array<Extract<ServerWsMessage, { type: 'bot-say' }>> => a.all('bot-say').filter((l) => l.key === key && l.to === a.id);

  /**
   * She keeps meeting the first castle bot: half a minute beside it, a minute and more away, again and again, until a
   * bot asks her into a party (from their second meeting, once she has been around three minutes). The inviter.
   */
  async function untilInvited(a: Client): Promise<string> {
    const [first] = castleBots;
    for (let cycle = 0; cycle < 20; cycle++) {
      for (let t = 0; t < 30_000; t += 100) {
        const bot = room().members.get(first ?? '')?.presence;
        if (bot) a.send({ type: 'update', x: bot.x + 2, y: bot.y, z: bot.z, yaw: 0, speed: 0 });
        await vi.advanceTimersByTimeAsync(100);
        const invite = a.last('party-invite');
        if (invite) {
          a.send({ type: 'update', x: bot?.x ?? 0, y: bot?.y ?? 0, z: (bot?.z ?? 0) + 2, yaw: 0, speed: 0 });
          return invite.from.id;
        }
      }
      a.send({ type: 'update', x: 600, y: 17, z: 600, yaw: 0, speed: 0 });
      await vi.advanceTimersByTimeAsync(65_000);
    }
    throw new Error('no invite');
  }

  it('asks with its line and the bot-labelled card, never in the first three minutes; said yes, she leads and it cheers', { timeout: 30_000 }, async () => {
    startBots();
    const a = await player();
    const startedAt = Date.now();
    const inviter = await untilInvited(a);
    expect(castleBots).toContain(inviter);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(3 * 60_000);
    expect(a.all('party-invite')).toHaveLength(1);
    expect(a.last('party-invite')?.from).toMatchObject({ id: inviter, isBot: true });
    expect(lines(a, 'invite').at(-1)?.id).toBe(inviter);

    a.send({ type: 'party-reply', from: inviter, accept: true });
    await vi.advanceTimersByTimeAsync(500);
    const party = a.last('party-state')?.party;
    expect(party?.leader).toBe(a.id);
    expect(party?.members.map((m) => m.id)).toEqual([a.id, inviter]);
    expect(lines(a, 'yay').map((l) => l.id)).toEqual([inviter]);
    expect(a.all('emote').some((e) => e.id === inviter && e.emote === 'cheer')).toBe(true);

    // She goes to another map: the bot leaves the party at once, rather than follow her.
    a.send({ type: 'join', mapId: 'cho-phien', x: 10, y: 5, z: 10, yaw: 0 });
    await vi.advanceTimersByTimeAsync(1_500);
    expect(h.hub.parties.partyOf(inviter)).toBeNull();
    expect(a.last('party-state')?.party).toBeNull();
    expect(h.hub.roomKeyOf(inviter)).toBe(CASTLE);
  });

  it('takes a no lightly: says "later" and asks her no more for a while', { timeout: 30_000 }, async () => {
    startBots();
    const a = await player();
    const inviter = await untilInvited(a);
    a.send({ type: 'party-reply', from: inviter, accept: false });
    await vi.advanceTimersByTimeAsync(500);
    expect(lines(a, 'later').map((l) => l.id)).toEqual([inviter]);
    expect(h.hub.parties.partyOf(a.id)).toBeNull();
    // Five more minutes beside the bots: no other invite.
    for (let t = 0; t < 5 * 60_000; t += 1_000) {
      const bot = room().members.get(inviter)?.presence;
      if (bot) a.send({ type: 'update', x: bot.x + 2, y: bot.y, z: bot.z, yaw: 0, speed: 0 });
      await vi.advanceTimersByTimeAsync(1_000);
    }
    expect(a.all('party-invite')).toHaveLength(1);
  });

  it('says "later" a moment after an unanswered card lapses', { timeout: 30_000 }, async () => {
    startBots();
    const a = await player();
    const inviter = await untilInvited(a);
    await vi.advanceTimersByTimeAsync(INVITE_LAPSE_MS - 1_000);
    expect(lines(a, 'later')).toEqual([]);
    await vi.advanceTimersByTimeAsync(1_200);
    expect(lines(a, 'later').map((l) => l.id)).toEqual([inviter]);
    // Too late now: a yes joins nothing.
    a.send({ type: 'party-reply', from: inviter, accept: true });
    await settle();
    expect(a.last('notice')?.code).toBe('invite-expired');
    expect(h.hub.parties.partyOf(inviter)).toBeNull();
  });

  it('after the party\'s challenge, waves goodbye and leaves 5 to 10 seconds later; leaves at once when she switches bots off', { timeout: 30_000 }, async () => {
    startBots();
    const a = await player();
    const inviter = await untilInvited(a);
    a.send({ type: 'party-reply', from: inviter, accept: true });
    await vi.advanceTimersByTimeAsync(500);
    expect(h.hub.parties.partyOf(inviter)?.leader).toBe(a.id);
    // The party's challenge is over (the co-op service lets its bots go).
    runner?.coopDriver().forget([inviter]);
    await vi.advanceTimersByTimeAsync(BOT_TEAM_LEAVE_MS - 100);
    expect(h.hub.parties.partyOf(inviter)).not.toBeNull();
    await vi.advanceTimersByTimeAsync(BOT_TEAM_LEAVE_MS + 200);
    expect(h.hub.parties.partyOf(inviter)).toBeNull();
    expect(lines(a, 'bye').map((l) => l.id)).toEqual([inviter]);
    expect(a.all('emote').some((e) => e.id === inviter && e.emote === 'wave')).toBe(true);
    expect(a.last('party-state')?.party).toBeNull();

    // Another time she says yes, then switches bots off: it leaves within a second and a half.
    const b = await h.joined('child-b', [600, 17, 600], CASTLE);
    h.friends.bots.set('child-b', new Set(castleBots));
    const second = await untilInvited(b);
    b.send({ type: 'party-reply', from: second, accept: true });
    await vi.advanceTimersByTimeAsync(500);
    expect(h.hub.parties.partyOf(second)?.leader).toBe(b.id);
    h.hub.settingsChanged('child-b', { botsEnabled: false });
    await vi.advanceTimersByTimeAsync(1_500);
    expect(h.hub.parties.partyOf(second)).toBeNull();
  });

  it('asks the party to play a quest of its map a moment after she said yes; played through, remembers her, and waves goodbye unless she starts another', { timeout: 30_000 }, async () => {
    const store = memoryBotStore();
    startBots(store);
    const a = await player();
    const inviter = await untilInvited(a);
    const propose = vi.spyOn(h.hub, 'botProposeQuest');
    a.send({ type: 'party-reply', from: inviter, accept: true });
    await vi.advanceTimersByTimeAsync(BOT_QUEST_PROPOSE_MS - 10);
    expect(propose).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(BOT_QUEST_PROPOSE_MS + 20);
    expect(propose).toHaveBeenCalledTimes(1);
    expect(propose).toHaveBeenCalledWith(inviter, a.id, 'thu-thach-lau-dai');

    // The party plays a quest (the party quests' service shows it to its bot): it heads for the quest's places and
    // shows the quest it is on.
    const driver = runner?.partyQuestDriver();
    const moves: PartyQuestBotMoves = { done: vi.fn(), blow: vi.fn(), question: () => null };
    const play = (): void => driver?.play(inviter, { quest: PARTY_QUEST, front: 0, done: new Set(), blow: null }, moves);
    play();
    expect(a.all('bot-doing').some((d) => d.id === inviter && d.quest === PARTY_QUEST.id)).toBe(true);
    // She finished it with the bot: it remembers her, and is to wave goodbye in 5 to 10 seconds; but she starts
    // another quest with it before that, so it stays.
    driver?.finished(inviter, PARTY_QUEST.id, [a.id]);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.memories.get(`${inviter}|child-a`)).toEqual({ runs: 1, lastQuestId: PARTY_QUEST.id });
    await vi.advanceTimersByTimeAsync(BOT_TEAM_LEAVE_MS - 100);
    expect(h.hub.parties.partyOf(inviter)?.leader).toBe(a.id);
    play();
    await vi.advanceTimersByTimeAsync(BOT_TEAM_LEAVE_MS + 200);
    expect(h.hub.parties.partyOf(inviter)?.leader).toBe(a.id);
    expect(lines(a, 'bye')).toEqual([]);
    // That one ends (she leaves it, say): 5 to 10 seconds later it waves goodbye and leaves.
    driver?.forget([inviter]);
    await vi.advanceTimersByTimeAsync(BOT_TEAM_LEAVE_MS - 100);
    expect(h.hub.parties.partyOf(inviter)).not.toBeNull();
    await vi.advanceTimersByTimeAsync(BOT_TEAM_LEAVE_MS + 200);
    expect(h.hub.parties.partyOf(inviter)).toBeNull();
    expect(lines(a, 'bye').map((l) => l.id)).toEqual([inviter]);
    expect(a.all('emote').some((e) => e.id === inviter && e.emote === 'wave')).toBe(true);
  });

  it('stays while she plays a quest of her own started during its goodbye, and waves goodbye once she finishes it', { timeout: 30_000 }, async () => {
    startBots();
    const a = await player();
    const inviter = await untilInvited(a);
    a.send({ type: 'party-reply', from: inviter, accept: true });
    await vi.advanceTimersByTimeAsync(500);
    const driver = runner?.partyQuestDriver();
    const moves: PartyQuestBotMoves = { done: vi.fn(), blow: vi.fn(), question: () => null };
    driver?.play(inviter, { quest: PARTY_QUEST, front: 0, done: new Set(), blow: null }, moves);
    // A quest of her own tried while it plays the party's quest (no goodbye on its way) keeps it nowhere.
    driver?.playedAlone(a.id, false);
    driver?.forget([inviter]);
    await vi.advanceTimersByTimeAsync(2 * BOT_TEAM_LEAVE_MS + 100);
    expect(h.hub.parties.partyOf(inviter)).toBeNull();
    expect(lines(a, 'bye').map((l) => l.id)).toEqual([inviter]);

    // Another bot, another party: its quest ends, and during the goodbye she starts a quest on her own.
    const b = await h.joined('child-b', [600, 17, 600], CASTLE);
    h.friends.bots.set('child-b', new Set(castleBots));
    const second = await untilInvited(b);
    b.send({ type: 'party-reply', from: second, accept: true });
    await vi.advanceTimersByTimeAsync(500);
    driver?.forget([second]);
    await vi.advanceTimersByTimeAsync(BOT_TEAM_LEAVE_MS - 100);
    driver?.playedAlone(b.id, false);
    await vi.advanceTimersByTimeAsync(4 * BOT_TEAM_LEAVE_MS);
    expect(h.hub.parties.partyOf(second)?.leader).toBe(b.id);
    expect(lines(b, 'bye')).toEqual([]);
    // She finishes it: 5 to 10 seconds later it waves goodbye and leaves.
    driver?.playedAlone(b.id, true);
    await vi.advanceTimersByTimeAsync(BOT_TEAM_LEAVE_MS - 100);
    expect(h.hub.parties.partyOf(second)).not.toBeNull();
    await vi.advanceTimersByTimeAsync(BOT_TEAM_LEAVE_MS + 200);
    expect(h.hub.parties.partyOf(second)).toBeNull();
    expect(lines(b, 'bye').map((l) => l.id)).toEqual([second]);
  });
});
