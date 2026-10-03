// Marble run: marbles drop one by one from a hopper onto a tilting wooden chute, roll off its low end onto one
// of two chutes below, and off that into one of four cups. Each marble's colour (and the shape on it) matches
// one cup. The child taps a chute to tip it the other way; a marble reads the tilt when it lands on a chute.
// A marble in its own cup is a point; another cup, nothing. Marbles come quicker as the round goes on, so
// with two on their way the chutes must be tipped at the right moment. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Chute {
  /** Middle of the plank, half its length, and which end is low (-1 left, 1 right). */
  x: number;
  y: number;
  half: number;
  tilt: number;
  /** Seconds since it was tipped (a wobble). */
  tippedAgo: number;
}

export type Leg = 'drop' | 'roll';

export interface Marble {
  id: number;
  colour: number;
  x: number;
  y: number;
  /** Where it is: falling to a chute (or a cup), or rolling along one. */
  leg: Leg;
  /** The chute it falls to or rolls on (0 top, 1 left, 2 right), or -1 when falling into a cup. */
  chute: number;
  dir: number;
  /** Where the current leg ends. */
  to: Point;
  /** Cup it fell in, and how long ago (-1 while running). */
  cup: number;
  inAgo: number;
}

export interface MarbleRunState {
  chutes: Chute[];
  cups: Point[];
  /** Colour of the cup at each position (shuffled per round). */
  cupColour: number[];
  cupY: number;
  hopper: Point;
  marbles: Marble[];
  /** Colour of the next marble (shown in the hopper). */
  next: number;
  score: number;
  time: number;
}

export const COLOURS = 4;
const FALL_SPEED = 520;
const ROLL_SPEED = 300;
const GAP_START = 2.7;
const GAP_END = 1.5;

export function createMarbleRun({ arena, duration, rng }: GameSetup): MinigameLogic<MarbleRunState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 50;
  const cupY = arena.height - 70;
  const span = cupY - top;
  const w = Math.min(arena.width, 900);
  const left = (arena.width - w) / 2;
  const colX = (k: number): number => left + ((k + 0.5) / 4) * w;
  const chutes: Chute[] = [
    { x: arena.width / 2, y: top + span * 0.3, half: w / 4, tilt: -1, tippedAgo: 9 },
    { x: (colX(0) + colX(1)) / 2, y: top + span * 0.62, half: w / 8, tilt: 1, tippedAgo: 9 },
    { x: (colX(2) + colX(3)) / 2, y: top + span * 0.62, half: w / 8, tilt: -1, tippedAgo: 9 },
  ];
  // Cup colours shuffled so the answer is not always the same pattern.
  const order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = order[i] ?? i;
    order[i] = order[j] ?? j;
    order[j] = a;
  }
  const state: MarbleRunState = {
    chutes,
    cups: [0, 1, 2, 3].map((k) => ({ x: colX(k), y: cupY })),
    cupColour: order,
    cupY,
    hopper: { x: arena.width / 2, y: top - 20 },
    marbles: [],
    next: rng.int(0, COLOURS - 1),
    score: 0,
    time: 0,
  };
  let nextId = 0;
  let dropIn = 1;

  function launch(): void {
    const c0 = chutes[0];
    if (!c0) return;
    state.marbles.push({ id: (nextId += 1), colour: state.next, x: state.hopper.x, y: state.hopper.y, leg: 'drop', chute: 0, dir: 0, to: { x: c0.x, y: c0.y - 14 }, cup: -1, inAgo: -1 });
    state.next = rng.int(0, COLOURS - 1);
  }

  const chuteAt = (p: Point): number => chutes.findIndex((c) => Math.abs(p.x - c.x) <= c.half + 20 && Math.abs(p.y - c.y) <= 55);

  function advance(m: Marble): void {
    if (m.leg === 'drop' && m.chute >= 0) {
      // Landed on a chute: roll toward its low end.
      const c = chutes[m.chute];
      if (!c) return;
      m.leg = 'roll';
      m.dir = c.tilt;
      m.to = { x: c.x + c.tilt * c.half, y: c.y - 14 + c.half * 0.18 };
      return;
    }
    if (m.leg === 'roll') {
      // Off the end: onto a lower chute or into a cup.
      const from = m.chute;
      m.leg = 'drop';
      if (from === 0) {
        m.chute = m.dir < 0 ? 1 : 2;
        const c = chutes[m.chute];
        if (c) m.to = { x: c.x, y: c.y - 14 };
      } else {
        // Chute 1 feeds cups 0 and 1, chute 2 cups 2 and 3.
        m.chute = -1;
        m.cup = (from === 1 ? 0 : 2) + (m.dir < 0 ? 0 : 1);
        const target = state.cups[m.cup];
        if (target) m.to = { x: target.x, y: state.cupY - 20 };
      }
      return;
    }
    // Into a cup.
    m.inAgo = 0;
    const right = state.cupColour[m.cup] === m.colour;
    if (right) {
      state.score += 1;
      events.push({ type: 'score', x: m.to.x, y: state.cupY - 50, note: 72 + m.colour * 3, voice: 'bell' });
    } else events.push({ type: 'miss', x: m.to.x, y: state.cupY - 40 });
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
      for (const c of chutes) c.tippedAgo += dt;
      for (const p of input.taps) {
        const i = chuteAt(p);
        const c = chutes[i];
        if (!c) continue;
        c.tilt = -c.tilt;
        c.tippedAgo = 0;
        events.push({ type: 'action', x: c.x, y: c.y, note: 55, voice: 'drum' });
      }
      dropIn -= dt;
      if (dropIn <= 0) {
        launch();
        dropIn = GAP_START + (GAP_END - GAP_START) * Math.min(1, state.time / duration);
      }
      for (const m of state.marbles) {
        if (m.inAgo >= 0) {
          m.inAgo += dt;
          continue;
        }
        const speed = m.leg === 'drop' ? FALL_SPEED : ROLL_SPEED;
        const dx = m.to.x - m.x;
        const dy = m.to.y - m.y;
        const dist = Math.hypot(dx, dy);
        const move = speed * dt;
        if (dist <= move) {
          m.x = m.to.x;
          m.y = m.to.y;
          advance(m);
        } else {
          m.x += (dx / dist) * move;
          m.y += (dy / dist) * move;
        }
      }
      state.marbles = state.marbles.filter((m) => m.inAgo < 0.6);
    },
  };
}

