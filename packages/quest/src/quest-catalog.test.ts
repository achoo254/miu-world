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
    sevenQuestions: { who: 'a', where: 'b', goal: 'c', play: 'd', learn: 'e', reward: 'f', unlock: 'g' },
    phases: { hook: 'find', explore: 'find', learn: 'find', challenge: 'add', decision: 'add', finale: 'add', reward: 'add', unlock: 'add' },
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
  it('accepts a sound catalogue with a stub unlocked by an active quest', () => {
    expect(questCatalogIssues([quest('a', { unlock: ['b'] }), stub('b')], skills)).toEqual([]);
  });

  it('reports unknown skills, unknown unlocks, duplicates and cycles', () => {
    expect(questCatalogIssues([quest('a', { reward: { skillXp: { bay: 1 } } })], skills)).toEqual(['quest a rewards unknown skill bay']);
    expect(questCatalogIssues([quest('a')], new Set())).toEqual([
      'quest a rewards unknown skill phep-cong',
      'quest a step add teaches unknown skill phep-cong',
    ]);
    expect(questCatalogIssues([quest('a', { unlock: ['ghost'] })], skills)).toEqual(['quest a unlocks unknown quest ghost']);
    expect(questCatalogIssues([quest('a'), quest('a')], skills)).toEqual(['duplicate quest id a']);
    const cycle = [quest('root'), quest('a', { unlock: ['b'] }), quest('b', { unlock: ['a'] })];
    expect(questCatalogIssues(cycle, skills)).toEqual(['quests locked forever (unlock cycle): a, b']);
  });

  it('checks drafts like active quests', () => {
    expect(questCatalogIssues([draft('tv2-t01-b01'), quest('a', { unlock: ['ghost'] })], skills)).toEqual(['quest a unlocks unknown quest ghost']);
    expect(questCatalogIssues([draft('toan2-cd1-b01', { reward: { skillXp: { bay: 1 } } })], skills)).toEqual(['quest toan2-cd1-b01 rewards unknown skill bay']);
  });

  it('refuses an active quest that depends on a draft the game never loads', () => {
    expect(questCatalogIssues([quest('a', { unlock: ['b'] }), quest('b', { status: 'draft' })], skills)).toEqual([
      'quest a unlocks draft quest b, which the game never loads',
    ]);
  });

  it('keeps every textbook quest open: nothing may lock one, written or not', () => {
    expect(questCatalogIssues([quest('a', { unlock: ['toan2-cd1-b01'] }), draft('toan2-cd1-b01')], skills)).toEqual([
      'quest a unlocks textbook quest toan2-cd1-b01: textbook lessons are open from the start',
    ]);
    expect(questCatalogIssues([quest('a', { unlock: ['tv2-t01-b02'] })], skills)).toEqual([
      'quest a unlocks textbook quest tv2-t01-b02: textbook lessons are open from the start',
    ]);
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
