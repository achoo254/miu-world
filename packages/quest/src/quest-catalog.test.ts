import { describe, expect, it } from 'vitest';
import { QuestDefinition } from '@miu/schema/content';
import { questCatalogIssues, questTargetIssues } from './quest-catalog';

const support = { guide: ['a'], hint: 'b', answer: { text: '2', explanation: '1 + 1 = 2' } };

function quest(id: string, extra: Record<string, unknown> = {}): QuestDefinition {
  return QuestDefinition.parse({
    id,
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: id,
    status: 'active',
    summary: 's',
    review: 'teacher-pending',
    sevenQuestions: { who: 'a', where: 'b', goal: 'c', play: 'd', learn: 'e', reward: 'f', next: 'g' },
    phases: { hook: 'find', explore: 'find', learn: 'find', challenge: 'add', decision: 'add', finale: 'add', reward: 'add', next: 'add' },
    steps: [
      { id: 'find', title: 'Tìm', kind: 'search', targets: ['box', 'letter'] },
      { id: 'add', title: 'Đố', kind: 'riddle', target: 'tree', question: '1 + 1', skill: 'phep-cong', answer: { value: 2 }, support },
    ],
    reward: { skillXp: { 'phep-cong': 1 } },
    ...extra,
  });
}
/** Textbook quests need two different interactive challenges; phases still point at `find` and `add`. */
const TEXTBOOK_STEPS = [
  { id: 'find', title: 'Xếp', goTo: 'Ra bãi cỏ xếp số', kind: 'challenge', mechanic: 'sort', target: 'box', prompt: 'Xếp từ bé đến lớn', skill: 'phep-cong', items: [{ id: 'b', label: '9' }, { id: 'a', label: '3' }], answer: { order: ['a', 'b'] }, support, feedback: { right: ['r1', 'r2', 'r3'], wrong: ['w1', 'w2', 'w3'] } },
  { id: 'add', title: 'Chọn', kind: 'challenge', mechanic: 'multi-select', target: 'tree', prompt: 'Chọn số chẵn', skill: 'phep-cong', choices: [{ id: 'c2', text: '2' }, { id: 'c3', text: '3' }], answer: { choices: ['c2'] }, support, feedback: { right: ['r4', 'r5', 'r6'], wrong: ['w4', 'w5', 'w6'] } },
];
/** Where the textbook steps happen: both on the same patch of grass. */
const TEXTBOOK_PLACES = { box: 'bãi cỏ', tree: 'bãi cỏ' };
const draft = (id: string, extra: Record<string, unknown> = {}) =>
  quest(id, { status: 'draft', lesson: 'toan2-t1-b01', steps: TEXTBOOK_STEPS, places: TEXTBOOK_PLACES, ...extra });
const stub = (id: string) => QuestDefinition.parse({ id, region: 'r', chapter: 2, title: id, status: 'stub' });
const skills = new Set(['phep-cong']);

describe('questCatalogIssues', () => {
  it('accepts a sound catalogue with an active quest and a stub', () => {
    expect(questCatalogIssues([quest('a'), stub('b')], skills)).toEqual([]);
  });

  it('reports unknown skills and duplicates', () => {
    expect(questCatalogIssues([quest('a', { reward: { skillXp: { bay: 1 } } })], skills)).toEqual(['quest a rewards unknown skill bay']);
    expect(questCatalogIssues([quest('a')], new Set())).toEqual([
      'quest a rewards unknown skill phep-cong',
      'quest a step add teaches unknown skill phep-cong',
    ]);
    expect(questCatalogIssues([quest('a'), quest('a')], skills)).toEqual(['duplicate quest id a']);
  });

  it('checks drafts like active quests', () => {
    expect(questCatalogIssues([draft('toan2-cd1-b01', { reward: { skillXp: { bay: 1 } } })], skills)).toEqual(['quest toan2-cd1-b01 rewards unknown skill bay']);
  });
});

describe('questTargetIssues', () => {
  it('lists targets missing from the world entities', () => {
    expect(questTargetIssues(quest('a'), new Set(['box', 'letter', 'tree']))).toEqual([]);
    expect(questTargetIssues(quest('a'), new Set(['box']))).toEqual([
      'quest a step find targets unknown entity letter',
      'quest a step add targets unknown entity tree',
    ]);
    expect(questTargetIssues(stub('b'), new Set())).toEqual([]);
  });
});

describe('minigame steps in the catalogue', () => {
  const spec = { id: 'egg-catch', name: 'Hứng trứng', family: 'catch', howTo: ['Kéo giỏ'], controls: ['drag' as const], duration: 40, goal: 12, params: { speed: 1 } };
  const side = (game: string, goal: number) =>
    quest('side-a', {
      category: 'side',
      phases: { hook: 'ask', explore: 'ask', learn: 'ask', challenge: 'play', decision: 'play', finale: 'play', reward: 'play', next: 'play' },
      steps: [
        { id: 'ask', title: 'Nhờ', kind: 'dialogue', target: 'parrot', lines: [{ speaker: 'Vẹt', text: 'Chơi nhé!' }], en: { title: 'Ask', lines: ["Let's play!"] } },
        { id: 'play', title: 'Chơi', kind: 'challenge', mechanic: 'minigame', trigger: 'auto', prompt: 'Hứng trứng', game, goal, en: { title: 'Play', prompt: 'Catch eggs' } },
      ],
      reward: {},
      en: { title: 'Egg catch', summary: 'Catch eggs' },
    });

  it('accepts a known game with a goal it is proven to reach, and names what is wrong otherwise', () => {
    const games = new Map([['egg-catch', spec]]);
    expect(questCatalogIssues([side('egg-catch', 10)], skills, games)).toEqual([]);
    expect(questCatalogIssues([side('kite', 10)], skills, games)).toEqual(['quest side-a step play plays unknown minigame kite (no content/minigames/kite.json)']);
    expect(questCatalogIssues([side('egg-catch', 30)], skills, games)).toEqual(['quest side-a step play asks for 30 points, more than the 12 the game egg-catch is proven to reach']);
  });
});
