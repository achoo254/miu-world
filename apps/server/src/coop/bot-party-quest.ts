// A companion bot in a party's quest (owner 07/10/2026: bots "lập tổ đội làm nhiệm vụ… mô phỏng giống người chơi").
// It plays its own part, as a player of the party would: on the steps the party shares (talking, searching, reading)
// it heads for the step's place by what it learnt of the map, and moves on once a player has done it (it follows,
// never goes first); a question it answers itself, never one past the furthest player, after thinking as long as its
// persona does (4 to 12 s), right as often as its skill, mood and tiredness make it, and right at the latest on its
// third try; at a team boss it strikes on its turn, its right blows counting for the whole party. What it does lives
// in memory only (party-quest.ts): it never records a step of anyone's and is never paid.
import { stepTargets, type ActiveQuest } from '@miu/schema/content';
import type { QuestionInfo } from '../multiplayer/bot-persona';
import type { SharedGoal } from '../multiplayer/bot-brain/brain';
import type { QuestBook } from '../multiplayer/bot-brain/quest-plan';
import { isQuestionStep } from './party-quest';

/** However quick or slow, a bot thinks over a question at least this long… */
export const BOT_QUEST_THINK_MIN_MS = 4_000;
/** …and at most this long. */
export const BOT_QUEST_THINK_MAX_MS = 12_000;
/** After a wrong answer it tries again this long later (and up to this much more). */
export const BOT_QUEST_RETRY_MS = 2_000;
export const BOT_QUEST_RETRY_SPREAD_MS = 3_000;
/** Wrong answers to one question at most: the next try is right. */
export const BOT_QUEST_MAX_WRONG = 2;

/** The party's quest as a bot in it sees it now. */
export interface PartyQuestBotSituation {
  readonly quest: ActiveQuest;
  /** The furthest step any player of the run has reached (its index): the bot answers nothing past it. */
  readonly front: number;
  /** Its own steps done in this run. */
  readonly done: ReadonlySet<string>;
  /** The boss blow that is its to strike now (null: none). */
  readonly blow: { readonly stepId: string; readonly turnId: string } | null;
}

/** What a bot may do in a party's quest; the service checks every move against the run as it is then. */
export interface PartyQuestBotMoves {
  /** It answered its next question right. */
  done(stepId: string): void;
  /** It landed its boss blow. */
  blow(stepId: string, turnId: string): void;
  /** What it knows of a question (a boss's: of the turn): its skill and subject (null: no skill to it). */
  question(stepId: string, turnId?: string): QuestionInfo | null;
}

/** How companion bots play the party quests they are in (the bot runner provides it). */
export interface PartyQuestBotDriver {
  /** The run as the bot sees it now (after every change): it goes on with its part. */
  play(botId: string, situation: PartyQuestBotSituation, moves: PartyQuestBotMoves): void;
  /** The players (public ids) finished quest `questId` in a run the bot played with them (told once a run). */
  finished(botId: string, questId: string, players: readonly string[]): void;
  /** Out of the run (it ended, or the bot left it): it forgets what it was about to do. */
  forget(botIds: readonly string[]): void;
}

/** The quest a bot asks the party to play (Jev D7 `random`): any quest bots play on the map, each as likely (null: none). */
export function chooseBotPartyQuest(book: QuestBook, mapId: string, now: Date, random: () => number): string | null {
  const quests = book.questsOn(mapId, now);
  if (quests.length === 0) return null;
  return quests[Math.min(quests.length - 1, Math.floor(random() * quests.length))]?.id ?? null;
}

export interface BotPartyQuestPlayerOptions {
  random: () => number;
  /** How long it would think over a question (ms; held within the bounds above) after `answers` answers in the run. */
  thinkMs(botId: string, info: QuestionInfo | null, answers: number): number;
  /** The chance its answer is right now (its persona, skill, mood and tiredness). */
  chance(botId: string, info: QuestionInfo | null, answers: number): Promise<number>;
  /** It learns from its own answer. */
  learnt(botId: string, info: QuestionInfo | null, right: boolean): void;
  /** Its party's goal for its mind (null: back to its own quest). */
  share(botId: string, goal: SharedGoal | null): void;
  finished(botId: string, questId: string, players: readonly string[]): void;
  /** Its part in a run is over (the players finished it, or it ended). */
  ended(botId: string): void;
}

interface Playing {
  situation: PartyQuestBotSituation;
  moves: PartyQuestBotMoves;
  /** The goal it was given last (`<quest>|<step>`). */
  goal: string | null;
  /** What it is thinking over (`<step>` or `<step>|<turn>`), and the timer of its answer. */
  thinking: string | null;
  timer: NodeJS.Timeout | null;
  wrongs: number;
  answers: number;
}

/** A question in front of the bot: a step it answers, or a boss blow. */
interface Question {
  key: string;
  stepId: string;
  turnId: string | null;
}

export class BotPartyQuestPlayer implements PartyQuestBotDriver {
  private readonly options: BotPartyQuestPlayerOptions;
  private readonly playing = new Map<string, Playing>();

