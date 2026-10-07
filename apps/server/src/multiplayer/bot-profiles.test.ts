import { describe, expect, it } from 'vitest';
import { BOT_MAP_CONFIGS, findBot } from './bot-profiles';

/** Every bot that ever was: friendships and the bots' skills and memories in the database name these ids. */
const BOT_IDS = [
  'bot-tt-1', 'bot-tt-2', 'bot-tt-3', 'bot-tt-4', 'bot-tt-5', 'bot-tt-6', 'bot-tt-7', 'bot-tt-8', 'bot-tt-9',
  'bot-tt-10', 'bot-tt-11', 'bot-tt-12', 'bot-tt-13', 'bot-tt-14', 'bot-tt-15', 'bot-tt-16', 'bot-tt-17',
  'bot-tt-18', 'bot-tt-19', 'bot-tt-20', 'bot-tt-21', 'bot-tt-22', 'bot-tt-23', 'bot-tt-24', 'bot-th-1', 'bot-th-2',
  'bot-th-3', 'bot-th-4', 'bot-th-5', 'bot-th-6', 'bot-th-7', 'bot-th-8', 'bot-th-9', 'bot-th-10', 'bot-cp-1',
  'bot-cp-2', 'bot-cp-3', 'bot-cp-4', 'bot-cp-5', 'bot-cp-6', 'bot-cp-7', 'bot-cp-8', 'bot-cp-9', 'bot-cp-10',
  'bot-lvs-1', 'bot-lvs-2', 'bot-lvs-3', 'bot-lvs-4', 'bot-lvs-5', 'bot-lvs-6', 'bot-lvs-7', 'bot-lvs-8',
  'bot-nt-1', 'bot-nt-2', 'bot-nt-3', 'bot-nt-4', 'bot-nt-5', 'bot-nt-6', 'bot-nt-7', 'bot-nt-8', 'bot-kr-1',
  'bot-kr-2', 'bot-kr-3', 'bot-kr-4', 'bot-kr-5', 'bot-kr-6', 'bot-kr-7', 'bot-kr-8', 'bot-tv-1', 'bot-tv-2',
  'bot-tv-3', 'bot-tv-4', 'bot-tv-5', 'bot-tv-6', 'bot-tv-7', 'bot-tv-8', 'bot-ld-1', 'bot-ld-2', 'bot-ld-3',
  'bot-ld-4', 'bot-ld-5', 'bot-ld-6', 'bot-ld-7', 'bot-ld-8', 'bot-xma-1', 'bot-xma-2', 'bot-xma-3', 'bot-xma-4',
  'bot-xma-5', 'bot-xma-6', 'bot-xma-7', 'bot-xma-8', 'bot-ntu-1', 'bot-ntu-2', 'bot-ntu-3', 'bot-ntu-4',
  'bot-ntu-5', 'bot-ntu-6', 'bot-ntu-7', 'bot-ntu-8', 'bot-dba-1', 'bot-dba-2', 'bot-dba-3', 'bot-dba-4',
  'bot-dba-5', 'bot-dba-6', 'bot-dba-7', 'bot-dba-8', 'bot-ncb-1', 'bot-ncb-2', 'bot-ncb-3', 'bot-ncb-4',
];

describe('the companion bots', () => {
  it('are the same bots as ever: no id added, dropped or renamed', () => {
    const ids = Object.values(BOT_MAP_CONFIGS).flatMap((profiles) => profiles.map((p) => p.id));
    expect(ids).toHaveLength(BOT_IDS.length);
    expect(new Set(ids)).toEqual(new Set(BOT_IDS));
  });

  it('each have a home on their map, and are found by id with the map they live on', () => {
    for (const [mapId, profiles] of Object.entries(BOT_MAP_CONFIGS)) {
      for (const profile of profiles) {
        expect([profile.home.x, profile.home.y, profile.home.z].every(Number.isFinite), profile.id).toBe(true);
        expect(findBot(profile.id)).toEqual({ profile, mapId });
      }
    }
    expect(findBot('bot-nobody')).toBeNull();
  });
});
