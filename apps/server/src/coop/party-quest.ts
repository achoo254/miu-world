// Any quest played by a party (owner, 05/10/2026; Jev: each member answers her own questions, each member's own
// progress moves). Built on the quest engine itself: every member plays the quest on her own screen through the step
// route, with her own progress and her own run, paid by the server like any run. This service only decides how the
// party moves together:
// - shared steps (talking, searching, finding, speaking, the worksheet): one member doing it moves every member on;
// - questions (any step with an answer, a decision, a challenge, a minigame): each member answers on her own screen,
//   and nobody goes past it until every member has;
// - a boss is a team boss: one HP for the party (every member's right blows count for all), the blows taken in turn.
// A member who finished the quest before plays a replay run. Leaving, a party change or a block takes a member out;
// her own progress stays as it is, and a run with no player left in it ends. Solo play goes on unchanged.
// Companion bots of the party play as virtual members (bot-party-quest.ts): a bot in the party joins a run as it
// starts, and a bot that asked a player into its party may ask the party to play a quest of its map (`propose`). A
// bot's steps and blows live in memory only: it follows the players on shared steps, answers its own questions (the
// party waits for it as for anyone) and strikes the boss on its turn, its blows counting for the team. Nothing of a
// bot's is ever recorded or paid; each player is paid her own run exactly as she would be with players only.
import { and, eq } from 'drizzle-orm';
import { bossStateOf } from '@miu/quest/quest-progress';
import type { ActiveQuest, QuestStep } from '@miu/schema/content';
import type { StepCompleteRequest } from '@miu/schema/game';
import type { PartyQuestView } from '@miu/schema/party-quest';
import type { ClientWsMessage } from '@miu/schema/multiplayer';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { questProgress } from '../db/schema';
import { paidRuns } from '../reward/reward-ledger';
import { progressDto, questOpenAt, runFinished } from '../quest/quest-access';
import { recordStep } from '../quest/step-record';
import type { QuestionInfo } from '../multiplayer/bot-persona';
import { difficultyOf } from '../multiplayer/bot-store';
import type { PartyQuestBotDriver, PartyQuestBotMoves } from './bot-party-quest';
import type { CoopHost } from './coop-service';

/** Whether a member may record a step now: yes, the party waits for an answer first, or it is another's boss blow. */
export type PartyGate = 'ok' | 'party-waiting' | 'not-your-turn';

/** What the step route asks of a party's quest. */
export interface PartyQuestHooks {
  gate(childId: string, quest: ActiveQuest, stepId: string, input: StepCompleteRequest): Promise<PartyGate>;
  /**
   * A step of hers was recorded (`finished`: it finished her run of the quest): the party's shared steps and boss
   * blows follow for the others.
   */
  recorded(childId: string, quest: ActiveQuest, stepId: string, input: StepCompleteRequest, finished: boolean): Promise<void>;
}

/**
 * The hub as this service needs it: the co-op host, a player's public id from her profile id, who plays now, and how
 * companion bots play.
 */
export interface PartyQuestHost extends CoopHost {
  publicIdOf(childId: string): string | null;
  /** Playing now: a player connected (in a room or between maps), a companion bot standing in a room. */
  present(id: string): boolean;
  /** How companion bots play the party quests they are in (null: no bot runner). */
  bots(): PartyQuestBotDriver | null;
}

/** A bot's thinking time on a question nobody's numbers tell (party quests keep no anonymous numbers). */
const BOT_QUESTION_MEDIAN_MS = 8_000;

/** Steps one member does for all. */
const SHARED_KINDS = new Set<QuestStep['kind']>(['dialogue', 'search', 'find-object', 'speak', 'worksheet']);
export const isSharedStep = (step: QuestStep): boolean => SHARED_KINDS.has(step.kind);
/** Steps every member answers herself before the party goes on (a boss is answered together, in turns). */
export const isQuestionStep = (step: QuestStep): boolean => 'support' in step || step.kind === 'decision' || step.kind === 'challenge' || step.kind === 'boss';

/**
 * Steps a decision's branch may skip: each member walks her own branch (a member who skipped them must not push
 * another member past them, and the other way round).
 */
export function branchSteps(quest: ActiveQuest): Set<string> {
  const ids = quest.steps.map((s) => s.id);
  const out = new Set<string>();
  quest.steps.forEach((step, i) => {
    if (step.kind !== 'decision') return;
    for (const choice of step.choices) {
      const to = choice.nextStepId ? ids.indexOf(choice.nextStepId) : -1;
      for (let k = i + 1; k < to; k++) out.add(ids[k] ?? '');
    }
  });
  return out;
}

