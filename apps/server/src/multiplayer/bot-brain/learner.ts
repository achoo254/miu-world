// How a companion bot learns where to go: reinforcement learning on its own map of places (memory-graph.ts), no
// network, nothing given beforehand. Each place has a value Q that rises when going there paid off (a quest step
// done there, something done at a person or a thing, a player met, something new found) and falls with the time the
// walk took; it is updated by TD(0) when a trip ends. Exploring, meeting a player, resting and riding are valued the
// same way as one number each (a bandit). It picks among its options by a softmax whose temperature its curiosity
// sets: a curious bot tries the less sure options more often. Values fade a little each hour, so a place that stopped
// being of use (a quest done) is let go of. Every number is here, with why it is what it is.

/** The learning rate, and how much what lies beyond a place counts (both as the plan has them). */
export const ALPHA = 0.2;
export const GAMMA = 0.8;
/**
 * What a second of walking costs, in reward. The plan started at 0.02; measured, a quest target 100 s away then cost
 * twice what doing the step there pays, and the bots learnt to leave their quests alone. A quarter of it keeps
 * nearer places preferred and the whole map worth crossing for a quest.
 */
export const LAMBDA = 0.005;
/** Values fade by this share an hour, towards 0. */
export const FORGET_PER_HOUR = 0.01;

/**
 * On top of a place's value when choosing: a target of its quest's step (the plan started at 1; measured, a bot then
 * took its quest's target in fewer than half of its choices and wandered off between steps; at 2 it mostly keeps to
 * its quest, a curious one less)…
 */
export const GOAL_BONUS = 2;
/** …a place near its home (where it started; it likes it there a little)… */
export const HOME_BONUS = 0.1;
export const HOME_RADIUS = 120;
/**
 * …and exploring while its quest needs a place it has not found yet (the plan started at 0.3; measured, a bot whose
 * known places paid well then never went looking and gave up step after step: looking for its quest's target is
 * worth what going to it is, as for a player).
 */
export const SEEK_BONUS = GOAL_BONUS;

/** Rewards, when a choice ends. */
export const REWARD = {
  /** A quest step done at its target. */
  step: 1,
  /** Something done at a person or a thing that is not its quest's (in full only after WORK_AGAIN_MS there). */
  work: 0.3,
  /** A player met (less each time it meets the same player within MEET_FORGET_MS). */
  meet: 0.6,
  newPlace: 0.5,
  newArea: 0.05,
  stuck: -0.5,
} as const;
export const MEET_FORGET_MS = 10 * 60_000;
/**
 * Doing something at the same person or thing again pays in full only this long after the last time (less before):
 * measured, a bot paid in full every time went round and round one classroom's people for the rest of the run.
 */
export const WORK_AGAIN_MS = 30 * 60_000;

/** What doing something at a place last done `sinceMs` ago is worth. */
export const workReward = (sinceMs: number): number => REWARD.work * Math.min(1, Math.max(0, sinceMs) / WORK_AGAIN_MS);

/** It chooses among this many best options only: two hundred places it knows must not drown one clear choice. */
export const SHORTLIST = 8;

/** Starting values of the options that are not places, by its curiosity (0 … 1). */
export const startValues = (curious: number): Bandits => ({ explore: 0.3 + 0.6 * curious, meet: 0.6, rest: -0.1, ride: 0.1 + 0.3 * curious });

/** The softmax temperature for a bot this curious (plan: τ = 0.15 + 0.35 · curious). */
export const temperature = (curious: number): number => 0.15 + 0.35 * Math.min(1, Math.max(0, curious));

/** Its values of the options that are not places. */
export interface Bandits {
  explore: number;
  meet: number;
  rest: number;
  ride: number;
}

/** TD(0): a place's value after a trip there earned `reward` and the best value next to it is `next`. */
export const tdUpdate = (q: number, reward: number, next: number): number => q + ALPHA * (reward + GAMMA * next - q);

/** A bandit's value after a choice of it earned `reward`. */
export const banditUpdate = (q: number, reward: number): number => q + ALPHA * (reward - q);

/** A value after `hours` of fading. */
export const faded = (q: number, hours: number): number => q * Math.pow(1 - FORGET_PER_HOUR, Math.max(0, hours));

/** What one more meeting with a player met `times` times in the last MEET_FORGET_MS is worth. */
export const meetReward = (times: number): number => REWARD.meet / (1 + Math.max(0, times));

/**
 * The index of the option picked among `utilities` by a softmax at temperature `tau`, over the SHORTLIST best ones
 * (-1 when there are none).
 */
export function softmaxPick(utilities: readonly number[], tau: number, random: () => number): number {
  if (utilities.length === 0) return -1;
  // The SHORTLIST best, best first (of two alike, the one offered first): picked out in one pass, not a whole sort.
  const order: number[] = [];
  for (let i = 0; i < utilities.length; i++) {
    const u = utilities[i] ?? 0;
    if (order.length === SHORTLIST && !(u > (utilities[order[SHORTLIST - 1] ?? 0] ?? 0))) continue;
    let slot = order.length;
    while (slot > 0 && u > (utilities[order[slot - 1] ?? 0] ?? 0)) slot -= 1;
    order.splice(slot, 0, i);
    if (order.length > SHORTLIST) order.pop();
  }
  const top = utilities[order[0] ?? 0] ?? 0;
  const weights = order.map((i) => Math.exp(((utilities[i] ?? 0) - top) / tau));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (let k = 0; k < order.length; k++) {
    roll -= weights[k] ?? 0;
    if (roll <= 0) return order[k] ?? -1;
  }
  return order.at(-1) ?? -1;
}
