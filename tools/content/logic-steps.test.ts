import { describe, expect, it } from 'vitest';
import { QuestDefinition } from '../../packages/schema/src/content';
import { checkLogicSteps, logicStepIssues } from './logic-steps';

const MAZE = [
  ['S', '.', '#'],
  ['#', '.', 'G'],
];

/** An active quest whose challenge step is the given logic step. */
function quest(id: string, logic: Record<string, unknown>) {
  const support = { guide: ['Nhìn kỹ từng ô.'], hint: 'Đi theo ô trống.', answer: { text: 'A', explanation: 'Đường A đi qua các ô trống.' } };
  return QuestDefinition.parse({
    id,
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: `Đường đi ${id}`,
    status: 'active',
    summary: `Tìm đường ${id}`,
    review: 'teacher-pending',
    sevenQuestions: { who: 'Vẹt', where: 'Rừng', goal: 'Giúp', play: 'Tìm', learn: 'Lô-gic', reward: 'XP', next: 'Tiếp' },
    phases: { hook: 'hi', explore: 'find', learn: 'think', challenge: 'think', decision: 'think', finale: 'think', reward: 'think', next: 'think' },
    steps: [
      { id: 'hi', title: 'Chào', kind: 'dialogue', trigger: 'auto', lines: [{ speaker: 'Vẹt', text: 'Xin chào!' }] },
      { id: 'find', title: 'Tìm', kind: 'search', targets: ['box'] },
      {
        id: 'think',
        title: 'Nghĩ',
        kind: 'challenge',
        mechanic: 'logic',
        trigger: 'auto',
        skill: 'logic',
        prompt: 'Chọn đường đúng.',
        choices: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
        answer: { choice: 'a' },
        support,
        ...logic,
      },
    ],
    reward: { xp: 10 },
  });
}

describe('logicStepIssues', () => {
  it('accepts clues on every kind, since the screen shows them all', () => {
    const clues = [{ label: 'Ghế 1 kê sát cây nến' }, { label: 'Gấu ngồi kề cây nến' }];
    expect(logicStepIssues({ logicType: 'puzzle', elements: clues })).toEqual([]);
    expect(logicStepIssues({ logicType: 'pattern', elements: [{ label: '5' }, { label: '?' }, { label: '15' }] })).toEqual([]);
    expect(logicStepIssues({ logicType: 'maze', elements: clues, grid: MAZE })).toEqual([]);
  });

  it('flags a grid on a step that does not draw one, and a maze without one', () => {
    expect(logicStepIssues({ logicType: 'puzzle', elements: [], grid: MAZE })).toEqual(['carries a grid that a puzzle step does not draw']);
    expect(logicStepIssues({ logicType: 'maze', elements: [] })).toEqual(['is a maze with no grid to draw']);
  });

  it('flags a pattern that shows two unknown cells', () => {
    expect(logicStepIssues({ logicType: 'pattern', elements: [{ label: '?' }, { label: 'Trang ?' }] })).toEqual([
      'shows more than one unknown («?») element: a pattern asks for one item',
    ]);
  });

  it('flags maze grids the screen cannot draw', () => {
    expect(logicStepIssues({ logicType: 'maze', elements: [], grid: [['S', 'x'], ['.', 'G']] })).toEqual([
      'has maze cells the screen does not draw (x): use S, G, # or .',
    ]);
    expect(logicStepIssues({ logicType: 'maze', elements: [], grid: [['S', '.'], ['.']] })).toEqual([
      'has a maze grid whose rows differ in length',
      'needs exactly one start (S) and one goal (G) in its maze grid',
    ]);
  });
});

describe('checkLogicSteps', () => {
  it('accepts mazes that each have their own grid', () => {
    const other = [
      ['S', '#', '.'],
      ['.', '.', 'G'],
    ];
    expect(checkLogicSteps([quest('a', { logicType: 'maze', grid: MAZE }), quest('b', { logicType: 'maze', grid: other })])).toEqual([]);
  });

  it('flags two quests drawing the same maze', () => {
    expect(checkLogicSteps([quest('a', { logicType: 'maze', grid: MAZE }), quest('b', { logicType: 'maze', grid: MAZE })])).toEqual([
      'quest b step think draws the same maze as quest a step think: give every maze its own grid',
    ]);
  });

  it('names the quest and step of a hidden grid', () => {
    expect(checkLogicSteps([quest('a', { logicType: 'pattern', elements: [{ id: 'x', label: '1' }], grid: MAZE })])).toEqual([
      'quest a step think carries a grid that a pattern step does not draw',
    ]);
  });
});
