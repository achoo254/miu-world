import { describe, expect, it } from 'vitest';
import { awardTierFromScore, ExamSubmitRequest, OlympiadQuestionPublic, OlympiadVisual, starsFor } from './olympiad';

describe('olympiad awards and stars', () => {
  it('maps a score out of 100 to the qualifying round medal lines', () => {
    expect(awardTierFromScore(100)).toBe('gold');
    expect(awardTierFromScore(80)).toBe('gold');
    expect(awardTierFromScore(79)).toBe('silver');
    expect(awardTierFromScore(60)).toBe('silver');
    expect(awardTierFromScore(40)).toBe('bronze');
    expect(awardTierFromScore(20)).toBe('consolation');
    expect(awardTierFromScore(19)).toBeNull();
  });

  it('gives 0–5 stars for right answers out of a topic', () => {
    expect(starsFor(0, 10)).toBe(0);
    expect(starsFor(6, 10)).toBe(3);
    expect(starsFor(10, 10)).toBe(5);
    expect(starsFor(3, 0)).toBe(0);
  });
});

describe('olympiad request and question shapes', () => {
  it('needs a run id and answers that are choices', () => {
    expect(ExamSubmitRequest.safeParse({ answers: {} }).success).toBe(false);
    expect(ExamSubmitRequest.safeParse({ runId: '7d3c3f5e-8f0e-4d38-9a40-2f8f7e8f6b10', answers: { 'olympic-exam-01': 'B' } }).success).toBe(true);
    expect(ExamSubmitRequest.safeParse({ runId: '7d3c3f5e-8f0e-4d38-9a40-2f8f7e8f6b10', answers: { 'olympic-exam-01': 'Z' } }).success).toBe(false);
  });

  it('drops the answer and support layers from the public shape', () => {
    const shown = OlympiadQuestionPublic.parse({
      id: 'q-1',
      topicId: 'logic',
      title: { vi: 'A', en: 'A' },
      prompt: { vi: 'B', en: 'B' },
      choices: [{ id: 'A', text: '1' }, { id: 'B', text: '2' }],
    });
    expect(Object.keys(shown).sort()).toEqual(['choices', 'id', 'prompt', 'title', 'topicId']);
  });

  it('accepts a number machine written with the signs a child reads', () => {
    expect(OlympiadVisual.safeParse({ type: 'machine', steps: ['− 14', '+ 8'], input: '?', output: 30 }).success).toBe(true);
    expect(OlympiadVisual.safeParse({ type: 'machine', steps: ['/ 3'], input: 6, output: '?' }).success).toBe(false);
  });
});
