// How a companion bot behaves with a player it meets (Master Plan §8b; owner 07/10/2026: "khi gặp người chơi thì
// ngẫu nhiên chat hoặc chủ động kết bạn"). Whether it walked over to her or only passes by, it turns to her and waves;
// it says hello the first time, "good to see you again" to a player it met or played with before, now and then what it
// is busy with, and cheers to a player in sight when it finds what its quest needs or finishes it. It sometimes asks
// her to be friends: more likely when they won a challenge together, never more often than FRIEND_ASK_GAP_MS for her
// (all bots together), never once they are friends.
//
// A bot that keeps meeting a player who has been around a while sometimes asks her into a party (its `invite` line,
// then the invite card a player gets from a player). Rarely (Jev D9, "balanced"): from their second meeting, once a
// meeting at most, no sooner than INVITE_AROUND_MS after she came around bots, at most one invite from any bot every
// INVITE_GAP_MS and INVITE_HOURLY an hour, and none for INVITE_PAUSE_MS after she said no or let one lapse.
//
// So that a player is never talked at (Jev D9, "balanced"): all bots together say at most one line to her every
// PLAYER_LINE_GAP_MS, one bot turns to her at most every PAIR_GAP_MS, and no line she was told among her last
// RECENT_LINES comes again (a bot with no fresh wording left only waves). Lines come from each bot's own voice
// (variant `i` belongs to voice `i % BOT_LINE_VOICES`), each kind shuffled through before a wording comes round again.
//
// What it keeps of a player lives only in memory, by her public id, and is dropped when she is in no room with bots:
// nothing of it goes to the database. Pure: the clock, the dice and whether a bot remembers her come in.
import { BOT_LINE_VARIANTS, BOT_LINE_VOICES, type BotLine, type BotLineKey } from '@miu/schema/bot-lines';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import { PARTY_INVITE_TTL_MS } from '@miu/schema/multiplayer';
import { inviteChance, talkChance } from './bot-persona';

/** All bots together say at most one line to a player this often… */
export const PLAYER_LINE_GAP_MS = 6_000;
/** …and one bot turns to one player at most this often. */
export const PAIR_GAP_MS = 25_000;
/** A line she was told among this many last ones is not said to her again. */
export const RECENT_LINES = 12;
/** Out of a bot's reach this long, she meets it anew the next time (a second meeting, a greeting again). */
export const APART_MS = 60_000;
/** The chance it asks her to be friends as they meet, from their second meeting… */
export const FRIEND_ASK_CHANCE = 0.35;
/** …and from the first when it remembers winning a challenge with her. */
export const FRIEND_ASK_KNOWN_CHANCE = 0.7;
/** At most one friend request from any bot to one player this often. */
export const FRIEND_ASK_GAP_MS = 10 * 60_000;
/** She has been around bots this long before any bot asks her into a party… */
export const INVITE_AROUND_MS = 3 * 60_000;
/** …from all bots together at most one invite this often… */
export const INVITE_GAP_MS = 5 * 60_000;
/** …and this many an hour… */
export const INVITE_HOURLY = 3;
/** …none for this long after she said no or let one lapse. */
export const INVITE_PAUSE_MS = 15 * 60_000;
/** An invite unanswered this long lapsed (the party's own time, and a second for her answer on its way). */
export const INVITE_LAPSE_MS = PARTY_INVITE_TTL_MS + 1_000;
/** Pairs of bot and player kept at most: a crowded server forgets them all rather than growing without end. */
export const MAX_PAIRS = 10_000;
/** Wordings of one kind a bot has (one voice's share). */
const VOICE_WORDINGS = BOT_LINE_VARIANTS / BOT_LINE_VOICES;

/** What the bot is and does now, as its runner sees it. */
export interface MeetContext {
  /** Its voice (persona). */
  readonly voice: number;
  /** How talkative it is (persona, 0 … 1). */
  readonly chat: number;
  /** The quest it is busy with (null: none). */
  readonly quest: string | null;
  /** Whether she is its friend already. */
  readonly friend: boolean;
  /**
   * Whether it may ask her into a party now, as far as its runner and the hub know (neither in a party or a
   * challenge, she near and not riding, no invite waiting for her, a map with quests to play together). Asked only
   * when the pace would let it; none: it never asks.
   */
  readonly mayInvite?: () => boolean;
}

