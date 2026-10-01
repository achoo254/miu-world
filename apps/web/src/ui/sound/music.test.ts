import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import regions from '../../../../../content/world/regions.json';
import { REGION_MUSIC } from '../region/regions';
import { MUSIC_MOODS, MUSIC_PATHS, MUSIC_SOURCE_DIR, MUSIC_TRACKS, type MusicMood } from './music';
import { nextTrack, playMood } from './music-player';

const SOURCES = path.resolve(import.meta.dirname, '../../../../../tools/assets/sources.json');

describe('music catalogue', () => {
  it('offers a few dozen tracks, each scene with its own pool', () => {
    expect(MUSIC_TRACKS.length).toBeGreaterThanOrEqual(30);
    for (const pool of Object.values(MUSIC_MOODS)) expect(pool.length).toBeGreaterThanOrEqual(3);
    expect(MUSIC_PATHS.every((p) => /^generated\/music\/[a-z0-9-]+\.m4a$/.test(p))).toBe(true);
  });

  it('takes every track from a CC0 pack file declared in sources.json', () => {
    const sources = JSON.parse(readFileSync(SOURCES, 'utf8')) as { packs: Array<{ id: string; version: string; license: string; files?: Array<{ to: string }> }> };
    const declared = new Set(
      sources.packs.flatMap((p) => (p.license === 'CC0-1.0' ? (p.files ?? []).map((f) => `packs/${p.id}/${p.version}/${f.to}`) : [])),
    );
    for (const track of MUSIC_TRACKS) expect(declared).toContain(`${MUSIC_SOURCE_DIR}/${track}.mp3`);
  });

  it('gives every open region a walking pool', () => {
    const open = (regions as { regions: Array<{ id: string; status: string; music?: string }> }).regions.filter((r) => r.status === 'open');
    for (const region of open) expect(Object.keys(MUSIC_MOODS)).toContain(region.music);
    for (const region of open) expect(REGION_MUSIC[region.id]).toBe(region.music);
  });
});

describe('nextTrack', () => {
  it('plays a whole pool before repeating and never the same track twice in a row', () => {
    const mood: MusicMood = 'quest';
    const pool = MUSIC_MOODS[mood].length;
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const played = Array.from({ length: pool * 6 }, () => nextTrack(mood, random));
    for (let round = 0; round < 6; round++) expect(new Set(played.slice(round * pool, (round + 1) * pool)).size).toBe(pool);
    played.forEach((track, i) => i > 0 && expect(track).not.toBe(played[i - 1]));
  });
});

describe('playMood', () => {
  const scene = { region: 'truong-hoc', questStarted: false, learning: false, finished: false };
  it('walks to the region music, adventures once a quest is under way, thinks on a learning step and cheers at the end', () => {
    expect(playMood(scene, REGION_MUSIC)).toBe('school');
    expect(playMood({ ...scene, region: 'khu-rung-bi-mat' }, REGION_MUSIC)).toBe('forest');
    expect(playMood({ ...scene, region: 'somewhere-new' }, REGION_MUSIC)).toBe('forest');
    expect(playMood({ ...scene, questStarted: true }, REGION_MUSIC)).toBe('quest');
    expect(playMood({ ...scene, questStarted: true, learning: true }, REGION_MUSIC)).toBe('puzzle');
    expect(playMood({ ...scene, questStarted: true, learning: true, finished: true }, REGION_MUSIC)).toBe('win');
  });
});