/** The tilt each chute needs for a marble of this colour (top chute, then the one below on its way). */
export function tiltsFor(state: MarbleRunState, colour: number): [number, number, number] {
  const cup = Math.max(0, state.cupColour.indexOf(colour));
  return [cup <= 1 ? -1 : 1, cup === 0 ? -1 : 1, cup === 2 ? -1 : 1];
}

/** Good play: for each chute, sets the tilt the next marble to land on it needs. */
export function marbleRunBot(state: MarbleRunState, _context: BotContext): BotMove {
  for (let i = 0; i < state.chutes.length; i += 1) {
    const chute = state.chutes[i];
    if (!chute) continue;
    // Marbles still to land on this chute, soonest first.
    const coming = state.marbles
      .filter((m) => m.inAgo < 0 && ((m.leg === 'drop' && m.chute === i) || (i > 0 && m.chute === 0 && m.leg === 'roll' && (m.dir < 0 ? 1 : 2) === i) || (i > 0 && m.chute === 0 && m.leg === 'drop')))
      .map((m) => ({ m, stage: m.leg === 'drop' && m.chute === i ? 0 : m.leg === 'roll' ? 1 : 2, d: Math.hypot(m.to.x - m.x, m.to.y - m.y) }))
      .sort((a, b) => a.stage - b.stage || a.d - b.d);
    const first = coming[0];
    if (!first) continue;
    // A marble not yet on the top chute only matters below if it will go this way.
    if (i > 0 && first.stage === 2 && tiltsFor(state, first.m.colour)[0] !== (i === 1 ? -1 : 1)) continue;
    const need = tiltsFor(state, first.m.colour)[i];
    if (need !== chute.tilt) return { tap: { x: chute.x, y: chute.y } };
  }
  return {};
}
