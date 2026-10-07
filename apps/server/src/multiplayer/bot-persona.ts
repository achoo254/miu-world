// Every companion bot is its own player (owner, 05/10/2026: "bot máy sẽ giống người chơi lúc này lúc khác"): a persona
// drawn once from its id (the same bot is always the same character), skills that grow as it plays, a mood that
// follows the hour and the day, and tiredness over a challenge. Together they make it quick and sharp one moment and
// slipping the next. It learns only from its own answers and from anonymous numbers per question (how many players
// get it right, how long they take), never from what any one player did. Pure: no clock, no database.

/** The bot itself behind an instance id (`<bot>@<home>`, `<bot>@<challenge>`): the persona belongs to the bot. */
const botProfileId = (id: string): string => id.split('@')[0] ?? id;

export const SUBJECTS = ['toan', 'tieng-viet'] as const;
export type BotSubject = (typeof SUBJECTS)[number];

export interface BotPersona {
  /** The subject it is good at, and the one it finds harder. */
  strong: BotSubject;
  weak: BotSubject;
  /** How long it takes over a question, against the players' usual time (0.6 quick … 1.6 slow). */
  speed: number;
  /** Careful (1: slower, steadier) or hasty (0: quick, more slips). */
  care: number;
  /** How often it says something after a move (0 quiet … 1 chatty). */
  chat: number;
  /** The hour (Vietnam time) it is at its best, and how much its mood swings over the day. */
  peakHour: number;
  swing: number;
  /** Which of the bots' lines it uses (two bots of one team never share a voice). */
  voice: number;
  /** How far it sees around itself (blocks): the places and players it can notice, and the stretch it plans a way over. */
  sight: number;
  /** Its walking pace (blocks per second). */
  walk: number;
  /** How curious it is (0 … 1): a curious bot explores more and picks less surely among what it knows. */
  curious: number;
}

/** The range of a bot's sight and walking pace (blocks, blocks per second). */
export const SIGHT_MIN = 16;
export const SIGHT_MAX = 28;
export const WALK_MIN = 2.4;
export const WALK_MAX = 3.6;

/** Voices of the bots' lines: a voice uses every `VOICES`-th variant of each line, from its own offset. */
export const VOICES = 3;

/** A 32-bit hash of a string (FNV-1a). */
export function hashOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A seeded generator (mulberry32): the same seed always gives the same numbers. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The persona of a bot, the same wherever it plays (a bot standing in a home is still that bot). */
export function personaOf(botId: string): BotPersona {
  const rng = seeded(hashOf(`persona:${botProfileId(botId)}`));
  const strong = rng() < 0.5 ? 'toan' : 'tieng-viet';
  return {
    strong,
    weak: strong === 'toan' ? 'tieng-viet' : 'toan',
    speed: round2(0.6 + rng()),
    care: round2(rng()),
    chat: round2(0.15 + 0.8 * rng()),
    peakHour: 7 + Math.floor(rng() * 14),
    swing: round2(0.04 + 0.11 * rng()),
    voice: Math.floor(rng() * VOICES),
    // Drawn from streams of their own, so the traits above stay what they were before a bot had a body or a mind.
    ...bodyOf(botId),
    curious: round2(seeded(hashOf(`mind:${botProfileId(botId)}`))()),
  };
}

function bodyOf(botId: string): Pick<BotPersona, 'sight' | 'walk'> {
  const rng = seeded(hashOf(`body:${botProfileId(botId)}`));
  return {
    sight: SIGHT_MIN + Math.floor(rng() * (SIGHT_MAX - SIGHT_MIN + 1)),
    walk: round2(WALK_MIN + (WALK_MAX - WALK_MIN) * rng()),
  };
}

