import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { QuestDefinition } from '@miu/schema/content';
import { STORY_CONTENT } from '../../test/test-app';
import { npcCatalogIssues, readNpcFiles, storyOrderIssues } from './npc-catalog';

const files = readNpcFiles(fileURLToPath(new URL('../../test/fixtures/npcs', import.meta.url)));
const quests = [...STORY_CONTENT.quests.values()] as QuestDefinition[];
const context = {
  targets: STORY_CONTENT.targets,
  isNpcLook: () => true,
  items: STORY_CONTENT.items,
  quests,
  openRegions: new Set(['khu-rung-bi-mat', 'lang-ven-song', 'truong-hoc']),
};

describe('characters catalogue', () => {
  it('accepts the fixture characters and their story', () => {
    expect(npcCatalogIssues(files, context)).toEqual([]);
  });

  it('asks every open map for its characters and stories when content:check runs', () => {
    expect(npcCatalogIssues(files, { ...context, requireEveryMap: true })).toEqual(
      expect.arrayContaining(['open region truong-hoc has no characters\' file (content/npcs/truong-hoc.json)', 'npcs/lang-ven-song.json tells 0 stories, at least 2']),
    );
  });

  it('refuses a repeated line, an unknown liked item and a chapter that opens elsewhere', () => {
    const [forest, river] = structuredClone(files);
    if (!forest || !river) throw new Error('fixtures');
    const hoaMi = forest.npcs[0];
    const doi = forest.npcs[1];
    if (!hoaMi || !doi) throw new Error('fixtures');
    doi.lines[0] = { ...(hoaMi.lines[0] as (typeof hoaMi.lines)[number]) };
    hoaMi.likes = ['khong-co-mon-nay'];
    const wrong = quests.map((q) => (q.id === 'yarn-fixture-song-2' && q.status !== 'stub' ? { ...q, steps: [{ ...q.steps[0], target: 'animal-beaver' } as (typeof q.steps)[number], ...q.steps.slice(1)] } : q));
    const issues = npcCatalogIssues([forest, river], { ...context, quests: wrong });
    expect(issues.some((i) => i.startsWith('character doi-hang-sau repeats'))).toBe(true);
    expect(issues).toContain('character hoa-mi-rung likes khong-co-mon-nay, which content/items does not describe');
    expect(issues).toContain('story fixture-song chapter 2: quest yarn-fixture-song-2 opens at animal-beaver, not at hoa-mi-rung, whose story it is');
  });

  it('keeps every story chapter after every lesson of its map in the quest list', () => {
    const lesson = (id: string) => ({ id, region: 'khu-rung-bi-mat', chapter: 1, title: id, status: 'stub' }) as QuestDefinition;
    const story = quests.find((q) => q.id === 'yarn-fixture-song-1');
    if (!story) throw new Error('fixture');
    expect(storyOrderIssues([lesson('vuot-ai-khu-rung'), story])).toEqual([]);
    expect(storyOrderIssues([lesson('zz-bai-cuoi'), story])).toEqual(['story chapter yarn-fixture-song-1 sorts before the lesson zz-bai-cuoi of khu-rung-bi-mat: the quest list would offer it first']);
  });
});
