// The stories story-order deals: four pictures each, in the order they happen. A picture is a few Fluent
// Emoji placed in a frame (x, y from 0 to 1 across the frame, size as a share of the frame's shorter side),
// sometimes with a word drawn on it (the "z z" of a nap). Every story has a cause-and-effect order a child of
// seven can tell: things grow, hatch, melt, a race is won by the one who keeps going.
import type { SpriteName } from '../../sprites';

export interface Placement {
  sprite: SpriteName;
  x: number;
  y: number;
  size: number;
  rotate?: number;
  flipX?: boolean;
}

export interface Frame {
  items: readonly Placement[];
  /** A short word drawn in the picture. */
  word?: { text: string; x: number; y: number };
}

export interface Story {
  title: string;
  frames: readonly [Frame, Frame, Frame, Frame];
}

const p = (sprite: SpriteName, x: number, y: number, size: number, extra: { rotate?: number; flipX?: boolean } = {}): Placement => ({ sprite, x, y, size, ...extra });

export const STORIES: readonly Story[] = [
  {
    title: 'Gà con ra đời',
    frames: [
      { items: [p('egg', 0.5, 0.58, 0.55)] },
      { items: [p('hatching-chick', 0.5, 0.56, 0.62)] },
      { items: [p('baby-chick', 0.5, 0.56, 0.6)] },
      { items: [p('chicken', 0.42, 0.5, 0.62), p('baby-chick', 0.78, 0.74, 0.3)] },
    ],
  },
  {
    title: 'Cây lớn lên',
    frames: [
      { items: [p('seedling', 0.5, 0.7, 0.32)] },
      { items: [p('herb', 0.5, 0.62, 0.5)] },
      { items: [p('deciduous-tree', 0.5, 0.52, 0.72)] },
      { items: [p('deciduous-tree', 0.5, 0.5, 0.8), p('red-apple', 0.35, 0.42, 0.18), p('red-apple', 0.62, 0.32, 0.18), p('red-apple', 0.58, 0.55, 0.18)] },
    ],
  },
  {
    title: 'Thỏ và Rùa chạy thi',
    frames: [
      { items: [p('rabbit', 0.3, 0.55, 0.38, { flipX: true }), p('turtle', 0.3, 0.82, 0.3, { flipX: true })] },
      { items: [p('rabbit', 0.8, 0.5, 0.36, { flipX: true }), p('turtle', 0.22, 0.78, 0.3, { flipX: true })] },
      {
        items: [p('deciduous-tree', 0.72, 0.45, 0.55), p('rabbit', 0.72, 0.78, 0.32, { rotate: Math.PI / 2 }), p('turtle', 0.25, 0.8, 0.3, { flipX: true })],
        word: { text: 'z z', x: 0.85, y: 0.62 },
      },
      { items: [p('turtle', 0.45, 0.68, 0.38, { flipX: true }), p('trophy', 0.75, 0.38, 0.32), p('rabbit', 0.15, 0.7, 0.26, { flipX: true })] },
    ],
  },
  {
    title: 'Người tuyết',
    frames: [
      { items: [p('cloud', 0.5, 0.3, 0.55), p('snowflake', 0.3, 0.65, 0.2), p('snowflake', 0.6, 0.75, 0.2), p('snowflake', 0.75, 0.55, 0.16)] },
      { items: [p('snowman', 0.5, 0.56, 0.62)] },
      { items: [p('sun', 0.22, 0.25, 0.32), p('snowman', 0.58, 0.6, 0.55)] },
      { items: [p('sun', 0.22, 0.25, 0.32), p('droplet', 0.5, 0.78, 0.2), p('droplet', 0.66, 0.82, 0.16), p('droplet', 0.38, 0.84, 0.14)] },
    ],
  },
  {
    title: 'Trời mưa rồi tạnh',
    frames: [
      { items: [p('sun', 0.5, 0.5, 0.55)] },
      { items: [p('sun', 0.62, 0.42, 0.42), p('cloud', 0.42, 0.55, 0.55)] },
      { items: [p('cloud-with-lightning', 0.5, 0.36, 0.55), p('droplet', 0.3, 0.8, 0.16), p('droplet', 0.55, 0.85, 0.16), p('droplet', 0.75, 0.75, 0.16)] },
      { items: [p('rainbow', 0.5, 0.5, 0.75), p('sun', 0.8, 0.25, 0.26)] },
    ],
  },
  {
    title: 'Nhổ củ cà rốt',
    frames: [
      { items: [p('carrot', 0.5, 0.62, 0.4, { rotate: 2.4 })] },
      { items: [p('rabbit', 0.36, 0.55, 0.4, { flipX: true }), p('carrot', 0.7, 0.66, 0.34, { rotate: 2.4 })] },
      { items: [p('bear', 0.18, 0.55, 0.32), p('rabbit', 0.45, 0.55, 0.32, { flipX: true }), p('carrot', 0.75, 0.66, 0.34, { rotate: 2.4 })] },
      { items: [p('carrot', 0.5, 0.48, 0.6, { rotate: 0.5 }), p('party-popper', 0.2, 0.3, 0.26), p('rabbit', 0.82, 0.75, 0.26)] },
    ],
  },
  {
    title: 'Hoa nở',
    frames: [
      { items: [p('seedling', 0.5, 0.72, 0.3)] },
      { items: [p('herb', 0.5, 0.64, 0.45)] },
      { items: [p('tulip', 0.5, 0.56, 0.6)] },
      { items: [p('tulip', 0.45, 0.58, 0.6), p('butterfly', 0.75, 0.28, 0.28), p('honeybee', 0.2, 0.3, 0.22)] },
    ],
  },
  {
    title: 'Đi câu cá',
    frames: [
      { items: [p('canoe', 0.5, 0.55, 0.62)] },
      { items: [p('canoe', 0.5, 0.42, 0.55), p('fish', 0.35, 0.82, 0.25), p('tropical-fish', 0.7, 0.8, 0.22)] },
      { items: [p('canoe', 0.5, 0.48, 0.55), p('fish', 0.66, 0.2, 0.3, { rotate: -0.6 })] },
      { items: [p('cat', 0.38, 0.6, 0.45), p('fish', 0.74, 0.62, 0.28)] },
    ],
  },
  {
    title: 'Thả diều',
    frames: [
      { items: [p('kite', 0.32, 0.8, 0.3), p('rabbit', 0.68, 0.72, 0.36)] },
      { items: [p('kite', 0.4, 0.55, 0.3), p('rabbit', 0.68, 0.76, 0.32)] },
      { items: [p('kite', 0.45, 0.28, 0.3), p('cloud', 0.2, 0.2, 0.25), p('rabbit', 0.72, 0.78, 0.3)] },
      { items: [p('kite', 0.55, 0.12, 0.24), p('bird', 0.25, 0.3, 0.2), p('cloud', 0.75, 0.32, 0.3), p('rabbit', 0.7, 0.8, 0.28)] },
    ],
  },
  {
    title: 'Quả táo chín',
    frames: [
      { items: [p('deciduous-tree', 0.5, 0.5, 0.75), p('red-apple', 0.62, 0.35, 0.16)] },
      { items: [p('deciduous-tree', 0.4, 0.5, 0.75), p('red-apple', 0.66, 0.66, 0.18)] },
      { items: [p('deciduous-tree', 0.4, 0.5, 0.75), p('red-apple', 0.7, 0.85, 0.18), p('monkey-face', 0.85, 0.6, 0.2)] },
      { items: [p('monkey', 0.5, 0.58, 0.5), p('red-apple', 0.72, 0.5, 0.2)] },
    ],
  },
];

/** Every picture the stories use. */
export const STORY_SPRITES: readonly SpriteName[] = [...new Set(STORIES.flatMap((s) => s.frames.flatMap((f) => f.items.map((i) => i.sprite))))];