/** Hour of day in Vietnam (UTC+7), with minutes as a fraction. */
const vietnamHour = (at: Date): number => ((at.getUTCHours() + 7) % 24) + at.getUTCMinutes() / 60;
const vietnamDay = (at: Date): string => new Date(at.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

/** Its mood now: best at its peak hour, low at the opposite hour, and a little up or down from one day to the next. */
export function moodAt(botId: string, persona: BotPersona, at: Date): number {
  const hour = vietnamHour(at);
  const curve = persona.swing * Math.cos((2 * Math.PI * (hour - persona.peakHour)) / 24);
  const day = seeded(hashOf(`mood:${botProfileId(botId)}:${vietnamDay(at)}`))() - 0.5;
  return round2(curve + 0.1 * day);
}

/** Tiredness after `answers` answers in one challenge. */
export const fatigueAfter = (answers: number): number => Math.min(0.15, answers * 0.012);

/** Level of a skill from the bot's own XP in it (1 … 10), as it grows with play. */
export const botSkillLevel = (xp: number): number => Math.min(10, 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 15)));
/** XP a bot gets from one of its own answers: more for a right one. */
export const botAnswerXp = (right: boolean): number => (right ? 6 : 2);

/** What a bot knows of one question: its skill and subject, and the players' anonymous numbers for it. */
export interface QuestionInfo {
  skill: string;
  subject: string | null;
  /** Share of answers that were wrong (0 … 1); a question nobody answered yet counts as middling. */
  difficulty: number;
  /** The players' median answer time (ms). */
  medianMs: number;
}

export interface Bounds {
  min: number;
  max: number;
}

/** The chance it answers right now: its skill level, the question, the subject, its care, mood and tiredness. */
export function rightChance(persona: BotPersona, info: QuestionInfo, level: number, mood: number, fatigue: number, bounds: Bounds): number {
  const subject = info.subject === persona.strong ? 0.08 : info.subject === persona.weak ? -0.08 : 0;
  const raw = 0.5 + 0.045 * (level - 1) + subject + 0.12 * (persona.care - 0.5) - 0.3 * (info.difficulty - 0.35) + mood - fatigue;
  return Math.min(bounds.max, Math.max(bounds.min, raw));
}

/** How long it thinks before answering (ms): the players' usual time, its speed, its care, its tiredness, a little chance. */
export function thinkMs(persona: BotPersona, info: QuestionInfo, fatigue: number, chance: number): number {
  const ms = info.medianMs * persona.speed * (0.75 + 0.5 * persona.care) * (1 + fatigue) * (0.8 + 0.4 * chance);
  return Math.round(Math.min(15_000, Math.max(1_200, ms)));
}

/** The pitch band of each of the bots' voices (`BotPersona.voice`): two bots of one team never share one. */
const VOICE_PITCH = [0.8, 1.15, 1.5] as const;

/**
 * The synthesized voice a bot speaks with in a voice channel: its pitch from its voice (a little of its own within
 * the band), its rate from its speed (a quick bot talks a little faster).
 */
export function botVoice(botId: string): { pitch: number; rate: number } {
  const persona = personaOf(botId);
  const jitter = seeded(hashOf(`voice:${botProfileId(botId)}`))() - 0.5;
  return {
    pitch: round2((VOICE_PITCH[persona.voice] ?? 1) + 0.12 * jitter),
    rate: round2(Math.min(1.25, Math.max(0.85, 1.25 - 0.35 * (persona.speed - 0.6)))),
  };
}

/** Voices close enough to sound alike. */
const ALIKE_PITCH = 0.2;

/**
 * The voices of the bots in one channel, in order, none sounding like another: a bot whose pitch comes close to
 * one already given is moved to the free band farthest from the others.
 */
export function distinctVoices(botIds: readonly string[]): Map<string, { pitch: number; rate: number }> {
  const out = new Map<string, { pitch: number; rate: number }>();
  for (const id of botIds) {
    const voice = botVoice(id);
    const taken = [...out.values()].map((v) => v.pitch);
    const nearest = (pitch: number): number => Math.min(...taken.map((p) => Math.abs(p - pitch)));
    if (taken.length > 0 && nearest(voice.pitch) < ALIKE_PITCH) {
      let far = voice.pitch;
      for (const band of [...VOICE_PITCH, 0.6, 1.8]) if (nearest(band) > nearest(far)) far = band;
      voice.pitch = far;
    }
    out.set(id, voice);
  }
  return out;
}
