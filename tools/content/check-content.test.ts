import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CONTENT_DIR, loadContentCatalog } from '../../apps/server/src/content/content-catalog';
import { ASSETS_DIR } from '../assets/asset-lib';
import { LOOK_CAP, checkAccessories, checkContent, checkEmojiProps, checkLessonLooks, checkQuestTargets, checkTargetCatalogues } from './check-content';

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

  it('flags quest story text that names another region, but not the textbook wording or where the story goes next', () => {
    const file = path.join(dir, 'quests/toan2-cd1-b01.json');
    const quest = JSON.parse(readFileSync(file, 'utf8')) as { summary: string; steps: Array<{ kind: string; text?: string }> };
    quest.summary = `${quest.summary} Rồi cả lớp ra Khu rừng bí mật.`;
    const next = quest.steps.find((s) => s.kind === 'next');
    if (next) next.text = 'Mai mình vào Khu rừng bí mật nhé.';
    writeFileSync(file, JSON.stringify(quest));
    expect(checkContent(dir).issues).toEqual(['quest toan2-cd1-b01 summary names Khu rừng bí mật, another region: tell the story where the quest is']);
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
    expect(issues).toContain('quest tv2-t10-b17 is in region khu-rung-bi-mat, which is not an open region');
    expect(issues.filter((i) => i.includes('not an open region')).every((i) => i.includes('khu-rung-bi-mat'))).toBe(true);
    writeFileSync(file, JSON.stringify({ version: 1, regions: [{ ...forest, status: 'level' }] }));
    // No region is locked behind a level any more: the old "level" status is refused.
    expect(checkContent(dir).issues.join('\n')).toMatch(/regions\.json/);
  });

  it('flags an open region without a map or music, a map not generated, an unknown music pool or guide', () => {
    const file = path.join(dir, 'world/regions.json');
    const regions = JSON.parse(readFileSync(file, 'utf8')) as { regions: Array<Record<string, unknown>> };
    const forest = regions.regions.find((r) => r.id === 'khu-rung-bi-mat');
    if (!forest) throw new Error('fixture regions missing');
    const { map: _map, ...noMap } = forest;
    writeFileSync(file, JSON.stringify({ ...regions, regions: regions.regions.map((r) => (r === forest ? noMap : r)) }));
    expect(checkContent(dir).issues.join('\n')).toMatch(/an open region needs a map and music/);
    Object.assign(forest, { map: 'no-such-map', music: 'disco', guide: 'nobody' });
    writeFileSync(file, JSON.stringify(regions));
    expect(checkContent(dir).issues).toEqual(
      expect.arrayContaining([
        'region khu-rung-bi-mat: map no-such-map is not generated (assets/generated/world/no-such-map)',
        'region khu-rung-bi-mat: music disco is not a mood of the music catalogue',
        'region khu-rung-bi-mat: guide nobody is not in content/world/targets.json',
      ]),
    );
  });

  it('flags a privacy page that does not match the consent parents accept', () => {
    const consent = path.join(dir, 'legal/consent-vi.json');
    writeFileSync(consent, readFileSync(consent, 'utf8').replace('"version": "v2"', '"version": "v3"'));
    expect(checkContent(dir).issues).toEqual([
      'content/legal/privacy-vi.json describes consent v2, but parents are asked to accept v3: update the page with the consent',
    ]);
    writeFileSync(path.join(dir, 'legal/privacy-vi.json'), JSON.stringify({ title: 'x', updatedOn: 'hôm nay', consentVersion: 'v3', contactEmail: null, sections: [] }));
    expect(checkContent(dir).issues.join('\n')).toMatch(/privacy-vi\.json: .*updatedOn/s);
  });

  it('flags an accessory that unlocks with an unknown quest', () => {
    writeFileSync(path.join(dir, 'accessories/hat-ghost.json'), JSON.stringify({ id: 'hat-ghost', name: 'Mũ ma', variantOf: 'hat-witch-pink', variant: 'mint', unlock: { quest: 'forest-ch9' } }));
    expect(checkContent(dir).issues).toEqual([
      'accessory hat-ghost unlocks with unknown quest forest-ch9',
      'accessory hat-ghost has no picture generated/accessories/hat-ghost.png: run pnpm assets:accessories',
    ]);
  });

  it('flags a slot offering fewer than 20 items from level 1', () => {
    const catalog = loadContentCatalog();
    const art = new Set([...catalog.accessories.keys()].map((id) => `generated/accessories/${id}.png`));
    expect(checkAccessories(catalog.accessories.values(), new Set(catalog.quests.keys()), art)).toEqual([]);
    let openShoes = 0;
    const fewerShoes = [...catalog.accessories.values()].filter((item) => item.slot !== 'shoes' || item.unlock || openShoes++ < 5);
    expect(checkAccessories(fewerShoes, new Set(catalog.quests.keys()), art)).toEqual([expect.stringMatching(/^accessory slot shoes offers \d+ items from level 1, needs at least 20$/)]);
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

    it('flags a character standing in the world twice while one lesson is played', () => {
      const worldDir = writeMap((e) => {
        for (const t of e.interactables as Array<{ id: string; character?: string }>) if (t.id === 'tv2-t12-cay-gao-cao') delete t.character;
      });
      expect(checkQuestTargets(quests().values(), worldDir).issues).toContainEqual(
        expect.stringMatching(/^quest tv2-t12-b21: Khỉ Lanh stands in the world twice \((khi-lanh, tv2-t12-cay-gao-cao|tv2-t12-cay-gao-cao, khi-lanh)\); name one as the other's "character"/),
      );
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
    const quest = JSON.parse(readFileSync(ch1, 'utf8')) as { reward: object };
    writeFileSync(ch1, JSON.stringify({ ...quest, reward: { ...quest.reward, skillXp: { bay: 1 } } }));
    writeFileSync(path.join(dir, 'quests/forest-ch2.json'), JSON.stringify({ id: 'forest-ch2', region: 'r', chapter: 2, title: 't', status: 'stub' }));
    expect(checkContent(dir).issues.join('\n')).toMatch(/quest forest-ch1 rewards unknown skill bay/);
  });
});

describe('quest looks', () => {
  const read = (rel: string) => JSON.parse(readFileSync(path.join(CONTENT_DIR, rel), 'utf8')) as Record<string, Record<string, Record<string, unknown>>>;
  const object = { model: 'packs/p/box.glb', height: 0.7, kind: 'object', label: 'Xem' };
  const npc = { model: 'packs/p/fox.glb', height: 1.2, kind: 'npc', label: 'Nói chuyện' };
  const models = new Set(['packs/p/box.glb', 'packs/p/fox.glb']);
  const catalogue = (targets: Record<string, unknown>) => ({ version: 1, targets });

  it('lets one look draw at most LOOK_CAP different things; a series of one name counts once', () => {
    const looks = { version: 1, looks: { box: object } };
    const many = Object.fromEntries(Array.from({ length: LOOK_CAP + 1 }, (_, i) => [`thing-${i}`, { name: `Hộp ${i}`, look: 'box' }]));
    const series = Object.fromEntries(Array.from({ length: LOOK_CAP + 1 }, (_, i) => [`ve-${i}`, { name: 'Vé lá vàng', look: 'box' }]));
    expect(checkTargetCatalogues(looks, catalogue(many), models)).toEqual([`look box draws ${LOOK_CAP + 1} different things (at most ${LOOK_CAP}): give some of them a look of their own`]);
    expect(checkTargetCatalogues(looks, catalogue(series), models)).toEqual([]);
  });

  it('counts the places one character is met at as one character, and checks what `character` names', () => {
    const looks = { version: 1, looks: { fox: npc, box: object } };
    const cast = Object.fromEntries(Array.from({ length: LOOK_CAP + 1 }, (_, i) => [`cao-lem-${i}`, { name: 'Cáo Lém', look: 'fox', ...(i > 0 ? { character: 'cao-lem-0' } : {}) }]));
    expect(checkTargetCatalogues(looks, catalogue(cast), models)).toEqual([]);
    const wrong = { 'cao-lem': { name: 'Cáo Lém', look: 'fox' }, 'trong-tai': { name: 'Thỏ Tí', look: 'fox', character: 'cao-lem' } };
    expect(checkTargetCatalogues(looks, catalogue(wrong), models)).toEqual(['target trong-tai: character cao-lem must be another entry named "Thỏ Tí", drawn as a character, with no character of its own']);
  });

  it('flags things of one lesson that the child tells apart by name but that look alike', () => {
    const targets = read('world/targets.json');
    const looks = read('world/looks.json');
    const quests = [...loadContentCatalog().quests.values()];
    expect(checkLessonLooks(quests, looks, targets)).toEqual([]);
    const red = targets.targets?.['toan2-cd1-phong-bi-do'];
    if (red) red.look = 'envelope-yellow';
    expect(checkLessonLooks(quests, looks, targets)).toEqual(['quest toan2-cd1-b05: Phong bì đỏ, Phong bì vàng all look like envelope-yellow']);
  });

  it('needs a picture for every emoji prop, and a prop for every look built from one', () => {
    const looks = { version: 1, looks: { envelope: { ...object, model: 'generated/props/envelope.glb' }, ticket: { ...object, model: 'generated/props/ticket.glb' } } };
    const props = { version: 1, props: { envelope: { emoji: 'envelope' }, kite: { emoji: 'kite' } } };
    expect(checkEmojiProps(props, looks, new Set(['envelope']))).toEqual([
      'emoji prop kite: no picture props/kite.png in the fluent-emoji pack (sources.json)',
      'look ticket: generated/props/ticket.glb has no entry in content/world/emoji-props.json',
    ]);
  });
});
