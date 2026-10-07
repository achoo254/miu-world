// How a companion bot behaves with a player it meets (Master Plan §8b; owner 07/10/2026: "khi gặp người chơi thì
// ngẫu nhiên chat hoặc chủ động kết bạn"). Whether it walked over to her or only passes by, it turns to her and waves;
// it says hello the first time, "good to see you again" to a player it met or played with before, now and then what it
// is busy with, and cheers to a player in sight when it finds what its quest needs or finishes it. It sometimes asks
// her to be friends: more likely when they won a challenge together, never more often than FRIEND_ASK_GAP_MS for her
// (all bots together), never once they are friends.
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
import { talkChance } from './bot-persona';

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
}

/** What it does towards her now. */
export interface MeetAction {
  /** A line said to her (null: none now, it only waves). */
  readonly say: BotLine | null;
  /** It turns to her and waves (null: a line said in passing). */
  readonly emote: 'wave' | null;
  /** It asks her to be friends. */
  readonly friendAsk: boolean;
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
  /** Whether it remembers her from a challenge won together ('asking': not known yet). */
  knows: boolean | 'asking' | null;
}

interface PlayerMemory {
  lastLineAt: number;
  /** Her last lines, as `key:variant`. */
  recent: string[];
  lastFriendAskAt: number;
  /** By bot (its own id, not an instance's). */
  pairs: Map<string, PairMemory>;
}

export class BotSocial {
  private readonly options: BotSocialOptions;
  private readonly players = new Map<string, PlayerMemory>();
  private pairCount = 0;
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
      pair.chatty = this.options.random() < talkChance(ctx);
    }
    pair.seenAt = now;
    const knows = this.knows(botId, playerId, pair);
    if (knows === null || now - pair.lastAt < PAIR_GAP_MS) return null;

    if (!pair.greeted) {
      // A bot that will talk waits its turn while another one just spoke to her.
      if (pair.chatty && now - who.lastLineAt < PLAYER_LINE_GAP_MS) return null;
      pair.greeted = true;
      pair.lastAt = now;
      const ask = this.asks(who, pair, ctx, knows, now);
      if (ask) {
        who.lastFriendAskAt = now;
        pair.asked = true;
      }
      const say = ask || pair.chatty ? this.line(botId, who, ask ? 'friend' : this.greeting(pair, ctx, knows), ctx.voice, now) : null;
      return { say, emote: 'wave', friendAsk: ask };
    }
    // Still together a while after its greeting: it tells her what it is busy with (once a meeting).
    if (!pair.chatty || pair.toldDoing || ctx.quest === null) return null;
    const say = this.line(botId, who, 'doing', ctx.voice, now);
    if (!say) return null;
    pair.toldDoing = true;
    pair.lastAt = now;
    return { say, emote: null, friendAsk: false };
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

  /** Forgets every player but those in `present` (the players in rooms with bots). */
  keepOnly(present: ReadonlySet<string>): void {
    for (const [id, who] of this.players) {
      if (present.has(id)) continue;
      this.pairCount -= who.pairs.size;
      this.players.delete(id);
    }
  }

  /** Players it keeps something of (tests). */
  get playersKept(): number {
    return this.players.size;
  }

  private playerOf(playerId: string): PlayerMemory {
    let who = this.players.get(playerId);
    if (!who) {
      who = { lastLineAt: Number.NEGATIVE_INFINITY, recent: [], lastFriendAskAt: Number.NEGATIVE_INFINITY, pairs: new Map() };
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
      pair = { meetings: 0, seenAt: Number.NEGATIVE_INFINITY, lastAt: Number.NEGATIVE_INFINITY, greeted: false, chatty: false, toldDoing: false, asked: false, knows: null };
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
