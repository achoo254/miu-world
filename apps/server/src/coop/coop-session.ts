// One team playing one co-op challenge (Master Plan §8): the shared state (round, clues shared, questions done,
// ropes held, the boss's HP) and who may do what. Pure: no timers, no network; the service calls it with the time
// and sends each player her view. Nothing a player does can make the team lose: a wrong answer only hears a line and
// the same question waits. A player who drops out is waited for (or a companion bot plays her place); a place
// nobody plays any more is played by the next player in the team, so the challenge always goes on.
import { COOP_DEFAULT_DAMAGE, type CoopStep, type CoopTask } from '@miu/schema/content';
import { COOP_HOLD_MS, COOP_PAUSE_MS, type CoopAction, type CoopBotLine, type CoopEvent, type CoopHelpLayer, type CoopStateView, type CoopTaskView } from '@miu/schema/coop';
import type { NotebookLine } from '@miu/schema/game';
import { coopAnswerText as answerText } from '@miu/quest/notebook';

/** Who takes a place: a player (public id) or a companion bot. */
export interface CoopPerson {
  id: string;
  displayName: string;
  species: string;
  isBot: boolean;
}

interface Seat extends CoopPerson {
  /** A companion bot playing her place while she is away or after she left. */
  standIn: CoopPerson | null;
  /** She dropped out (her connection is gone)… */
  away: boolean;
  /** …and is waited for until then (ms), unless a bot stands in. */
  awayUntil: number | null;
  /** She stepped out for good (left the challenge, the party, or blocked someone in it). */
  left: boolean;
  /** Waited for too long: the team goes on without her until she is back. */
  gone: boolean;
  /** She played a part: shared a clue, answered right or held a rope. */
  part: boolean;
}

export type CoopActError = 'not-yours' | 'paused' | 'done' | 'unknown' | 'not-ready';
export type CoopActResult = { ok: true } | { ok: false; error: CoopActError };

export interface CoopHelp {
  text: string;
  textEn: string | null;
  explanation: string | null;
  explanationEn: string | null;
}

const taskView = (task: CoopTask): CoopTaskView => ({
  id: task.id,
  prompt: task.prompt,
  choices: task.choices.map((c) => ({ id: c.id, text: c.text })),
  ...(task.en ? { en: { prompt: task.en.prompt, choices: task.en.choices } } : {}),
});


export class CoopSession {
  readonly questId: string;
  readonly step: CoopStep;
  private readonly seats: Seat[];
  private round = 0;
  /** Pieces: clues of the round shared so far. */
  private shared = new Set<number>();
  /** Together: questions of the round answered, and when each place's hold lets go. */
  private doneTasks = new Set<string>();
  private holds = new Map<number, number>();
  /** Team-boss: right blows so far. */
  private hits = 0;
  private rights = 0;
  private wrongs = 0;
  private seq = 0;
  private last: CoopEvent | null = null;
  private finished = false;
  /** When each question was first shown (ms), for the players' anonymous answer times. */
  private readonly shown = new Map<string, number>();
  /** Bots that won a challenge with a player before, as each player sees them (viewer → bot → memory). */
  private readonly greetings = new Map<string, Map<string, { runs: number; lastQuestId: string }>>();

  constructor(questId: string, step: CoopStep, people: readonly CoopPerson[]) {
    if (people.length === 0) throw new Error('a co-op challenge needs at least one player');
    this.questId = questId;
    this.step = step;
    this.seats = people.map((p) => ({ ...p, standIn: null, away: false, awayUntil: null, left: false, gone: false, part: false }));
  }

  /** The questions on screen now are marked shown at `now` (those already marked keep their time). */
  markShown(now: number): void {
    const visible = this.step.mode === 'together' ? this.roundTasks().map((t) => t.task) : [this.current()?.task].filter((t): t is CoopTask => t !== undefined);
    for (const task of visible) if (!this.shown.has(task.id)) this.shown.set(task.id, now);
  }

  /** When a question was first shown (ms), null if never. */
  shownAt(taskId: string): number | null {
    return this.shown.get(taskId) ?? null;
  }

  /** A bot remembers `viewer`: it greets her with how often they won together and the last challenge. */
  greet(viewer: string, botId: string, memory: { runs: number; lastQuestId: string }): void {
    const own = this.greetings.get(viewer) ?? new Map<string, { runs: number; lastQuestId: string }>();
    own.set(botId, memory);
    this.greetings.set(viewer, own);
  }

  /** The line a bot says with the move it just made (on the last event, when it is the bot's). */
  say(botId: string, line: CoopBotLine): void {
    if (this.last?.by === botId) this.last = { ...this.last, say: line };
  }

