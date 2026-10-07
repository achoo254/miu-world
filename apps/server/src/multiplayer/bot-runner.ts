// Bot Runner (Master Plan §8b, Jev 03/10/2026).
// Runs companion bots across game maps, each one like a player of its own: it walks the map on its own feet (no
// route given, nobody followed), sees only what is around it, finds its way over what it sees, and decides where
// to go next by what it learnt (bot-brain/): the places it found, the ways it walked, the map's quests it plays on
// its own (its name tag shows the quest mark), a player it sees and chooses to go and meet. It waves and says hello
// when a player comes up to it, visits friends, answers invites and plays co-op challenges. What it learnt of each
// map is kept in the database (bot-brain/memory-keeper.ts), so it goes on learning after a restart. All bots are
// clearly labeled "[Bạn máy]".
import {
  HOME_MAP_ID,
  SAFE_CANNED_CHATS,
  type PlayerPresence,
  type ServerWsMessage,
} from '@miu/schema/multiplayer';
import { COOP_BOT_LINE_VARIANTS, type CoopAction, type CoopBotLine, type CoopBotLineKey, type CoopStateView, type CoopTaskView } from '@miu/schema/coop';
import { VOICE_BOT_LINE_VARIANTS, type VoiceBotLineKey, type VoiceChannel } from '@miu/schema/voice';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import type { CoopBotDriver, CoopBotMoves } from '../coop/coop-service';
import { botAnswerXp, botSkillLevel, fatigueAfter, moodAt, personaOf, rightChance, thinkMs, VOICES, type Bounds } from './bot-persona';
import { BOT_MAP_CONFIGS, findBot, HOME_SNAP, type BotProfile } from './bot-profiles';
import type { BotStore } from './bot-store';
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
/** Meeting the same player this many times, a companion bot may ask her to be friends (once per server run). */
const BOT_ASKS_AFTER_GREETS = 2;
const BOT_ASK_CHANCE = 0.5;
const MAX_GREET_PAIRS = 10_000;
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

/** What a bot asks of its runner: the hub's messages, meeting a player, and its friends in the room. */
interface BotHooks {
  onMessage(message: ServerWsMessage): void;
  /** It greeted a player (by public id). */
  onGreet(playerId: string): void;
  /** Public ids of the players in its room who are friends with it. */
  friendsHere(): readonly string[];
  random(): number;
  /** Whether it may walk yet (what it learnt before is still being read). */
  awake(): boolean;
}

const NO_HOOKS: BotHooks = { onMessage: () => {}, onGreet: () => {}, friendsHere: () => [], random: Math.random, awake: () => true };

/** A player this close (blocks) is greeted. */
const GREET_RANGE = 4.5;
const GREET_GAP_MS = 15_000;
const GREET_S = 3.5;

class CompanionBotInstance {
  readonly profile: BotProfile;
  readonly room: MultiplayerRoom;
  readonly presence: PlayerPresence;
  /** Its feet on the map and its mind (null: the map has no walk grid, and it stays at its home). */
  readonly body: BotBody | null;
  readonly brain: Brain | null;
  private greetLeft = 0;
  private lastGreetTime = 0;
  private readonly hooks: BotHooks;
  private readonly walkSpeed: number;

