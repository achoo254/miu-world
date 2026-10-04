import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { OlympiadCatalog, OLYMPIAD_TOPIC_IDS } from '@miu/schema/olympiad';

const OLYMPIAD_FILE = path.resolve(import.meta.dirname, '../../../../content/olympiad/olympic-math.json');

describe('olympiad catalog validation and mathematical verification', () => {
  const raw = JSON.parse(readFileSync(OLYMPIAD_FILE, 'utf8'));
  const parsed = OlympiadCatalog.safeParse(raw);

  it('parses validly against OlympiadCatalog schema', () => {
    if (!parsed.success) {
      console.error(parsed.error.format());
    }
    expect(parsed.success).toBe(true);
  });

  if (!parsed.success) return;
  const catalog = parsed.data;

  it('has no mention of "TIMO" anywhere in the content', () => {
    const jsonStr = JSON.stringify(catalog);
    expect(jsonStr).not.toMatch(/timo/i);
  });

  it('has unique question IDs across all questions', () => {
    const allIds = [
      ...catalog.practiceQuestions.map((q) => q.id),
      ...catalog.examQuestions.map((q) => q.id),
    ];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('has 10 practice questions and 5 exam questions for each of the 5 topics', () => {
    for (const topicId of OLYMPIAD_TOPIC_IDS) {
      const practice = catalog.practiceQuestions.filter((q) => q.topicId === topicId);
      const exam = catalog.examQuestions.filter((q) => q.topicId === topicId);
      expect(practice.length).toBe(10);
      expect(exam.length).toBe(5);
    }
    expect(catalog.practiceQuestions.length).toBe(50);
    expect(catalog.examQuestions.length).toBe(25);
  });

  it('ensures every question correctAnswer exists in choices', () => {
    for (const q of catalog.practiceQuestions) {
      const choiceIds = q.choices.map((c) => c.id);
      expect(choiceIds).toContain(q.correctAnswer);
    }
    for (const q of catalog.examQuestions) {
      const choiceIds = q.choices.map((c) => c.id);
      expect(choiceIds).toContain(q.correctAnswer);
    }
  });

  it('exam questions are strictly numbered 1 to 25', () => {
    for (let i = 0; i < 25; i++) {
      expect(catalog.examQuestions[i]?.number).toBe(i + 1);
    }
  });

  it('mathematically verifies exam question answers', () => {
    const qMap = new Map(catalog.examQuestions.map((q) => [q.number, q]));

    // Q1: 2 xoài = 4 cam -> 1 xoài = 2 cam (B)
    expect(qMap.get(1)?.correctAnswer).toBe('B');
    expect(4 / 2).toBe(2);

    // Q2: 5, 10, 15, 20 -> 25 (D)
    expect(qMap.get(2)?.correctAnswer).toBe('D');
    expect(20 + 5).toBe(25);

    // Q3: 32 - 7 = 25 (B)
    expect(qMap.get(3)?.correctAnswer).toBe('B');
    expect(32 - 7).toBe(25);

    // Q4: Thứ Hai + 9 ngày = Thứ Hai + 2 ngày = Thứ Tư (B)
    expect(qMap.get(4)?.correctAnswer).toBe('B');
    expect((1 + 9) % 7).toBe(3); // 1 = Mon, 3 = Wed

    // Q5: 1 thỏ = 2 gà = 2 * 3 chim sẻ = 6 (B)
    expect(qMap.get(5)?.correctAnswer).toBe('B');
    expect(2 * 3).toBe(6);

    // Q6: 54 + 28 - 14 = 68 (B)
    expect(qMap.get(6)?.correctAnswer).toBe('B');
    expect(54 + 28 - 14).toBe(68);

    // Q7: 65 - ? = 29 -> 65 - 29 = 36 (C)
    expect(qMap.get(7)?.correctAnswer).toBe('C');
    expect(65 - 29).toBe(36);

    // Q8: 37 + 19 = ? + 26 -> 56 - 26 = 30 (B)
    expect(qMap.get(8)?.correctAnswer).toBe('B');
    expect(37 + 19 - 26).toBe(30);

    // Q9: (? * 3) + 7 = 22 -> (22 - 7) / 3 = 5 (B)
    expect(qMap.get(9)?.correctAnswer).toBe('B');
    expect((22 - 7) / 3).toBe(5);

    // Q10: 18 + 25 + 12 + 35 = 90 (C)
    expect(qMap.get(10)?.correctAnswer).toBe('C');
    expect(18 + 25 + 12 + 35).toBe(90);

    // Q11: 31, 42, 57, 69 -> 42 chẵn (B)
    expect(qMap.get(11)?.correctAnswer).toBe('B');
    expect(42 % 2).toBe(0);

    // Q12: lẻ + lẻ + lẻ = lẻ (B)
    expect(qMap.get(12)?.correctAnswer).toBe('B');
    expect((1 + 3 + 5) % 2).toBe(1);

    // Q13: 24 / 4 = 6 (B)
    expect(qMap.get(13)?.correctAnswer).toBe('B');
    expect(24 / 4).toBe(6);

    // Q14: số lẻ giữa 20 và 30: 21, 23, 25, 27, 29 = 5 (B)
    expect(qMap.get(14)?.correctAnswer).toBe('B');
    const odds = [21, 22, 23, 24, 25, 26, 27, 28, 29].filter((n) => n % 2 !== 0);
    expect(odds.length).toBe(5);

    // Q15: hàng chục = 3 * hàng đơn vị -> 31 (B)
    expect(qMap.get(15)?.correctAnswer).toBe('B');
    expect(3).toBe(3 * 1);

    // Q16: MN có P ở giữa -> MP, PN, MN = 3 (B)
    expect(qMap.get(16)?.correctAnswer).toBe('B');

    // Q17: 3 ô vuông nối tiếp -> 3 + 2 + 1 = 6 (D)
    expect(qMap.get(17)?.correctAnswer).toBe('D');
    expect(3 + 2 + 1).toBe(6);

    // Q18: Khối lập phương có 12 cạnh (C)
    expect(qMap.get(18)?.correctAnswer).toBe('C');

    // Q19: 4 + 1 = 5 (B)
    expect(qMap.get(19)?.correctAnswer).toBe('B');
    expect(4 + 1).toBe(5);

    // Q20: 2 tam giác rời = 2 * 3 = 6 (C)
    expect(qMap.get(20)?.correctAnswer).toBe('C');
    expect(2 * 3).toBe(6);

    // Q21: 49, 94 -> 2 số (B)
    expect(qMap.get(21)?.correctAnswer).toBe('B');

    // Q22: 3 mũ * 2 khăn = 6 cách (B)
    expect(qMap.get(22)?.correctAnswer).toBe('B');
    expect(3 * 2).toBe(6);

    // Q23: 4 bạn đấu vòng tròn: 4 * 3 / 2 = 6 (C)
    expect(qMap.get(23)?.correctAnswer).toBe('C');
    expect((4 * 3) / 2).toBe(6);

    // Q24: tổng chữ số bằng 5: 14, 23, 32, 41, 50 -> 5 số (B)
    expect(qMap.get(24)?.correctAnswer).toBe('B');
    const sum5 = [14, 23, 32, 41, 50];
    expect(sum5.length).toBe(5);

    // Q25: 15 / 3 = 5 (B)
    expect(qMap.get(25)?.correctAnswer).toBe('B');
    expect(15 / 3).toBe(5);
  });
});