interface PlayerMember {
  kind: 'player';
  publicId: string;
  childId: string;
  /** She finished her run in this party's play (her row then reads as between runs). */
  finished: boolean;
  /** Most steps of this run seen done: a row between runs after that means she finished it here. */
  seen: number;
}

/** A companion bot playing along: its steps and blows in this run, in memory only (never recorded, never paid). */
interface BotMember {
  kind: 'bot';
  publicId: string;
  own: MemberState;
  /** Every step of its run done. */
  finished: boolean;
}

type Member = PlayerMember | BotMember;

interface Run {
  partyId: string;
  quest: ActiveQuest;
  leader: string;
  /** Members asked to play, by public id; those who said yes are `members`, in the order they joined. */
  invited: Set<string>;
  members: Map<string, Member>;
  /** Records for the party run one after another (catching members up never races another catch-up). */
  queue: Promise<void>;
  /** Its bots were told the players finished it. */
  finishTold: boolean;
}

interface MemberState {
  done: Set<string>;
  found: Record<string, string[]>;
}

export interface PartyQuestOptions {
  db: Db;
  content: ContentCatalog;
  clock?: () => Date;
  host: PartyQuestHost;
}

export class PartyQuestService implements PartyQuestHooks {
  private readonly db: Db;
  private readonly content: ContentCatalog;
  private readonly clock: () => Date;
  private readonly host: PartyQuestHost;
  private readonly runs = new Map<string, Run>();

  constructor(options: PartyQuestOptions) {
    this.db = options.db;
    this.content = options.content;
    this.clock = options.clock ?? (() => new Date());
    this.host = options.host;
  }

  /** A member's party-quest message (validated by the wire schema). */
  message(id: string, message: Extract<ClientWsMessage, { type: `party-quest-${string}` }>): void {
    switch (message.type) {
      case 'party-quest-start':
        return this.start(id, message.questId);
      case 'party-quest-join':
        return this.join(id, message.questId);
      case 'party-quest-leave':
        return this.leave(id);
    }
  }

  private playable(questId: string): ActiveQuest | null {
    const quest = this.content.quests.get(questId);
    // Lessons, story chapters, zone guardians (a team boss) and the quests of an event on now; a minigame side quest and
    // a co-op challenge have their own ways of playing.
    const kinds = quest?.status === 'active' && (quest.category === 'main' || quest.category === 'story' || quest.category === 'guardian' || quest.category === 'event');
    return kinds && questOpenAt(this.content, quest, this.clock()) ? quest : null;
  }

  private start(id: string, questId: string): void {
    const party = this.host.party(id);
    if (!party) return this.host.notice(id, 'not-here');
    if (party.leader !== id) return this.host.notice(id, 'not-leader');
    const quest = this.playable(questId);
    const child = this.host.childIdOf(id);
    if (!quest || !child) return this.host.notice(id, 'coop-unknown');
    this.open(party, quest, { kind: 'player', publicId: id, childId: child, finished: false, seen: 0 });
  }

  /**
   * Companion bot `botId` asks its party to play `questId` (its runner chose a quest of its map): player `playerId`
   * and the other players of the party are asked, the party's other bots play along. Only while the party plays no
   * quest; false when it may not.
   */
  propose(botId: string, playerId: string, questId: string): boolean {
    const party = this.host.party(botId);
    if (!party?.members.includes(playerId) || this.host.childIdOf(botId) !== null || this.host.childIdOf(playerId) === null || this.runs.has(party.id)) return false;
    const quest = this.playable(questId);
    if (!quest || !this.host.present(botId)) return false;
    this.open(party, quest, this.botMember(botId));
    return true;
  }

  /**
   * A new run of the party's quest led by `leader`: the party's other players are asked, its bots standing in a room
   * play along at once (bots always say yes). A run the party played before ends.
   */
  private open(party: { id: string; members: readonly string[] }, quest: ActiveQuest, leader: Member): void {
    const old = this.runs.get(party.id);
    const others = party.members.filter((m) => m !== leader.publicId);
    const bots = others.filter((m) => this.host.childIdOf(m) === null && this.host.present(m)).map((m) => this.botMember(m));
    const run: Run = {
      partyId: party.id,
      quest,
      leader: leader.publicId,
      invited: new Set(others.filter((m) => this.host.childIdOf(m) !== null)),
      members: new Map([leader, ...bots].map((m) => [m.publicId, m])),
      queue: Promise.resolve(),
      finishTold: false,
    };
    this.runs.set(party.id, run);
    if (old) {
      for (const m of old.invited) if (!run.invited.has(m)) this.host.send(m, { type: 'party-quest', quest: null });
      this.forgetBots(old);
    }
    void this.push(run);
  }