  constructor(profile: BotProfile, room: MultiplayerRoom, body: BotBody | null, brain: Brain | null, hooks: Partial<BotHooks> = {}) {
    this.profile = profile;
    this.room = room;
    this.body = body;
    this.brain = brain;
    this.hooks = { ...NO_HOOKS, ...hooks };
    this.walkSpeed = personaOf(profile.id).walk;
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

  /** A player came up to it: it turns to her, waves and says hello (not again for a while). */
  private greet(now: number): boolean {
    if (now - this.lastGreetTime <= GREET_GAP_MS) return false;
    const player = seePlayers(this.room, this.presence.id, this.presence, GREET_RANGE)[0];
    if (!player) return false;
    this.greetLeft = GREET_S;
    this.lastGreetTime = now;
    this.presence.yaw = Math.atan2(player.presence.x - this.presence.x, player.presence.z - this.presence.z);
    this.presence.speed = 0;
    this.presence.action = 'wave';
    this.room.updatePresence(this.presence.id, { x: this.presence.x, y: this.presence.y, z: this.presence.z, yaw: this.presence.yaw, speed: 0, action: 'wave' });
    this.room.broadcastEmote(this.presence.id, 'wave');
    // A greeting, never the nudge towards a quest's hints (that one is for a party at a question).
    const greetings = SAFE_CANNED_CHATS.filter((line) => line !== 'Thử bấm Gợi ý xem!');
    const chatChoice = greetings[Math.floor(this.hooks.random() * greetings.length)] ?? 'Xin chào bạn!';
    this.room.broadcastChat(this.presence.id, chatChoice);
    this.hooks.onGreet(player.id);
    return true;
  }

  tick(dt: number): void {
    if (this.greetLeft > 0) {
      this.greetLeft -= dt;
      return;
    }
    if (this.greet(Date.now())) return;
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
    const speed = moving ? this.walkSpeed : 0;
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
  /** Answers on their way (a bot takes a moment, as a player would). */
  private readonly replies = new Set<NodeJS.Timeout>();
  /** Greetings per bot and player, and the pairs a bot already asked to be friends. */
  private readonly greets = new Map<string, number>();
  private readonly asked = new Set<string>();
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

  /** Its answer: right as often as its skill, the question, its mood and tiredness make it; it learns from it. */
  private async coopAnswer(botId: string, task: CoopTaskView, turn: CoopTurn): Promise<{ action: CoopAction; right: boolean }> {
    const right = turn.moves.answerOf(task.id);
    const info = turn.moves.question(task.id);
    const persona = personaOf(botId);
    const skills = await this.skillsOf(botId);
    const level = botSkillLevel(info ? (skills[info.skill] ?? 0) : 0);
    const chance = info ? rightChance(persona, info, level, moodAt(botId, persona, this.clock()), fatigueAfter(turn.answers), this.bounds) : this.bounds.max;
    const others = task.choices.filter((c) => c.id !== right);
    const wrong = others[Math.floor(this.random() * others.length)];
    const isRight = right !== null && (this.random() < chance || !wrong);
    turn.answers += 1;
    if (info) {
      // It learns from its own answer only (more from a right one), kept for the next challenge.
      const gained = botAnswerXp(isRight);
      skills[info.skill] = (skills[info.skill] ?? 0) + gained;
      void this.store?.addSkillXp(botProfileId(botId), info.skill, gained).catch((err: unknown) => {
        console.error('bot skill failed', err instanceof Error ? err.name : typeof err);
      });
    }
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
            now: () => Date.now(),
            planner: this.planner,
            requestPlan: (run) => this.plans.request(`${key}|way`, run),
            players: (at, sight) =>
              seePlayers(room, profile.id, { x: at.x + 0.5, z: at.z + 0.5 }, sight).map((m): SeenPlayer => ({ id: m.id, x: m.presence.x, y: m.presence.y, z: m.presence.z })),
            events: {
              doing: () => inst?.showDoing(),
              gesture: (emote) => inst?.gesture(emote),
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
            now: () => Date.now(),
          })
        : null;
    inst = new CompanionBotInstance(profile, room, body, brain, {
      // A player who comes in learns what quest it is on.
      onMessage: (message) => (message.type === 'spawn' ? inst?.welcome(message.player) : this.heard(profile.id, message)),
      onGreet: (playerId) => this.greeted(profile.id, playerId),
      friendsHere: () => this.hub.friendsOfBot(botProfileId(profile.id)).filter((id) => room.members.has(id)),
      random: this.random,
      awake: () => this.memories?.ready(key) ?? true,
    });
    if (map && brain) this.memories?.attach({ key, botId: botProfileId(profile.id), mapId: room.mapId, map, brain, shared: room.host !== null });
    return inst;
  }

  start(): void {
    // Populate companion bots for configured maps; each home gets its own while a player is in it.
    for (const [mapId, profiles] of Object.entries(BOT_MAP_CONFIGS)) {
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
      },
    });

    // Run tick loop at 10Hz (100ms)
    this.lastTick = Date.now();
    this.timer = setInterval(() => this.tick(), 100);
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
    const neighbours = BOT_MAP_CONFIGS[HOME_MAP_ID] ?? [];
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

  /** Moves every bot on by the time since the last tick (at most a fifth of a second, after a stall), then plans. */
  tick(): void {
    const now = Date.now();
    const dt = Math.min((now - this.lastTick) / 1000, 0.2);
    this.lastTick = now;
    for (const list of this.bots.values()) {
      for (const bot of list) {
        bot.tick(dt);
      }
    }
    this.plans.drain();
    this.memories?.tick();
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
    for (const talk of this.talks.values()) if (talk.timer) clearTimeout(talk.timer);
    this.talks.clear();
    this.plans.clear();
  }

  private later(ms: number, run: () => void): void {
    const reply = setTimeout(() => {
      this.replies.delete(reply);
      run();
    }, ms);
    this.replies.add(reply);
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
      if (this.talks.size >= MAX_GREET_PAIRS) {
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
    if (key !== 'hello' && this.random() >= 0.35 + 0.6 * personaOf(bot).chat) return;
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

  /** Meeting a player again and again, a bot may ask her to be friends (once). */
  private greeted(botId: string, playerId: string): void {
    const pair = `${botId}>${playerId}`;
    if (this.asked.has(pair)) return;
    const count = (this.greets.get(pair) ?? 0) + 1;
    // Only a memory of who met whom: a crowded server forgets it rather than growing without end.
    if (this.greets.size >= MAX_GREET_PAIRS) this.greets.clear();
    this.greets.set(pair, count);
    if (count < BOT_ASKS_AFTER_GREETS || this.random() >= BOT_ASK_CHANCE) return;
    // A record of asks, not a log: a crowded server forgets it (at worst a bot asks again).
    if (this.asked.size >= MAX_GREET_PAIRS) this.asked.clear();
    this.asked.add(pair);
    this.greets.delete(pair);
    void this.hub.botFriendRequest(botId, playerId);
  }
}
