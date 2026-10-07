// Bot Runner (Master Plan §8b, Jev 03/10/2026).
// Runs companion bots across game maps, each one like a player of its own: it walks the map on its own feet (no
// route given, nobody followed), sees only what is around it, finds its way over what it sees, and decides where
// to go next by what it learnt (bot-brain/): the places it found, the ways it walked, the map's quests it plays on
// its own (its name tag shows the quest mark), a player it sees and chooses to go and meet. A player within its reach
// it turns to, waves at and talks to in its own lines, now and then asking her to be friends (bot-social.ts, at a
// pace that never talks her over); it visits friends, answers invites and plays co-op challenges. A player it keeps
// meeting it now and then asks into a party: she leads it, the bot still goes its own way, asks the party to play a
// quest of its map and plays its own part in it (coop/bot-party-quest.ts: it heads for each step's place by what it
// learnt, answers its own questions, strikes the boss on its turn; nothing of it recorded or paid), remembers her when
// they played it through, and waves goodbye and leaves a little after the party's quest or challenge ends, at once
// when she goes to another map. What it learnt of each
// map is kept in the database (bot-brain/memory-keeper.ts), so it goes on learning after a restart. All bots are
// clearly labeled "[Bạn máy]".
import { HOME_MAP_ID, INTERACT_RANGE, type PartyView, type PlayerPresence, type ServerWsMessage } from '@miu/schema/multiplayer';
import type { BotLine, BotLineKey } from '@miu/schema/bot-lines';
import { COOP_BOT_LINE_VARIANTS, type CoopAction, type CoopBotLine, type CoopBotLineKey, type CoopStateView, type CoopTaskView } from '@miu/schema/coop';
import { VOICE_BOT_LINE_VARIANTS, type VoiceBotLineKey, type VoiceChannel } from '@miu/schema/voice';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import type { CoopBotDriver, CoopBotMoves, CoopHost } from '../coop/coop-service';
import { BotPartyQuestPlayer, chooseBotPartyQuest, type PartyQuestBotDriver } from '../coop/bot-party-quest';
import { botAnswerXp, botSkillLevel, fatigueAfter, moodAt, personaOf, rightChance, talkChance, thinkMs, VOICES, type BotPersona, type Bounds, type QuestionInfo } from './bot-persona';
import { BOT_MAP_CONFIGS, findBot, HOME_SNAP, type BotProfile } from './bot-profiles';
import type { BotStore } from './bot-store';
import { BotSocial, type MeetAction, type MeetContext, type PendingInvite } from './bot-social';
import type { CoopPerson } from '../coop/coop-session';
import { botProfileId, homeBotId, type MultiplayerHub, type MultiplayerRoom } from './multiplayer-hub';
import { BotBody } from './bot-brain/body';
import { Brain, type SeenPlayer } from './bot-brain/brain';
import { LocalPlanner, PathQueue } from './bot-brain/local-path';
import { MemoryKeeper } from './bot-brain/memory-keeper';
import { contentQuestBook, type QuestBook } from './bot-brain/quest-plan';
import { seePlayers } from './bot-brain/sight';
import type { WalkMap } from './bot-brain/walk-store';

/** How long a companion bot takes to answer a party invite. */
export const BOT_REPLY_MS = 1_500;
/** A companion bot thinks over a friend request this long (and up to twice as long), as a player would. */
export const BOT_FRIEND_REPLY_MS = 2_000;
/** Most friend requests a companion bot accepts; now and then it is "busy" and says not now. */
export const BOT_FRIEND_ACCEPT = 0.85;
/** Parties' voices followed at most: a crowded server forgets the oldest rather than growing without end. */
const MAX_TALKS = 10_000;
/** However sharp or tired, a companion bot answers a co-op question right at least, and at most, this often. */
export const BOT_COOP_ACCURACY_MIN = 0.35;
export const BOT_COOP_ACCURACY_MAX = 0.95;
/** A pending move further off than twice this gives way to news (a wake-up to pull again). */
export const BOT_COOP_THINK_MS = 1_800;
/** In a `together` round it pulls its rope again this long before letting go. */
const BOT_REHOLD_MS = 3_000;
/** Bot friends of a home's owner who come to visit it. */
const HOME_VISITORS = 2;
/** A bot goes to visit a friend standing at most this far from it, and stops this far from her. */
const VISIT_RANGE = 20;
const VISIT_STOP = 2.5;
const VISIT_CHANCE = 0.6;
/** In a party's voice a bot answers this long after a player stops talking (and up to twice as long)… */
export const BOT_VOICE_REPLY_MS = 700;
/** …greets a player who comes into the voice after this long… */
export const BOT_VOICE_HELLO_MS = 1_200;
/** …and no bot says another line sooner than this after the last one (the players talk more than the bots). */
export const BOT_VOICE_GAP_MS = 4_000;
/** A player's turn shorter than this gets a quick "yes"; longer than the next a "tell me more". */
const SHORT_TURN_MS = 1_500;
const LONG_TURN_MS = 4_500;

/** What a bot asks of its runner: the hub's messages, and its friends in the room. */
interface BotHooks {
  onMessage(message: ServerWsMessage): void;
  /** Public ids of the players in its room who are friends with it. */
  friendsHere(): readonly string[];
  random(): number;
  /** Whether it may walk yet (what it learnt before is still being read). */
  awake(): boolean;
}

const NO_HOOKS: BotHooks = { onMessage: () => {}, friendsHere: () => [], random: Math.random, awake: () => true };

/** Turned to a player to wave at her, it stands this long (s). */
const GREET_S = 3.5;
/** How often the runner forgets the players no longer in any room with bots (ms). */
const SOCIAL_SWEEP_MS = 5_000;
/** How often a bot in a party it asked a player into checks she is still on its map (ms). */
const TEAM_CHECK_MS = 1_000;
/** The runner ticks this often (ms): a room with players in it moves its bots on at every tick… */
export const TICK_MS = 100;
/** …one with none, this often (s; its bots still learn, and nobody is told). */
export const EMPTY_ROOM_STEP_S = 1;
/** However long a stall, a bot where players are moves on at most this far at once (s). */
const STEP_MAX_S = 0.2;
/** After the party's challenge or quest, it waves goodbye and leaves this long later (and up to twice as long). */
export const BOT_TEAM_LEAVE_MS = 5_000;
/** In the party it asked her into, it asks the party to play a quest this long after she said yes (up to twice as long). */
export const BOT_QUEST_PROPOSE_MS = 1_000;
/** A question of a party's quest with no skill to it (a choice of the story's way): an ordinary one to think over. */
const PLAIN_QUESTION: QuestionInfo = { skill: '', subject: null, difficulty: 0.35, medianMs: 8_000 };