  private botMember(id: string): BotMember {
    return { kind: 'bot', publicId: id, own: { done: new Set(), found: {} }, finished: false };
  }

  private join(id: string, questId: string): void {
    const party = this.host.party(id);
    const run = party ? this.runs.get(party.id) : undefined;
    const child = this.host.childIdOf(id);
    if (!run || run.quest.id !== questId || !run.invited.has(id) || !child) return this.host.notice(id, 'not-here');
    run.invited.delete(id);
    run.members.set(id, { kind: 'player', publicId: id, childId: child, finished: false, seen: 0 });
    void this.push(run);
  }

  private leave(id: string): void {
    const run = this.runOfPublic(id);
    if (!run) return;
    this.drop(run, id);
  }

  /**
   * Out of the party's quest (left it, left the party, removed, blocked someone); the leader leaving ends it, and so
   * does the last player leaving it (a bot never plays on its own: her "later" to a bot's quest ends it).
   */
  private drop(run: Run, id: string): void {
    if (id === run.leader) return this.end(run);
    const member = run.members.get(id);
    run.members.delete(id);
    run.invited.delete(id);
    this.host.send(id, { type: 'party-quest', quest: null });
    if (member?.kind === 'bot') this.host.bots()?.forget([id]);
    if (!this.hasPlayer(run)) return this.end(run);
    void this.push(run);
  }

  private end(run: Run): void {
    if (this.runs.get(run.partyId) === run) this.runs.delete(run.partyId);
    for (const id of [...run.members.keys(), ...run.invited]) this.host.send(id, { type: 'party-quest', quest: null });
    this.forgetBots(run);
  }

  /** A player plays the run or is asked to. */
  private hasPlayer(run: Run): boolean {
    return [...run.members.values()].some((m) => m.kind === 'player') || run.invited.size > 0;
  }

  /** The run's bots are out of it. */
  private forgetBots(run: Run): void {
    const bots = [...run.members.values()].filter((m) => m.kind === 'bot').map((m) => m.publicId);
    if (bots.length > 0) this.host.bots()?.forget(bots);
  }

  private runOfPublic(id: string): Run | undefined {
    const party = this.host.party(id);
    const run = party ? this.runs.get(party.id) : undefined;
    return run && (run.members.has(id) || run.invited.has(id)) ? run : undefined;
  }

  private runOfChild(childId: string, questId: string): { run: Run; member: PlayerMember } | null {
    const publicId = this.host.publicIdOf(childId);
    const run = publicId ? this.runOfPublic(publicId) : undefined;
    const member = publicId ? run?.members.get(publicId) : undefined;
    return run && member?.kind === 'player' && run.quest.id === questId ? { run, member } : null;
  }

  // ---- what the hub tells ----

  /** She left her party, was removed or blocked someone in it: out of its quest. */
  leftParty(id: string): void {
    for (const run of this.runs.values()) if (run.members.has(id) || run.invited.has(id)) this.drop(run, id);
  }

  /**
   * Parties changed: a quest whose leader's party is gone ends; a member no longer in the party (left, removed, or
   * let go after dropping out) is out of its quest; a player who joined the party since is asked too.
   */
  partyChanged(ids: readonly string[]): void {
    for (const run of [...this.runs.values()]) {
      const party = this.host.party(run.leader);
      if (party?.id !== run.partyId) {
        this.end(run);
        continue;
      }
      for (const id of [...run.members.keys(), ...run.invited]) if (!party.members.includes(id)) this.drop(run, id);
      if (this.runs.get(run.partyId) !== run) continue;
      // A player who joined the party since is asked too; a bot plays only the runs it was in from their start.
      for (const id of party.members) if (!run.members.has(id) && !run.invited.has(id) && this.host.childIdOf(id) !== null) run.invited.add(id);
      if (ids.some((id) => party.members.includes(id))) void this.push(run);
    }
  }

  /** In a room again: she gets her party's quest. */
  back(id: string): void {
    const run = this.runOfPublic(id);
    if (run) void this.push(run);
  }

