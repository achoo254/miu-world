// A ride across the map as a journey the child sees (owner, 03/10/2026: "hoạt cảnh bé di chuyển thật khi di
// chuyển bằng phương tiện"): she gets on at the stop (the bus pulls in, she hops into the boat, the balloon
// fills out), the vehicle carries her to the far stop in a few seconds while the camera rides along beside it,
// and she hops off there and the vehicle goes on its way. The land streams in round the camera as it travels:
// the far stop is fetched and drawn from the start and held, and where the land under the vehicle is not drawn
// yet the picture fades out and waits rather than show the gap. A long trip shows its two ends joined by a
// fade; "Bỏ qua" goes straight to the far stop; with reduced motion the trip is a short fade.
import { MathUtils, Vector3, type PerspectiveCamera, type Scene } from 'three';
import type { Horizon } from '@miu/voxel/region-format';
import { raycastGrid, type SolidAt } from '@miu/voxel/grid-collision';
import type { InteractableObject } from '../entities/interactables';
import type { SeatedPose } from '../entities/player-character';
import { WALK_SPEED } from '../player/player-controller';
import type { WorldRenderer } from '../world/world-renderer';
import { RIDE_PROFILES, rideKind, type RideKind } from './ride-kind';
import { createRideOverlay } from './ride-overlay';
import { RidePath, airHeight, hop, phaseAt, rideTimeline, tripAt, type RidePhase, type RideTimeline } from './ride-path';
import { groundClasses, planRoute, type GroundClass, type Point3 } from './ride-route';
import { createRideVehicle, type RideVehicle } from './ride-vehicle';

export interface JourneyDeps {
  scene: Scene;
  camera: PerspectiveCamera;
  /** The game's DOM root: the fade and the skip button go in it. */
  host: HTMLElement;
  world: Pick<WorldRenderer, 'settle' | 'hold' | 'drawnAt'>;
  horizon: Horizon;
  blocks: ReadonlyArray<{ id: number; name: string; liquid?: boolean }>;
  /** The ground under (x, z) near `nearY` where its region is loaded, else null. */
  groundAt(x: number, z: number, nearY: number): number | null;
  /** Where she can stand at or next to a spot, once its region is in; null when nowhere so close. */
  standAt(spot: Readonly<Point3>): Readonly<Point3> | null;
  /** What the riding camera stops in front of (every loaded block, leaves too: it never sits in a tree top). */
  solid: SolidAt;
  /** The follow camera's tilt and distance, to hand the view back to it at the end. */
  followView(): { pitch: number; distance: number };
  reduced: boolean;
  castShadow: boolean;
}

/** Her pose while the journey runs. */
export interface JourneyFrame {
  feet: Vector3;
  facing: number;
  pose: SeatedPose | null;
  /** Clip speed for her hops on and off (0: idle or seated). */
  speed: number;
}

/** The journey is over: she stands at `at`, facing that way, the camera turned to `cameraYaw`. */
export interface JourneyEnd {
  done: Readonly<Point3>;
  facing: number;
  cameraYaw: number;
}

export interface RideJourney {
  readonly active: boolean;
  /** Kind and part of the journey (stats and tests), or null. */
  readonly state: { kind: RideKind; phase: RidePhase | 'fade' } | null;
  /** Starts the ride of `stop` for the child standing at `from`, facing `facing`. False when it cannot start. */
  start(stop: InteractableObject, from: Vector3, facing: number): boolean;
  /** Each frame (also after the journey, while the vehicle leaves): her pose, the end once she is off, else null. */
  update(dt: number): JourneyFrame | JourneyEnd | null;
  skip(): void;
  dispose(): void;
}

