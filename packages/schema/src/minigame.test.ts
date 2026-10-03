import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QuestDefinition, QuestStepPublic } from './content';
import { StepAnswer, StepCompleteRequest } from './game';
import { MinigameSpec, minigameStepIssues } from './minigame';

/** A side quest that passes every rule; each test breaks one thing. */
function sideQuest() {
  return {
    id: 'side-hung-trung',
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: 'Hứng trứng giúp Vẹt',
    status: 'active',
    category: 'side',
    summary: 'Hứng trứng rơi từ tổ cao',
    review: 'teacher-pending',
    sevenQuestions: { who: 'Bạn của Vẹt', where: 'Gốc cây', goal: 'Hứng trứng', play: 'Hứng trứng', learn: 'Phản xạ', reward: 'XP, xu', next: 'Chơi lại' },
    phases: { hook: 'ask', explore: 'ask', learn: 'ask', challenge: 'play', decision: 'play', finale: 'play', reward: 'thanks', next: 'bye' },
    steps: [
      { id: 'ask', title: 'Vẹt nhờ', kind: 'dialogue', target: 'parrot-guide', lines: [{ speaker: 'Vẹt', text: 'Giúp tớ hứng trứng nhé {name}!' }] },
      { id: 'play', title: 'Hứng trứng', kind: 'challenge', mechanic: 'minigame', trigger: 'auto', prompt: 'Hứng mười quả trứng!', game: 'egg-catch', goal: 10 },
      { id: 'thanks', title: 'Cảm ơn', kind: 'reward', trigger: 'auto', text: 'Cảm ơn {name}!' },
      { id: 'bye', title: 'Hẹn gặp lại', kind: 'next', trigger: 'auto', text: 'Lúc nào rảnh lại chơi nhé.' },
    ],
    reward: { xp: 20, coin: 5 },
  } as Record<string, unknown> & { steps: Record<string, unknown>[] };
}

const issues = (raw: unknown): string[] => {
  const parsed = QuestDefinition.safeParse(raw);
  return parsed.success ? [] : parsed.error.issues.map((i) => i.message);
};

describe('minigame side quests', () => {
  it('parses a side quest: a dialogue at its giver, one minigame, reward and next', () => {
    const quest = QuestDefinition.parse(sideQuest());
    if (quest.status !== 'active') throw new Error('expected an active quest');
    expect(quest.category).toBe('side');
    expect(quest.steps[1]).toMatchObject({ mechanic: 'minigame', game: 'egg-catch', goal: 10, params: {} });
  });

  it('defaults every other quest to a lesson', () => {
    const { category: _side, ...rest } = sideQuest();
    expect(issues({ ...rest, id: 'hung-trung' })).toContain('needs at least two mechanics other than multiple choice (search, riddle or an interactive challenge)');
  });

  it('keeps the side- prefix for side quests only', () => {
    expect(issues({ ...sideQuest(), id: 'hung-trung' })).toContain('a side quest id starts with "side-"');
    expect(issues({ ...sideQuest(), category: 'main' })).toContain('a quest whose id starts with "side-" is a side quest ("category": "side")');
  });

  it('holds exactly one minigame, after a dialogue at its giver, and nothing else to learn', () => {
    const twoGames = sideQuest();
    twoGames.steps.splice(2, 0, { ...twoGames.steps[1], id: 'again' });
    expect(issues(twoGames)).toContain('a side quest holds exactly one minigame step');
    const noGiver = sideQuest();
    noGiver.steps[0] = { ...noGiver.steps[0], trigger: 'auto', target: undefined };
    expect(issues(noGiver)).toContain('a side quest starts with a dialogue at the character who offers it');
    const riddle = sideQuest();
    riddle.steps[2] = { id: 'thanks', title: 'Đố', kind: 'riddle', trigger: 'auto', question: '1 + 1', skill: 'phep-cong', answer: { value: 2 }, support: { guide: ['a'], hint: 'b', answer: { text: '2', explanation: '1 + 1' } } };
    expect(issues(riddle)).toContain('step thanks: a side quest has only dialogue, its minigame, reward and next steps');
    const waits = sideQuest();
    waits.steps[1] = { ...waits.steps[1], trigger: 'interact', target: 'parrot-guide' };
    expect(issues(waits)).toContain('step play: after the first dialogue, side quest steps start by themselves (trigger "auto")');
  });

  it('never plays a textbook lesson', () => {
    expect(issues({ ...sideQuest(), lesson: 'toan2-t1-b01' })).toContain('a side quest plays no textbook lesson');
  });

  it('rejects a goal out of range and unknown keys on the step', () => {
    const quest = sideQuest();
    quest.steps[1] = { ...quest.steps[1], goal: 0 };
    expect(QuestDefinition.safeParse(quest).success).toBe(false);
    quest.steps[1] = { ...quest.steps[1], goal: 10, answer: { score: 10 } };
    expect(QuestDefinition.safeParse(quest).success).toBe(false);
  });

  it('sends the game, goal and params to the client: none of it is secret', () => {
    const step = QuestStepPublic.parse({ ...sideQuest().steps[1], params: { speed: 1.2 } });
    expect(step).toMatchObject({ kind: 'challenge', mechanic: 'minigame', game: 'egg-catch', goal: 10, params: { speed: 1.2 } });
  });
});

describe('minigame answers and runs', () => {
  it('takes a whole, bounded score', () => {
    expect(StepAnswer.safeParse({ score: 12 }).success).toBe(true);
    expect(StepAnswer.safeParse({ score: -1 }).success).toBe(false);
    expect(StepAnswer.safeParse({ score: 2.5 }).success).toBe(false);
    expect(StepAnswer.safeParse({ score: 10_000 }).success).toBe(false);
  });

  it('names the run a step request belongs to', () => {
    expect(StepCompleteRequest.parse({ run: 2 })).toEqual({ run: 2 });
    expect(StepCompleteRequest.safeParse({ run: 0 }).success).toBe(false);
  });
});

describe('minigame catalogue', () => {
  const spec = MinigameSpec.parse({ id: 'egg-catch', name: 'Hứng trứng', family: 'catch', howTo: ['Kéo giỏ'], controls: ['drag'], duration: 40, goal: 12, params: { speed: 1 } });

  it('checks a step against its game: known id, a goal the game is proven to reach, declared params', () => {
    expect(minigameStepIssues(spec, 'egg-catch', 10, { speed: 1.5 })).toEqual([]);
    expect(minigameStepIssues(undefined, 'kite', 10, {})).toEqual(['plays unknown minigame kite (no content/minigames/kite.json)']);
    expect(minigameStepIssues(spec, 'egg-catch', 20, {})).toEqual(['asks for 20 points, more than the 12 the game egg-catch is proven to reach']);
    expect(minigameStepIssues(spec, 'egg-catch', 10, { sped: 2, speed: 'fast' })).toEqual([
      'sets param sped, which the game egg-catch does not declare',
      'sets param speed to a string, the game egg-catch reads a number',
    ]);
  });

  it('validates every shipped game file, named after its id', () => {
    const dir = new URL('../../../content/minigames/', import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const file of files) {
      const game = MinigameSpec.parse(JSON.parse(readFileSync(new URL(file, dir), 'utf8')));
      expect(`${game.id}.json`).toBe(file);
    }
  });
});
