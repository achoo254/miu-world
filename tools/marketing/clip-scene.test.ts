import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readLessonPageData } from '../../apps/web/lesson-page-data';
import { REPO_ROOT } from '../assets/asset-lib';
import { findClipScene, firstStop } from './clip-scene';
import { readClipSchedule } from './clip-schedule';

describe('the scene of a lesson', () => {
  it('is the region of its quest and the spot of the quest\'s first stop', () => {
    const scene = findClipScene('toan2-t1-b07');
    expect(scene).toMatchObject({ questId: 'toan2-cd2-b07', region: 'cho-phien', map: 'cho-phien', chapter: 1 });
    // The quest's first step goes to the bee, whose place on the map is the centre.
    expect(scene.center).toEqual([301.5, 13, 435.5]);
  });

  it('can be found for every lesson of the schedule, so every week\'s clip can be filmed', () => {
    for (const week of readClipSchedule().weeks) {
      for (const lessonId of Object.values(week.lessons)) expect(() => findClipScene(lessonId), lessonId).not.toThrow();
    }
  });

  it('can be found for every lesson that has a page', () => {
    for (const page of readLessonPageData(path.join(REPO_ROOT, 'content'))) expect(findClipScene(page.lessonId).region, page.lessonId).toBe(page.activities[0]?.region);
  });

  it('says so when a lesson has no quest', () => {
    expect(() => findClipScene('toan2-t1-b99')).toThrow(/no active quest/);
  });

  it('takes the first step place that is on the map and none when no place is', () => {
    const positions = new Map<string, readonly [number, number, number]>([['b', [1, 2, 3]], ['c', [4, 5, 6]]]);
    expect(firstStop(['a', 'b', 'c'], positions)).toEqual([1, 2, 3]);
    expect(firstStop(['a'], positions)).toBeNull();
    expect(firstStop([], positions)).toBeNull();
  });
});