class CompanionBotInstance {
  readonly profile: BotProfile;
  readonly room: MultiplayerRoom;
  readonly presence: PlayerPresence;
  /** Its feet on the map and its mind (null: the map has no walk grid, and it stays at its home). */
  readonly body: BotBody | null;
  readonly brain: Brain | null;
  readonly persona: BotPersona;
  private greetLeft = 0;
  private readonly hooks: BotHooks;

  constructor(profile: BotProfile, room: MultiplayerRoom, body: BotBody | null, brain: Brain | null, hooks: Partial<BotHooks> = {}) {
    this.profile = profile;
    this.room = room;
    this.body = body;
    this.brain = brain;
    this.hooks = { ...NO_HOOKS, ...hooks };
    this.persona = personaOf(profile.id);
    const at = body?.stepper ?? profile.home;

    this.presence = {
      id: profile.id,
      displayName: profile.displayName,
      isBot: true, // ALWAYS labelled as bot per Jev ruling
      species: profile.species,
      outfit: profile.outfit,
      pet: null,
      petGear: [],
      x: at.x,
      y: at.y,
      z: at.z,
      yaw: 0,
      speed: 0,
      action: 'idle',
      riding: false,
      bubble: null,
    };
  }

  join(): void {
    this.room.join({
      id: this.profile.id,
      presence: this.presence,
      send: (message) => this.hooks.onMessage(message),
      isBot: true,
    });
    // After its spawn, the players learn what quest it is on.
    this.showDoing();
  }

  /** The quest it is busy with, to everyone in the room who sees it. */
  showDoing(): void {
    const id = this.profile.id;
    if (this.room.members.has(id)) this.room.broadcast({ type: 'bot-doing', id, quest: this.brain?.questId ?? null }, id);
  }

  /** Someone came into its room: a player is told the quest it is on (nothing to tell when it is on none). */
  welcome(who: PlayerPresence): void {
    const quest = this.brain?.questId ?? null;
    const member = this.room.members.get(who.id);
    if (quest === null || who.isBot || !member || !this.room.canSee(who.id, this.profile.id)) return;
    member.send({ type: 'bot-doing', id: this.profile.id, quest });
  }

  leave(): void {
    this.room.leave(this.profile.id);
  }

  /** Sometimes, as it sets off somewhere, it walks over to a friend in its room instead (friends meet it more often). */
  private visitFriend(body: BotBody): void {
    if (this.hooks.random() >= VISIT_CHANCE) return;
    for (const id of this.hooks.friendsHere()) {
      const friend = this.room.members.get(id)?.presence;
      if (!friend) continue;
      const dist = Math.hypot(friend.x - this.presence.x, friend.z - this.presence.z);
      if (dist > VISIT_RANGE || dist <= VISIT_STOP) continue;
      body.goTo({ x: friend.x, y: null, z: friend.z, reach: VISIT_STOP });
      return;
    }
  }

  /** Whether it is free to turn to a player (not standing to wave at one already). */
  get free(): boolean {
    return this.greetLeft <= 0;
  }

  /** It does towards player `to` what it chose: turns to her and waves (standing a moment), says its line. */
  interact(to: PlayerPresence, action: MeetAction): void {
    if (action.emote) {
      this.greetLeft = GREET_S;
      const p = this.presence;
      p.yaw = Math.atan2(to.x - p.x, to.z - p.z);
      this.room.updatePresence(p.id, { x: p.x, y: p.y, z: p.z, yaw: p.yaw, speed: 0, action: action.emote });
      this.room.broadcastEmote(p.id, action.emote);
    }
    if (action.say) this.say(action.say, to.id);
  }

  /** A line of its own (to player `to`: she gets it as said to her), to everyone in the room who sees it. */
  say(line: BotLine, to?: string): void {
    const id = this.profile.id;
    this.room.broadcast({ type: 'bot-say', id, key: line.key, variant: line.variant, ...(to ? { to } : {}) }, id, to);
  }

  tick(dt: number): void {
    if (this.greetLeft > 0) {
      this.greetLeft -= dt;
      return;
    }
    const body = this.body;
    if (!body || !this.hooks.awake()) return;
    const before = body.mode;
    body.tick(dt);
    if ((before === 'rest' || before === 'work') && body.mode === 'walk') this.visitFriend(body);
    this.show(body);
  }

  /** It shows what it does: a wave at a person, a jump at a thing, a cheer when done. */
  gesture(emote: 'wave' | 'jump' | 'cheer'): void {
    this.room.broadcastEmote(this.profile.id, emote);
  }

  /** Tells the room where it is now, when anything about it changed. */
  private show(body: BotBody): void {
    const { stepper } = body;
    const moving = stepper.moving;
    const speed = moving ? this.persona.walk : 0;
    const action = moving ? 'walk' : 'idle';
    const p = this.presence;
    if (p.x === stepper.x && p.y === stepper.y && p.z === stepper.z && p.speed === speed && p.action === action && p.riding === stepper.riding) return;
    this.room.updatePresence(p.id, { x: stepper.x, y: stepper.y, z: stepper.z, yaw: stepper.yaw, speed, action, riding: stepper.riding });
  }
}

