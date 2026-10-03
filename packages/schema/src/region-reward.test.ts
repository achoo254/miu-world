import { describe, expect, it } from 'vitest';
import { RegionRewardCatalog, regionRewardIssues, regionRewardOfSource, regionRewardSource, type RegionRewardContext } from './region-reward';

const catalog = RegionRewardCatalog.parse({
  version: 1,
  minigameGoal: 10,
  regions: [
    {
      region: 'nui-tuyet',
      title: 'Nhà leo núi tuyết',
      half: { coin: 25, xp: 35 },
      full: { coin: 90, xp: 115, item: 'hat-snow' },
      stars: { coin: 68, xp: 90, item: 'wings-snow' },
      minigames: { coin: 60, xp: 40 },
    },
  ],
});

const context = (over: Partial<RegionRewardContext> = {}): RegionRewardContext => ({
  regions: new Map([
    ['nui-tuyet', { open: true }],
    ['sap-co', { open: false }],
  ]),
  wearables: new Map([
    ['hat-snow', { region: 'nui-tuyet' }],
    ['wings-snow', { region: 'nui-tuyet' }],
    ['hat-free', { region: undefined }],
  ]),
  ...over,
});

describe('region reward sources', () => {
  it('names a tier of a region and reads it back; other sources are not chests', () => {
    expect(regionRewardSource('nui-tuyet', 'full')).toBe('region:nui-tuyet:full');
    expect(regionRewardOfSource('region:nui-tuyet:full')).toEqual({ region: 'nui-tuyet', tier: 'full' });
    expect(regionRewardOfSource('region:nui-tuyet:gold')).toBeNull();
    expect(regionRewardOfSource('quest:forest-ch1')).toBeNull();
  });
});

describe('region reward catalogue', () => {
  it('fits content whose region wearables are all given by their chest', () => {
    expect(regionRewardIssues(catalog, context())).toEqual([]);
    expect(regionRewardIssues(catalog, context({ lessons: new Map([['nui-tuyet', 1]]) }))).toEqual([]);
  });

  it('reports open regions without a chest, foreign or unknown items, and orphan region wearables', () => {
    const issues = regionRewardIssues(
      catalog,
      context({
        regions: new Map([
          ['nui-tuyet', { open: true }],
          ['dao-bi-an', { open: true }],
        ]),
        wearables: new Map([
          ['hat-snow', { region: 'dao-bi-an' }],
          ['wings-snow', { region: 'nui-tuyet' }],
          ['hat-island', { region: 'dao-bi-an' }],
        ]),
        lessons: new Map(),
      }),
    );
    expect(issues).toEqual([
      'region nui-tuyet has a chest but no lesson quest to earn it',
      'region nui-tuyet gives hat-snow: the accessory must say "unlock": { "region": "nui-tuyet" }',
      'open region dao-bi-an has no chest in content/region-rewards.json',
      'accessory hat-snow opens with the chest of dao-bi-an, which does not give it',
      'accessory hat-island opens with the chest of dao-bi-an, which does not give it',
    ]);
  });

  it('refuses a region listed twice and rewards out of range', () => {
    const entry = catalog.regions[0];
    expect(RegionRewardCatalog.safeParse({ ...catalog, regions: [entry, entry] }).success).toBe(false);
    expect(RegionRewardCatalog.safeParse({ ...catalog, regions: [{ ...entry, half: { coin: -1, xp: 0 } }] }).success).toBe(false);
  });
});
