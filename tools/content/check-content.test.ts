import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CONTENT_DIR, loadContentCatalog } from '../../apps/server/src/content/content-catalog';
import { ASSETS_DIR } from '../assets/asset-lib';
import { checkContent, checkQuestTargets } from './check-content';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'miu-content-'));
  cpSync(CONTENT_DIR, dir, { recursive: true });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('content:check', () => {
  it('passes the shipped content and says which checks are not run yet', () => {
    const report = checkContent();
    expect(report.issues).toEqual([]);
    expect(report.notes.join(' ')).toMatch(/reward item ids/);
  });

  describe('quest map targets', () => {
    const quests = () => loadContentCatalog().quests;
    const forest = path.join(ASSETS_DIR, 'generated/world/forest-ch1/entities.json');
    const writeMap = (mutate: (entities: { interactables: Array<{ id: string }> }) => void): string => {
      const worldDir = path.join(dir, 'world');
      mkdirSync(path.join(worldDir, 'forest-ch1'), { recursive: true });
      const entities = JSON.parse(readFileSync(forest, 'utf8')) as { interactables: Array<{ id: string }> };
      mutate(entities);
      writeFileSync(path.join(worldDir, 'forest-ch1/entities.json'), JSON.stringify(entities));
      return worldDir;
    };

    it('finds every target of the active chapter 1 quest on the generated forest map', () => {
      expect(checkQuestTargets(quests().values())).toEqual({ issues: [], notes: [] });
    });

    it('flags a target the map does not place', () => {
      const worldDir = writeMap((e) => (e.interactables = e.interactables.filter((t) => t.id !== 'clue-letter')));
      expect(checkQuestTargets(quests().values(), worldDir).issues).toEqual([
        'quest forest-ch1 step find-clues targets clue-letter, which map forest-ch1 does not place',
        'quest forest-ch1 step read-letter targets clue-letter, which map forest-ch1 does not place',
      ]);
    });

    it('notes, without failing, an active quest whose map is not generated yet; stubs are skipped', () => {
      const report = checkQuestTargets(quests().values(), path.join(dir, 'no-maps'));
      expect(report.issues).toEqual([]);
      expect(report.notes).toEqual(['quest forest-ch1: map targets not checked, region khu-rung-bi-mat chapter 1 has no generated map']);
    });
  });

  it('flags a JSON file nothing validates', () => {
    writeFileSync(path.join(dir, 'learning/extra.json'), '{}');
    writeFileSync(path.join(dir, 'quests/forest-ch3.JSON'), '{}');
    expect(checkContent(dir).issues).toEqual([
      'content/learning/extra.json has no validator: add it to the server catalogue or an asset tool',
      'content/quests/forest-ch3.JSON has no validator: add it to the server catalogue or an asset tool',
    ]);
  });

  it('flags a quest that breaks the schema or points at unknown content', () => {
    writeFileSync(path.join(dir, 'quests/forest-ch2.json'), JSON.stringify({ id: 'forest-ch2', region: 'r', chapter: 2, status: 'stub' }));
    expect(checkContent(dir).issues.join('\n')).toMatch(/invalid content file forest-ch2\.json/);
    const ch1 = path.join(dir, 'quests/forest-ch1.json');
    writeFileSync(ch1, JSON.stringify({ ...(JSON.parse(readFileSync(ch1, 'utf8')) as object), unlock: ['forest-ch9'] }));
    writeFileSync(path.join(dir, 'quests/forest-ch2.json'), JSON.stringify({ id: 'forest-ch2', region: 'r', chapter: 2, title: 't', status: 'stub' }));
    expect(checkContent(dir).issues.join('\n')).toMatch(/quest forest-ch1 unlocks unknown quest forest-ch9/);
  });
});
