import { describe, expect, it } from 'vitest';
import { AchievementCatalog, achievementIssues, achievementOfSource, achievementSource, type AchievementContext, type AchievementEntry } from './achievement';
import { SkillGiftCatalog, skillGiftIssues, skillGiftOfSource, skillGiftSource } from './progression';

const entry = (over: Partial<AchievementEntry> = {}): AchievementEntry => ({
  id: 'bai-hoc-dau-tien',
  category: 'hoc-tap',
  name: 'Bài học đầu tiên',
  description: '{name} hoàn thành bài học đầu tiên.',
  icon: 'books',
  metric: { kind: 'lessons' },
  goal: 1,
  reward: { xp: 20, coin: 20 },
  ...over,
});

const context: AchievementContext = {
  regions: new Set(['khu-rung-bi-mat']),
  skills: new Set(['phep-cong']),
  subjects: new Set(['toan']),
  wearables: new Map([
    ['hat-thanh-tich', { award: true }],
    ['hat-crown-gold', { award: false }],
  ]),
  giftItems: new Set(['glasses-ky-nang']),
  icons: new Set(['books', 'trophy']),
  reach: { lessons: new Map([['khu-rung-bi-mat', 3]]), minigames: new Map([['khu-rung-bi-mat', 2]]), bosses: 1, collectibles: 10, collectionSets: 1, gates: 2, skillLevels: 10, playerLevels: 15 },
};

describe('achievement catalogue', () => {
  it('accepts goals in reach over known content', () => {
    const catalog = AchievementCatalog.parse({ version: 1, achievements: [entry(), entry({ id: 'rung', name: 'Rừng', description: 'Ba bài rừng.', metric: { kind: 'lessons', region: 'khu-rung-bi-mat' }, goal: 3, reward: { xp: 1, coin: 1, item: 'hat-thanh-tich' } })] });
    expect(achievementIssues(catalog, context)).toEqual([]);
  });

  it('reports unknown references, unreachable goals, repeated wording and award items given twice', () => {
    const catalog = AchievementCatalog.parse({
      version: 1,
      achievements: [
        entry({ goal: 4 }),
        entry({ id: 'b', metric: { kind: 'skill-level', skill: 'bay' }, icon: 'ghost', reward: { xp: 0, coin: 0, item: 'hat-crown-gold' } }),
        entry({ id: 'c', name: 'C', description: 'C.', metric: { kind: 'minigame-runs', region: 'dao-xa' }, reward: { xp: 0, coin: 0, item: 'glasses-ky-nang' } }),
      ],
    });
    expect(achievementIssues(catalog, context)).toEqual([
      'achievement bai-hoc-dau-tien: asks for 4, the game has 3',
      'achievement b: the name "Bài học đầu tiên" is used twice',
      'achievement b: the description is used twice',
      'achievement b: unknown skill bay',
      'achievement b: unknown picture ghost',
      'achievement b: the accessory hat-crown-gold must say "unlock": { "award": true }',
      'achievement c: unknown region dao-xa',
      'achievement c: glasses-ky-nang is not a wearable of content/accessories',
      'achievement c: glasses-ky-nang is already given by another gift',
      'achievement c: asks for 1, the game has 0',
    ]);
  });

  it('refuses an id listed twice', () => {
    expect(AchievementCatalog.safeParse({ version: 1, achievements: [entry(), entry()] }).success).toBe(false);
  });

  it('round-trips ledger sources', () => {
    expect(achievementOfSource(achievementSource('bai-hoc-dau-tien'))).toBe('bai-hoc-dau-tien');
    expect(achievementOfSource('region:khu-rung-bi-mat:full')).toBeNull();
    expect(skillGiftOfSource(skillGiftSource('phep-cong', 10))).toEqual({ skill: 'phep-cong', level: 10 });
    expect(skillGiftOfSource('skill-gift:Phep:2')).toBeNull();
  });
});

describe('skill gift catalogue', () => {
  const coins = { '2': 10, '3': 15, '4': 20, '5': 30, '6': 35, '7': 40, '8': 50, '9': 60, '10': 80 };
  const wearables = new Map([
    ['glasses-ky-nang', { award: true }],
    ['hat-crown-gold', { award: false }],
  ]);

  it('needs coins for every level and award items of known skills', () => {
    const ok = SkillGiftCatalog.parse({ version: 1, coins, items: [{ skill: 'phep-cong', level: 3, item: 'glasses-ky-nang' }] });
    expect(skillGiftIssues(ok, { skills: new Set(['phep-cong']), wearables })).toEqual([]);
    const { '7': _seven, ...missing } = coins;
    const bad = SkillGiftCatalog.parse({ version: 1, coins: missing, items: [{ skill: 'bay', level: 3, item: 'hat-crown-gold' }] });
    expect(skillGiftIssues(bad, { skills: new Set(['phep-cong']), wearables })).toEqual([
      'skill gifts: level 7 has no coins',
      'skill gift hat-crown-gold: unknown skill bay',
      'skill gift hat-crown-gold: the accessory must say "unlock": { "award": true }',
    ]);
  });

  it('refuses two items on one level and one item on two levels', () => {
    const twice = (items: object[]) => SkillGiftCatalog.safeParse({ version: 1, coins, items }).success;
    expect(twice([{ skill: 'a', level: 2, item: 'x' }, { skill: 'a', level: 2, item: 'y' }])).toBe(false);
    expect(twice([{ skill: 'a', level: 2, item: 'x' }, { skill: 'b', level: 2, item: 'x' }])).toBe(false);
  });
});