  /** She plays a quest on her own while in a party: its bots hear of it (one about to leave stays while she plays). */
  private playedAlone(childId: string, finished: boolean): void {
    const publicId = this.host.publicIdOf(childId);
    if (publicId && this.host.party(publicId)) this.host.bots()?.playedAlone(publicId, finished);
  }

  // ---- progress ----

  /** Her steps done in her current run, and what her searches and boss found (a bot's: kept in memory). */
  private async state(run: Run, member: Member): Promise<MemberState> {
    if (member.kind === 'bot') return member.own;
    const [row] = await this.db
      .select({ completedSteps: questProgress.completedSteps, completedAt: questProgress.completedAt, found: questProgress.found })
      .from(questProgress)
      .where(and(eq(questProgress.childId, member.childId), eq(questProgress.questId, run.quest.id)));
    if (!row) return { done: new Set(), found: {} };
    // Between two runs: she finished this run with the party (all done), or her replay has not started yet.
    if (runFinished(row, run.quest)) {
      if (member.seen > 0) member.finished = true;
      return member.finished ? { done: new Set(row.completedSteps), found: row.found } : { done: new Set(), found: {} };
    }
    member.seen = Math.max(member.seen, row.completedSteps.length);
    return { done: new Set(row.completedSteps), found: row.found };
  }

  private async states(run: Run): Promise<Map<string, MemberState>> {
    const out = new Map<string, MemberState>();
    for (const member of run.members.values()) out.set(member.publicId, await this.state(run, member));
    return out;
  }

  /** At a boss: the blows the party has landed, and the member whose blow is next. */
  private bossTurn(run: Run, step: Extract<QuestStep, { kind: 'boss' }>, states: Map<string, MemberState>): { landed: Set<string>; owner: string | null } {
    const landed = new Set([...states.values()].flatMap((s) => s.found[step.id] ?? []));
    // Blows go round the members playing now: one who dropped out takes no turn until she is back.
    const order = [...run.members.keys()].filter((id) => this.host.present(id));
    return { landed, owner: order.length > 0 ? (order[landed.size % order.length] ?? null) : null };
  }

  async gate(childId: string, quest: ActiveQuest, stepId: string, input: StepCompleteRequest): Promise<PartyGate> {
    const found = this.runOfChild(childId, quest.id);
    if (!found) this.playedAlone(childId, false);
    if (!found || found.run.members.size < 2) return 'ok';
    const { run, member } = found;
    const index = quest.steps.findIndex((s) => s.id === stepId);
    const step = quest.steps[index];
    if (!step) return 'ok';
    const states = await this.states(run);
    if (step.kind === 'boss' && input.answer && 'turnId' in input.answer) {
      const { owner } = this.bossTurn(run, step, states);
      if (owner !== null && owner !== member.publicId) return 'not-your-turn';
    }
    // Nobody goes past a question until every member has answered it.
    for (const [id, other] of states) {
      if (id === member.publicId) continue;
      const otherMember = run.members.get(id);
      // A member who finished her run, or dropped out, holds nobody back.
      if (otherMember?.finished || !this.host.present(id)) continue;
      for (const earlier of quest.steps.slice(0, Math.max(0, index))) if (isQuestionStep(earlier) && !other.done.has(earlier.id)) return 'party-waiting';
    }
    return 'ok';
  }

  async recorded(childId: string, quest: ActiveQuest, _stepId: string, _input: StepCompleteRequest, finished: boolean): Promise<void> {
    const found = this.runOfChild(childId, quest.id);
    if (!found) {
      if (finished) this.playedAlone(childId, true);
      return;
    }
    const { run } = found;
    run.queue = run.queue.then(() => this.catchUp(run)).catch((err: unknown) => {
      console.error('party quest catch-up failed', err instanceof Error ? err.name : typeof err);
    });
    await run.queue;
  }