export interface BotRunnerOptions {
  /** Injectable for tests (whether a bot accepts, asks, visits, answers right). */
  random?: () => number;
  /** How often a bot answers a co-op question right, fixed (0–1; tests). Without it, its persona and skill decide… */
  coopAccuracy?: number;
  /** …within these bounds. */
  coopAccuracyMin?: number;
  coopAccuracyMax?: number;
  /** How long a bot thinks before a co-op move, fixed (ms, up to twice as long; tests). Without it, its persona decides. */
  coopThinkMs?: number;
  /** Bots' own skill XP and what they learnt of each map; none: they learn only while the server runs. */
  store?: BotStore;
  /** The time of day (a bot's mood follows the hour). */
  clock?: () => Date;
  /** The maps' walk grids (bot-brain/walk-store.ts); without them, or for a map without one, its bots stay at home. */
  walk?: { get(mapId: string): WalkMap | null };
  /** The quests bots play on their own on each map (default: the content directory's, read when first needed). */
  quests?: QuestBook;
  /** Time each tick may spend planning bots' ways (ms). */
  planBudgetMs?: number;
  /** The bots of each map (default: every companion bot, `BOT_MAP_CONFIGS`; others only to measure load). */
  profiles?: Readonly<Record<string, readonly BotProfile[]>>;
}

/** Time each tick may spend planning bots' ways, for the whole server (ms). */
export const PLAN_BUDGET_MS = 4;

interface CoopTurn {
  state: CoopStateView;
  moves: CoopBotMoves;
  timer: NodeJS.Timeout | null;
  /** When the pending move is due (ms). */
  dueAt: number;
  /** When it got the state it sees (the holds' time left counts from then). */
  receivedAt: number;
  /** Its answers in this challenge (it tires a little with each). */
  answers: number;
  /** Its lines, each kind from its own voice, never the same twice in a row. */
  lines: Map<CoopBotLineKey, FreshPicker<number>>;
}

/** A party's voice as its bots follow it: who is in it, who talks now (since when), and whose turn a line is. */
interface VoiceTalk {
  players: Set<string>;
  speaking: Map<string, number>;
  /** The line a bot is about to say (cancelled when a player starts talking). */
  timer: NodeJS.Timeout | null;
  lastLineAt: number;
  /** When each bot last spoke: the turn goes to the one who spoke least lately. */
  spoke: Map<string, number>;
}

export class BotRunner {
  private readonly hub: MultiplayerHub;
  private readonly random: () => number;
  private readonly bots = new Map<string, CompanionBotInstance[]>();
  private readonly walk: { get(mapId: string): WalkMap | null } | null;
  private readonly quests: QuestBook;
  private readonly planner = new LocalPlanner();
  /** Every bot's plans, worked through each tick within the budget. */
  readonly plans: PathQueue;
  private timer: NodeJS.Timeout | null = null;
  private lastTick = Date.now();
  /** The time of the tick running now (null: none runs): read once a tick for every bot, not by each one. */
  private tickAt: number | null = null;
  /** Answers on their way (a bot takes a moment, as a player would). */
  private readonly replies = new Set<NodeJS.Timeout>();
  /** How the bots behave with the players they meet (what they keep of each player, in memory only). */
  private readonly social: BotSocial;
  private socialSweptAt = Date.now();
  /** Bots playing a co-op challenge: what each sees and the move it is thinking over. */
  private readonly coop = new Map<string, CoopTurn>();
  private readonly bounds: Bounds;
  private readonly coopThinkMs: number | null;
  private readonly store: BotStore | null;
  private readonly clock: () => Date;
  /** Each bot's skill XP, read once from the store and kept up to date as it plays. */
  private readonly skills = new Map<string, Promise<Record<string, number>>>();
  /** Parties' voices with bots in them, by party id. */
  private readonly talks = new Map<string, VoiceTalk>();
  /** Each bot's voice lines per kind, from its own voice, never the same twice in a row. */
  private readonly voiceLines = new Map<string, FreshPicker<number>>();
  /** What the bots learnt of their maps, read and written (none without a store). */
  private readonly memories: MemoryKeeper | null;
  private readonly host: CoopHost;
  /**
   * Bots in a party with the player they asked into it (by the bot's instance id), their goodbye on its way, and
   * whether she started a quest of her own while it was on its way (the bot stays until she finishes it).
   */
  private readonly teams = new Map<string, { inst: CompanionBotInstance; player: string; leaving: NodeJS.Timeout | null; alone: boolean }>();
  private teamsCheckedAt = Date.now();
  /** Bots playing their part in party quests. */
  private readonly partyPlayer: BotPartyQuestPlayer;
  private readonly profiles: Readonly<Record<string, readonly BotProfile[]>>;
  /** Time gone by since the bots of each room with no player in it last moved on (s, by room key). */
  private readonly unwatched = new Map<string, number>();

  constructor(hub: MultiplayerHub, options: BotRunnerOptions = {}) {
    this.hub = hub;
    this.random = options.random ?? Math.random;
    const fixed = options.coopAccuracy === undefined ? null : Math.min(1, Math.max(0, options.coopAccuracy));
    this.bounds = fixed === null ? { min: options.coopAccuracyMin ?? BOT_COOP_ACCURACY_MIN, max: options.coopAccuracyMax ?? BOT_COOP_ACCURACY_MAX } : { min: fixed, max: fixed };
    this.coopThinkMs = options.coopThinkMs ?? null;
    this.store = options.store ?? null;
    this.memories = this.store ? new MemoryKeeper(this.store) : null;
    this.clock = options.clock ?? (() => new Date());
    this.walk = options.walk ?? null;
    this.quests = options.quests ?? contentQuestBook();
    this.plans = new PathQueue(options.planBudgetMs ?? PLAN_BUDGET_MS);
    this.profiles = options.profiles ?? BOT_MAP_CONFIGS;
    const host = hub.coopHost();
    this.host = host;
    const store = this.store;
    this.social = new BotSocial({
      now: () => this.now(),
      random: this.random,
      // A bot remembers the players it won a challenge with (its own id; never an instance in a home).
      recall: async (botId, playerId) => {
        const child = host.childIdOf(playerId);
        return Boolean(store && child && (await store.recall(botProfileId(botId), child)));
      },
    });
    this.partyPlayer = new BotPartyQuestPlayer({
      random: this.random,
      thinkMs: (botId, info, answers) => thinkMs(personaOf(botId), info ?? PLAIN_QUESTION, fatigueAfter(answers), this.random()),
      chance: (botId, info, answers) => this.chanceOf(botId, info, answers),
      learnt: (botId, info, right) => this.learnt(botId, info, right),
      share: (botId, goal) => this.instanceOf(botId)?.brain?.share(goal),
      finished: (botId, questId, players) => this.playedThrough(botId, questId, players),
      ended: (botId) => {
        // The quest of a party it asked her into is over: it says goodbye and leaves.
        if (this.teams.has(botId)) this.waveAndLeave(botId);
      },
      playedAlone: (playerId, finished) => this.playedAlone(playerId, finished),
    });
  }

