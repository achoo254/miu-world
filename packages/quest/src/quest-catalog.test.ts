import { describe, expect, it } from 'vitest';
import { QuestDefinition } from '@miu/schema/content';
import { questCatalogReport, questTargetIssues } from './quest-catalog';

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
const stub = (id: string) => QuestDefinition.parse({ id, region: 'r', chapter: 2, title: id, status: 'stub' });
const skills = new Set(['phep-cong']);

describe('questCatalogReport', () => {
  it('accepts a sound catalogue with a stub unlocked by an active quest', () => {
    expect(questCatalogReport([quest('a', { unlock: ['b'] }), stub('b')], skills).issues).toEqual([]);
  });

  it('reports unknown skills, unknown unlocks, duplicates and cycles', () => {
    expect(questCatalogReport([quest('a', { reward: { skillXp: { bay: 1 } } })], skills).issues).toEqual(['quest a rewards unknown skill bay']);
    expect(questCatalogReport([quest('a')], new Set()).issues).toEqual([
      'quest a rewards unknown skill phep-cong',
      'quest a step add teaches unknown skill phep-cong',
    ]);
    expect(questCatalogReport([quest('a', { unlock: ['ghost'] })], skills).issues).toEqual(['quest a unlocks unknown quest ghost']);
    expect(questCatalogReport([quest('a'), quest('a')], skills).issues).toEqual(['duplicate quest id a']);
    const cycle = [quest('root'), quest('a', { unlock: ['b'] }), quest('b', { unlock: ['a'] })];
    expect(questCatalogReport(cycle, skills).issues).toEqual(['quests locked forever (unlock cycle): a, b']);
  });

  it('checks drafts like active quests but only warns about textbook quests not written yet', () => {
    const draft = (id: string, extra: Record<string, unknown> = {}) => quest(id, { status: 'draft', steps: TEXTBOOK_STEPS, places: TEXTBOOK_PLACES, ...extra });
    expect(questCatalogReport([draft('tv2-t01-b01', { unlock: ['tv2-t01-b02'] })], skills)).toEqual({
      issues: [],
      warnings: ['draft quest tv2-t01-b01 unlocks tv2-t01-b02, not written yet'],
    });
    expect(questCatalogReport([draft('tv2-t01-b01', { unlock: ['ghost'] })], skills).issues).toEqual(['quest tv2-t01-b01 unlocks unknown quest ghost']);
    expect(questCatalogReport([draft('toan2-cd1-b01', { reward: { skillXp: { bay: 1 } } })], skills).issues).toEqual([
      'quest toan2-cd1-b01 rewards unknown skill bay',
    ]);
  });

  it('refuses an active quest that depends on a draft the game never loads', () => {
    const report = questCatalogReport([quest('a', { unlock: ['toan2-cd1-b01'] }), quest('toan2-cd1-b01', { status: 'draft', steps: TEXTBOOK_STEPS, places: TEXTBOOK_PLACES })], skills);
    expect(report.issues).toEqual(['quest a unlocks draft quest toan2-cd1-b01, which the game never loads']);
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