  /**
   * Moves every member on through what the party already did for her: a shared step another member did (with the
   * targets that member found), and the boss blows the party landed. Stops at anything she answers herself.
   */
  private async catchUp(run: Run): Promise<void> {
    const steps = run.quest.steps;
    const ownBranch = branchSteps(run.quest);
    const moved = new Set<string>();
    for (const member of run.members.values()) {
      if (member.kind === 'bot') continue;
      for (let guard = 0; guard < steps.length * 4; guard++) {
        const states = await this.states(run);
        const mine = states.get(member.publicId);
        if (!mine) break;
        const next = steps.find((s) => !mine.done.has(s.id));
        if (!next) break;
        let input: StepCompleteRequest | null = null;
        if (next.kind === 'boss') {
          const { landed } = this.bossTurn(run, next, states);
          const missing = next.turns.find((t) => landed.has(t.id) && !(mine.found[next.id] ?? []).includes(t.id));
          if (missing) input = { answer: { turnId: missing.id, choice: missing.answer.choice } };
        } else if (isSharedStep(next) && !ownBranch.has(next.id)) {
          const doer = [...states].find(([id, s]) => id !== member.publicId && s.done.has(next.id));
          if (doer) {
            const theirs = doer[1].found[next.id] ?? [];
            const target = theirs.find((t) => !(mine.found[next.id] ?? []).includes(t));
            input = next.kind === 'search' || next.kind === 'find-object' ? (target ? { target } : null) : {};
          }
        }
        if (!input) break;
        try {
          const result = await recordStep({ db: this.db, content: this.content, clock: this.clock }, member.childId, run.quest, next.id, input, true);
          if (!result.correct || result.repeated) break;
        } catch (err) {
          console.error('party quest step failed', err instanceof Error ? err.name : typeof err);
          break;
        }
        moved.add(member.publicId);
      }
    }
    const states = await this.states(run);
    for (const member of run.members.values()) if (member.kind === 'bot') this.followBot(run, member, states);
    for (const member of run.members.values()) {
      if (member.kind === 'bot' || !moved.has(member.publicId)) continue;
      const [row] = await this.db.select().from(questProgress).where(and(eq(questProgress.childId, member.childId), eq(questProgress.questId, run.quest.id)));
      const paid = await paidRuns(this.db, member.childId, run.quest.id);
      this.host.send(member.publicId, { type: 'party-quest-progress', progress: progressDto(run.quest.id, row, paid, run.quest) });
    }
    await this.push(run);
  }

  /**
   * A bot following the players: through the shared steps (and any step that is not a question) a player did, with
   * what she found there, and through the boss once the party's blows beat it. It stops at a question it answers.
   */
  private followBot(run: Run, bot: BotMember, states: Map<string, MemberState>): void {
    const { own } = bot;
    for (const next of run.quest.steps) {
      if (own.done.has(next.id)) continue;
      if (next.kind === 'boss') {
        const { landed } = this.bossTurn(run, next, states);
        own.found[next.id] = [...new Set([...(own.found[next.id] ?? []), ...landed])];
        if (bossStateOf(next, own.found).hp > 0) break;
      } else if (isQuestionStep(next)) {
        break;
      } else {
        const doer = [...run.members.values()].find((m) => m.kind === 'player' && states.get(m.publicId)?.done.has(next.id));
        if (!doer) break;
        own.found[next.id] = [...(states.get(doer.publicId)?.found[next.id] ?? [])];
      }
      own.done.add(next.id);
    }
    bot.finished = own.done.size === run.quest.steps.length;
  }

  /**
   * A bot's move (its answer to its next question, or its boss blow on its turn), checked against the run as it is
   * once the records before it are through; then the party moves on as after a player's step.
   */
  private botMove(run: Run, bot: BotMember, stepId: string, turnId: string | null): void {
    run.queue = run.queue
      .then(async () => {
        if (this.runs.get(run.partyId) !== run || run.members.get(bot.publicId) !== bot) return;
        const steps = run.quest.steps;
        const index = steps.findIndex((s) => !bot.own.done.has(s.id));
        const step = steps[index];
        if (step?.id !== stepId) return;
        const states = await this.states(run);
        if (turnId === null) {
          if (step.kind === 'boss' || !isQuestionStep(step) || index > this.playersFront(run, states)) return;
          bot.own.done.add(step.id);
        } else {
          if (step.kind !== 'boss' || !step.turns.some((t) => t.id === turnId)) return;
          const { landed, owner } = this.bossTurn(run, step, states);
          if (owner !== bot.publicId || landed.has(turnId)) return;
          bot.own.found[step.id] = [...(bot.own.found[step.id] ?? []), turnId];
        }
        await this.catchUp(run);
      })
      .catch((err: unknown) => {
        console.error('party quest bot move failed', err instanceof Error ? err.name : typeof err);
      });
  }

  private botMoves(run: Run, bot: BotMember): PartyQuestBotMoves {
    return {
      done: (stepId) => this.botMove(run, bot, stepId, null),
      blow: (stepId, turnId) => this.botMove(run, bot, stepId, turnId),
      question: (stepId, turnId) => this.questionInfo(run.quest, stepId, turnId),
    };
  }