  /** Bots playing in it (their own places, and those standing in for players). */
  bots(): CoopPerson[] {
    return this.audience().filter((p) => p.isBot);
  }

  get done(): boolean {
    return this.finished;
  }

  /** Everyone who may see the challenge: the players still in it, and every bot playing a place. */
  audience(): CoopPerson[] {
    const out = new Map<string, CoopPerson>();
    for (const seat of this.seats) {
      if (!seat.left && !(seat.isBot && seat.gone)) out.set(seat.id, seat);
      if (seat.standIn) out.set(seat.standIn.id, seat.standIn);
    }
    return [...out.values()];
  }

  /** Players (not bots) who played a part and did not step out: the ones paid when the team wins. */
  paidPlayers(): string[] {
    return this.seats.filter((s) => !s.isBot && s.part && !s.left).map((s) => s.id);
  }

  /** Players still in the challenge, here or waited for. */
  playersIn(): string[] {
    return this.seats.filter((s) => !s.isBot && !s.left && !s.gone).map((s) => s.id);
  }

  has(id: string): boolean {
    return this.seats.some((s) => s.id === id && !s.left);
  }

  /** When the pause ends, if one runs (ms). */
  pauseEnds(now: number): number | null {
    const waits = this.seats.flatMap((s) => (s.awayUntil !== null && s.awayUntil > now && !s.standIn && !s.left ? [s.awayUntil] : []));
    return waits.length > 0 ? Math.min(...waits) : null;
  }

  /** Ends the waits that ran out: those places are played by the rest of the team until their players are back. */
  tick(now: number): void {
    for (const seat of this.seats) {
      if (seat.awayUntil !== null && seat.awayUntil <= now && !seat.standIn) {
        seat.awayUntil = null;
        seat.gone = true;
      }
    }
  }

  /** She dropped out: a bot plays her place at once, or she is waited for. */
  away(id: string, now: number, standIn: CoopPerson | null): void {
    const seat = this.seatOf(id);
    if (!seat || seat.isBot) return;
    seat.away = true;
    if (standIn) seat.standIn = standIn;
    else seat.awayUntil = now + COOP_PAUSE_MS;
  }

  /** She is back (not after stepping out): her place is hers again. */
  back(id: string): boolean {
    const seat = this.seatOf(id);
    if (!seat || seat.isBot) return false;
    seat.away = false;
    seat.awayUntil = null;
    seat.gone = false;
    seat.standIn = null;
    return true;
  }

  /** She stepped out: a bot plays her place, or the next player does. */
  leave(id: string, standIn: CoopPerson | null): void {
    const seat = this.seatOf(id);
    if (!seat) return;
    seat.left = true;
    seat.gone = true;
    seat.awayUntil = null;
    seat.standIn = standIn;
  }

  /** The bot playing a player's place, if any (it is told to stop when she is back). */
  standInOf(id: string): CoopPerson | null {
    return this.seatOf(id)?.standIn ?? null;
  }

  private seatOf(id: string): Seat | undefined {
    return this.seats.find((s) => s.id === id && !s.left);
  }

  private here(seat: Seat): boolean {
    return !seat.left && !seat.gone && !seat.away;
  }

  /** Who plays place `i` now: its player, the bot standing in, else the next player here; null while she is waited for. */
  private controller(i: number): string | null {
    const seat = this.seats[i];
    if (!seat) return null;
    if (this.here(seat)) return seat.id;
    if (seat.standIn) return seat.standIn.id;
    if (!seat.gone) return null;
    const n = this.seats.length;
    for (let k = 1; k < n; k++) {
      const other = this.seats[(i + k) % n];
      if (other && this.here(other)) return other.id;
    }
    for (let k = 1; k < n; k++) {
      const other = this.seats[(i + k) % n];
      if (other?.standIn) return other.standIn.id;
    }
    return null;
  }

  private paused(now: number): boolean {
    return this.pauseEnds(now) !== null;
  }

  private roundsCount(): number {
    return this.step.mode === 'team-boss' ? this.step.turns.length : this.step.rounds.length;
  }

  /** The question everyone sees (pieces, team-boss) and the place whose answer it is. */
  private current(): { task: CoopTask; seat: number } | null {
    const n = this.seats.length;
    if (this.step.mode === 'pieces') {
      const round = this.step.rounds[this.round];
      return round ? { task: round.task, seat: this.round % n } : null;
    }
    if (this.step.mode === 'team-boss') {
      const task = this.step.turns[this.hits];
      return task ? { task, seat: this.hits % n } : null;
    }
    return null;
  }