/** What it does towards her now. */
export interface MeetAction {
  /** A line said to her (null: none now, it only waves). */
  readonly say: BotLine | null;
  /** It turns to her and waves (null: a line said in passing). */
  readonly emote: 'wave' | null;
  /** It asks her to be friends. */
  readonly friendAsk: boolean;
  /** It asks her into a party. */
  readonly partyInvite: boolean;
}

/** An invite of a bot (its instance's id) that she has not answered yet. */
export interface PendingInvite {
  readonly botId: string;
  readonly playerId: string;
}

export interface BotSocialOptions {
  /** Milliseconds. */
  now: () => number;
  random: () => number;
  /** Whether bot `botId` remembers player `playerId` from a challenge they won together (asked once per pair). */
  recall?: (botId: string, playerId: string) => Promise<boolean>;
}

interface PairMemory {
  /** Times they met (out of its reach more than APART_MS in between). */
  meetings: number;
  /** When she was last within its reach, and when it last turned to her. */
  seenAt: number;
  lastAt: number;
  /** In this meeting: greeted her, will talk at all (its persona), told her what it is busy with. */
  greeted: boolean;
  chatty: boolean;
  toldDoing: boolean;
  asked: boolean;
  /** Whether it rolled the dice for a party invite in this meeting. */
  inviteTried: boolean;
  /** Whether it remembers her from a challenge won together ('asking': not known yet). */
  knows: boolean | 'asking' | null;
}

interface PlayerMemory {
  lastLineAt: number;
  /** Her last lines, as `key:variant`. */
  recent: string[];
  lastFriendAskAt: number;
  /** Since when she has been around bots (first met, or first in a room with bots). */
  since: number;
  /** When bots asked her into a party within the last hour, oldest first. */
  invitedAt: number[];
  /** No party invite before this (she said no, or let one lapse). */
  invitePauseUntil: number;
  /** By bot (its own id, not an instance's). */
  pairs: Map<string, PairMemory>;
}

export class BotSocial {
  private readonly options: BotSocialOptions;
  private readonly players = new Map<string, PlayerMemory>();
  private pairCount = 0;
  /** Party invites waiting for an answer, by the inviting bot's instance id. */
  private readonly pending = new Map<string, { playerId: string; lapsesAt: number }>();
  /** Each bot's wordings per kind, shuffled through before one comes round again. */
  private readonly pickers = new Map<string, FreshPicker<number>>();

  constructor(options: BotSocialOptions) {
    this.options = options;
  }

  /**
   * Player `playerId` is within reach of bot `botId` (called as long as she is): what it does towards her now, or
   * null when it leaves her be (it turned to her lately, another bot just spoke to her, it is still recalling her).
   */
  meet(botId: string, playerId: string, ctx: MeetContext): MeetAction | null {
    const now = this.options.now();
    const who = this.playerOf(playerId);
    const pair = this.pairOf(who, botId);
    if (now - pair.seenAt > APART_MS) {
      pair.meetings += 1;
      pair.greeted = false;
      pair.toldDoing = false;
      pair.inviteTried = false;
      pair.chatty = this.options.random() < talkChance(ctx);
    }
    pair.seenAt = now;
    const knows = this.knows(botId, playerId, pair);
    if (knows === null || now - pair.lastAt < PAIR_GAP_MS) return null;

    if (!pair.greeted) {
      // A bot that will talk waits its turn while another one just spoke to her.
      if (pair.chatty && now - who.lastLineAt < PLAYER_LINE_GAP_MS) return null;
      const ask = this.asks(who, pair, ctx, knows, now);
      if (ask) {
        who.lastFriendAskAt = now;
        pair.asked = true;
      } else if (this.invites(who, pair, ctx, now)) {
        return this.invite(botId, who, pair, ctx, now);
      }
      pair.greeted = true;
      pair.lastAt = now;
      const say = ask || pair.chatty ? this.line(botId, who, ask ? 'friend' : this.greeting(pair, ctx, knows), ctx.voice, now) : null;
      return { say, emote: 'wave', friendAsk: ask, partyInvite: false };
    }
    // Still together a while after its greeting: it may ask her into a party, or tell her what it is busy with (once
    // a meeting).
    if (this.invites(who, pair, ctx, now)) return this.invite(botId, who, pair, ctx, now);
    if (!pair.chatty || pair.toldDoing || ctx.quest === null) return null;
    const say = this.line(botId, who, 'doing', ctx.voice, now);
    if (!say) return null;
    pair.toldDoing = true;
    pair.lastAt = now;
    return { say, emote: null, friendAsk: false, partyInvite: false };
  }