/** How each vehicle takes her on and off, and how the camera rides along (seconds, blocks, radians). */
interface Staging {
  board: number;
  /** Part of `board` the vehicle spends pulling in to the stop (the bus and the train come; the others wait). */
  arrive: number;
  /** Part of `board` the balloon spends filling out. */
  grow: number;
  /** Camera: distance, tilt, and the angle off straight behind (a three-quarter view shows the vehicle's side). */
  distance: number;
  pitch: number;
  side: number;
  /**
   * The balloon goes up from among the others at its stop: the camera stays where it was and watches it rise,
   * and rides along only once it is this high (blocks) over the stop.
   */
  liftOff?: number;
}
const STAGING: Readonly<Record<RideKind, Staging>> = {
  bus: { board: 1.4, arrive: 0.9, grow: 0, distance: 10, pitch: 0.36, side: 0.6 },
  train: { board: 1.4, arrive: 0.9, grow: 0, distance: 11, pitch: 0.34, side: 0.6 },
  boat: { board: 0.9, arrive: 0, grow: 0, distance: 9, pitch: 0.34, side: 0.55 },
  'cable-car': { board: 0.9, arrive: 0, grow: 0, distance: 10, pitch: 0.22, side: 0.7 },
  balloon: { board: 1.3, arrive: 0, grow: 1.3, distance: 15, pitch: 0.16, side: 0.75, liftOff: 9 },
};
/** Getting on: the hop takes this long and ends with the boarding; getting off takes ALIGHT_S, the hop most of it. */
const HOP_S = 0.55;
const ALIGHT_S = 0.75;
const HOP_HEIGHT = 0.8;
/** A bus or a train pulls in from this far behind the stop. */
const ARRIVE_FROM = 14;
/** After she is off, the vehicle goes on for this long, fading out over the last FADE_OUT_S. */
const LEAVE_S = 2.2;
const FADE_OUT_S = 0.8;
/** The picture darkens and clears at this rate (a second's share) while land is on its way, or on a skip. */
const FADE_RATE = 4;
/** Longest wait for the land under the vehicle before the trip goes on to the far stop. */
const MAX_WAIT_S = 3;
/** Reduced motion: the trip is a fade out and in, each this long. */
const REDUCED_FADE_S = 0.35;
/** Water rides sit this far into the water; the horizon gives the top of the water block. */
const DRAFT = 0.3;
const CAMERA_PAD = 0.4;
/** Near the ground an air ride's camera comes in to this distance (among roofs and trees), out to its own up high. */
const LOW_DISTANCE = 9;
const LOW_HEIGHT = 12;
/** The low view under a tree top or an arch (radians over level). */
const LOW_PITCH = 0.08;

const angleTo = (from: number, to: number, share: number): number => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * Math.min(1, share);
const smoothstep = (u: number): number => {
  const c = Math.min(1, Math.max(0, u));
  return c * c * (3 - 2 * c);
};

interface Trip {
  kind: RideKind;
  stop: InteractableObject;
  stopWasVisible: boolean;
  staging: Staging;
  vehicle: RideVehicle | null;
  path: RidePath;
  timeline: RideTimeline;
  /** Air rides: start and end heights and the cruise height; others take the line's own heights. */
  air: { y0: number; y1: number; cruise: number; climb: number } | null;
  from: Vector3;
  facing: number;
  rideTo: Point3;
  releases: Array<() => void>;
  destReady: boolean;
  t: number;
  waited: number;
  skipping: boolean;
  /** Smoothed vehicle state. */
  y: number;
  yaw: number;
  pitch: number;
  lastS: number;
  /** She gets off here (worked out when the vehicle stops). */
  landing: Readonly<Point3> | null;
  /** The way she faces once off (toward where she hopped). */
  endFacing: number | null;
  /** The follow camera's yaw once she is off. */
  endCamYaw: number | null;
  /** The view at the start round her head (for the turn into the ride), and the camera's yaw while riding. */
  camFrom: { yaw: number; pitch: number; distance: number };
  camYaw: number;
  /** Where the camera stood when she tapped. */
  camStart: Vector3;
  /** The camera's angle off straight behind now (the staging's side, the other side, or 0). */
  side: number;
  /** The camera's tilt now, and the tilt it eases to (the staging's, or low under a tree top). */
  camPitch: number;
  pitchAim: number;
  /** Whether the stop's own model is hidden yet (a bus or a train hides it as it pulls in over it). */
  stopHidden: boolean;
}