  constructor(options: BotPartyQuestPlayerOptions) {
    this.options = options;
  }

  /** Whether the bot plays a party's quest now. */
  plays(botId: string): boolean {
    return this.playing.has(botId);
  }

  play(botId: string, situation: PartyQuestBotSituation, moves: PartyQuestBotMoves): void {
    // Every step of it done: its part of the run is over.
    if (situation.quest.steps.every((s) => situation.done.has(s.id))) {
      if (this.over(botId)) this.options.ended(botId);
      return;
    }
    let turn = this.playing.get(botId);
    if (turn && turn.situation.quest.id !== situation.quest.id) {
      this.drop(turn);
      turn = undefined;
    }
    if (!turn) {
      turn = { situation, moves, goal: null, thinking: null, timer: null, wrongs: 0, answers: 0 };
      this.playing.set(botId, turn);
    }
    turn.situation = situation;
    turn.moves = moves;
    this.goOn(botId, turn);
  }

  /** The players finished the run: it is over for the bot too, whatever it still had to do. */
  finished(botId: string, questId: string, players: readonly string[]): void {
    this.options.finished(botId, questId, players);
    if (this.over(botId)) this.options.ended(botId);
  }

  forget(botIds: readonly string[]): void {
    for (const id of botIds) {
      this.over(id);
      // Told even when the run ended before the bot saw it.
      this.options.ended(id);
    }
  }

  /** It stops playing a run (true: it was playing one), back to its own quest. */
  private over(botId: string): boolean {
    const turn = this.playing.get(botId);
    if (!turn) return false;
    this.drop(turn);
    this.playing.delete(botId);
    this.options.share(botId, null);
    return true;
  }

  /** Every bot stops at once (the runner stops). */
  stop(): void {
    for (const turn of this.playing.values()) this.drop(turn);
    this.playing.clear();
  }

  private drop(turn: Playing): void {
    if (turn.timer) clearTimeout(turn.timer);
    turn.timer = null;
    turn.thinking = null;
  }

  /** Its next step: it heads for the step's places, and thinks over a question that is its to answer now. */
  private goOn(botId: string, turn: Playing): void {
    const { quest, done } = turn.situation;
    const next = quest.steps.find((s) => !done.has(s.id));
    if (!next) return;
    const goal = `${quest.id}|${next.id}`;
    if (turn.goal !== goal) {
      turn.goal = goal;
      this.options.share(botId, { quest: quest.id, targets: stepTargets(next) });
    }
    const question = this.questionOf(turn);
    if (question?.key === turn.thinking) return;
    this.drop(turn);
    if (!question) return;
    turn.thinking = question.key;
    turn.wrongs = 0;
    const info = turn.moves.question(question.stepId, question.turnId ?? undefined);
    const ms = Math.min(BOT_QUEST_THINK_MAX_MS, Math.max(BOT_QUEST_THINK_MIN_MS, this.options.thinkMs(botId, info, turn.answers)));
    this.answerIn(botId, turn, ms);
  }

  /** The question it may answer now: its next step when that is a question the players reached, or its boss blow. */
  private questionOf(turn: Playing): Question | null {
    const { quest, done, front, blow } = turn.situation;
    const index = quest.steps.findIndex((s) => !done.has(s.id));
    const step = quest.steps[index];
    if (!step) return null;
    if (step.kind === 'boss') return blow?.stepId === step.id ? { key: `${step.id}|${blow.turnId}`, stepId: step.id, turnId: blow.turnId } : null;
    return isQuestionStep(step) && index <= front ? { key: step.id, stepId: step.id, turnId: null } : null;
  }

  private answerIn(botId: string, turn: Playing, ms: number): void {
    turn.timer = setTimeout(() => {
      turn.timer = null;
      void this.answer(botId, turn).catch((err: unknown) => {
        console.error('bot party quest answer failed', err instanceof Error ? err.name : typeof err);
      });
    }, ms);
  }

  /** It answers what it thought over, if that is still in front of it: right, or wrong and a try again soon. */
  private async answer(botId: string, turn: Playing): Promise<void> {
    const question = this.questionOf(turn);
    if (this.playing.get(botId) !== turn || !question || question.key !== turn.thinking) return;
    const info = turn.moves.question(question.stepId, question.turnId ?? undefined);
    const chance = await this.options.chance(botId, info, turn.answers);
    // Still the same question once its skill is read (the run may have moved on meanwhile).
    if (this.playing.get(botId) !== turn || turn.thinking !== question.key) return;
    const right = this.options.random() < chance || turn.wrongs >= BOT_QUEST_MAX_WRONG;
    turn.answers += 1;
    this.options.learnt(botId, info, right);
    if (!right) {
      turn.wrongs += 1;
      this.answerIn(botId, turn, BOT_QUEST_RETRY_MS + BOT_QUEST_RETRY_SPREAD_MS * this.options.random());
      return;
    }
    turn.thinking = null;
    if (question.turnId === null) turn.moves.done(question.stepId);
    else turn.moves.blow(question.stepId, question.turnId);
  }
}