  /**
   * Its invite to player `playerId` reached her (`botId`: its instance's id): it waits for her answer, until the
   * invite lapses.
   */
  invited(botId: string, playerId: string): void {
    this.pending.set(botId, { playerId, lapsesAt: this.options.now() + INVITE_LAPSE_MS });
  }

  /** The player an invite of bot `botId` (its instance's id) waits for (null: none waits). */
  inviting(botId: string): string | null {
    return this.pending.get(botId)?.playerId ?? null;
  }

  /**
   * She answered bot `botId`'s invite: the player it asked (null: none waiting). A no pauses every bot's invites to
   * her.
   */
  answered(botId: string, accepted: boolean): string | null {
    const invite = this.pending.get(botId);
    if (!invite) return null;
    this.pending.delete(botId);
    if (!accepted) this.pause(invite.playerId);
    return invite.playerId;
  }

  /** The invites that lapsed unanswered by now (each told once): every bot's invites to her pause. */
  lapsed(): PendingInvite[] {
    if (this.pending.size === 0) return [];
    const now = this.options.now();
    const out: PendingInvite[] = [];
    for (const [botId, invite] of this.pending) {
      if (now < invite.lapsesAt) continue;
      this.pending.delete(botId);
      this.pause(invite.playerId);
      out.push({ botId, playerId: invite.playerId });
    }
    return out;
  }

  /**
   * A line of `key` in answer to what she did (she said yes or no to its invite, it leaves her party): said whatever
   * the pace, for it answers her, but never one she was told lately (null: no fresh wording left, it only waves).
   */
  answer(botId: string, playerId: string, key: BotLineKey, voice: number): BotLine | null {
    return this.fresh(botId, this.playerOf(playerId), key, voice, this.options.now());
  }

  /** It found what its quest needs (`found`) or finished it (`done`), and player `playerId` sees it: a cheer to her, or null. */
  cheer(botId: string, playerId: string, kind: 'found' | 'done', ctx: MeetContext): BotLine | null {
    const now = this.options.now();
    const who = this.playerOf(playerId);
    const pair = this.pairOf(who, botId);
    if (now - pair.lastAt < PAIR_GAP_MS || this.options.random() >= talkChance(ctx)) return null;
    const say = this.line(botId, who, kind, ctx.voice, now);
    if (say) pair.lastAt = now;
    return say;
  }

  /**
   * Forgets every player but those in `present` (the players in rooms with bots), and starts counting how long the
   * new ones among them are around.
   */
  keepOnly(present: ReadonlySet<string>): void {
    for (const [id, who] of this.players) {
      if (present.has(id)) continue;
      this.pairCount -= who.pairs.size;
      this.players.delete(id);
    }
    for (const id of present) this.playerOf(id);
  }

  /** Players it keeps something of (tests). */
  get playersKept(): number {
    return this.players.size;
  }

  private playerOf(playerId: string): PlayerMemory {
    let who = this.players.get(playerId);
    if (!who) {
      who = {
        lastLineAt: Number.NEGATIVE_INFINITY,
        recent: [],
        lastFriendAskAt: Number.NEGATIVE_INFINITY,
        since: this.options.now(),
        invitedAt: [],
        invitePauseUntil: Number.NEGATIVE_INFINITY,
        pairs: new Map(),
      };
      this.players.set(playerId, who);
    }
    return who;
  }

  private pairOf(who: PlayerMemory, botId: string): PairMemory {
    let pair = who.pairs.get(botId);
    if (!pair) {
      if (this.pairCount >= MAX_PAIRS) {
        for (const other of this.players.values()) other.pairs.clear();
        this.pairCount = 0;
      }
      pair = { meetings: 0, seenAt: Number.NEGATIVE_INFINITY, lastAt: Number.NEGATIVE_INFINITY, greeted: false, chatty: false, toldDoing: false, asked: false, inviteTried: false, knows: null };
      who.pairs.set(botId, pair);
      this.pairCount += 1;
    }
    return pair;
  }

  /** Whether it remembers her, null while it is still recalling (asked once per pair). */
  private knows(botId: string, playerId: string, pair: PairMemory): boolean | null {
    if (pair.knows === true || pair.knows === false) return pair.knows;
    if (pair.knows === 'asking') return null;
    const { recall } = this.options;
    if (!recall) {
      pair.knows = false;
      return false;
    }
    pair.knows = 'asking';
    recall(botId, playerId).then(
      (known) => {
        pair.knows = known;
      },
      (err: unknown) => {
        console.error('bot recall failed', err instanceof Error ? err.name : typeof err);
        pair.knows = false;
      },
    );
    return null;
  }