export function createRideJourney(deps: JourneyDeps): RideJourney {
  const { camera } = deps;
  const classOf = groundClasses(deps.blocks);
  const [cellsX, cellsZ] = deps.horizon.cells;
  const horizonCell = (x: number, z: number): number => {
    const cx = Math.min(cellsX - 1, Math.max(0, Math.floor(x / deps.horizon.cell)));
    const cz = Math.min(cellsZ - 1, Math.max(0, Math.floor(z / deps.horizon.cell)));
    return cz * cellsX + cx;
  };
  const classAt = (x: number, z: number): GroundClass => classOf(deps.horizon.tops[horizonCell(x, z)] ?? 0);
  const topAt = (x: number, z: number): number => deps.horizon.heights[horizonCell(x, z)] ?? 0;

  let trip: Trip | null = null;
  /** Reduced motion: the fade-only trip in progress. */
  let reducedTrip: { kind: RideKind; rideTo: Point3; facing: number; releases: Array<() => void>; ready: boolean; t: number; camYaw: number } | null = null;
  /** After a journey: the vehicle going on its way. */
  let leaving: { vehicle: RideVehicle; t: number; kind: RideKind; from: Vector3; yaw: number } | null = null;
  let fade = 0;
  const overlay = createRideOverlay(deps.host, () => {
    if (trip) trip.skipping = true;
  });

  const feet = new Vector3();
  const seat = new Vector3();
  const focus = new Vector3();
  const chasePos = new Vector3();
  const lookTmp = new Vector3();
  const backTmp = new Vector3();

  /** Holds the land round (x, z) drawn for the journey and starts drawing it; `ready` once it is in. */
  const prepare = (x: number, z: number, releases: Array<() => void>, ready: () => void): void => {
    releases.push(deps.world.hold(x, z));
    deps.world
      .settle(x, z)
      .catch((err: unknown) => console.warn('ride: the far stop did not load', err))
      .finally(ready);
  };

  const release = (releases: Array<() => void>): void => {
    for (const r of releases.splice(0)) r();
  };

  /** The line the vehicle follows from the stop to beside the far stop. */
  const planPath = (kind: RideKind, origin: Point3, rideTo: Point3, halfWidth: number): { path: RidePath; air: Trip['air'] } => {
    const profile = RIDE_PROFILES[kind];
    const dx = rideTo[0] - origin[0];
    const dz = rideTo[2] - origin[2];
    const len = Math.hypot(dx, dz) || 1;
    // It stops beside where she gets off, on whichever side suits it (the water for a boat, open ground else).
    const side = halfWidth + 0.9;
    const sides: Point3[] = [-1, 1].map((k): Point3 => [rideTo[0] + (-dz / len) * side * k, rideTo[1], rideTo[2] + (dx / len) * side * k]);
    const rank = (p: Point3): number => {
      const c = classAt(p[0], p[2]);
      if (profile.travel === 'water') return c === 'water' ? 0 : c === 'blocked' ? 2 : 1;
      return c === 'way' ? 0 : c === 'land' ? 1 : 2;
    };
    const end = rank(sides[0] ?? rideTo) <= rank(sides[1] ?? rideTo) ? (sides[0] ?? rideTo) : (sides[1] ?? rideTo);
    if (profile.travel === 'air') {
      // Straight over everything, high enough to clear the tallest thing under the line.
      let top = Math.max(origin[1], end[1]);
      const steps = Math.ceil(len / 4);
      for (let k = 0; k <= steps; k++) top = Math.max(top, topAt(origin[0] + (dx * k) / steps, origin[2] + (dz * k) / steps));
      const cruise = Math.min(top + profile.cruise, Math.max(origin[1], end[1]) + 40);
      return { path: new RidePath([origin, end]), air: { y0: origin[1], y1: end[1], cruise, climb: kind === 'balloon' ? 40 : 60 } };
    }
    const line = planRoute(deps.horizon, classOf, profile.travel, origin, end);
    // On water the vehicle floats a little into it; the line's points are at the top of the blocks.
    if (profile.travel === 'water') for (const p of line) if (classAt(p[0], p[2]) === 'water') p[1] -= DRAFT;
    return { path: new RidePath(line), air: null };
  };

  /** The vehicle `s` along the line: its feet point, smoothed height and heading. */
  const placeVehicle = (t: Trip, s: number, dt: number, snap: boolean): void => {
    const sample = t.path.sample(s);
    let y: number;
    if (t.air) y = airHeight(s, t.path.length, t.air.y0, t.air.y1, t.air.cruise, t.air.climb);
    else {
      const onWater = RIDE_PROFILES[t.kind].travel === 'water' && classAt(sample.x, sample.z) === 'water';
      // The real ground once its region is in (the horizon only knows each 4 x 4 cell's top).
      y = onWater ? sample.y : (deps.groundAt(sample.x, sample.z, sample.y) ?? sample.y);
    }
    if (snap) {
      t.y = y;
      t.yaw = sample.yaw;
    } else {
      t.y += (y - t.y) * Math.min(1, dt * (t.air ? 20 : 8));
      t.yaw = angleTo(t.yaw, sample.yaw, dt * 6);
    }
    // Nose up on a climb, down on a descent (ground and water rides).
    if (!t.air) {
      const ahead = t.path.sample(s + 2).y;
      const behind = t.path.sample(s - 2).y;
      const pitch = MathUtils.clamp(-Math.atan2(ahead - behind, 4), -0.3, 0.3);
      t.pitch = snap ? pitch : t.pitch + (pitch - t.pitch) * Math.min(1, dt * 5);
    }
    t.vehicle?.root.position.set(sample.x, t.y, sample.z);
    if (t.vehicle) {
      t.vehicle.root.rotation.y = t.yaw;
      t.vehicle.root.rotation.x = t.pitch;
    }
  };

  /**
   * What the riding camera stops at: every block but those right round her head (a tree top over the stop
   * would otherwise hold the camera in her ears).
   */
  const camSolid: SolidAt = (x, y, z) =>
    !(Math.abs(x + 0.5 - focus.x) < 1.5 && Math.abs(y + 0.5 - focus.y) < 1.5 && Math.abs(z + 0.5 - focus.z) < 1.5) && deps.solid(x, y, z);

  /** The camera `distance` from `focus` (less where a block is in the way), seen from `yaw` and `pitch`, looking at it. */
  const view = (yaw: number, pitch: number, distance: number): void => {
    const dir: [number, number, number] = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    const hit = raycastGrid([focus.x, focus.y, focus.z], dir, distance, camSolid);
    const reach = hit === null ? distance : Math.max(1.5, hit - CAMERA_PAD);
    chasePos.set(focus.x + dir[0] * reach, focus.y + dir[1] * reach, focus.z + dir[2] * reach);
    camera.position.copy(chasePos);
    camera.lookAt(focus);
  };

  /** How far the camera can back off from `focus` toward `yaw` before a block. */
  const clearance = (yaw: number, pitch: number, distance: number): number =>
    raycastGrid([focus.x, focus.y, focus.z], [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)], distance, camSolid) ?? distance;

  /**
   * The side the camera rides on: the one it is on while it has room, else whichever of the other side and
   * straight behind has more (a stop beside a wall, a street of houses), so the view never ends up in her ears.
   */
  const pickSide = (t: Trip): void => {
    const st = t.staging;
    const room = ([side, pitch]: readonly [number, number]): number => clearance(t.yaw + Math.PI + side, pitch, st.distance);
    // Out from under the trees, back up to the view over the vehicle.
    if (t.pitchAim !== st.pitch && room([t.side, st.pitch]) >= st.distance * 0.9) t.pitchAim = st.pitch;
    const here: [number, number] = [t.side, t.pitchAim];
    if (room(here) >= st.distance * 0.6) return;
    // Under a tree top or an arch, a low view along the ground often has the room a high one has not.
    const choices: Array<[number, number]> = [st.side, -st.side, 0].flatMap((side): Array<[number, number]> => [[side, st.pitch], [side, LOW_PITCH]]);
    [t.side, t.pitchAim] = choices.reduce((best, c) => (room(c) > room(best) + 0.5 ? c : best), here);
  };

  /** The camera riding along: behind and to the side of the vehicle, looking at the child. */
  const chase = (t: Trip, dt: number, snap: boolean): void => {
    const st = t.staging;
    focus.copy(t.vehicle ? t.vehicle.seatWorld(seat) : feet).y += 1.1;
    pickSide(t);
    const want = t.yaw + Math.PI + t.side;
    t.camYaw = snap ? want : angleTo(t.camYaw, want, dt * 2.2);
    t.camPitch = snap ? t.pitchAim : t.camPitch + (t.pitchAim - t.camPitch) * Math.min(1, dt * 2.2);
    // An air ride's camera keeps close while it is low among roofs and trees.
    const high = t.air ? smoothstep((t.y - Math.min(t.air.y0, t.air.y1)) / LOW_HEIGHT) : 1;
    view(t.camYaw, t.camPitch, LOW_DISTANCE + (st.distance - LOW_DISTANCE) * high);
    // Lifting off from among the other balloons: the camera stays put and watches until it is up.
    if (st.liftOff !== undefined && t.air && t.lastS < t.path.length / 2) {
      const up = smoothstep((t.y - t.air.y0 - st.liftOff) / 6);
      camera.position.lerpVectors(t.camStart, chasePos, up);
      camera.lookAt(focus);
    }
  };

  const hideStop = (t: Trip): void => {
    if (t.stopHidden) return;
    t.stopHidden = true;
    t.stop.root.visible = false;
  };

  const begin = (t: Trip): void => {
    trip = t;
    overlay.setRiding(true);
  };

  const finish = (t: Trip): JourneyEnd => {
    release(t.releases);
    t.stop.root.visible = t.stopWasVisible;
    overlay.setRiding(false);
    const at = t.landing ?? t.rideTo;
    if (t.vehicle) {
      leaving?.vehicle.dispose();
      leaving = { vehicle: t.vehicle, t: 0, kind: t.kind, from: t.vehicle.root.position.clone(), yaw: t.yaw };
    }
    trip = null;
    return { done: at, facing: t.endFacing ?? t.yaw, cameraYaw: t.endCamYaw ?? t.camYaw };
  };

  const updateLeaving = (dt: number): void => {
    if (!leaving) return;
    const l = leaving;
    l.t += dt;
    const u = l.t / LEAVE_S;
    const away = 6 * l.t * l.t;
    const forward = l.kind === 'balloon' ? 4 * u : away;
    const up = l.kind === 'balloon' ? 12 * smoothstep(u) : l.kind === 'cable-car' ? 3 * smoothstep(u) : 0;
    l.vehicle.root.position.set(l.from.x + Math.sin(l.yaw) * forward, l.from.y + up, l.from.z + Math.cos(l.yaw) * forward);
    l.vehicle.update(dt, Math.min(12, 12 * l.t));
    l.vehicle.setOpacity(Math.min(1, (LEAVE_S - l.t) / FADE_OUT_S));
    if (l.t >= LEAVE_S) {
      l.vehicle.dispose();
      leaving = null;
    }
  };

  const updateReduced = (dt: number): JourneyEnd | null => {
    const r = reducedTrip;
    if (!r) return null;
    r.t += dt;
    fade = Math.min(1, r.t / REDUCED_FADE_S);
    overlay.setFade(fade);
    if (fade < 1 || !r.ready) return null;
    release(r.releases);
    reducedTrip = null;
    overlay.setRiding(false);
    return { done: deps.standAt(r.rideTo) ?? r.rideTo, facing: r.facing, cameraYaw: r.camYaw };
  };

  return {
    get active() {
      return trip !== null || reducedTrip !== null;
    },
    get state() {
      if (reducedTrip) return { kind: reducedTrip.kind, phase: 'fade' as const };
      if (!trip) return null;
      return { kind: trip.kind, phase: phaseAt(trip.timeline, trip.t).phase };
    },

    start(stop, from, facing) {
      if (trip || reducedTrip || !stop.def.ride) return false;
      const [rx, ry, rz] = stop.def.ride;
      const rideTo: Point3 = [rx, ry, rz];
      const releases: Array<() => void> = [];
      if (deps.reduced) {
        const camYaw = Math.atan2(camera.position.x - from.x, camera.position.z - from.z);
        const r = { kind: rideKind(stop.def), rideTo, facing, releases, ready: false, t: 0, camYaw };
        reducedTrip = r;
        overlay.setRiding(true);
        prepare(rx, rz, releases, () => (r.ready = true));
        return true;
      }
      const kind = rideKind(stop.def);
      const staging = STAGING[kind];
      const vehicle = createRideVehicle(kind, stop, deps.castShadow);
      const [px, py, pz] = stop.def.position;
      const origin: Point3 = [px, py, pz];
      const { path, air } = planPath(kind, origin, rideTo, vehicle.halfWidth);
      const timeline = rideTimeline(path.length, RIDE_PROFILES[kind].maxSpeed, staging.board, ALIGHT_S);
      const t: Trip = {
        kind,
        stop,
        stopWasVisible: stop.root.visible,
        staging,
        vehicle,
        path,
        timeline,
        air,
        from: from.clone(),
        facing,
        rideTo,
        releases,
        destReady: false,
        t: 0,
        waited: 0,
        skipping: false,
        y: py,
        yaw: 0,
        pitch: 0,
        lastS: 0,
        landing: null,
        endFacing: null,
        endCamYaw: null,
        camFrom: (() => {
          const dx = camera.position.x - from.x;
          const dy = camera.position.y - (from.y + 1.3);
          const dz = camera.position.z - from.z;
          const distance = Math.hypot(dx, dy, dz) || 1;
          return { yaw: Math.atan2(dx, dz), pitch: Math.asin(MathUtils.clamp(dy / distance, -1, 1)), distance };
        })(),
        camYaw: 0,
        camStart: camera.position.clone(),
        side: staging.side,
        camPitch: staging.pitch,
        pitchAim: staging.pitch,
        stopHidden: false,
      };
      // The far stop, and on a long trip the start of its last stretch, are fetched and drawn from now on.
      prepare(rx, rz, releases, () => (t.destReady = true));
      if (timeline.cut) {
        const last = path.sample(path.length - timeline.shown / 2);
        prepare(last.x, last.z, releases, () => undefined);
      }
      // The stop's own vehicle leaves with her (its copy takes its place at once).
      if (staging.arrive === 0) hideStop(t);
      deps.scene.add(vehicle.root);
      placeVehicle(t, 0, 0, true);
      vehicle.setGrowth(staging.grow > 0 ? 0 : 1);
      // A bus or a train is not there yet: it pulls in during the boarding.
      if (staging.arrive > 0) vehicle.setOpacity(0);
      vehicle.seatWorld(seat);
      focus.copy(seat).y += 1.1;
      pickSide(t);
      t.camYaw = t.yaw + Math.PI + t.side;
      t.camPitch = t.pitchAim;
      begin(t);
      return true;
    },

    update(dt) {
      updateLeaving(dt);
      if (reducedTrip) return updateReduced(dt);
      const t = trip;
      if (!t) {
        // The fade clears after the journey.
        if (fade > 0) overlay.setFade((fade = Math.max(0, fade - dt * FADE_RATE)));
        return null;
      }
      const vehicle = t.vehicle;
      const { timeline, staging } = t;
      const travelEnd = timeline.board + timeline.travel;
      let { phase } = phaseAt(timeline, t.t);
      // Darken while waiting: for the land under the vehicle, for the far stop before getting off, for a skip.
      let waiting = false;
      if (t.skipping && phase !== 'alight') {
        waiting = true;
        if (fade >= 1 && t.destReady) {
          hideStop(t);
          t.t = travelEnd;
          t.skipping = false;
          vehicle?.setGrowth(1);
          vehicle?.setOpacity(1);
          placeVehicle(t, t.path.length, 0, true);
          chase(t, 0, true);
          phase = 'alight';
        }
      } else if (phase === 'travel') {
        const now = tripAt(timeline, t.t - timeline.board);
        const at = t.path.sample(now.s);
        const landMissing = !deps.world.drawnAt(at.x, at.z);
        const stopNotReady = t.t + dt >= travelEnd && !t.destReady;
        if (landMissing || stopNotReady) {
          waiting = true;
          t.waited += dt;
          // Waited long enough on the way: on to the far stop once it is in.
          if (t.waited > MAX_WAIT_S && landMissing && t.destReady && fade >= 1) {
            t.t = travelEnd - 0.05;
            t.waited = 0;
          }
        } else t.waited = 0;
      }
      const cutFade = phase === 'travel' ? tripAt(timeline, t.t - timeline.board).fade : 0;
      fade = waiting ? Math.min(1, fade + dt * FADE_RATE) : Math.max(cutFade, fade - dt * FADE_RATE);
      overlay.setFade(Math.max(fade, cutFade));
      if (!waiting) t.t += dt;
      ({ phase } = phaseAt(timeline, t.t));

      if (phase === 'board') {
        const u = t.t;
        // A bus or a train pulls in from behind the stop, slowing to a stop (it fades in as it comes).
        const sample = t.path.sample(0);
        if (staging.arrive > 0 && vehicle) {
          const left = Math.max(0, 1 - u / staging.arrive);
          const back = ARRIVE_FROM * left * left;
          vehicle.root.position.set(sample.x - Math.sin(sample.yaw) * back, t.y, sample.z - Math.cos(sample.yaw) * back);
          vehicle.setOpacity(Math.min(1, u / 0.35));
          vehicle.update(dt, (2 * ARRIVE_FROM * left) / staging.arrive);
          // At a bus or train stop the small model gives way to the vehicle as it pulls in over it.
          if (u >= staging.arrive * 0.85) hideStop(t);
        } else vehicle?.update(dt, 0);
        if (staging.grow > 0) vehicle?.setGrowth(smoothstep(u / staging.grow));
        const hopFrom = timeline.board - HOP_S;
        if (vehicle) vehicle.seatWorld(seat);
        const hopU = (u - hopFrom) / HOP_S;
        if (hopU <= 0) feet.copy(t.from);
        else feet.fromArray(hop([t.from.x, t.from.y, t.from.z], [seat.x, seat.y, seat.z], HOP_HEIGHT, smoothstep(hopU)));
        const toward = Math.atan2(seat.x - t.from.x, seat.z - t.from.z);
        const facing = hopU <= 0 ? angleTo(t.facing, toward, u * 3) : angleTo(toward, t.yaw, smoothstep(hopU));
        // The camera swings round her from where it was to riding along (round her, never through the vehicle);
        // at a balloon it stays where it was and watches her climb in.
        const blend = smoothstep(u / timeline.board);
        focus.copy(feet).y += 1.2;
        if (staging.liftOff !== undefined) {
          camera.position.copy(t.camStart);
          camera.lookAt(focus);
        } else view(angleTo(t.camFrom.yaw, t.camYaw, blend), MathUtils.lerp(t.camFrom.pitch, t.camPitch, blend), MathUtils.lerp(t.camFrom.distance, staging.distance, blend));
        return { feet, facing, pose: hopU >= 1 ? (vehicle?.pose ?? null) : null, speed: hopU > 0 && hopU < 1 ? WALK_SPEED : 0 };
      }

      if (phase === 'travel') {
        const { s, speed } = tripAt(timeline, t.t - timeline.board);
        // The cut of a long trip: the vehicle and the camera land on the far stretch at once, behind the fade.
        const jumped = Math.abs(s - t.lastS) > 30;
        t.lastS = s;
        placeVehicle(t, s, dt, jumped);
        vehicle?.update(dt, speed);
        chase(t, dt, jumped);
        vehicle?.seatWorld(feet);
        return { feet, facing: t.yaw, pose: vehicle?.pose ?? null, speed: 0 };
      }

      if (phase === 'alight') {
        const u = t.t - travelEnd;
        if (!t.landing) {
          placeVehicle(t, t.path.length, dt, false);
          t.landing = deps.standAt(t.rideTo) ?? t.rideTo;
          // The view ends behind her on the side away from the vehicle: she in front, the vehicle leaving beyond.
          const root = vehicle?.root.position;
          t.endCamYaw = root ? Math.atan2(t.landing[0] - root.x, t.landing[2] - root.z) : t.camYaw;
        }
        vehicle?.update(dt, 0);
        vehicle?.seatWorld(seat);
        const hopU = smoothstep(u / (ALIGHT_S * 0.8));
        feet.fromArray(hop([seat.x, seat.y, seat.z], t.landing, HOP_HEIGHT, hopU));
        // The view eases from riding along to the follow camera behind her, from the same side.
        chase(t, dt, false);
        const follow = deps.followView();
        lookTmp.set(t.landing[0], t.landing[1] + 1.3, t.landing[2]);
        const endYaw = angleTo(t.camYaw, t.endCamYaw ?? t.camYaw, smoothstep(u / ALIGHT_S));
        backTmp.set(Math.sin(endYaw) * Math.cos(follow.pitch), Math.sin(follow.pitch), Math.cos(endYaw) * Math.cos(follow.pitch));
        backTmp.multiplyScalar(follow.distance).add(lookTmp);
        const blend = smoothstep(u / ALIGHT_S);
        camera.position.lerpVectors(chasePos, backTmp, blend);
        focus.lerp(lookTmp, blend);
        camera.lookAt(focus);
        const away = Math.atan2(t.landing[0] - seat.x, t.landing[2] - seat.z);
        t.endFacing = angleTo(t.yaw, away, hopU);
        return { feet, facing: t.endFacing, pose: null, speed: hopU < 1 ? WALK_SPEED : 0 };
      }

      return finish(t);
    },

    skip() {
      if (trip) trip.skipping = true;
    },

    dispose() {
      if (trip) {
        release(trip.releases);
        trip.stop.root.visible = trip.stopWasVisible;
        trip.vehicle?.dispose();
        trip = null;
      }
      if (reducedTrip) release(reducedTrip.releases);
      reducedTrip = null;
      leaving?.vehicle.dispose();
      leaving = null;
      overlay.dispose();
    },
  };
}
