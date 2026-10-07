import { describe, expect, it } from 'vitest';
import { contentQuestBook } from '../../apps/server/src/multiplayer/bot-brain/quest-plan';
import { WalkStore } from '../../apps/server/src/multiplayer/bot-brain/walk-store';
import { LEARNING_SETTINGS, simulateMap } from './learning-report';

describe('the review page\'s measure of companion bots learning', () => {
  it('samples a fleet from nothing at a steady pace, the same every run, walking only where the child could', () => {
    const map = new WalkStore().get('truong-hoc');
    if (!map) throw new Error('no walk grid for truong-hoc');
    const book = contentQuestBook();
    const settings = { ...LEARNING_SETTINGS, bots: 2, minutes: 30 };
    const run = simulateMap('truong-hoc', map, book, settings);
    expect(run).toMatchObject({ map: 'truong-hoc', bots: 2, places: map.places.length, badSteps: 0 });
    expect(run.quests).toBeGreaterThan(0);
    expect(run.samples.map((s) => s.minute)).toEqual([10, 20, 30]);
    // What it knows only grows; shortcuts and steps only add up; shares stay shares.
    for (const [i, s] of run.samples.entries()) {
      const before = run.samples[i - 1];
      expect(s.placesKnown).toBeGreaterThan(0);
      expect(s.placesKnown).toBeLessThanOrEqual(map.places.length);
      expect(s.stuckShare).toBeGreaterThanOrEqual(0);
      expect(s.stuckShare).toBeLessThan(1);
      if (!before) continue;
      expect(s.placesKnown).toBeGreaterThanOrEqual(before.placesKnown);
      expect(s.shortcuts).toBeGreaterThanOrEqual(before.shortcuts);
      expect(s.stepsDone).toBeGreaterThanOrEqual(before.stepsDone);
      expect(s.firstTrips + s.againTrips).toBeGreaterThanOrEqual(before.firstTrips + before.againTrips);
    }
    // A measure, not a dice roll: the same seeds give the same numbers.
    expect(simulateMap('truong-hoc', map, book, settings)).toEqual(run);
  });
});