  /** Whether it asks her to be friends as they meet now. */
  private asks(who: PlayerMemory, pair: PairMemory, ctx: MeetContext, knows: boolean, now: number): boolean {
    if (ctx.friend || pair.asked || now - who.lastFriendAskAt < FRIEND_ASK_GAP_MS) return false;
    if (!knows && pair.meetings < 2) return false;
    return this.options.random() < (knows ? FRIEND_ASK_KNOWN_CHANCE : FRIEND_ASK_CHANCE);
  }

  /**
   * Whether it asks her into a party now: from their second meeting, once a meeting, she around a while and the
   * pace letting it, the runner and the hub too, then as its persona's dice say. It waits its turn while another bot
   * just spoke to her (an invite comes with its line).
   */
  private invites(who: PlayerMemory, pair: PairMemory, ctx: MeetContext, now: number): boolean {
    if (!ctx.mayInvite || pair.inviteTried || pair.meetings < 2 || now - who.since < INVITE_AROUND_MS) return false;
    if (now < who.invitePauseUntil || now - who.lastLineAt < PLAYER_LINE_GAP_MS) return false;
    while (who.invitedAt.length > 0 && now - (who.invitedAt[0] ?? 0) >= 3_600_000) who.invitedAt.shift();
    if (who.invitedAt.length >= INVITE_HOURLY || now - (who.invitedAt.at(-1) ?? Number.NEGATIVE_INFINITY) < INVITE_GAP_MS) return false;
    if (!ctx.mayInvite()) return false;
    pair.inviteTried = true;
    return this.options.random() < inviteChance(ctx);
  }

  /** It asks her into a party: its `invite` line and a wave; the invite counts towards her pace from now. */
  private invite(botId: string, who: PlayerMemory, pair: PairMemory, ctx: MeetContext, now: number): MeetAction {
    pair.greeted = true;
    pair.lastAt = now;
    who.invitedAt.push(now);
    return { say: this.line(botId, who, 'invite', ctx.voice, now), emote: 'wave', friendAsk: false, partyInvite: true };
  }

  /** Every bot's party invites to player `playerId` wait a while. */
  private pause(playerId: string): void {
    const who = this.players.get(playerId);
    if (who) who.invitePauseUntil = this.options.now() + INVITE_PAUSE_MS;
  }

  /** Hello the first time; to a player it met or played with before, glad to see her again, or what it is busy with. */
  private greeting(pair: PairMemory, ctx: MeetContext, knows: boolean): BotLineKey {
    if (!knows && pair.meetings === 1) return 'hello';
    if (ctx.quest !== null && this.options.random() < 0.5) {
      pair.toldDoing = true;
      return 'doing';
    }
    return 'again';
  }

  /** A wording of `key` in its voice that she was not told lately (null: none, or another bot just spoke to her). */
  private line(botId: string, who: PlayerMemory, key: BotLineKey, voice: number, now: number): BotLine | null {
    if (now - who.lastLineAt < PLAYER_LINE_GAP_MS) return null;
    return this.fresh(botId, who, key, voice, now);
  }

  /** A wording of `key` in its voice that she was not told lately (null: none left). */
  private fresh(botId: string, who: PlayerMemory, key: BotLineKey, voice: number, now: number): BotLine | null {
    const picker = this.pickerOf(botId, key, voice);
    for (let i = 0; i < VOICE_WORDINGS; i++) {
      const variant = picker.next();
      const said = `${key}:${variant}`;
      if (who.recent.includes(said)) continue;
      who.recent.push(said);
      if (who.recent.length > RECENT_LINES) who.recent.shift();
      who.lastLineAt = now;
      return { key, variant };
    }
    return null;
  }

  private pickerOf(botId: string, key: BotLineKey, voice: number): FreshPicker<number> {
    const id = `${botId}:${key}`;
    let picker = this.pickers.get(id);
    if (!picker) {
      const own = Array.from({ length: BOT_LINE_VARIANTS }, (_, i) => i).filter((i) => i % BOT_LINE_VOICES === voice);
      picker = freshPicker(own, this.options.random);
      this.pickers.set(id, picker);
    }
    return picker;
  }
}
