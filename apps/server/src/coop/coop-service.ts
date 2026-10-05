// Co-op challenges over the multiplayer hub (Master Plan §8, §8b): a team's lobby at the challenge's host, the
// countdown, the challenge itself (`CoopSession`) and its end. A team is a party (any party: its members accepted
// an invite) or a player alone; a lone player's free places go to companion bots while her bot switch is on.
// Players are paid by the server, each the quest's reward once per run, and only a player who played a part (a
// bot doing all the work pays nobody). Leaving, dropping out or blocking never breaks the challenge: a bot plays
// the place, or the team waits a minute and then goes on; nothing learnt is lost by stepping out.
import { coopTasks, type ActiveQuest, type CoopStep } from '@miu/schema/content';
import { COOP_COUNTDOWN_MS, type CoopAction, type CoopBotLine, type CoopLobbyView, type CoopResult, type CoopStateView } from '@miu/schema/coop';
import type { QuestionInfo } from '../multiplayer/bot-persona';
import { difficultyOf, medianMs, type BotStore, type QuestionNumbers } from '../multiplayer/bot-store';
import type { ClientWsMessage, MpNotice, ServerWsMessage } from '@miu/schema/multiplayer';
import { CoopSession, type CoopPerson } from './coop-session';

/** What the service needs of the hub: delivering, parties, who a player or bot is, her switches. */
export interface CoopHost {
  send(id: string, message: ServerWsMessage): void;
  notice(id: string, code: MpNotice): void;
  party(id: string): { id: string; leader: string; members: readonly string[] } | null;
  person(id: string): CoopPerson | null;
  /** The profile id of a player (kept while the server runs, so one who dropped out is still paid); null: a bot. */
  childIdOf(id: string): string | null;
  /** Her companion bot switch. */
  botsOn(id: string): boolean;
  /** Connected now (in a room or between maps). */
  online(id: string): boolean;
  /** The map she stands on (the bots who fill free places live there). */
  mapOf(id: string): string | null;
}

/** What a companion bot does in a challenge: who fills free places, and how each bot plays its part. */
export interface CoopBotDriver {
  /** Up to `count` companion bots of `mapId` (any map when it has too few), none of `exclude`. */
  pick(mapId: string | null, count: number, exclude: ReadonlySet<string>): CoopPerson[];
  /**
   * The challenge as the bot sees it now: it acts through `act` after a moment (with a line of its own, sometimes),
   * knowing the right answer (`answerOf`) and what players find of the question (`question`); its own skill decides.
   */
  play(botId: string, state: CoopStateView, moves: CoopBotMoves): void;
  /** The challenge ended (or the bot stood down): it forgets what it was about to do. */
  forget(botIds: readonly string[]): void;
}

export interface CoopBotMoves {
  act(action: CoopAction, say?: CoopBotLine): void;
  answerOf(taskId: string): string | null;
  question(taskId: string): QuestionInfo | null;
}

/** Pays one player for a won challenge, in her own transaction. */
export interface CoopRewards {
  pay(childId: string, quest: ActiveQuest): Promise<CoopResult>;
}

export interface CoopServiceOptions {
  host: CoopHost;
  /** An open co-op challenge by id (null: unknown, a stub, or not a co-op challenge). */
  quest(id: string): ActiveQuest | null;
  rewards: CoopRewards;
  bots?: CoopBotDriver;
  now?: () => number;
  /** A player starts at most this many challenges… */
  startLimit?: number;
  /** …in this long (ms): a bot farm cannot run challenges back to back. Every run still pays in full. */
  startWindowMs?: number;
  /** Anonymous numbers per question and bots' memories of players (none: bots know only the questions). */
  store?: BotStore;
  /** The subject of a skill (content/learning/skills.json). */
  subjectOf?: (skill: string) => string | null;
}

