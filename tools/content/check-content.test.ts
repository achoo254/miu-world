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
  it('passes the shipped content', () => {
    expect(checkContent().issues).toEqual([]);
  });

  it('flags a rewarded item with no description, a bad icon, and a misnamed item file', () => {
    rmSync(path.join(dir, 'items/la-than.json'));
    expect(checkContent(dir).issues).toEqual(['quest forest-ch1 rewards item la-than, which content/items does not describe']);
    const item = { id: 'la-than', name: 'Lá thần', description: 'Lá sáng.', usedIn: 'Chương sau.', kind: 'quest', icon: 'dragon' };
    writeFileSync(path.join(dir, 'items/leaf.json'), JSON.stringify(item));
    expect(checkContent(dir).issues).toEqual([
      'content/items/leaf.json: file name must be la-than.json',
      'item la-than uses icon "dragon", which the UI does not ship',
    ]);
  });

  it('flags quest text that calls the player "Miu" instead of the character name', () => {
    const ch1 = path.join(dir, 'quests/forest-ch1.json');
    writeFileSync(ch1, readFileSync(ch1, 'utf8').replace('Chào {name}! Cây cổ thụ', 'Chào Miu! Cây cổ thụ'));
    expect(checkContent(dir).issues).toEqual(['quest forest-ch1 steps[0].lines[0].text says "Miu" instead of {name}']);
  });

  it('flags regions that break the schema, say "Miu", or do not match the quests', () => {
    const file = path.join(dir, 'world/regions.json');
    const regions = JSON.parse(readFileSync(file, 'utf8')) as { regions: Array<{ id: string; name: string; status: string }> };
    const forest = regions.regions.find((r) => r.id === 'khu-rung-bi-mat');
    const home = regions.regions.find((r) => r.id === 'nha-cua-be');
    if (!forest || !home) throw new Error('fixture regions missing');
    forest.status = 'soon';
    home.name = 'Nhà của Miu';
    writeFileSync(file, JSON.stringify(regions));
    const issues = checkContent(dir).issues;
    expect(issues[0]).toBe('region nha-cua-be says "Miu" instead of {name}');
    // Every quest of the forest (chapter 1 and the Tiếng Việt lessons) now sits in a region that is not open.
    expect(issues).toContain('quest forest-ch1 is in region khu-rung-bi-mat, which is not an open region');
    expect(issues).toContain('quest tv2-t01-b01 is in region khu-rung-bi-mat, which is not an open region');
    expect(issues.filter((i) => i.includes('not an open region')).every((i) => i.includes('khu-rung-bi-mat'))).toBe(true);
    writeFileSync(file, JSON.stringify({ version: 1, regions: [{ ...forest, status: 'level' }] }));
    expect(checkContent(dir).issues.join('\n')).toMatch(/level goes with status/);
  });

  it('flags a privacy page that does not match the consent parents accept', () => {
    const consent = path.join(dir, 'legal/consent-vi.json');
    writeFileSync(consent, readFileSync(consent, 'utf8').replace('"version": "v1"', '"version": "v2"'));
    expect(checkContent(dir).issues).toEqual([
      'content/legal/privacy-vi.json describes consent v1, but parents are asked to accept v2: update the page with the consent',
    ]);
    writeFileSync(path.join(dir, 'legal/privacy-vi.json'), JSON.stringify({ title: 'x', updatedOn: 'hôm nay', consentVersion: 'v2', contactEmail: null, sections: [] }));
    expect(checkContent(dir).issues.join('\n')).toMatch(/privacy-vi\.json: .*updatedOn/s);
  });

  it('flags an accessory that unlocks with an unknown quest', () => {
    writeFileSync(path.join(dir, 'accessories/hat-ghost.json'), JSON.stringify({ id: 'hat-ghost', name: 'Mũ ma', variantOf: 'hat-witch-pink', variant: 'mint', unlock: { quest: 'forest-ch9' } }));
    expect(checkContent(dir).issues).toEqual(['accessory hat-ghost unlocks with unknown quest forest-ch9']);
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

    it('flags a riddle whose board on the map no longer matches the question', () => {
      const worldDir = writeMap((e) => {
        const tree = (e.interactables as Array<{ id: string; board?: string }>).find((t) => t.id === 'ancient-tree');
        if (tree) tree.board = '7 + 6 = ?';
      });
      expect(checkQuestTargets(quests().values(), worldDir).issues).toEqual([
        'quest forest-ch1 step tree-riddle: the board on ancient-tree reads "7 + 6 = ?", which the question does not contain',
      ]);
    });

    it('notes, without failing, an active quest whose map is not generated yet; stubs are skipped', () => {
      const report = checkQuestTargets(quests().values(), path.join(dir, 'no-maps'));
      expect(report.issues).toEqual([]);
      expect(report.notes).toContain('quest forest-ch1: map targets not checked, region khu-rung-bi-mat chapter 1 has no generated map');
      expect(report.notes).toContain('quest toan2-cd1-b01: map targets not checked, region truong-hoc chapter 1 has no generated map');
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
