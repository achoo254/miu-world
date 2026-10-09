// "Bài hôm nay" (owner, 09/10/2026: the child plays only at home, every day): each Vietnam day the home points the
// player to one textbook lesson on another map, so the maps she loves less get their turn. Pure, so the web, a
// future app and the server word the same pick.

/** What the pick needs to know of one lesson quest of the player. */
export interface DailyLessonCandidate {
  id: string;
  region: string;
  /** Her progress on it: not started, some steps done, finished at least once. */
  state: 'open' | 'in-progress' | 'completed';
}

const DAY_MS = 86_400_000;

/** Days since 1970-01-01 of a calendar day (`YYYY-MM-DD`), the rotation's counter. */
export function dayNumber(day: string): number {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
}

/**
 * Today's lesson, or null when every lesson away from `home` is finished. A lesson she left halfway comes first
 * (among several, one per day in turn), so nothing stays abandoned; otherwise the maps that still have a lesson to play take turns day by day, each offering its first
 * lesson not played yet in catalogue order. The same lessons and day always give the same pick.
 */
export function dailyLesson(lessons: readonly DailyLessonCandidate[], day: string, home: string): DailyLessonCandidate | null {
  const away = lessons.filter((lesson) => lesson.region !== home);
  const n = dayNumber(day);
  const started = away.filter((lesson) => lesson.state === 'in-progress');
  if (started.length > 0) return started[n % started.length] ?? null;
  const regions: string[] = [];
  for (const lesson of away) if (lesson.state === 'open' && !regions.includes(lesson.region)) regions.push(lesson.region);
  const region = regions[n % Math.max(regions.length, 1)];
  return away.find((lesson) => lesson.region === region && lesson.state === 'open') ?? null;
}
