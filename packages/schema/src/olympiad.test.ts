import { describe, expect, it } from 'vitest';
import {
  awardTierFromScore,
  awardTitleFromTier,
  ExamSubmitRequest,
  ExamSubmitResponse,
} from './olympiad';

describe('olympiad schema and award calculation', () => {
  it('correctly maps scores to award tiers', () => {
    expect(awardTierFromScore(100)).toBe('gold');
    expect(awardTierFromScore(80)).toBe('gold');
    expect(awardTierFromScore(79)).toBe('silver');
    expect(awardTierFromScore(60)).toBe('silver');
    expect(awardTierFromScore(59)).toBe('bronze');
    expect(awardTierFromScore(40)).toBe('bronze');
    expect(awardTierFromScore(39)).toBe('consolation');
    expect(awardTierFromScore(20)).toBe('consolation');
    expect(awardTierFromScore(19)).toBeNull();
    expect(awardTierFromScore(0)).toBeNull();
  });

  it('provides friendly titles for tiers', () => {
    expect(awardTitleFromTier('gold')).toContain('Vàng');
    expect(awardTitleFromTier('silver')).toContain('Bạc');
    expect(awardTitleFromTier('bronze')).toContain('Đồng');
    expect(awardTitleFromTier('consolation')).toContain('Khuyến khích');
    expect(awardTitleFromTier(null)).toBeNull();
  });

  it('validates submission request and response schemas', () => {
    const validReq = ExamSubmitRequest.parse({
      answers: { 'olympic-exam-01': 'A', 'olympic-exam-02': 'C' },
      elapsedSeconds: 1540,
    });
    expect(validReq.elapsedSeconds).toBe(1540);

    const validResp = ExamSubmitResponse.safeParse({
      score: 80,
      totalScore: 100,
      correctCount: 20,
      totalCount: 25,
      award: 'gold',
      awardTitle: 'Giải Vàng',
      isNewBest: true,
      bestScore: 80,
      bestAward: 'gold',
      breakdown: {
        logic: { topicId: 'logic', topicName: 'Tư duy logic', correct: 4, total: 5, score: 16 },
        arithmetic: { topicId: 'arithmetic', topicName: 'Số học', correct: 5, total: 5, score: 20 },
        'number-theory': { topicId: 'number-theory', topicName: 'Lý thuyết số', correct: 4, total: 5, score: 16 },
        geometry: { topicId: 'geometry', topicName: 'Hình học', correct: 4, total: 5, score: 16 },
        combinatorics: { topicId: 'combinatorics', topicName: 'Tổ hợp', correct: 3, total: 5, score: 12 },
      },
      rewards: { xp: 300, coin: 60 },
      elapsedSeconds: 1540,
      review: Array.from({ length: 25 }, (_, i) => ({
        id: `olympic-exam-${String(i + 1).padStart(2, '0')}`,
        number: i + 1,
        topicId: 'logic',
        prompt: `Câu hỏi ${i + 1}`,
        choices: [
          { id: 'A', text: '1' },
          { id: 'B', text: '2' },
          { id: 'C', text: '3' },
          { id: 'D', text: '4' },
        ],
        chosenAnswer: 'A',
        correctAnswer: 'A',
        isCorrect: true,
        explanation: 'Giải thích chi tiết',
      })),
    });
    expect(validResp.success).toBe(true);
  });
});
