import { describe, expect, it } from 'vitest';
import type { NpcLine, StoryArc } from '@miu/schema/npc';
import { lineFits, momentLines, storyOffer } from './friendship';

const bi = { vi: 'x', en: 'x' };
const letter = { from: 'a', title: bi, body: bi, reward: { coins: 0, xp: 0, items: {} } };
const arc = (id: string, hearts: number[]): StoryArc => ({ id, npc: 'a', title: bi, teaser: bi, chapters: hearts.map((h, i) => ({ quest: `${id}-${i + 1}`, hearts: h, letter })) });

describe('story offer', () => {
  const arcs = [arc('one', [0, 2, 3]), arc('two', [0, 1, 4])];
  it('offers the first unfinished chapter the friendship is close enough for', () => {
    expect(storyOffer(arcs, new Set(), 0)).toEqual({ questId: 'one-1', arcId: 'one', part: 1, hearts: 0, ready: true });
    expect(storyOffer(arcs, new Set(['one-1']), 1)).toEqual({ questId: 'two-1', arcId: 'two', part: 1, hearts: 0, ready: true });
    expect(storyOffer(arcs, new Set(['one-1', 'two-1']), 1)).toEqual({ questId: 'two-2', arcId: 'two', part: 2, hearts: 1, ready: true });
  });
  it('names the chapter still waiting for hearts, and nothing once every chapter is finished', () => {
    expect(storyOffer(arcs, new Set(['one-1', 'two-1', 'two-2']), 1)).toEqual({ questId: 'one-2', arcId: 'one', part: 2, hearts: 2, ready: false });
    expect(storyOffer([arc('one', [0, 0, 0])], new Set(['one-1', 'one-2', 'one-3']), 5)).toBeNull();
  });
});

describe('everyday lines', () => {
  const lines: NpcLine[] = [
    { vi: 'sáng', en: 'morning', when: 'morning' },
    { vi: 'mưa', en: 'rain', weather: 'rain' },
    { vi: 'bạn thân', en: 'friend', hearts: 3 },
    { vi: 'thường', en: 'plain' },
  ];
  it('says what fits the moment, lines made for the moment first', () => {
    expect(lineFits(lines[2] as NpcLine, { time: 'night', weather: 'fine', hearts: 2 })).toBe(false);
    expect(momentLines(lines, { time: 'morning', weather: 'fine', hearts: 0 }).map((l) => l.en)).toEqual(['morning']);
    expect(momentLines(lines, { time: 'night', weather: 'rain', hearts: 0 }).map((l) => l.en)).toEqual(['rain']);
    expect(momentLines(lines, { time: 'night', weather: 'fine', hearts: 3 }).map((l) => l.en)).toEqual(['friend', 'plain']);
  });
});