  /** What a bot knows of a question: its skill and subject; party quests keep no players' numbers, so middling ones. */
  private questionInfo(quest: ActiveQuest, stepId: string, turnId?: string): QuestionInfo | null {
    const step = quest.steps.find((s) => s.id === stepId);
    const skill = step?.kind === 'boss' ? step.turns.find((t) => t.id === turnId)?.skill : step && 'skill' in step ? step.skill : undefined;
    if (!skill) return null;
    const subject = this.content.subjects.find((s) => s.skills.some((k) => k.id === skill))?.id ?? null;
    return { skill, subject, difficulty: difficultyOf(undefined), medianMs: BOT_QUESTION_MEDIAN_MS };
  }

  /** The furthest step a player of the run has reached (its index; -1 while no player plays it yet). */
  private playersFront(run: Run, states: Map<string, MemberState>): number {
    let front = -1;
    for (const member of run.members.values()) {
      const state = states.get(member.publicId);
      if (member.kind === 'player' && state) front = Math.max(front, nextIndexOf(run.quest, state));
    }
    return front;
  }

  /** Every member and invited player gets the party's quest as it is now; its bots go on with their part. */
  private async push(run: Run): Promise<void> {
    if (this.runs.get(run.partyId) !== run) return;
    const states = await this.states(run);
    const view = this.view(run, states);
    for (const id of [...run.members.keys(), ...run.invited]) this.host.send(id, { type: 'party-quest', quest: view });
    this.tellBots(run, states, view.turn);
  }

  /**
   * Each bot of the run sees it as it is now: how far the players got, its own steps, and its boss blow when the turn
   * is its. Once every player in it finished her run, its bots are told so (once), and the run is over for them.
   */
  private tellBots(run: Run, states: Map<string, MemberState>, turn: string | null): void {
    const driver = this.host.bots();
    const bots = [...run.members.values()].filter((m): m is BotMember => m.kind === 'bot');
    if (!driver || bots.length === 0 || run.finishTold) return;
    const players = [...run.members.values()].filter((m) => m.kind === 'player');
    if (players.length > 0 && players.every((m) => m.finished)) {
      run.finishTold = true;
      for (const bot of bots) driver.finished(bot.publicId, run.quest.id, players.map((m) => m.publicId));
      return;
    }
    const front = this.playersFront(run, states);
    for (const bot of bots) {
      const next = run.quest.steps.find((s) => !bot.own.done.has(s.id));
      let blow: { stepId: string; turnId: string } | null = null;
      if (next?.kind === 'boss' && turn === bot.publicId) {
        const { landed } = this.bossTurn(run, next, states);
        const open = next.turns.find((t) => !landed.has(t.id));
        if (open) blow = { stepId: next.id, turnId: open.id };
      }
      driver.play(bot.publicId, { quest: run.quest, front, done: new Set(bot.own.done), blow }, this.botMoves(run, bot));
    }
  }

  private view(run: Run, states: Map<string, MemberState>): PartyQuestView {
    const steps = run.quest.steps;
    // The party's front: the furthest step any member has reached; a member owes an answer before it.
    const front = Math.max(0, ...[...states.values()].map((s) => nextIndexOf(run.quest, s)));
    const boss = steps.find((s): s is Extract<QuestStep, { kind: 'boss' }> => s.kind === 'boss' && [...states.values()].some((st) => nextIndexOf(run.quest, st) === steps.indexOf(s)));
    const member = (id: string, joined: boolean) => {
      const person = this.host.person(id);
      const state = states.get(id);
      const finished = run.members.get(id)?.finished ?? false;
      return {
        id,
        displayName: person?.displayName ?? '…',
        joined,
        done: state?.done.size ?? 0,
        waiting: !!state && !finished && this.host.present(id) && steps.slice(0, front).some((s) => isQuestionStep(s) && !state.done.has(s.id)),
        finished,
      };
    };
    return {
      questId: run.quest.id,
      leader: run.leader,
      members: [...[...run.members.keys()].map((id) => member(id, true)), ...[...run.invited].map((id) => member(id, false))].slice(0, 4),
      turn: boss ? this.bossTurn(run, boss, states).owner : null,
    };
  }
}

/** The index of the first step not done (the number of steps once all are). */
function nextIndexOf(quest: ActiveQuest, state: MemberState): number {
  const i = quest.steps.findIndex((step) => !state.done.has(step.id));
  return i < 0 ? quest.steps.length : i;
}
