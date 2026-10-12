// The camera flight of a lesson clip: from high and wide over the quest's first stop, round it and down to a close
// view. The path is data (a function of time), so the recorder only asks "where is the camera at t" and sets it on
// the page. `chooseFlight` tries a few starting directions and keeps the one a roof, a tree or a wall hides least.
export type Vec3 = readonly [number, number, number];

export interface CameraPose {
  eye: Vec3;
  target: Vec3;
  /** Vertical field of view in degrees (the clip is portrait, so this is the long side). */
  fov: number;
}

export interface FlightPlan {
  /** What the flight circles: the ground at the quest's first stop. */
  center: Vec3;
  /** Compass angle of the start, in degrees. */
  startAngle: number;
  /** 1 sweeps one way round, -1 the other. */
  direction: 1 | -1;
}

export const FLIGHT = {
  fov: 66,
  startRadius: 56,
  endRadius: 22,
  startHeight: 36,
  endHeight: 13,
  sweepDegrees: 85,
  /** The camera looks this far above the ground at the centre. */
  lookHeight: 1.5,
} as const;

/** The furthest the camera strays from the centre: the map the page loads round the shot must reach this far. */
export const FLIGHT_REACH = FLIGHT.startRadius + 4;

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
/** 0 → 1 with a slow start and a slow stop. */
const smooth = (t: number): number => t * t * (3 - 2 * t);

/** The camera `t` of the way (0 to 1) along the flight. */
export function cameraAt(plan: FlightPlan, t: number): CameraPose {
  const k = smooth(Math.min(1, Math.max(0, t)));
  const angle = ((plan.startAngle + plan.direction * FLIGHT.sweepDegrees * k) * Math.PI) / 180;
  const radius = lerp(FLIGHT.startRadius, FLIGHT.endRadius, k);
  const [cx, cy, cz] = plan.center;
  return {
    eye: [cx + Math.sin(angle) * radius, cy + lerp(FLIGHT.startHeight, FLIGHT.endHeight, k), cz + Math.cos(angle) * radius],
    target: [cx, cy + FLIGHT.lookHeight, cz],
    fov: FLIGHT.fov,
  };
}

/** Whether a block is solid (a wall, a roof, a tree). */
export type SolidAt = (x: number, y: number, z: number) => Promise<boolean>;

const START_ANGLES = [225, 315, 135, 45, 180, 270, 0, 90] as const;
/** Points of the path judged, and the share of it the close end is (the part that must have a clear view). */
const PATH_SAMPLES = 20;
const CLOSE_FROM = 0.35;
const RAY_SAMPLES = 24;
const RAY_END = 0.88;
/** How far to either side of the centre the side lines aim, so a tree beside the view counts too. */
const SIDE_BLOCKS = 5;

/** Whether a block stands between the eye and `to` (the last share of the way is not judged: it ends at the quest's own stall or door). */
async function blocked(eye: Vec3, to: Vec3, solid: SolidAt): Promise<boolean> {
  for (let i = 1; i <= RAY_SAMPLES; i++) {
    const k = (i / RAY_SAMPLES) * RAY_END;
    if (await solid(Math.floor(lerp(eye[0], to[0], k)), Math.floor(lerp(eye[1], to[1], k)), Math.floor(lerp(eye[2], to[2], k)))) return true;
  }
  return false;
}

/** Points round and below the eye: a block there is a tree or a roof the camera would hang over, filling the picture. */
const CROWD_PROBES: ReadonlyArray<Vec3> = [[4, -2, 0], [-4, -2, 0], [0, -2, 4], [0, -2, -4], [3, -5, 3], [-3, -5, 3], [3, -5, -3], [-3, -5, -3], [0, -4, 0]];

/**
 * How badly a plan is hidden: a point of the path inside a block counts 5; in the close part of the path, each of three
 * lines from the eye (to the centre and to a point five blocks to either side of it) with a block on it counts 1, and so
 * does a block close beside or under the eye.
 */
export async function hiddenness(plan: FlightPlan, solid: SolidAt): Promise<number> {
  let score = 0;
  for (let step = 0; step <= PATH_SAMPLES; step++) {
    const t = step / PATH_SAMPLES;
    const { eye, target } = cameraAt(plan, t);
    if (await solid(Math.floor(eye[0]), Math.floor(eye[1]), Math.floor(eye[2]))) score += 5;
    if (t < CLOSE_FROM) continue;
    for (const [px, py, pz] of CROWD_PROBES) {
      if (await solid(Math.floor(eye[0] + px), Math.floor(eye[1] + py), Math.floor(eye[2] + pz))) {
        score += 1;
        break;
      }
    }
    const dx = target[0] - eye[0];
    const dz = target[2] - eye[2];
    const length = Math.hypot(dx, dz) || 1;
    const side: Vec3 = [(dz / length) * SIDE_BLOCKS, 0, (-dx / length) * SIDE_BLOCKS];
    for (const sign of [0, 1, -1]) {
      if (await blocked(eye, [target[0] + side[0] * sign, target[1], target[2] + side[2] * sign], solid)) score += 1;
    }
  }
  return score;
}

/** The least hidden flight round `center` of the sixteen tried (eight starting directions, both ways round); the first of equals wins. */
export async function chooseFlight(center: Vec3, solid: SolidAt): Promise<FlightPlan> {
  let best: { plan: FlightPlan; score: number } | null = null;
  for (const startAngle of START_ANGLES) {
    for (const direction of [1, -1] as const) {
      const plan: FlightPlan = { center, startAngle, direction };
      const score = await hiddenness(plan, solid);
      if (!best || score < best.score) best = { plan, score };
    }
  }
  if (!best) throw new Error('no flight to choose from');
  return best.plan;
}
