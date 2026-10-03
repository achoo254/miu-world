// Bobber fishing: tap the water to cast the float there. Fish shadows swim about; one that notices the float
// comes over, nibbles a few times (the float only trembles), then bites: the float goes right under for a
// moment. A tap then lands the fish; a tap too early scares it away and reels in an empty line. Casting
// close to a shadow brings a bite sooner. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type FishKind = 'fish' | 'tropical-fish';

export interface Fish {
  id: number;
  kind: FishKind;
  x: number;
  y: number;
  /** Where it is swimming to. */
  tx: number;
  ty: number;
  /** Seconds it keeps away from the float after being scared. */
  shy: number;
}

export type FloatPhase = 'ready' | 'flying' | 'floating' | 'nibble' | 'bite' | 'reeling';

export interface FishingState {
  water: { top: number; bottom: number; left: number; right: number };
  /** The rod's tip, where the line starts. */
  rodX: number;
  rodY: number;
  float: { x: number; y: number; fromX: number; fromY: number; phase: FloatPhase; t: number; fish: number | null; nibbles: number };
  fish: Fish[];
  /** A landed fish flying up to the child: its kind and seconds since. */
  landed: { kind: FishKind; x: number; y: number; t: number } | null;
  scaredAgo: number;
  score: number;
  time: number;
}

const FISH_COUNT = 5;
const CAST_SECONDS = 0.45;
const NOTICE = 250;
const SWIM = 70;
const APPROACH = 95;
/** Seconds the float stays under: the moment to tap. */
export const BITE_SECONDS = 0.95;
const NIBBLE_SECONDS = 0.3;
const REEL_SECONDS = 0.5;

