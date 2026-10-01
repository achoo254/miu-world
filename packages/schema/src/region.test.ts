import { describe, expect, it } from 'vitest';
import { RegionCatalog, defaultRegion, mapForRegion, playableMaps, regionGuides } from './region';

const hotspot = { x: 10, y: 10 };
const catalog = RegionCatalog.parse({
  version: 1,
  regions: [
    { id: 'house', name: 'Nhà', tagline: 't', status: 'soon', hotspot },
    { id: 'forest', name: 'Rừng', tagline: 't', status: 'open', map: 'forest-map', music: 'forest', guide: 'parrot', hotspot },
    { id: 'school', name: 'Trường', tagline: 't', status: 'open', map: 'school-map', music: 'school', hotspot },
  ],
});

describe('region catalogue', () => {
  it('plays each region in its own map, and anything else in the first open region', () => {
    expect(defaultRegion(catalog).id).toBe('forest');
    expect(mapForRegion(catalog, 'school')).toBe('school-map');
    expect(mapForRegion(catalog, 'house')).toBe('forest-map');
    expect(mapForRegion(catalog, 'nowhere')).toBe('forest-map');
    expect(playableMaps(catalog)).toEqual(['forest-map', 'school-map']);
    expect(regionGuides(catalog)).toEqual({ forest: 'parrot' });
  });

  it('refuses an open region without a map or music, and a catalogue with nothing open', () => {
    const open = { id: 'a', name: 'A', tagline: 't', status: 'open', hotspot };
    expect(RegionCatalog.safeParse({ version: 1, regions: [{ ...open, music: 'forest' }] }).success).toBe(false);
    expect(RegionCatalog.safeParse({ version: 1, regions: [{ ...open, map: 'a' }] }).success).toBe(false);
    expect(RegionCatalog.safeParse({ version: 1, regions: [{ ...open, status: 'soon' }] }).success).toBe(false);
  });
});
