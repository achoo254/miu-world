// Photo snap: the child rides slowly through the forest with a camera. Animals hide behind bushes and
// rocks; now and then one pops up and looks around for a moment. A tap takes a photo of what is in the
// viewfinder: an animal that is up and inside the frame is a good photo (a point). The roll has twelve
// shots, so snapping at nothing wastes film. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const ANIMALS: readonly [SpriteName, ...SpriteName[]] = ['fox', 'owl', 'rabbit', 'frog', 'turtle', 'butterfly', 'bird', 'snail', 'monkey-face', 'panda'];
export type Cover = 'bush' | 'rock' | 'tree';

export interface Hideout {
  x: number;
  cover: Cover;
  animal: SpriteName;
  /** Where the animal pops up (screen x of the hideout), seconds it stays up, and its state. */
  popAt: number;
  stay: number;
  /** Seconds since it popped up (-1: not yet), photographed already. */
  up: number;
  taken: boolean;
}

export interface Photo {
  animal: SpriteName | null;
}

export interface PhotoState {
  groundY: number;
  frameX: number;
  frameY: number;
  frameW: number;
  frameH: number;
  hideouts: Hideout[];
  scroll: number;
  speed: number;
  film: number;
  photos: Photo[];
  /** Seconds since the last shutter. */
  flashAgo: number;
  score: number;
  time: number;
}

export const FILM = 12;
const RISE = 0.25;
const SPEED = 125;

/** How far up an animal is (0 hidden, 1 up). */
export function upness(h: Hideout): number {
  if (h.up < 0) return 0;
  if (h.up < RISE) return h.up / RISE;
  if (h.up < RISE + h.stay) return 1;
  return Math.max(0, 1 - (h.up - RISE - h.stay) / RISE);
}

/** Where the animal shows: above its bush or rock, or beside a tree trunk. */
export const animalX = (h: Hideout): number => (h.cover === 'tree' ? h.x + 60 * upness(h) : h.x);

/** An animal that would make a good photo right now: fully up and inside the frame. */
export function inShot(state: PhotoState, h: Hideout): boolean {
  return upness(h) >= 1 && !h.taken && Math.abs(animalX(h) - state.frameX) < state.frameW / 2 - 30;
}

function hideout(rng: Rng, x: number, frameX: number, last: SpriteName | null): Hideout {
  let animal = rng.pick(ANIMALS);
  if (animal === last) animal = rng.pick(ANIMALS);
  return {
    x,
    cover: rng.pick(['bush', 'rock', 'tree'] as const),
    animal,
    // Pops up somewhere from just before the frame to well before it: sometimes there is time to wait.
    popAt: frameX + rng.range(40, 300),
    stay: rng.range(0.9, 1.4),
    up: -1,
    taken: false,
  };
}

export function createPhotoSnap({ arena, params, rng }: GameSetup): MinigameLogic<PhotoState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const groundY = Math.min(arena.height - 170, HUD_SAFE_TOP + 380);
  const frameX = arena.width / 2;
  const state: PhotoState = {
    groundY,
    frameX,
    frameY: groundY - 95,
    frameW: 250,
    frameH: 210,
    hideouts: [],
    scroll: 0,
    speed: SPEED * factor,
    film: FILM,
    photos: [],
    flashAgo: 9,
    score: 0,
    time: 0,
  };
  let nextX = arena.width * 0.8;
  const lay = (): void => {
    state.hideouts.push(hideout(rng, nextX, frameX, state.hideouts.at(-1)?.animal ?? null));
    nextX += rng.range(260, 380);
  };
  while (nextX < arena.width + 300) lay();

  function snap(): void {
    if (state.film <= 0) return;
    state.film -= 1;
    state.flashAgo = 0;
    const subject = state.hideouts.filter((h) => inShot(state, h)).sort((a, b) => Math.abs(animalX(a) - frameX) - Math.abs(animalX(b) - frameX))[0];
    if (subject) {
      subject.taken = true;
      state.photos.push({ animal: subject.animal });
      state.score += 1;
      events.push({ type: 'score', x: animalX(subject), y: state.frameY });
    } else {
      state.photos.push({ animal: null });
      events.push({ type: 'miss', x: frameX, y: state.frameY });
    }
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.film <= 0 && state.flashAgo > 0.8;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.flashAgo += dt;
      if (input.taps.some((t) => t.y > HUD_SAFE_TOP)) snap();
      const move = state.speed * dt;
      state.scroll += move;
      nextX -= move;
      for (const h of state.hideouts) {
        h.x -= move;
        if (h.up >= 0) h.up += dt;
        else if (h.x <= h.popAt) h.up = 0;
      }
      state.hideouts = state.hideouts.filter((h) => h.x > -200);
      while (nextX < arena.width + 300) lay();
    },
  };
}

/** Good play: snap when an animal is up and near the middle of the frame. */
export function photoSnapBot(state: PhotoState, context: BotContext): BotMove {
  const ready = state.hideouts.some((h) => inShot(state, h) && Math.abs(animalX(h) - state.frameX) < state.frameW / 2 - 50);
  return ready ? { tap: { x: context.arena.width / 2, y: context.arena.height / 2 } } : {};
}
