import { describe, expect, it } from 'vitest';
import { Topic, evaluateExpression, topicIssues } from './learning';

const subjects = [{ id: 'toan', skills: [{ id: 'phep-cong' }, { id: 'phep-tru' }] }, { id: 'tieng-viet', skills: [{ id: 'doc-hieu' }] }];

function topic(over: Record<string, unknown> = {}) {
  return {
    id: 'cong-tru',
    subject: 'toan',
    title: 'Cộng, trừ',
    summary: 'Cộng và trừ các số.',
    order: 1,
    gdpt: { grade: 2, strand: 'Số và phép tính', requirements: ['Thực hiện được phép cộng, phép trừ.'] },
    objectives: [{ id: 'cong-tru-cong', text: 'Cộng hai số.', skills: ['phep-cong'], practice: ['tinh'] }],
    ...over,
  };
}

describe('Topic', () => {
  it('has a subject, an order, its curriculum alignment and objectives of its own', () => {
    expect(Topic.safeParse(topic()).success).toBe(true);
    expect(Topic.safeParse({ ...topic(), book: 'toan2-t1' }).success).toBe(false);
    expect(Topic.safeParse(topic({ objectives: [] })).success).toBe(false);
    const foreign = topic({ objectives: [{ id: 'khac-cong', text: 'Cộng.', skills: ['phep-cong'], practice: ['tinh'] }] });
    expect(Topic.safeParse(foreign).error?.issues.map((i) => i.message)).toEqual(['objective khac-cong: id must start with cong-tru-']);
    expect(Topic.safeParse(topic({ objectives: [{ id: 'cong-tru-x', text: 'x', skills: ['phep-cong'], practice: ['viet-thu'] }] })).success).toBe(false);
  });

  it('takes any grade: a later grade is only another topic file', () => {
    expect(Topic.safeParse(topic({ gdpt: { grade: 3, strand: 'Số và phép tính', requirements: ['Thực hiện được phép nhân.'] } })).success).toBe(true);
    expect(Topic.safeParse(topic({ gdpt: { grade: 13, strand: 'x', requirements: ['x'] } })).success).toBe(false);
  });
});

describe('topicIssues', () => {
  const parse = (raw: unknown) => Topic.parse(raw);

  it('accepts a consistent set', () => {
    expect(topicIssues([parse(topic())], subjects)).toEqual([]);
  });

  it('reports duplicate ids, unknown subjects, skills of another subject and a taken order', () => {
    const second = parse(topic({ id: 'cong-tru', objectives: [{ id: 'cong-tru-cong', text: 'x', skills: ['doc-hieu'], practice: ['tinh'] }] }));
    const ghost = parse(topic({ id: 'ma', subject: 'am-nhac', order: 2, objectives: [{ id: 'ma-a', text: 'x', skills: ['phep-cong'], practice: ['tinh'] }] }));
    expect(topicIssues([parse(topic()), second, ghost], subjects)).toEqual([
      'topic cong-tru is defined twice',
      'topic cong-tru: order 1 is already taken by cong-tru in toan',
      'objective cong-tru-cong is defined twice',
      'objective cong-tru-cong: skill doc-hieu is not a skill of toan',
      'topic ma: unknown subject am-nhac',
    ]);
  });
});

describe('evaluateExpression', () => {
  it('computes sums, comparisons and one unknown', () => {
    expect(evaluateExpression('62 - 6')).toBe(56);
    expect(evaluateExpression('8 + 5 - 4')).toBe(9);
    expect(evaluateExpression('47 ? 38 + 5')).toBe('>');
    expect(evaluateExpression('? + 5 = 12')).toBe(7);
    expect(evaluateExpression('6 x 2')).toBeNull();
  });
});