interface Lobby {
  key: string;
  questId: string;
  leader: string;
  partyId: string | null;
  ready: Set<string>;
  startsAt: number | null;
  timer: NodeJS.Timeout | null;
  /** Who was last shown it (told when it closes). */
  shown: Set<string>;
}

interface Running {
  key: string;
  partyId: string | null;
  quest: ActiveQuest;
  session: CoopSession;
  /** Players in it (still in or stepped out), told when it ends. */
  players: Set<string>;
  mapId: string | null;
  timer: NodeJS.Timeout | null;
  /** Companion bots playing in it (party bots, bots filling places, bots standing in). */
  bots: Set<string>;
  /** Each player's bot switch when it began (read again while she is connected). */
  switches: Map<string, boolean>;
  /** The players' anonymous numbers for its questions, read when it began. */
  numbers: Map<string, QuestionNumbers>;
}

/** The co-op step of a co-op challenge. */
export const coopStepOf = (quest: ActiveQuest): CoopStep | null => quest.steps.find((s): s is CoopStep => s.kind === 'coop') ?? null;

export class CoopService {
  private readonly host: CoopHost;
  private readonly options: CoopServiceOptions;
  private bots: CoopBotDriver | null;
  private readonly now: () => number;
  private readonly lobbies = new Map<string, Lobby>();
  private readonly running = new Map<string, Running>();
  /** The challenge each player (and each bot) is in, by its team key. */
  private readonly playing = new Map<string, string>();
  private readonly starts = new Map<string, number[]>();
  private seq = 0;

  constructor(options: CoopServiceOptions) {
    this.options = options;
    this.host = options.host;
    this.bots = options.bots ?? null;
    this.now = options.now ?? Date.now;
  }

  /** The bot runner plays the companion bots (set once it runs). */
  setBots(bots: CoopBotDriver): void {
    this.bots = bots;
  }

  close(): void {
    for (const lobby of this.lobbies.values()) if (lobby.timer) clearTimeout(lobby.timer);
    for (const run of this.running.values()) if (run.timer) clearTimeout(run.timer);
    this.bots?.forget([...this.running.values()].flatMap((r) => [...r.bots]));
    this.lobbies.clear();
    this.running.clear();
    this.playing.clear();
  }

  /** A player's co-op message (validated by the wire schema). */
  message(id: string, message: Extract<ClientWsMessage, { type: `coop-${string}` }>): void {
    switch (message.type) {
      case 'coop-open':
        return this.open(id, message.questId);
      case 'coop-ready':
        return this.ready(id, message.ready);
      case 'coop-start':
        return this.start(id);
      case 'coop-leave':
        return this.leave(id);
      case 'coop-act': {
        const key = this.playing.get(id);
        if (key) this.act(key, id, message.action);
        return;
      }
      case 'coop-help':
        return this.help(id, message.task, message.layer);
    }
  }

  // ---- lobby ----

  private teamKey(id: string): { key: string; partyId: string | null; leader: string; members: readonly string[] } {
    const party = this.host.party(id);
    return party ? { key: `party:${party.id}`, partyId: party.id, leader: party.leader, members: party.members } : { key: `solo:${id}`, partyId: null, leader: id, members: [id] };
  }

  private isBot(id: string): boolean {
    return this.host.person(id)?.isBot ?? !this.host.childIdOf(id);
  }

  private open(id: string, questId: string): void {
    const quest = this.options.quest(questId);
    if (!quest || !coopStepOf(quest)) return this.host.notice(id, 'coop-unknown');
    if (this.playing.has(id)) return this.host.notice(id, 'coop-busy');
    const team = this.teamKey(id);
    if (this.running.has(team.key)) return this.host.notice(id, 'coop-busy');
    const existing = this.lobbies.get(team.key);
    if (team.leader !== id) {
      // Only the leader picks the challenge; the others see the one she opened.
      if (existing) return this.pushLobby(existing);
      return this.host.notice(id, 'not-leader');
    }
    if (existing?.questId === questId) return this.pushLobby(existing);
    if (existing) this.closeLobby(existing);
    const lobby: Lobby = { key: team.key, questId, leader: id, partyId: team.partyId, ready: new Set([id]), startsAt: null, timer: null, shown: new Set() };
    this.lobbies.set(team.key, lobby);
    this.pushLobby(lobby);
  }

