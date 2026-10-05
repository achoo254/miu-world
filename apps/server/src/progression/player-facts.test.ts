import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QuestDefinition, type ActiveQuest } from '@miu/schema/content';
import { FIXTURE_CONTENT } from '../../test/test-app';
import { playerFacts, regionQuests, type PlayerRecord } from './player-facts';

/** A shipped zone guardian, moved into the region of the fixture lessons. */
const shipped = QuestDefinition.parse(JSON.parse(readFileSync(new URL('../../../../content/quests/ward-khu-rung-trang-tay-bac.json', import.meta.url), 'utf8'))) as ActiveQuest;
const lessonsOf = (region: string): ActiveQuest[] =>
  [...FIXTURE_CONTENT.quests.values()].filter((q): q is ActiveQuest => q.status === 'active' && (q.category ?? 'main') === 'main' && q.region === region);
const [firstLesson] = [...FIXTURE_CONTENT.quests.values()].filter((q): q is ActiveQuest => q.status === 'active' && (q.category ?? 'main') === 'main');
if (!firstLesson) throw new Error('the fixture content has no lesson');
const REGION = firstLesson.region;
const guardian: ActiveQuest = { ...shipped, region: REGION };
const CONTENT = { ...FIXTURE_CONTENT, quests: new Map([...FIXTURE_CONTENT.quests, [guardian.id, guardian]]) };

const record = (done: readonly string[]): PlayerRecord => ({
  quests: done.map((questId) => ({ questId, completedAt: new Date('2026-10-06T00:00:00Z'), stars: 3 })),
  ledger: done.map((id) => ({ source: `quest:${id}`, xp: 10, coins: 1, skillXp: {}, items: {}, createdAt: new Date('2026-10-06T00:00:00Z') })),
  skills: new Map(),
  inventory: new Map(),
  cupboard: new Map(),
});

describe('player facts with zone guardians', () => {
  it('never counts a zone guardian as a lesson of its region', () => {
    expect(regionQuests(CONTENT).lessons.get(REGION)).not.toContain(guardian.id);
  });

  it("completes a region with its lessons alone, and counts no guardian as a lesson run or a boss win", () => {
    const lessons = lessonsOf(REGION).map((q) => q.id);
    const facts = playerFacts(CONTENT, record([...lessons, guardian.id]));
    expect(facts.lessonsByRegion.get(REGION)).toBe(lessons.length);
    expect(facts.regionsComplete).toBeGreaterThanOrEqual(1);
    expect(facts.lessonsDone.has(guardian.id)).toBe(false);
    expect(facts.questRuns).toBe(lessons.length);
    // Boss wins are the maps' big bosses: a zone guardian's short fight is not one.
    expect(playerFacts(CONTENT, record([guardian.id])).bossWins).toBe(0);
  });
});