  /** Together: the round's questions with their places. */
  private roundTasks(): Array<{ task: CoopTask; seat: number }> {
    if (this.step.mode !== 'together') return [];
    const round = this.step.rounds[this.round];
    return (round?.tasks ?? []).map((task, j) => ({ task, seat: j % this.seats.length }));
  }

  private hp(): number {
    if (this.step.mode !== 'team-boss') return 0;
    const taken = this.step.turns.slice(0, this.hits).reduce((sum, t) => sum + (t.damage ?? COOP_DEFAULT_DAMAGE), 0);
    return Math.max(0, this.step.boss.maxHp - taken);
  }

  private markPart(actor: string, seat: number): void {
    const own = this.seats[seat];
    // The player herself played, or (her place played by the next player) the one who did it.
    const by = own && own.id === actor ? own : this.seats.find((s) => s.id === actor);
    if (by && !by.isBot) by.part = true;
  }

  private event(by: string, kind: CoopEvent['kind'], line: { vi: string; en: string | null } | null = null, copy: NotebookLine | null = null): void {
    this.seq += 1;
    this.last = { seq: this.seq, by, kind, line: line?.vi ?? null, lineEn: line?.en ?? null, copy, say: null };
  }

  private feedback(kind: 'right' | 'wrong'): { vi: string; en: string | null } {
    const pool = this.step.feedback[kind];
    const n = kind === 'right' ? this.rights : this.wrongs;
    const at = n % pool.length;
    return { vi: pool[at] ?? '', en: this.step.feedback.en?.[kind][at] ?? null };
  }

  /** The next round (or the win); `copy`: the right answer that ended the round, kept on the event. */
  private nextRound(by: string, copy: NotebookLine | null = null): void {
    this.round += 1;
    this.shared = new Set();
    this.doneTasks = new Set();
    this.holds = new Map();
    if (this.round >= this.roundsCount()) this.win(by, copy);
    else if (!copy) this.event(by, 'round');
  }

  private win(by: string, copy: NotebookLine | null = null): void {
    this.finished = true;
    const boss = this.step.mode === 'team-boss' ? this.step.boss : null;
    this.event(by, 'won', boss ? { vi: boss.win, en: boss.en?.win ?? null } : this.feedback('right'), copy);
  }

  /** A move by `actor`; refused when it is not hers to make. */
  act(actor: string, action: CoopAction, now: number): CoopActResult {
    if (this.finished) return { ok: false, error: 'done' };
    this.tick(now);
    if (this.paused(now)) return { ok: false, error: 'paused' };
    switch (action.kind) {
      case 'share':
        return this.share(actor, action.piece);
      case 'answer':
        return this.answer(actor, action.task, action.choice);
      case 'hold':
        return this.hold(actor, now);
    }
  }

  private share(actor: string, piece: number): CoopActResult {
    if (this.step.mode !== 'pieces') return { ok: false, error: 'unknown' };
    const round = this.step.rounds[this.round];
    if (!round || piece >= round.pieces.length) return { ok: false, error: 'unknown' };
    const seat = piece % this.seats.length;
    if (this.controller(seat) !== actor) return { ok: false, error: 'not-yours' };
    if (this.shared.has(piece)) return { ok: true };
    this.shared.add(piece);
    this.markPart(actor, seat);
    this.event(actor, 'shared');
    return { ok: true };
  }

  private answer(actor: string, taskId: string, choice: string): CoopActResult {
    let target: { task: CoopTask; seat: number } | null;
    if (this.step.mode === 'together') {
      target = this.roundTasks().find((t) => t.task.id === taskId) ?? null;
      if (target && this.doneTasks.has(taskId)) return { ok: true };
    } else {
      const current = this.current();
      target = current && current.task.id === taskId ? current : null;
    }
    if (!target) return { ok: false, error: 'unknown' };
    if (this.controller(target.seat) !== actor) return { ok: false, error: 'not-yours' };
    const round = this.step.mode === 'pieces' ? this.step.rounds[this.round] : undefined;
    if (round && this.shared.size < round.pieces.length) return { ok: false, error: 'not-ready' };
    const { task } = target;
    if (task.answer.choice !== choice) {
      this.event(actor, 'wrong', this.feedback('wrong'));
      this.wrongs += 1;
      return { ok: true };
    }
    this.markPart(actor, target.seat);
    const copy: NotebookLine = { step: task.id, question: task.prompt, answer: answerText(task) };
    this.event(actor, 'right', this.feedback('right'), copy);
    this.rights += 1;
    if (this.step.mode === 'together') {
      this.doneTasks.add(task.id);
      return { ok: true };
    }
    if (this.step.mode === 'team-boss') {
      this.hits += 1;
      if (this.hp() <= 0 || this.hits >= this.step.turns.length) this.win(actor, copy);
      return { ok: true };
    }
    this.nextRound(actor, copy);
    return { ok: true };
  }