  /**
   * Companion bots in party quests: each bot of the party plays its own part (coop/bot-party-quest.ts), as its
   * persona, skill and mood have it; what it learns from its answers goes to its own skills.
   */
  partyQuestDriver(): PartyQuestBotDriver {
    return this.partyPlayer;
  }

  /**
   * Companion bots in co-op challenges: the bots of the map fill a lone player's free places (always labelled), no two
   * of a team alike, and each plays its part like a player of its own: shares its clues, answers its questions as its
   * persona, skill, mood and tiredness have it (quick and sharp one moment, slipping the next), pulls its rope and
   * pulls again before letting go, and now and then says a line in its own voice.
   */
  coopDriver(): CoopBotDriver {
    return {
      pick: (mapId, count, exclude) => {
        const local = mapId ? (BOT_MAP_CONFIGS[mapId] ?? []) : [];
        const all = Object.values(BOT_MAP_CONFIGS).flat();
        const seen = new Set<string>();
        const pool = [...this.shuffled(local), ...this.shuffled(all)].filter((p) => {
          if (seen.has(p.id) || exclude.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        // No two bots of one team alike: another voice and another rhythm than every bot already in it.
        const team = [...exclude].filter((id) => id.startsWith('bot-')).map((id) => personaOf(id));
        const chosen: BotProfile[] = [];
        const differs = (p: BotProfile): boolean => {
          const persona = personaOf(p.id);
          return team.every((o) => o.voice !== persona.voice && Math.abs(o.speed - persona.speed) >= 0.1);
        };
        for (const p of pool) {
          if (chosen.length >= count) break;
          if (!differs(p)) continue;
          chosen.push(p);
          team.push(personaOf(p.id));
        }
        // More places than voices: the rest come as they are (still with their own personas).
        for (const p of pool) if (chosen.length < count && !chosen.includes(p)) chosen.push(p);
        return chosen.map((p): CoopPerson => ({ id: p.id, displayName: p.displayName, species: p.species, isBot: true }));
      },
      play: (botId, state, moves) => {
        const turn = this.coop.get(botId);
        if (turn) {
          turn.state = state;
          turn.moves = moves;
          turn.receivedAt = Date.now();
          // A far wake-up (waiting to pull again) gives way to news: it thinks again now. A move it is already
          // thinking over stays, so a busy team never keeps it from answering.
          if (turn.timer && turn.dueAt - Date.now() > 2 * (this.coopThinkMs ?? BOT_COOP_THINK_MS)) {
            clearTimeout(turn.timer);
            turn.timer = null;
          }
        } else this.coop.set(botId, { state, moves, timer: null, dueAt: 0, receivedAt: Date.now(), answers: 0, lines: new Map() });
        this.coopThink(botId, this.moveMs(botId, state, moves));
      },
      forget: (ids) => {
        for (const id of ids) {
          const turn = this.coop.get(id);
          if (turn?.timer) clearTimeout(turn.timer);
          this.coop.delete(id);
          // The challenge of a party it asked her into is over: it says goodbye and leaves.
          if (this.teams.has(id)) this.waveAndLeave(id);
        }
      },
    };
  }

  private shuffled<T>(list: readonly T[]): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  }

  /** A bot's skill XP (read once, then kept as it learns). */
  private skillsOf(botId: string): Promise<Record<string, number>> {
    const id = botProfileId(botId);
    let skills = this.skills.get(id);
    if (!skills) {
      skills = this.store ? this.store.skills(id).catch(() => ({})) : Promise.resolve({});
      this.skills.set(id, skills);
    }
    return skills;
  }

  /** How long its next move takes: a question as long as its persona and the players' usual time say, a share or a pull less. */
  private moveMs(botId: string, state: CoopStateView, moves: CoopBotMoves): number {
    const chance = this.random();
    if (this.coopThinkMs !== null) return this.coopThinkMs * (1 + chance);
    const persona = personaOf(botId);
    const own = state.tasks.find((t) => t.task !== null)?.task ?? (state.turn === state.self ? state.task : null);
    const info = own ? moves.question(own.id) : null;
    const fatigue = fatigueAfter(this.coop.get(botId)?.answers ?? 0);
    return info ? thinkMs(persona, info, fatigue, chance) : Math.round(1_200 + 1_800 * persona.speed * (0.5 + chance));
  }

  /** Thinks over its next move a moment, unless it already is. */
  private coopThink(botId: string, ms: number): void {
    const turn = this.coop.get(botId);
    if (!turn || turn.timer) return;
    turn.dueAt = Date.now() + ms;
    turn.timer = setTimeout(() => {
      turn.timer = null;
      void this.coopMove(botId);
    }, ms);
  }

  /** A line of its own voice for this kind of move, said as often as its persona talks. */
  private lineFor(botId: string, turn: CoopTurn, key: CoopBotLineKey): CoopBotLine | undefined {
    const persona = personaOf(botId);
    if (this.random() >= persona.chat) return undefined;
    let picker = turn.lines.get(key);
    if (!picker) {
      const variants = Array.from({ length: COOP_BOT_LINE_VARIANTS }, (_, i) => i).filter((i) => i % VOICES === persona.voice);
      picker = freshPicker(variants, this.random);
      turn.lines.set(key, picker);
    }
    return { key, variant: picker.next() };
  }

  /** The chance its answer is right now: as its skill, the question, its mood and tiredness (after `answers`) make it. */
  private async chanceOf(botId: string, info: QuestionInfo | null, answers: number): Promise<number> {
    const persona = personaOf(botId);
    const skills = await this.skillsOf(botId);
    const level = botSkillLevel(info ? (skills[info.skill] ?? 0) : 0);
    return info ? rightChance(persona, info, level, moodAt(botId, persona, this.clock()), fatigueAfter(answers), this.bounds) : this.bounds.max;
  }

  /** It learns from its own answer only (more from a right one), kept for the next challenge or quest. */
  private learnt(botId: string, info: QuestionInfo | null, right: boolean): void {
    if (!info?.skill) return;
    const gained = botAnswerXp(right);
    void this.skillsOf(botId).then((skills) => {
      skills[info.skill] = (skills[info.skill] ?? 0) + gained;
    });
    void this.store?.addSkillXp(botProfileId(botId), info.skill, gained).catch((err: unknown) => {
      console.error('bot skill failed', err instanceof Error ? err.name : typeof err);
    });
  }

  /** Its answer: right as often as its skill, the question, its mood and tiredness make it; it learns from it. */
  private async coopAnswer(botId: string, task: CoopTaskView, turn: CoopTurn): Promise<{ action: CoopAction; right: boolean }> {
    const right = turn.moves.answerOf(task.id);
    const info = turn.moves.question(task.id);
    const chance = await this.chanceOf(botId, info, turn.answers);
    const others = task.choices.filter((c) => c.id !== right);
    const wrong = others[Math.floor(this.random() * others.length)];
    const isRight = right !== null && (this.random() < chance || !wrong);
    turn.answers += 1;
    this.learnt(botId, info, isRight);
    const choice = isRight ? (right ?? '') : (wrong?.id ?? task.choices[0]?.id ?? '');
    return { action: { kind: 'answer', task: task.id, choice }, right: isRight };
  }

  private async coopMove(botId: string): Promise<void> {
    const turn = this.coop.get(botId);
    if (!turn || turn.state.status !== 'playing') return;
    const { state } = turn;
    const self = state.self;
    // Its own clue not shown yet: share it.
    const clue = state.pieces.find((p) => p.text !== null && !p.shared);
    if (clue) return turn.moves.act({ kind: 'share', piece: clue.index }, this.lineFor(botId, turn, 'share'));
    const task = state.task && state.turn === self && state.pieces.every((p) => p.shared) ? state.task : (state.tasks.find((t) => t.task !== null)?.task ?? null);
    if (task) {
      const { action, right } = await this.coopAnswer(botId, task, turn);
      if (this.coop.get(botId) !== turn) return;
      return turn.moves.act(action, this.lineFor(botId, turn, right ? 'right' : 'oops'));
    }
    if (state.mode !== 'together') return;
    const places = state.seats.filter((s) => s.id === self || s.standIn?.id === self).map((s) => s.id);
    // Time left of its holds now, not when the state came.
    const since = Date.now() - turn.receivedAt;
    const left = state.holds.filter((h) => places.includes(h.seat)).map((h) => Math.max(0, h.msLeft - since));
    if (left.length === 0) return;
    if (left.some((ms) => ms < BOT_REHOLD_MS)) return turn.moves.act({ kind: 'hold' }, this.lineFor(botId, turn, 'hold'));
    // Held: it pulls again just before letting go, while the others answer.
    this.coopThink(botId, Math.min(...left) - BOT_REHOLD_MS + 100);
  }

  /**
   * A bot of `profile` in `room`, wired to this runner: on its own feet and with a mind of its own when the map has
   * a walk grid. It takes up what it learnt of the map before (in a home, what all its instances in homes learnt),
   * or starts knowing nothing of it.
   */
  private instance(profile: BotProfile, room: MultiplayerRoom): CompanionBotInstance {
    const map = this.walk?.get(room.mapId) ?? null;
    const home = map?.snap(profile.home, HOME_SNAP) ?? null;
    const persona = personaOf(profile.id);
    const key = this.planKey(room, profile.id);
    let inst: CompanionBotInstance | null = null;
    const brain =
      map && home
        ? new Brain({
            map,
            home,
            persona,
            quests: this.quests.questsOn(room.mapId, this.clock()),
            random: this.random,
            now: () => this.now(),
            planner: this.planner,
            requestPlan: (run) => this.plans.request(`${key}|way`, run),
            players: (at, sight) =>
              seePlayers(room, profile.id, { x: at.x + 0.5, z: at.z + 0.5 }, sight).map((m): SeenPlayer => ({ id: m.id, x: m.presence.x, y: m.presence.y, z: m.presence.z })),
            events: {
              doing: () => inst?.showDoing(),
              gesture: (emote) => inst?.gesture(emote),
              news: (kind) => {
                if (inst) this.cheer(inst, kind);
              },
            },
          })
        : null;
    const body =
      map && home && brain
        ? new BotBody({
            map,
            home,
            pace: { speed: persona.walk, sight: persona.sight },
            chooser: brain,
            planner: this.planner,
            requestPlan: (run) => this.plans.request(key, run),
            now: () => this.now(),
          })
        : null;
    inst = new CompanionBotInstance(profile, room, body, brain, {
      // A player who comes in learns what quest it is on.
      onMessage: (message) => (message.type === 'spawn' ? inst?.welcome(message.player) : this.heard(profile.id, message)),
      friendsHere: () => this.hub.friendsOfBot(botProfileId(profile.id)).filter((id) => room.members.has(id)),
      random: this.random,
      awake: () => this.memories?.ready(key) ?? true,
    });
    if (map && brain) this.memories?.attach({ key, botId: botProfileId(profile.id), mapId: room.mapId, map, brain, shared: room.host !== null });
    return inst;
  }

  start(): void {
    // Populate companion bots for configured maps; each home gets its own while a player is in it.
    for (const [mapId, profiles] of Object.entries(this.profiles)) {
      if (mapId === HOME_MAP_ID) continue;
      this.fill(this.hub.getOrCreateRoom(mapId), profiles);
    }
    this.hub.setHomeRoomHooks({
      opened: (room) => this.fill(room, this.homeBots(room), room.host),
      closed: (room) => {
        for (const bot of this.bots.get(room.key) ?? []) {
          bot.leave();
          this.plans.cancel(this.planKey(room, bot.profile.id));
          this.plans.cancel(`${this.planKey(room, bot.profile.id)}|way`);
          // What it learnt in her home joins its memory of homes.
          void this.memories?.detach(this.planKey(room, bot.profile.id));
        }
        this.bots.delete(room.key);
        this.unwatched.delete(room.key);
      },
    });

    // Its bots play their part in the party quests they are in.
    this.hub.setPartyQuestBots(this.partyPlayer);

    this.lastTick = Date.now();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private planKey(room: MultiplayerRoom, botId: string): string {
    return `${room.key}|${botId}`;
  }

  /** Bots of `profiles` into `room`; in a home (`host`), each as its own instance there. */
  private fill(room: MultiplayerRoom, profiles: readonly BotProfile[], host: string | null = null): void {
    const instances = profiles.map((p) => this.instance(host ? { ...p, id: homeBotId(p.id, host) } : p, room));
    for (const inst of instances) inst.join();
    this.bots.set(room.key, instances);
  }

  /**
   * A home's bots: the neighbours of the home map, and up to two of its owner's bot friends come to visit (setting
   * out from a neighbour's home), so friends turn up more often.
   */
  private homeBots(room: MultiplayerRoom): BotProfile[] {
    const neighbours = this.profiles[HOME_MAP_ID] ?? [];
    const visitors = (room.host ? this.hub.botFriendsOf(room.host) : [])
      .filter((id) => !neighbours.some((n) => n.id === id))
      .slice(0, HOME_VISITORS)
      .flatMap((id, i): BotProfile[] => {
        const friend = findBot(id)?.profile;
        const home = neighbours[i % Math.max(1, neighbours.length)]?.home;
        return friend && home ? [{ ...friend, home }] : [];
      });
    return [...neighbours, ...visitors];
  }

  /**
   * Moves every bot on by the time since the last tick, then plans. Where players are, ten times a second (at most a
   * fifth of a second at once, after a stall); in a room with none, nobody sees them walk: once a second (at most a
   * second at once), still learning, nothing to tell anyone.
   */
  tick(): void {
    const now = Date.now();
    this.tickAt = now;
    try {
      this.moveOn(now);
    } finally {
      this.tickAt = null;
    }
  }

  /** The time now: the tick's while one runs. */
  private now(): number {
    return this.tickAt ?? Date.now();
  }

  private moveOn(now: number): void {
    const gone = Math.max(0, (now - this.lastTick) / 1000);
    this.lastTick = now;
    const sweep = now - this.socialSweptAt >= SOCIAL_SWEEP_MS;
    const present = new Set<string>();
    for (const [key, list] of this.bots) {
      // The room's players, once a tick (a room with none has nobody to meet).
      const room = list[0]?.room;
      const players = room ? [...room.people.values()].map((m) => m.presence) : [];
      if (players.length === 0) {
        const waited = (this.unwatched.get(key) ?? 0) + gone;
        if (waited < EMPTY_ROOM_STEP_S) {
          this.unwatched.set(key, waited);
          continue;
        }
        this.unwatched.set(key, 0);
        const dt = Math.min(waited, EMPTY_ROOM_STEP_S);
        for (const bot of list) bot.tick(dt);
        continue;
      }
      this.unwatched.delete(key);
      const dt = Math.min(gone, STEP_MAX_S);
      if (sweep) for (const p of players) present.add(p.id);
      for (const bot of list) {
        bot.tick(dt);
        this.meetPlayers(bot, players);
      }
    }
    if (sweep) {
      this.socialSweptAt = now;
      this.social.keepOnly(present);
    }
    for (const lapse of this.social.lapsed()) this.inviteLapsed(lapse);
    if (now - this.teamsCheckedAt >= TEAM_CHECK_MS) {
      this.teamsCheckedAt = now;
      this.checkTeams();
    }
    this.plans.drain();
    this.memories?.tick();
  }

  /** What a bot is and does now, for the players it meets. */
  private meetContext(bot: CompanionBotInstance, playerId: string): MeetContext {
    const { persona } = bot;
    return {
      voice: persona.voice,
      chat: persona.chat,
      quest: bot.brain?.questId ?? null,
      friend: this.hub.botFriendsOf(playerId).includes(botProfileId(bot.profile.id)),
      mayInvite: () => this.mayInvite(bot, playerId),
    };
  }

  /**
   * Whether a bot may ask player `playerId` into a party now: it walks the map with a mind of its own, plays no
   * challenge, waits for no answer to another invite, the hub lets it (see `botMayInvite`), and the map has quests
   * to play together.
   */
  private mayInvite(bot: CompanionBotInstance, playerId: string): boolean {
    const id = bot.profile.id;
    if (!bot.brain || this.coop.has(id) || this.partyPlayer.plays(id) || this.social.inviting(id) !== null || !this.hub.botMayInvite(id, playerId)) return false;
    return this.quests.questsOn(bot.room.mapId, this.clock()).length > 0;
  }

  /**
   * The players within a bot's reach who see it, nearest first: it turns to the first one it has something for (one
   * a tick), and its mind counts the meeting. A player it walks over to meet is greeted once it is there.
   */
  private meetPlayers(bot: CompanionBotInstance, players: readonly PlayerPresence[]): void {
    if (!bot.free) return;
    const at = bot.presence;
    const near: Array<{ p: PlayerPresence; away: number }> = [];
    for (const p of players) {
      const away = Math.hypot(p.x - at.x, p.y - at.y, p.z - at.z);
      if (away <= INTERACT_RANGE && bot.room.canSee(p.id, at.id) && bot.brain?.approaching !== p.id) near.push({ p, away });
    }
    near.sort((a, b) => a.away - b.away);
    for (const { p } of near) {
      const action = this.social.meet(botProfileId(at.id), p.id, this.meetContext(bot, p.id));
      if (!action) continue;
      bot.interact(p, action);
      if (action.friendAsk) void this.hub.botFriendRequest(at.id, p.id);
      if (action.partyInvite && this.hub.botPartyInvite(at.id, p.id)) this.social.invited(at.id, p.id);
      bot.brain?.metPlayer(p.id);
      return;
    }
  }

  /** A bot found what its quest needs or finished it: it cheers to the nearest player who sees it and may be told now. */
  private cheer(bot: CompanionBotInstance, kind: 'found' | 'done'): void {
    const id = bot.profile.id;
    if (!bot.room.members.has(id)) return;
    for (const seen of seePlayers(bot.room, id, bot.presence, bot.persona.sight)) {
      const line = this.social.cheer(botProfileId(id), seen.id, kind, this.meetContext(bot, seen.id));
      if (!line) continue;
      bot.say(line, seen.id);
      return;
    }
  }

  /** Writes out what every bot learnt since it was last written (the server stopping), and waits for it. */
  async flush(): Promise<void> {
    await this.memories?.flush();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const reply of this.replies) clearTimeout(reply);
    this.replies.clear();
    for (const turn of this.coop.values()) if (turn.timer) clearTimeout(turn.timer);
    this.coop.clear();
    this.partyPlayer.stop();
    this.hub.setPartyQuestBots(null);
    for (const talk of this.talks.values()) if (talk.timer) clearTimeout(talk.timer);
    this.talks.clear();
    this.teams.clear();
    this.plans.clear();
  }

  private later(ms: number, run: () => void): NodeJS.Timeout {
    const reply = setTimeout(() => {
      this.replies.delete(reply);
      run();
    }, ms);
    this.replies.add(reply);
    return reply;
  }

  /** The bot instance with `id`, wherever it stands (null: none now). */
  private instanceOf(id: string): CompanionBotInstance | null {
    for (const list of this.bots.values()) {
      const inst = list.find((b) => b.profile.id === id);
      if (inst) return inst;
    }
    return null;
  }

  /** A bot answers what player `playerId` did in a line of its own (and a gesture), if it is still on its map. */
  private answerTo(botId: string, playerId: string, key: BotLineKey, emote: 'wave' | 'cheer' | null): void {
    const inst = this.instanceOf(botId);
    if (!inst?.room.members.has(botId)) return;
    if (emote) inst.gesture(emote);
    const line = this.social.answer(botProfileId(botId), playerId, key, inst.persona.voice);
    if (line) inst.say(line, playerId);
  }

  /**
   * A bot's party changed. Its invite answered with a yes (she leads the party now): it cheers and keeps her as its
   * party mate. Its invite void (it joined another party meanwhile): as if she said no, without a word. Its party
   * mate gone from its party: it lets her go.
   */
  private partyChanged(botId: string, party: PartyView | null): void {
    const members = party?.members.map((m) => m.id) ?? [];
    const team = this.teams.get(botId);
    if (team) {
      if (!members.includes(botId) || !members.includes(team.player)) this.dropTeam(botId);
      return;
    }
    const asked = this.social.inviting(botId);
    if (asked === null || !members.includes(botId)) return;
    const accepted = members.includes(asked);
    this.social.answered(botId, accepted);
    const inst = this.instanceOf(botId);
    if (!accepted || !inst) return;
    this.teams.set(botId, { inst, player: asked, leaving: null, alone: false });
    this.answerTo(botId, asked, 'yay', 'cheer');
    this.later(BOT_QUEST_PROPOSE_MS * (1 + this.random()), () => this.proposeQuest(botId));
  }

  /**
   * A moment after she said yes, it asks the party to play a quest of its map (Jev D7: any of them, each as likely),
   * unless the party plays one or a challenge already.
   */
  private proposeQuest(botId: string): void {
    const team = this.teams.get(botId);
    if (!team || this.coop.has(botId) || this.partyPlayer.plays(botId)) return;
    const questId = chooseBotPartyQuest(this.quests, team.inst.room.mapId, this.clock(), this.random);
    if (questId) this.hub.botProposeQuest(botId, team.player, questId);
  }

  /**
   * It played a party's quest through with these players: it remembers each of them (kept in its store, so it knows
   * her after a restart too) and may ask her to be friends now (more likely than when they only meet).
   */
  private playedThrough(botId: string, questId: string, players: readonly string[]): void {
    const inst = this.instanceOf(botId);
    for (const playerId of players) {
      const child = this.host.childIdOf(playerId);
      if (child && this.store) {
        void this.store.remember(botProfileId(botId), child, questId, this.clock()).catch((err: unknown) => {
          console.error('bot memory failed', err instanceof Error ? err.name : typeof err);
        });
      }
      if (!inst?.room.members.has(botId)) continue;
      const action = this.social.playedWith(botProfileId(botId), playerId, this.meetContext(inst, playerId));
      if (!action) continue;
      if (action.say) inst.say(action.say, playerId);
      void this.hub.botFriendRequest(botId, playerId);
    }
  }

  /** She said no to a bot's invite, or let it lapse: no hard feelings, it goes back to what it was doing. */
  private inviteLapsed({ botId, playerId }: PendingInvite): void {
    this.answerTo(botId, playerId, 'later', null);
  }

  /**
   * Every second: a bot whose party mate went to another map (or another home), switched bots off, or who is no
   * longer on its map itself, leaves the party at once.
   */
  private checkTeams(): void {
    for (const [botId, team] of this.teams) {
      const room = team.inst.room;
      const there = this.hub.roomKeyOf(team.player);
      const elsewhere = there !== null && (there !== room.key || !this.host.botsOn(team.player));
      if (elsewhere || !room.members.has(botId)) this.leaveTeam(botId);
    }
  }

  /**
   * In a moment it waves goodbye and leaves the party, unless she starts a quest meanwhile (Jev: any quest she starts,
   * a challenge or quest with it or one she plays on her own).
   */
  private waveAndLeave(botId: string): void {
    const team = this.teams.get(botId);
    if (!team || team.leaving) return;
    team.leaving = this.later(BOT_TEAM_LEAVE_MS * (1 + this.random()), () => {
      team.leaving = null;
      // She started a challenge or another quest meanwhile: it stays.
      if (this.teams.get(botId) !== team || team.alone || this.coop.has(botId) || this.partyPlayer.plays(botId)) return;
      this.answerTo(botId, team.player, 'bye', 'wave');
      this.leaveTeam(botId);
    });
  }

  /**
   * Its party mate plays a quest on her own. A step of it tried while its goodbye is on its way: it stays while she
   * plays. That quest finished: it waves goodbye and leaves a little later, as after the party's own quest.
   */
  private playedAlone(playerId: string, finished: boolean): void {
    for (const [botId, team] of this.teams) {
      if (team.player !== playerId) continue;
      if (!finished) {
        if (team.leaving) team.alone = true;
      } else if (team.alone) {
        team.alone = false;
        this.waveAndLeave(botId);
      }
    }
  }

  private leaveTeam(botId: string): void {
    this.dropTeam(botId);
    this.hub.botLeaveParty(botId);
  }

  private dropTeam(botId: string): void {
    const team = this.teams.get(botId);
    if (!team) return;
    if (team.leaving) {
      clearTimeout(team.leaving);
      this.replies.delete(team.leaving);
    }
    this.teams.delete(botId);
  }

  /**
   * A companion bot is a full party member: invited, it joins after a moment. Asked to be friends, it thinks it
   * over and mostly says yes. Leaving and choosing by character are the bots' own behaviour, built on this.
   */
  private heard(botId: string, message: ServerWsMessage): void {
    if (message.type === 'party-invite') {
      this.later(BOT_REPLY_MS, () => this.hub.answerPartyInvite(botId, message.from.id, true));
      return;
    }
    if (message.type === 'friend-request') {
      const accept = this.random() < BOT_FRIEND_ACCEPT;
      this.later(BOT_FRIEND_REPLY_MS * (1 + this.random()), () => void this.hub.answerBotFriendRequest(botId, message.request.id, accept));
      return;
    }
    if (message.type === 'party-state') return this.partyChanged(botId, message.party);
    if (message.type === 'notice' && message.code === 'invite-declined') {
      const player = this.social.answered(botId, false);
      if (player) this.answerTo(botId, player, 'later', null);
      return;
    }
    if (message.type === 'voice-state') return this.voiceState(botId, message.channel);
    if (message.type === 'voice-speaking') return this.voiceSpeaking(botId, message.id, message.on);
  }

  /**
   * Its party's voice changed. Every bot of the party hears it; the first one to hear a change acts for them all (the
   * others find nothing new): a player who came in is greeted by one bot.
   */
  private voiceState(botId: string, channel: VoiceChannel | null): void {
    const partyId = this.hub.parties.partyOf(botId)?.id;
    if (!partyId) return;
    const players = new Set((channel?.members ?? []).filter((m) => !m.isBot).map((m) => m.id));
    let talk = this.talks.get(partyId);
    if (players.size === 0) {
      if (talk?.timer) clearTimeout(talk.timer);
      this.talks.delete(partyId);
      return;
    }
    if (!talk) {
      // Only voices with players in them are followed: a crowded server forgets the oldest rather than growing.
      if (this.talks.size >= MAX_TALKS) {
        for (const old of this.talks.values()) if (old.timer) clearTimeout(old.timer);
        this.talks.clear();
      }
      talk = { players: new Set(), speaking: new Map(), timer: null, lastLineAt: Number.NEGATIVE_INFINITY, spoke: new Map() };
      this.talks.set(partyId, talk);
    }
    const newcomer = [...players].some((p) => !talk.players.has(p));
    talk.players = players;
    for (const id of talk.speaking.keys()) if (!players.has(id)) talk.speaking.delete(id);
    if (newcomer && !talk.timer) this.voiceTurn(partyId, talk, 'hello', BOT_VOICE_HELLO_MS);
  }

  /**
   * A player in its party's voice started or stopped talking. The bots never talk over her: a line about to be said
   * waits; when she stops, one bot answers after a moment with a line fitting how long she talked (never what she
   * said: the sound never reaches the server).
   */
  private voiceSpeaking(botId: string, playerId: string, on: boolean): void {
    const partyId = this.hub.parties.partyOf(botId)?.id;
    const talk = partyId ? this.talks.get(partyId) : undefined;
    if (!partyId || !talk) return;
    const now = Date.now();
    if (on) {
      talk.speaking.set(playerId, now);
      if (talk.timer) clearTimeout(talk.timer);
      talk.timer = null;
      return;
    }
    const started = talk.speaking.get(playerId);
    if (started === undefined) return;
    talk.speaking.delete(playerId);
    if (talk.timer) return;
    const ms = now - started;
    const key: VoiceBotLineKey = ms < SHORT_TURN_MS ? 'yes' : ms < LONG_TURN_MS ? 'wow' : 'more';
    this.voiceTurn(partyId, talk, key, BOT_VOICE_REPLY_MS * (1 + this.random()));
  }

  private voiceTurn(partyId: string, talk: VoiceTalk, key: VoiceBotLineKey, ms: number): void {
    talk.timer = setTimeout(() => {
      talk.timer = null;
      this.voiceLine(partyId, talk, key);
    }, ms);
  }

  /** One bot of the party says its line: the one who spoke least lately, as often as its persona talks. */
  private voiceLine(partyId: string, talk: VoiceTalk, key: VoiceBotLineKey): void {
    const anyone = [...talk.players][0];
    const party = anyone ? this.hub.parties.partyOf(anyone) : null;
    if (party?.id !== partyId) {
      this.talks.delete(partyId);
      return;
    }
    const now = Date.now();
    // Someone talks again, or a bot just spoke: the players' turn.
    if (talk.speaking.size > 0 || now - talk.lastLineAt < BOT_VOICE_GAP_MS) return;
    const bots = party.members.filter((m) => m.startsWith('bot-')).sort((a, b) => (talk.spoke.get(a) ?? 0) - (talk.spoke.get(b) ?? 0));
    const bot = bots[0];
    if (!bot) return;
    if (key !== 'hello' && this.random() >= talkChance(personaOf(bot))) return;
    talk.lastLineAt = now;
    talk.spoke.set(bot, now);
    this.hub.voiceBotSay(bot, { key, variant: this.voiceVariant(bot, key) });
  }

  /** A line of its own voice (every `VOICES`-th variant from its offset), never the one it said last. */
  private voiceVariant(botId: string, key: VoiceBotLineKey): number {
    const id = `${botProfileId(botId)}:${key}`;
    let picker = this.voiceLines.get(id);
    if (!picker) {
      const voice = personaOf(botId).voice;
      picker = freshPicker(
        Array.from({ length: VOICE_BOT_LINE_VARIANTS }, (_, i) => i).filter((i) => i % VOICES === voice),
        this.random,
      );
      this.voiceLines.set(id, picker);
    }
    return picker.next();
  }
}
