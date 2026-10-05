import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COOP_BOT_LINE_VARIANTS, COOP_COUNTDOWN_MS, type CoopAction, type CoopBotLine, type CoopStateView } from '@miu/schema/coop';
import type { ActiveQuest } from '@miu/schema/content';
import { coopQuest } from '../../test/coop-fixture';
import { hubHarness, settle } from '../../test/hub-harness';
import { CoopService } from '../coop/coop-service';
import { BOT_COOP_ACCURACY_MAX, BOT_COOP_ACCURACY_MIN, BotRunner } from './bot-runner';
import { botSkillLevel, fatigueAfter, moodAt, personaOf, rightChance, thinkMs, VOICES, type QuestionInfo } from './bot-persona';
import { medianMs, memoryBotStore } from './bot-store';

const INFO: QuestionInfo = { skill: 'phep-cong', subject: 'toan', difficulty: 0.35, medianMs: 6_000 };
const BOUNDS = { min: BOT_COOP_ACCURACY_MIN, max: BOT_COOP_ACCURACY_MAX };

describe('a companion bot is a player of its own', () => {
  it('has one persona, drawn from its id, wherever it plays', () => {
    expect(personaOf('bot-tt-1')).toEqual(personaOf('bot-tt-1'));
    expect(personaOf('bot-tt-1@c7')).toEqual(personaOf('bot-tt-1'));
  });

  it('differs from bot to bot: a hundred bots make a hundred characters', () => {
    const personas = Array.from({ length: 100 }, (_, i) => personaOf(`bot-x-${i}`));
    expect(new Set(personas.map((p) => JSON.stringify(p))).size).toBe(100);
    expect(new Set(personas.map((p) => p.strong))).toEqual(new Set(['toan', 'tieng-viet']));
    expect(new Set(personas.map((p) => p.voice)).size).toBe(VOICES);
    const speeds = personas.map((p) => p.speed);
    expect(Math.max(...speeds) - Math.min(...speeds)).toBeGreaterThan(0.7);
    const care = personas.map((p) => p.care);
    expect(Math.min(...care)).toBeLessThan(0.15);
    expect(Math.max(...care)).toBeGreaterThan(0.85);
    expect(new Set(personas.map((p) => p.peakHour)).size).toBeGreaterThan(8);
  });

  it('is sharp one moment and slips the next, always within the bounds', () => {
    const persona = personaOf('bot-tt-3');
    const chances: number[] = [];
    for (let hour = 0; hour < 24; hour += 3) {
      const at = new Date(Date.UTC(2026, 9, 5, (hour + 17) % 24));
      for (const answers of [0, 5, 12]) chances.push(rightChance(persona, INFO, 3, moodAt('bot-tt-3', persona, at), fatigueAfter(answers), BOUNDS));
    }
    expect(Math.max(...chances) - Math.min(...chances)).toBeGreaterThan(0.1);
    expect(chances.every((c) => c >= BOUNDS.min && c <= BOUNDS.max)).toBe(true);
    // Tired after many answers: a little less sure than fresh, at the same hour.
    const at = new Date(Date.UTC(2026, 9, 5, 3));
    const mood = moodAt('bot-tt-3', persona, at);
    expect(rightChance(persona, INFO, 3, mood, fatigueAfter(12), BOUNDS)).toBeLessThan(rightChance(persona, INFO, 3, mood, fatigueAfter(0), BOUNDS));
    // Its strong subject is easier than its weak one; a harder question (more players wrong) is harder for it too.
    const strong = { ...INFO, subject: persona.strong };
    const weak = { ...INFO, subject: persona.weak };
    expect(rightChance(persona, strong, 3, 0, 0, BOUNDS)).toBeGreaterThan(rightChance(persona, weak, 3, 0, 0, BOUNDS));
    expect(rightChance(persona, { ...INFO, difficulty: 0.8 }, 3, 0, 0, BOUNDS)).toBeLessThan(rightChance(persona, INFO, 3, 0, 0, BOUNDS));
    // A quick bot answers sooner than a slow one on the same question.
    const quick = { ...persona, speed: 0.6 };
    const slow = { ...persona, speed: 1.6 };
    expect(thinkMs(quick, INFO, 0, 0.5)).toBeLessThan(thinkMs(slow, INFO, 0, 0.5));
  });

  it('grows its skills with its own play, kept in the store', async () => {
    vi.useFakeTimers();
    try {
      const store = memoryBotStore();
      const { hub } = hubHarness();
      const runner = new BotRunner(hub, { store, coopThinkMs: 100, random: () => 0.3 });
      const driver = runner.coopDriver();
      const acts: CoopAction[] = [];
      const state: CoopStateView = {
        questId: 'with-test-team-boss',
        mode: 'team-boss',
        self: 'bot-tt-2@c1',
        status: 'playing',
        waitingFor: null,
        round: 0,
        rounds: 4,
        seats: [],
        turn: 'bot-tt-2@c1',
        task: { id: 't1', prompt: 'Đòn?', choices: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }] },
        pieces: [],
        title: null,
        tasks: [],
        holds: [],
        boss: { name: 'Trùm', nameEn: null, hp: 300, maxHp: 300 },
        last: null,
      };
      for (let i = 0; i < 30; i++) {
        driver.play('bot-tt-2@c1', state, { act: (a) => void acts.push(a), answerOf: () => 'a', question: () => INFO });
        await vi.advanceTimersByTimeAsync(400);
      }
      const xp = store.xp.get('bot-tt-2')?.['phep-cong'] ?? 0;
      expect(acts.length).toBe(30);
      expect(xp).toBeGreaterThanOrEqual(60);
      expect(botSkillLevel(xp)).toBeGreaterThan(botSkillLevel(0));
      runner.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('a team of bots', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('never has two bots alike: other voices, other rhythms, other lines', async () => {
    const { hub } = hubHarness();
    const runner = new BotRunner(hub, { random: () => 0.01 });
    const picked = runner.coopDriver().pick('cho-phien', 2, new Set(['p-me']));
    const [one, two] = picked.map((p) => personaOf(p.id));
    if (!one || !two) throw new Error('two bots');
    expect(one.voice).not.toBe(two.voice);
    expect(Math.abs(one.speed - two.speed)).toBeGreaterThanOrEqual(0.1);
    // Each says its lines in its own voice: their lines never overlap, and a bot never says the same line twice running.
    const lines = new Map<string, CoopBotLine[]>();
    for (const bot of picked) {
      const id = `${bot.id}@c1`;
      const said: CoopBotLine[] = [];
      for (let i = 0; i < 6; i++) {
        const state: CoopStateView = {
          questId: 'with-test-pieces',
          mode: 'pieces',
          self: id,
          status: 'playing',
          waitingFor: null,
          round: 0,
          rounds: 2,
          seats: [],
          turn: null,
          task: null,
          pieces: [{ index: i % 4, seat: id, shared: false, text: 'Mảnh', en: null }],
          title: null,
          tasks: [],
          holds: [],
          boss: null,
          last: null,
        };
        runner.coopDriver().play(id, state, { act: (_a, say) => void (say && said.push(say)), answerOf: () => null, question: () => null });
        await vi.advanceTimersByTimeAsync(10_000);
      }
      lines.set(bot.id, said);
    }
    const [a, b] = [...lines.values()];
    expect(a?.length).toBeGreaterThan(0);
    const variants = (list: CoopBotLine[] | undefined) => new Set((list ?? []).map((l) => l.variant));
    expect([...variants(a)].some((v) => variants(b).has(v))).toBe(false);
    for (const list of [a, b]) {
      list?.forEach((line, i) => {
        expect(line.variant).toBeLessThan(COOP_BOT_LINE_VARIANTS);
        if (i > 0) expect(line.variant).not.toBe(list[i - 1]?.variant);
      });
    }
    runner.stop();
  });
});

describe('what bots learn from players: anonymous numbers only', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts each answer of a player without her, and the bots remember whom they won with', async () => {
    const h = hubHarness();
    const store = memoryBotStore();
    const quest = coopQuest('team-boss');
    const coop = new CoopService({
      host: h.hub.coopHost(),
      quest: (id) => (id === quest.id ? quest : null),
      rewards: { pay: async (_c: string, q: ActiveQuest) => ({ reward: structuredClone(q.reward), completion: null, unpaid: null }) },
      bots: new BotRunner(h.hub, { coopThinkMs: 50, coopAccuracy: 1, random: () => 0.5 }).coopDriver(),
      store,
      subjectOf: () => 'toan',
      now: () => h.clock.now,
    });
    h.hub.setCoop(coop);
    const a = await h.joined('child-a');
    await settle();
    a.send({ type: 'coop-open', questId: quest.id });
    a.send({ type: 'coop-start' });
    h.clock.now += COOP_COUNTDOWN_MS;
    await vi.advanceTimersByTimeAsync(COOP_COUNTDOWN_MS);
    // She answers wrong once, then right, 4 seconds after the question showed.
    h.clock.now += 4_000;
    a.send({ type: 'coop-act', action: { kind: 'answer', task: 't1', choice: 'b' } });
    a.send({ type: 'coop-act', action: { kind: 'answer', task: 't1', choice: 'a' } });
    await settle();
    const numbers = store.stats.get(`${quest.id}/t1`);
    expect(numbers).toMatchObject({ answers: 2, rights: 1 });
    expect(medianMs(numbers?.times ?? [])).toBe(4_500);
    expect(Object.keys(numbers ?? {}).sort()).toEqual(['answers', 'rights', 'times']);
    expect(JSON.stringify([...store.stats])).not.toMatch(/child-a|p-/);
    // The bots play their blows; the team wins and every bot remembers her.
    for (let i = 0; i < 10 && !a.last('coop-end'); i++) {
      await vi.advanceTimersByTimeAsync(500);
      const s = a.last('coop-state')?.state;
      if (s?.turn === a.id && s.task) a.send({ type: 'coop-act', action: { kind: 'answer', task: s.task.id, choice: 'a' } });
    }
    await settle();
    expect(a.last('coop-end')?.reason).toBe('done');
    const remembered = [...store.memories.entries()].filter(([key]) => key.endsWith('|child-a'));
    expect(remembered.length).toBe(2);
    expect(remembered.every(([, m]) => m.lastQuestId === quest.id && m.runs === 1)).toBe(true);
    // Next time, the bots greet her: they won together before.
    a.send({ type: 'coop-open', questId: quest.id });
    a.send({ type: 'coop-start' });
    h.clock.now += COOP_COUNTDOWN_MS;
    await vi.advanceTimersByTimeAsync(COOP_COUNTDOWN_MS);
    await settle();
    const seats = a.last('coop-state')?.state.seats ?? [];
    expect(seats.filter((s) => s.isBot).every((s) => s.greeting?.runs === 1 && s.greeting.lastQuestId === quest.id)).toBe(true);
  });
});