export function createBobberFishing({ arena, params, rng }: GameSetup): MinigameLogic<FishingState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const water = { top: HUD_SAFE_TOP + 20, bottom: arena.height - 150, left: 30, right: arena.width - 30 };
  const rodX = arena.width / 2 + 70;
  const rodY = arena.height - 190;
  let nextId = 0;
  const spot = (r: Rng): Point => ({ x: r.range(water.left + 50, water.right - 50), y: r.range(water.top + 50, water.bottom - 40) });
  const newFish = (): Fish => {
    const p = spot(rng);
    const t = spot(rng);
    return { id: (nextId += 1), kind: rng.chance(0.25) ? 'tropical-fish' : 'fish', x: p.x, y: p.y, tx: t.x, ty: t.y, shy: 0 };
  };
  const state: FishingState = {
    water,
    rodX,
    rodY,
    float: { x: rodX, y: rodY, fromX: rodX, fromY: rodY, phase: 'ready', t: 0, fish: null, nibbles: 0 },
    fish: Array.from({ length: FISH_COUNT }, newFish),
    landed: null,
    scaredAgo: 9,
    score: 0,
    time: 0,
  };
  const { float } = state;
  const hooked = (): Fish | undefined => state.fish.find((f) => f.id === float.fish);

  function reelIn(): void {
    float.phase = 'reeling';
    float.t = 0;
    float.fromX = float.x;
    float.fromY = float.y;
    float.fish = null;
  }

  function tap(at: Point): void {
    if (float.phase === 'ready') {
      float.phase = 'flying';
      float.t = 0;
      float.fromX = rodX;
      float.fromY = rodY;
      float.x = Math.min(water.right - 30, Math.max(water.left + 30, at.x));
      float.y = Math.min(water.bottom - 25, Math.max(water.top + 25, at.y));
      events.push({ type: 'action', x: rodX, y: rodY });
      return;
    }
    if (float.phase === 'bite') {
      const fish = hooked();
      if (fish) {
        const points = fish.kind === 'tropical-fish' ? 2 : 1;
        state.score += points;
        state.landed = { kind: fish.kind, x: float.x, y: float.y, t: 0 };
        events.push({ type: 'score', x: float.x, y: float.y, points });
        state.fish = state.fish.filter((f) => f !== fish);
        state.fish.push(newFish());
      }
      reelIn();
      return;
    }
    if (float.phase === 'floating' || float.phase === 'nibble') {
      // Too early: the fish darts off.
      const fish = hooked();
      if (fish) {
        fish.shy = 4;
        const away = Math.atan2(fish.y - float.y, fish.x - float.x);
        fish.tx = Math.min(water.right - 40, Math.max(water.left + 40, fish.x + Math.cos(away) * 300));
        fish.ty = Math.min(water.bottom - 30, Math.max(water.top + 30, fish.y + Math.sin(away) * 300));
        state.scaredAgo = 0;
        events.push({ type: 'miss', x: float.x, y: float.y });
      }
      reelIn();
    }
  }

  function swim(fish: Fish, dt: number): void {
    fish.shy = Math.max(0, fish.shy - dt);
    const chasing = fish.id === float.fish;
    const speed = (chasing ? APPROACH : fish.shy > 0 ? SWIM * 2.5 : SWIM) * factor;
    const dx = fish.tx - fish.x;
    const dy = fish.ty - fish.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) {
      if (!chasing) {
        const t = spot(rng);
        fish.tx = t.x;
        fish.ty = t.y;
      }
      return;
    }
    fish.x += (dx / d) * Math.min(d, speed * dt);
    fish.y += (dy / d) * Math.min(d, speed * dt);
  }

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
      state.scaredAgo += dt;
      float.t += dt;
      if (state.landed) {
        state.landed.t += dt;
        if (state.landed.t > 0.8) state.landed = null;
      }
      for (const at of input.taps) tap(at);

      if (float.phase === 'flying' && float.t >= CAST_SECONDS) {
        float.phase = 'floating';
        float.t = 0;
      } else if (float.phase === 'reeling' && float.t >= REEL_SECONDS) {
        float.phase = 'ready';
        float.t = 0;
      }

      if (float.phase === 'floating' && float.fish === null) {
        // The nearest calm fish that sees the float comes over.
        const seen = state.fish.filter((f) => f.shy <= 0 && Math.hypot(f.x - float.x, f.y - float.y) < NOTICE).sort((a, b) => Math.hypot(a.x - float.x, a.y - float.y) - Math.hypot(b.x - float.x, b.y - float.y))[0];
        if (seen) {
          float.fish = seen.id;
          float.nibbles = rng.int(1, 3);
        }
      }
      const fish = hooked();
      if (fish && (float.phase === 'floating' || float.phase === 'nibble' || float.phase === 'bite')) {
        fish.tx = float.x - 18;
        fish.ty = float.y + 12;
        const close = Math.hypot(fish.x - fish.tx, fish.y - fish.ty) < 8;
        if (float.phase === 'floating' && close && float.t > 0.4) {
          float.phase = float.nibbles > 0 ? 'nibble' : 'bite';
          float.t = 0;
        } else if (float.phase === 'nibble' && float.t >= NIBBLE_SECONDS + rng.range(0, 0.02)) {
          float.nibbles -= 1;
          float.phase = 'floating';
          // A pause between nibbles, so a nibble and a bite never run together.
          float.t = -rng.range(0.3, 0.8);
        } else if (float.phase === 'bite' && float.t >= BITE_SECONDS / factor) {
          // Too late: the fish took the bait and swam off.
          fish.shy = 3;
          const t = spot(rng);
          fish.tx = t.x;
          fish.ty = t.y;
          float.fish = null;
          float.phase = 'floating';
          float.t = 0;
          events.push({ type: 'miss', x: float.x, y: float.y });
        }
      }
      for (const f of state.fish) swim(f, dt);
    },
  };
}

/** Good play: cast right next to the nearest fish, wait out the nibbles, tap on the bite. */
export function bobberBot(state: FishingState, _context: BotContext): BotMove {
  const { float } = state;
  if (float.phase === 'bite') return { tap: { x: float.x, y: float.y } };
  if (float.phase !== 'ready') return {};
  const fish = state.fish.filter((f) => f.shy <= 0).sort((a, b) => Math.hypot(a.x - state.rodX, a.y - state.rodY) - Math.hypot(b.x - state.rodX, b.y - state.rodY))[0];
  return fish ? { tap: { x: fish.x + 30, y: fish.y - 20 } } : {};
}