  private lobbyOf(id: string): Lobby | null {
    const lobby = this.lobbies.get(this.teamKey(id).key);
    return lobby ?? null;
  }

  private ready(id: string, ready: boolean): void {
    const lobby = this.lobbyOf(id);
    if (!lobby || id === lobby.leader) return;
    if (ready) lobby.ready.add(id);
    else {
      lobby.ready.delete(id);
      this.cancelCountdown(lobby);
    }
    this.pushLobby(lobby);
  }

  private start(id: string): void {
    const lobby = this.lobbyOf(id);
    if (!lobby || lobby.leader !== id) return this.host.notice(id, 'not-leader');
    if (lobby.startsAt !== null) return;
    if (!this.allowStart(id)) return this.host.notice(id, 'rate-limited');
    lobby.startsAt = this.now() + COOP_COUNTDOWN_MS;
    lobby.timer = setTimeout(() => {
      lobby.timer = null;
      this.begin(lobby);
    }, COOP_COUNTDOWN_MS);
    this.pushLobby(lobby);
  }

  /** At most `startLimit` starts per player in `startWindowMs`. */
  private allowStart(id: string): boolean {
    const child = this.host.childIdOf(id) ?? id;
    const now = this.now();
    const window = this.options.startWindowMs ?? 10 * 60_000;
    const recent = (this.starts.get(child) ?? []).filter((at) => now - at < window);
    if (recent.length >= (this.options.startLimit ?? 8)) return false;
    recent.push(now);
    this.starts.set(child, recent);
    for (const [key, list] of this.starts) if (list.every((at) => now - at >= window)) this.starts.delete(key);
    return true;
  }

  private cancelCountdown(lobby: Lobby): void {
    if (lobby.timer) clearTimeout(lobby.timer);
    lobby.timer = null;
    lobby.startsAt = null;
  }

  /** Members of the lobby's team now (the party as it is, or the player alone). */
  private lobbyMembers(lobby: Lobby): readonly string[] {
    if (!lobby.partyId) return [lobby.leader];
    const party = this.host.party(lobby.leader);
    return party?.id === lobby.partyId ? party.members : [];
  }

  private botsFill(members: readonly string[], seats: number): number {
    const players = members.filter((m) => !this.isBot(m));
    if (players.length !== 1 || !players.every((p) => this.host.botsOn(p)) || !this.bots) return 0;
    return Math.max(0, seats - members.length);
  }

  private lobbyView(lobby: Lobby): CoopLobbyView | null {
    const quest = this.options.quest(lobby.questId);
    const step = quest ? coopStepOf(quest) : null;
    const members = this.lobbyMembers(lobby);
    if (!step || members.length === 0) return null;
    const people = members.flatMap((m) => {
      const person = this.host.person(m);
      return person ? [{ id: m, displayName: person.displayName, isBot: person.isBot, species: person.species, ready: person.isBot || lobby.ready.has(m) }] : [];
    });
    if (people.length === 0) return null;
    return {
      questId: lobby.questId,
      leader: lobby.leader,
      members: people,
      seats: step.seats,
      botsFill: this.botsFill(members, step.seats),
      startsInMs: lobby.startsAt === null ? null : Math.max(0, lobby.startsAt - this.now()),
    };
  }

  private pushLobby(lobby: Lobby): void {
    const view = this.lobbyView(lobby);
    if (!view) return this.closeLobby(lobby);
    const players = view.members.filter((m) => !m.isBot).map((m) => m.id);
    for (const gone of lobby.shown) if (!players.includes(gone)) this.host.send(gone, { type: 'coop-lobby', lobby: null });
    lobby.shown = new Set(players);
    for (const id of players) this.host.send(id, { type: 'coop-lobby', lobby: view });
  }

