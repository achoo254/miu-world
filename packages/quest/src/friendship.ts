// Friendship with the map's characters, shared by the server (which counts it) and the web app (which shows it):
// which story chapter a character offers, and which of its everyday lines fit the moment. Pure.
import type { NpcLine, NpcTime, NpcWeather, StoryArc, StoryOffer } from '@miu/schema/npc';

/**
 * The chapter a character offers when talked to: in each of its arcs the first chapter not finished yet; the first
 * one the friendship is close enough for (`ready`), else the first one still waiting for hearts. Null when every
 * chapter is finished (finished chapters stay in the quest list to play again).
 */
export function storyOffer(arcs: readonly StoryArc[], finished: ReadonlySet<string>, hearts: number): StoryOffer | null {
  let waiting: StoryOffer | null = null;
  for (const arc of arcs) {
    const index = arc.chapters.findIndex((c) => !finished.has(c.quest));
    const chapter = arc.chapters[index];
    if (!chapter) continue;
    const offer = { questId: chapter.quest, arcId: arc.id, part: index + 1, hearts: chapter.hearts };
    if (chapter.hearts <= hearts) return { ...offer, ready: true };
    waiting ??= { ...offer, ready: false };
  }
  return waiting;
}

export interface LineMoment {
  time: NpcTime;
  weather: NpcWeather;
  hearts: number;
}

/** Whether a line may be said at this moment: its tags (if any) match, and the friendship is close enough. */
export function lineFits(line: NpcLine, moment: LineMoment): boolean {
  return (line.when === undefined || line.when === moment.time) && (line.weather === undefined || line.weather === moment.weather) && (line.hearts ?? 0) <= moment.hearts;
}

/**
 * The lines a character may say now. Lines made for this moment (its time of day, its weather) come first, so a
 * chat in the rain is about the rain; the rest follow. Never empty while the character has an untagged line.
 */
export function momentLines(lines: readonly NpcLine[], moment: LineMoment): NpcLine[] {
  const fitting = lines.filter((line) => lineFits(line, moment));
  const timely = fitting.filter((line) => line.when !== undefined || line.weather !== undefined);
  return timely.length > 0 ? timely : fitting;
}
