// Sentence train: a picture shows what happens, and the words of its sentence wait on the siding in wagons, out
// of order. The child taps the wagons in the order of the sentence: each right one rolls up behind the engine;
// a wrong one makes the train back up a wagon (the last one rolls back to the siding) and rest a moment. A whole sentence toots
// and drives off (a point) and the next train comes in. The first word starts with a capital letter and the
// last one ends with a full stop. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Sentence {
  words: readonly string[];
  /** Pictures for the scene, by index into draw.ts's picture list (-1: the child's own character). */
  scene: readonly number[];
}

/** Short sentences about a picture, three words (wagons) then four. */
export const SENTENCES: readonly Sentence[] = [
  { words: ['Con mèo', 'bắt', 'chuột.'], scene: [0, 1] },
  { words: ['Bé', 'tưới', 'cây.'], scene: [-1, 2, 3] },
  { words: ['Gà mẹ', 'dẫn', 'đàn con.'], scene: [4, 5] },
  { words: ['Chú chó', 'đuổi', 'quả bóng.'], scene: [6, 7] },
  { words: ['Đàn cá', 'bơi', 'dưới nước.'], scene: [8, 9] },
  { words: ['Chim', 'hót', 'trên cành.'], scene: [10, 11] },
  { words: ['Mẹ', 'nấu', 'cơm.'], scene: [12] },
  { words: ['Bạn nhỏ', 'thả', 'diều.'], scene: [-1, 13] },
  { words: ['Ong', 'hút', 'mật hoa.'], scene: [14, 15] },
  { words: ['Vịt', 'bơi', 'trên ao.'], scene: [16, 17] },
  { words: ['Thỏ', 'ăn', 'cà rốt.'], scene: [18, 19] },
  { words: ['Bò', 'ăn', 'cỏ.'], scene: [20, 21] },
  { words: ['Em', 'đi', 'xe đạp.'], scene: [-1, 22] },
  { words: ['Trời', 'đổ', 'mưa.'], scene: [23, 3] },
  { words: ['Khỉ', 'ăn', 'chuối.'], scene: [24, 25] },
  { words: ['Bướm', 'đậu', 'trên hoa.'], scene: [26, 27] },
  { words: ['Ếch', 'nhảy', 'xuống ao.'], scene: [28, 17] },
  { words: ['Bé', 'cho', 'gà', 'ăn thóc.'], scene: [-1, 4, 29] },
  { words: ['Chim', 'làm', 'tổ', 'trên cây.'], scene: [10, 11] },
  { words: ['Bé', 'tặng', 'mẹ', 'bó hoa.'], scene: [-1, 27, 30] },
  { words: ['Gấu', 'thích', 'ăn', 'mật ong.'], scene: [31, 14] },
  { words: ['Mèo', 'nằm', 'sưởi', 'nắng.'], scene: [0, 32] },
];
const THREE_WORD_FIRST = 4;
const DRIVE_SECONDS = 1.3;
/** Seconds taps rest after a wrong wagon, more after wrong ones in a row (so guessing does not pay). */
const BACK_SECONDS = 0.8;
const MAX_BACK_SECONDS = 3;
const NOTES = [67, 72, 76, 79];

export interface Wagon {
  word: string;
  /** Its place in the sentence. */
  order: number;
  w: number;
  /** Where it waits on the siding. */
  home: Point;
  attached: boolean;
  /** When it was attached or rolled back (animations). */
  movedAt: number;
  shakeAt: number;
}

export interface SentenceTrainState {
  sentence: number;
  wagons: Wagon[];
  /** How many are behind the engine. */
  built: number;
  phase: 'build' | 'drive';
  phaseAgo: number;
  /** Taps are not taken until then (after a wrong wagon). */
  lockedUntil: number;
  wrongStreak: number;
  trackY: number;
  sceneY: number;
  wagonH: number;
  queue: number[];
  trains: number;
  lastTapAt: number;
  score: number;
  time: number;
}

/** Width of a wagon for a word (letters are about 17 units wide at the wagons' size). */
export const wagonWidth = (word: string): number => Math.max(110, 34 + word.length * 18);

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = items[i];
    const b = items[j];
    if (a !== undefined && b !== undefined) {
      items[i] = b;
      items[j] = a;
    }
  }
  return items;
}