  private closeLobby(lobby: Lobby): void {
    this.cancelCountdown(lobby);
    if (this.lobbies.get(lobby.key) === lobby) this.lobbies.delete(lobby.key);
    for (const id of lobby.shown) this.host.send(id, { type: 'coop-lobby', lobby: null });
    lobby.shown.clear();
  }

  // ---- the challenge ----

  /** The countdown ran out: the leader, the ready players and the party's bots play; free places go to bots. */
  private begin(lobby: Lobby): void {
    lobby.startsAt = null;
    const quest = this.options.quest(lobby.questId);
    const step = quest ? coopStepOf(quest) : null;
    const members = this.lobbyMembers(lobby);
    if (!quest || !step || !this.host.online(lobby.leader) || this.running.has(lobby.key)) return this.closeLobby(lobby);
    const takers = members.filter((m) => this.isBot(m) || ((m === lobby.leader || lobby.ready.has(m)) && this.host.online(m) && !this.playing.has(m)));
    const fill = this.botsFill(takers, step.seats);
    const mapId = this.host.mapOf(lobby.leader);
    this.seq += 1;
    const tag = `c${this.seq}`;
    const fillers = fill > 0 && this.bots ? this.bots.pick(mapId, fill, new Set(members)).map((b) => ({ ...b, id: `${b.id}@${tag}`, isBot: true })) : [];
    const people = [...takers.flatMap((m) => this.host.person(m) ?? []), ...fillers];
    // Shown the challenge now: the lobby closes for everyone (those who did not join just go on playing).
    this.closeLobby(lobby);
    if (people.length === 0) return;
    const run: Running = {
      key: lobby.key,
      partyId: lobby.partyId,
      quest,
      session: new CoopSession(quest.id, step, people),
      players: new Set(people.filter((p) => !p.isBot).map((p) => p.id)),
      mapId,
      timer: null,
      bots: new Set(people.filter((p) => p.isBot).map((p) => p.id)),
      switches: new Map(people.filter((p) => !p.isBot).map((p) => [p.id, this.host.botsOn(p.id)])),
      numbers: new Map(),
    };
    this.running.set(run.key, run);
    for (const p of people) this.playing.set(p.id, run.key);
    run.session.markShown(this.now());
    void this.prepare(run).finally(() => this.push(run));
  }

  /** What the bots need before they play: the questions' anonymous numbers, and the players they remember. */
  private async prepare(run: Running): Promise<void> {
    const store = this.options.store;
    if (!store) return;
    try {
      run.numbers = await store.questionNumbers(coopTasks(run.session.step).map((t) => `${run.quest.id}/${t.id}`));
      for (const bot of run.session.bots()) {
        for (const player of run.players) {
          const child = this.host.childIdOf(player);
          const memory = child ? await store.recall(bot.id.split('@')[0] ?? bot.id, child) : null;
          if (memory) run.session.greet(player, bot.id, memory);
        }
      }
    } catch (err) {
      console.error('co-op bot memories failed', err instanceof Error ? err.name : typeof err);
    }
  }

  /** What a bot knows of a question: its skill and subject, and the players' anonymous numbers for it. */
  private questionInfo(run: Running, taskId: string): QuestionInfo | null {
    const task = coopTasks(run.session.step).find((t) => t.id === taskId);
    if (!task) return null;
    const numbers = run.numbers.get(`${run.quest.id}/${taskId}`);
    return { skill: task.skill, subject: this.options.subjectOf?.(task.skill) ?? null, difficulty: difficultyOf(numbers), medianMs: (numbers ? medianMs(numbers.times) : null) ?? 6_000 };
  }