  private hold(actor: string, now: number): CoopActResult {
    if (this.step.mode !== 'together') return { ok: false, error: 'unknown' };
    const tasks = this.roundTasks();
    const mine = this.seats.map((_, i) => i).filter((i) => this.controller(i) === actor);
    if (mine.length === 0) return { ok: false, error: 'not-yours' };
    // A place holds once its own questions are answered.
    const ready = mine.filter((i) => tasks.every((t) => t.seat !== i || this.doneTasks.has(t.task.id)));
    if (ready.length === 0) return { ok: false, error: 'not-ready' };
    for (const i of ready) {
      this.holds.set(i, now + COOP_HOLD_MS);
      this.markPart(actor, i);
    }
    const all = this.seats.every((_, i) => (this.holds.get(i) ?? 0) > now);
    if (all) this.nextRound(actor);
    else this.event(actor, 'held');
    return { ok: true };
  }

  /** A support layer for a question she can see now. */
  help(viewer: string, taskId: string, layer: CoopHelpLayer): CoopHelp | null {
    const visible = this.step.mode === 'together' ? this.roundTasks().find((t) => t.task.id === taskId && this.controller(t.seat) === viewer) : this.current();
    const task = visible && visible.task.id === taskId ? visible.task : null;
    if (!task || !this.audience().some((p) => p.id === viewer)) return null;
    if (layer === 'hint') return { text: task.hint, textEn: task.en?.hint ?? null, explanation: null, explanationEn: null };
    const index = task.choices.findIndex((c) => c.id === task.answer.choice);
    return { text: answerText(task), textEn: task.en?.choices[index] ?? null, explanation: task.explain, explanationEn: task.en?.explain ?? null };
  }

  /** The challenge as `viewer` sees it now. */
  view(viewer: string, now: number): CoopStateView {
    this.tick(now);
    const step = this.step;
    const n = this.seats.length;
    const pauseEnds = this.pauseEnds(now);
    const waited = pauseEnds === null ? undefined : this.seats.find((s) => s.awayUntil === pauseEnds && !s.standIn);
    const current = this.finished ? null : this.current();
    const seatId = (i: number): string => this.seats[i]?.id ?? '';
    const pieces =
      step.mode === 'pieces' && !this.finished
        ? (step.rounds[this.round]?.pieces ?? []).map((text, index) => {
            const seat = index % n;
            const shown = this.shared.has(index) || this.controller(seat) === viewer;
            const round = step.rounds[this.round];
            return { index, seat: seatId(seat), shared: this.shared.has(index), text: shown ? text : null, en: shown ? (round?.en?.pieces[index] ?? null) : null };
          })
        : [];
    const together = step.mode === 'together' && !this.finished ? step.rounds[this.round] : undefined;
    return {
      questId: this.questId,
      mode: step.mode,
      self: viewer,
      status: this.finished ? 'done' : pauseEnds !== null ? 'paused' : 'playing',
      waitingFor: waited && pauseEnds !== null ? { id: waited.id, displayName: waited.displayName, msLeft: Math.max(0, pauseEnds - now) } : null,
      round: step.mode === 'team-boss' ? this.hits : this.round,
      rounds: this.roundsCount(),
      seats: this.seats.map((s) => ({
        id: s.id,
        displayName: s.displayName,
        isBot: s.isBot,
        species: s.species,
        standIn: s.standIn ? { id: s.standIn.id, displayName: s.standIn.displayName } : null,
        away: s.away && !s.standIn,
        greeting: s.isBot ? (this.greetings.get(viewer)?.get(s.id) ?? null) : null,
      })),
      turn: current ? this.controller(current.seat) : null,
      task: current ? taskView(current.task) : null,
      pieces,
      title: together ? { text: together.title, en: together.en?.title ?? null } : null,
      tasks: together
        ? this.roundTasks().map(({ task, seat }) => {
            const done = this.doneTasks.has(task.id);
            return { id: task.id, seat: seatId(seat), done, task: !done && this.controller(seat) === viewer ? taskView(task) : null };
          })
        : [],
      holds: together ? this.seats.map((s, i) => ({ seat: s.id, msLeft: Math.max(0, (this.holds.get(i) ?? 0) - now) })) : [],
      boss: step.mode === 'team-boss' ? { name: step.boss.name, nameEn: step.boss.en?.name ?? null, hp: this.hp(), maxHp: step.boss.maxHp } : null,
      last: this.last,
    };
  }
}