export function createSentenceTrain({ arena, rng }: GameSetup): MinigameLogic<SentenceTrainState> {
  const events = eventQueue();
  const free = arena.height - HUD_SAFE_TOP;
  const wagonH = 78;
  const sceneY = HUD_SAFE_TOP + Math.min(80, free * 0.14);
  const trackY = sceneY + Math.min(150, free * 0.26);
  const sidingTop = trackY + Math.min(160, free * 0.25);
  const state: SentenceTrainState = {
    sentence: 0,
    wagons: [],
    built: 0,
    phase: 'build',
    phaseAgo: 0,
    lockedUntil: 0,
    wrongStreak: 0,
    trackY,
    sceneY,
    wagonH,
    queue: [],
    trains: 0,
    lastTapAt: -9,
    score: 0,
    time: 0,
  };

  const arrive = (): void => {
    if (state.queue.length === 0) {
      const three = SENTENCES.map((s, i) => (s.words.length === 3 ? i : -1)).filter((i) => i >= 0);
      const all = SENTENCES.map((_, i) => i);
      const start = state.trains === 0 ? shuffle(three, rng).slice(0, THREE_WORD_FIRST) : [];
      state.queue = [...start, ...shuffle(all.filter((i) => !start.includes(i)), rng)];
    }
    state.sentence = state.queue.shift() ?? 0;
    const words = SENTENCES[state.sentence]?.words ?? [];
    let order = shuffle(
      words.map((_, i) => i),
      rng,
    );
    if (order.every((v, i) => v === i)) order = [...order.slice(1), ...order.slice(0, 1)];
    // Siding rows: as many wagons as fit across, centred.
    const rows: number[][] = [[]];
    let rowW = 0;
    for (const i of order) {
      const w = wagonWidth(words[i] ?? '') + 24;
      const row = rows[rows.length - 1];
      if (row && row.length > 0 && rowW + w > arena.width - 30) {
        rows.push([]);
        rowW = 0;
      }
      rows[rows.length - 1]?.push(i);
      rowW += w;
    }
    const wagons: Wagon[] = [];
    rows.forEach((row, r) => {
      const total = row.reduce((s, i) => s + wagonWidth(words[i] ?? '') + 24, -24);
      let x = (arena.width - total) / 2;
      for (const i of row) {
        const w = wagonWidth(words[i] ?? '');
        wagons.push({ word: words[i] ?? '', order: i, w, home: { x: x + w / 2, y: sidingTop + r * (wagonH + 40) + wagonH / 2 }, attached: false, movedAt: -9, shakeAt: -9 });
        x += w + 24;
      }
    });
    state.wagons = wagons;
    state.built = 0;
    state.phase = 'build';
    state.phaseAgo = 0;
  };

  const wagonAt = (p: Point): Wagon | undefined => state.wagons.find((w) => !w.attached && Math.abs(p.x - w.home.x) <= w.w / 2 + 10 && Math.abs(p.y - w.home.y) <= wagonH / 2 + 16);

  arrive();

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseAgo += dt;
      if (state.phase === 'drive') {
        if (state.phaseAgo >= DRIVE_SECONDS) {
          state.trains += 1;
          arrive();
        }
        return;
      }
      if (state.time < state.lockedUntil) return;
      const tap = input.taps[0];
      const wagon = tap ? wagonAt(tap) : undefined;
      if (!wagon) return;
      state.lastTapAt = state.time;
      if (wagon.order === state.built) {
        state.wrongStreak = 0;
        wagon.attached = true;
        wagon.movedAt = state.time;
        state.built += 1;
        events.push({ type: 'action', x: wagon.home.x, y: wagon.home.y, note: NOTES[wagon.order] ?? 72, voice: 'bell' });
        if (state.built === state.wagons.length) {
          state.phase = 'drive';
          state.phaseAgo = 0;
          state.score += 1;
          events.push({ type: 'score', x: arena.width / 2, y: trackY, note: 84, voice: 'whistle' });
        }
      } else {
        wagon.shakeAt = state.time;
        state.wrongStreak += 1;
        state.lockedUntil = state.time + Math.min(MAX_BACK_SECONDS, BACK_SECONDS * state.wrongStreak);
        // The train backs up: its last wagon rolls back to the siding.
        const last = state.wagons.find((w) => w.attached && w.order === state.built - 1);
        if (last) {
          last.attached = false;
          last.movedAt = state.time;
          state.built -= 1;
        }
        events.push({ type: 'miss', x: wagon.home.x, y: wagon.home.y });
      }
    },
  };
}

/** Good play: reads the sentence and taps the next word, a short look between taps. */
export function sentenceTrainBot(state: SentenceTrainState, _context: BotContext): BotMove {
  if (state.phase !== 'build' || state.time < state.lockedUntil || state.time - state.lastTapAt < 0.4) return {};
  const next = state.wagons.find((w) => !w.attached && w.order === state.built);
  return next ? { tap: next.home } : {};
}