  /** Whether bots may play in it: every player in it has her bot switch on. */
  private botsAllowed(run: Running): boolean {
    const on = (p: string): boolean => (this.host.online(p) ? this.host.botsOn(p) : (run.switches.get(p) ?? false));
    return this.bots !== null && [...run.players].every((p) => !run.session.has(p) || on(p));
  }

  /** A bot to play `id`'s place, when bots may play. */
  private standIn(run: Running): CoopPerson | null {
    if (!this.botsAllowed(run) || !this.bots) return null;
    this.seq += 1;
    const exclude = new Set([...run.bots].map((b) => b.split('@')[0] ?? b));
    const [bot] = this.bots.pick(run.mapId, 1, exclude);
    if (!bot) return null;
    const person: CoopPerson = { ...bot, id: `${bot.id}@c${this.seq}`, isBot: true };
    run.bots.add(person.id);
    this.playing.set(person.id, run.key);
    return person;
  }

  private act(key: string, actor: string, action: CoopAction, say?: CoopBotLine): void {
    const run = this.running.get(key);
    if (!run) return;
    const now = this.now();
    const shown = action.kind === 'answer' ? run.session.shownAt(action.task) : null;
    const result = run.session.act(actor, action, now);
    if (!result.ok) return;
    if (say) run.session.say(actor, say);
    // A player's answer counts in the question's anonymous numbers (right or not, how long it took; never who).
    const store = this.options.store;
    if (store && action.kind === 'answer' && shown !== null && !this.isBot(actor) && this.host.childIdOf(actor)) {
      const view = run.session.view(actor, now);
      const right = view.last?.by === actor && (view.last.kind === 'right' || view.last.kind === 'won' || view.last.kind === 'round');
      void store.recordAnswer(`${run.quest.id}/${action.task}`, right, (now - shown) / 1000).catch((err: unknown) => {
        console.error('question numbers failed', err instanceof Error ? err.name : typeof err);
      });
    }
    run.session.markShown(now);
    this.changed(run);
  }

  private help(id: string, task: string, layer: 'hint' | 'answer'): void {
    const run = this.running.get(this.playing.get(id) ?? '');
    const help = run?.session.help(id, task, layer);
    if (help) this.host.send(id, { type: 'coop-help', task, layer, ...help });
  }

  private changed(run: Running): void {
    if (run.session.done) {
      this.push(run);
      void this.finish(run);
      return;
    }
    if (run.session.playersIn().length === 0) return this.end(run, 'closed');
    this.push(run);
  }

  /** Everyone in it gets her view; each bot plays from its own. A pause wakes the team when it runs out. */
  private push(run: Running): void {
    const now = this.now();
    if (run.timer) clearTimeout(run.timer);
    run.timer = null;
    const pauseEnds = run.session.pauseEnds(now);
    if (pauseEnds !== null) {
      run.timer = setTimeout(() => {
        run.timer = null;
        run.session.tick(this.now());
        this.changed(run);
      }, pauseEnds - now);
    }
    for (const person of run.session.audience()) {
      const state = run.session.view(person.id, now);
      if (!person.isBot) {
        this.host.send(person.id, { type: 'coop-state', state });
        continue;
      }
      this.bots?.play(person.id, state, {
        act: (action, say) => this.act(run.key, person.id, action, say),
        answerOf: (taskId) => coopTasks(run.session.step).find((t) => t.id === taskId)?.answer.choice ?? null,
        question: (taskId) => this.questionInfo(run, taskId),
      });
    }
  }

  /** Won: each player who played a part is paid by the server (her own transaction); the others hear why not. */
  private async finish(run: Running): Promise<void> {
    this.detach(run);
    const paid = new Set(run.session.paidPlayers());
    await Promise.all(
      [...run.players].map(async (id) => {
        if (!run.session.has(id)) return;
        let result: CoopResult = { reward: null, completion: null, unpaid: 'no-part' };
        const child = this.host.childIdOf(id);
        if (paid.has(id) && child) {
          try {
            result = await this.options.rewards.pay(child, run.quest);
          } catch (err) {
            console.error('co-op reward failed', err instanceof Error ? err.name : typeof err);
            result = { reward: null, completion: null, unpaid: 'failed' };
          }
        }
        this.host.send(id, { type: 'coop-end', questId: run.quest.id, reason: 'done', result });
        // The bots that played remember her (how often, the last challenge), to greet her next time.
        const store = this.options.store;
        if (store && child && paid.has(id)) {
          for (const bot of run.session.bots()) {
            await store.remember(bot.id.split('@')[0] ?? bot.id, child, run.quest.id, new Date(this.now())).catch((err: unknown) => {
              console.error('bot memory failed', err instanceof Error ? err.name : typeof err);
            });
          }
        }
      }),
    );
  }

  private detach(run: Running): void {
    if (run.timer) clearTimeout(run.timer);
    run.timer = null;
    if (this.running.get(run.key) === run) this.running.delete(run.key);
    for (const [id, key] of this.playing) if (key === run.key) this.playing.delete(id);
    this.bots?.forget([...run.bots]);
  }

  private end(run: Running, reason: 'closed'): void {
    this.detach(run);
    for (const id of run.players) if (run.session.has(id)) this.host.send(id, { type: 'coop-end', questId: run.quest.id, reason, result: null });
  }

  /** She steps out of her challenge (or her lobby): a bot plays her place, or the team goes on without her. */
  private leave(id: string): void {
    const key = this.playing.get(id);
    const run = key ? this.running.get(key) : undefined;
    if (run) return this.stepOut(run, id);
    const lobby = this.lobbyOf(id);
    if (!lobby) return;
    if (lobby.leader === id) return this.closeLobby(lobby);
    lobby.ready.delete(id);
    this.cancelCountdown(lobby);
    this.pushLobby(lobby);
  }

  private stepOut(run: Running, id: string): void {
    if (!run.session.has(id)) return;
    run.session.leave(id, this.standIn(run));
    this.playing.delete(id);
    this.host.send(id, { type: 'coop-end', questId: run.quest.id, reason: 'left', result: null });
    this.changed(run);
  }

  // ---- what the hub tells ----

  /** She lost her connection: a bot plays her place, or the team waits for her a minute. */
  dropped(id: string): void {
    const run = this.running.get(this.playing.get(id) ?? '');
    if (!run || !run.session.has(id)) return;
    run.session.away(id, this.now(), this.standIn(run));
    this.changed(run);
  }

  /** She is in a room again: back in her place (the bot standing in steps down), or shown her team's lobby. */
  back(id: string): void {
    const run = this.running.get(this.playing.get(id) ?? '');
    if (run && run.session.has(id)) {
      const bot = run.session.standInOf(id);
      run.session.back(id);
      if (bot) {
        run.bots.delete(bot.id);
        this.playing.delete(bot.id);
        this.bots?.forget([bot.id]);
      }
      this.changed(run);
      return;
    }
    const lobby = this.lobbyOf(id);
    if (lobby && this.lobbyMembers(lobby).includes(id)) this.pushLobby(lobby);
  }

  /**
   * She left her party, was removed from it or blocked someone in it (the hub tells): out of the party's challenge.
   * A player the party let go after she dropped out keeps her place for the challenge's minute instead.
   */
  leftParty(id: string): void {
    const run = this.running.get(this.playing.get(id) ?? '');
    if (run?.partyId) this.stepOut(run, id);
  }

  /** Parties changed for these players: lobbies follow their party (a leader out of it closes hers). */
  partyChanged(ids: readonly string[]): void {
    for (const lobby of [...this.lobbies.values()]) {
      if (this.teamKey(lobby.leader).key !== lobby.key) this.closeLobby(lobby);
      else if (ids.some((id) => lobby.shown.has(id) || this.lobbyMembers(lobby).includes(id))) this.pushLobby(lobby);
    }
  }
}
