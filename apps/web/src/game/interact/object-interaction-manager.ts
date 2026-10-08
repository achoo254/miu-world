// The interactions with the map's furniture and props: which one is in reach, the prompt over it, and what
// happens on a tap. The child makes the pose's gesture (interaction-poses.ts) where she stands, turned to the
// object, or sits on its seat, lies on its mattress, sits in front of its screen, swings with its seat
// (interaction-geometry.ts); the object answers (its switched state in object-states.ts, drawn by
// object-effects.ts). Her controller never goes into the object: while she is on it the body is drawn there and
// the controller waits on open ground beside it, where she stands up again. Nothing locks her: a second tap, a
// push of the stick or the end of the gesture always lets her go.
import { Vector3, type Camera } from 'three';
import type { CatalogModel } from '@miu/voxel/model-catalog';
import type { ModelBounds } from '@miu/voxel/prop-collision';
import type { WorldEntities } from '@miu/voxel/world-entities';
import type { InteractionPrompt } from '../../game-bridge/game-store';
import { getLangMode, inline } from '../../ui/i18n/i18n';
import type { SpeechBubble } from '../ambient/speech-bubble';
import type { ExtraPlayerAction, SeatedPose } from '../entities/player-character';
import type { MultiplayerClient } from '../multiplayer/multiplayer-client';
import type { PlayerController } from '../player/player-controller';
import {
  floorBody,
  lieBody,
  lieOf,
  middleOf,
  nearestSeat,
  seatBody,
  seatsOf,
  standBody,
  standUpSpot,
  stateKey,
  swingAngle,
  swingBody,
  toWorld,
  watchSpot,
  type Point,
} from './interaction-geometry';
import { POSE_BEHAVIOURS } from './interaction-poses';
import { matchInteraction } from './object-interaction-registry';
import type { ActiveInteraction, BodyPlacement, CandidateObject, ObjectInteractionDef } from './object-interaction-types';
import { ObjectStates } from './object-states';
import { liesDown } from './player-actions';

export interface InteractionVisualState {
  poseOverride: SeatedPose | null;
  bubblePos: { x: number; y: number; z: number };
  action: ExtraPlayerAction;
  /** Where her body is drawn while she is on the object (not where her controller waits), else null. */
  body: BodyPlacement | null;
}

/** What the effects drawing is told (object-effects.ts); the manager keeps the states. */
export interface EffectsChannel {
  /** A one-off answer while she uses it (water running, steam, floating shapes, a globe spinning). */
  play(object: CandidateObject, seconds: number): void;
  stop(object: CandidateObject): void;
  /** Turns a swing's seat (radians) with her on it. */
  swing(object: CandidateObject, part: string, angle: number): void;
}

export interface ObjectInteractionDeps {
  /** A model's catalogue entry (content/world/models.json: seats, mattress, front, screen). */
  catalog?: (model: string) => CatalogModel | undefined;
  /** A model's bounds in its own frame. */
  bounds?: (model: string) => ModelBounds | undefined;
  /** The open spot she can stand on nearest to a point (null: none close). */
  standSpot?: (at: Point) => Point | null;
  /** Whether a wall (blocks, not furniture) stands between two spots at her waist: a spot behind one is not hers. */
  wallBetween?: (from: Point, to: Point) => boolean;
  states?: ObjectStates;
  effects?: EffectsChannel;
  /** Less motion asked for: the swing holds still. */
  reduced?: boolean;
}

/** A house door opens as she comes this close (blocks) and closes once she is this far, after a moment. */
export const DOOR_OPEN_RADIUS = 3.2;
const DOOR_CLOSE_RADIUS = 4.2;
const DOOR_CLOSE_DELAY = 1.2;
/** A spot she sits on or stands up to is at most this far from where she tapped (blocks): never the next room. */
const MAX_SPOT_REACH = 4.5;
/** A one-off answer with no duration of its own plays this long. */
const MOMENT_SECONDS = 3;

const isToggle = (def: ObjectInteractionDef): boolean => def.effect?.toggle === true;
/** The prompt while she sits, lies or watches; while she stands inside something (a shower). */
const GET_UP = { vi: 'Đứng dậy', en: 'Get up' };
const STEP_OUT = { vi: 'Bước ra', en: 'Step out' };

export class ObjectInteractionManager {
  private readonly candidates: CandidateObject[] = [];
  private readonly doors: CandidateObject[] = [];
  private active: ActiveInteraction | null = null;
  /** The active gesture's pose when it is not the def's own (switching a television off: a tap, no sitting). */
  private gesture: ExtraPlayerAction = null;
  private readonly bubble: SpeechBubble;
  private readonly deps: ObjectInteractionDeps;
  readonly states: ObjectStates;
  /** Doors she closed by hand stay closed until she has walked away from them. */
  private readonly heldShut = new Set<string>();
  private readonly doorAway = new Map<string, number>();

  constructor(entities: WorldEntities, bubble: SpeechBubble, deps: ObjectInteractionDeps = {}) {
    this.bubble = bubble;
    this.deps = deps;
    this.states = deps.states ?? new ObjectStates();
    this.indexEntities(entities);
  }

  /** Every interactable prop of the map, once per spot; a piece of her home keyed by its decor spot. */
  private indexEntities(entities: WorldEntities): void {
    const seenSpots = new Set<string>();
    const anchors = entities.decorAnchors ?? [];
    for (let i = 0; i < entities.props.length; i++) {
      const prop = entities.props[i];
      if (!prop) continue;
      const def = matchInteraction(prop.model, prop.slot);
      if (!def) continue;
      const [x, y, z] = prop.position;
      const spot = `${Math.round(x * 10)},${Math.round(y * 10)},${Math.round(z * 10)}`;
      if (seenSpots.has(spot)) continue;
      seenSpots.add(spot);
      const slotSpot = prop.slot ? nearestAnchor(anchors, prop.slot, prop.position) : null;
      const placed = { position: prop.position, yaw: prop.yaw, scale: prop.scale };
      const candidate: CandidateObject = {
        id: `prop-${def.id}-${i}`,
        name: inline({ vi: def.nameVi, en: def.nameEn }, getLangMode()),
        model: prop.model,
        slot: prop.slot,
        propIndex: i,
        position: prop.position,
        yaw: prop.yaw,
        scale: prop.scale,
        def,
        stateKey: stateKey(def.id, prop.position, slotSpot),
        middle: middleOf(placed, this.deps.bounds?.(prop.model)),
      };
      this.candidates.push(candidate);
      if (def.effect?.kind === 'door') this.doors.push(candidate);
    }
  }

  /** Every interactable object of the map. */
  get objects(): readonly CandidateObject[] {
    return this.candidates;
  }

  /** Nearest interactable prop within reach (its own radius, and within 1.8 blocks up or down). */
  nearest(playerPos: { x: number; y: number; z: number }): CandidateObject | null {
    let best: CandidateObject | null = null;
    let minDistanceSq = Infinity;
    for (const obj of this.candidates) {
      const [ox, oy, oz] = obj.middle;
      const dy = oy - playerPos.y;
      if (Math.abs(dy) > 1.8) continue;
      const dx = ox - playerPos.x;
      const dz = oz - playerPos.z;
      const distSq = dx * dx + dz * dz;
      const radius = obj.def.radius ?? 2.2;
      if (distSq <= radius * radius && distSq < minDistanceSq) {
        minDistanceSq = distSq;
        best = obj;
      }
    }
    return best;
  }

  /** The prompt over it: the verb, the switch-off verb while it is on, or "get up" while it holds her. */
  toPrompt(obj: CandidateObject): InteractionPrompt {
    const { def } = obj;
    const on = isToggle(def) && this.states.isOn(obj.stateKey);
    const getUp = POSE_BEHAVIOURS[def.pose].place === 'inside' ? STEP_OUT : GET_UP;
    const label =
      this.holding === obj ? getUp : on && def.offVi && def.offEn ? { vi: def.offVi, en: def.offEn } : { vi: def.verbVi, en: def.verbEn };
    return { targetId: obj.id, kind: 'object', name: obj.name, label: inline(label, getLangMode()) };
  }

  /** Screen coordinates for the interaction label anchor. */
  screenAnchor(obj: CandidateObject, camera: Camera, viewport: { width: number; height: number }): { x: number; y: number } {
    const [ox, oy, oz] = this.middle(obj);
    const v = new Vector3(ox, oy + 1.2, oz);
    v.project(camera);
    return { x: ((v.x + 1) / 2) * viewport.width, y: ((-v.y + 1) / 2) * viewport.height };
  }

  /** A tap on the object: its gesture, its answer, and her place on it if the pose takes her there. */
  interact(obj: CandidateObject, controller: PlayerController, multiplayer?: MultiplayerClient): void {
    // A second tap while she is on something (or using it) gets her up first.
    if (this.active) {
      const holding = this.active.body !== null;
      this.finish();
      if (holding) return;
    }
    const { def } = obj;
    const behaviour = POSE_BEHAVIOURS[def.pose];
    const lines = def.dialoguesVi;
    const line = lines[Math.floor(Math.random() * lines.length)] ?? lines[0] ?? '';
    let gesture: ExtraPlayerAction = behaviour.action;
    let place = behaviour.place;

    if (isToggle(def)) {
      const keep = def.effect?.kind !== 'door';
      const on = this.states.toggle(obj.stateKey, keep);
      if (def.effect?.kind === 'door') {
        if (on) this.heldShut.delete(obj.stateKey);
        else this.heldShut.add(obj.stateKey);
      }
      // Switching a screen off she just taps it; switching it on she sits down to watch.
      if (!on && place !== 'face') {
        place = 'face';
        gesture = 'tap';
      }
    } else if (def.effect) {
      this.deps.effects?.play(obj, def.duration && def.duration > 0 ? def.duration : MOMENT_SECONDS);
    }

    const here: Point = [controller.position.x, controller.position.y, controller.position.z];
    const placed = { position: obj.position, yaw: obj.yaw, scale: obj.scale };
    const entry = this.deps.catalog?.(obj.model);
    const bounds = this.deps.bounds?.(obj.model);
    // An open spot near where she is, on her floor and not behind a wall (else none: she stays where she is).
    const open = (at: Point): Point | null => {
      const spot = this.deps.standSpot?.(at) ?? null;
      if (!spot || Math.abs(spot[1] - here[1]) > 1.01 || Math.hypot(spot[0] - here[0], spot[2] - here[2]) > MAX_SPOT_REACH) return null;
      return this.deps.wallBetween?.(here, spot) ? null : spot;
    };
    let body: BodyPlacement | null = null;
    let swing: ActiveInteraction['swing'] = null;
    let standAt: Point = this.deps.standSpot?.(here) ?? here;

    if (place === 'seat') {
      const seat = nearestSeat(placed, seatsOf(entry, bounds), here);
      body = seatBody(placed, seat, entry?.front ?? 0);
      standAt = open(standUpSpot(placed, body)) ?? standAt;
      if (seat.part && seat.pivot) swing = { part: seat.part, pivot: toWorld(placed, seat.pivot), seat: body.position, yaw: obj.yaw };
    } else if (place === 'inside') {
      if (entry?.stand) {
        body = standBody(placed, entry.stand, entry.front ?? 0);
        standAt = open(standUpSpot(placed, body)) ?? standAt;
      } else {
        // No floor of its own in the catalogue: she uses it standing where she is, turned to it.
        place = 'face';
      }
    } else if (place === 'lie') {
      body = lieBody(placed, lieOf(entry, bounds));
    } else if (place === 'front') {
      const { spot, facing } = watchSpot(placed, entry, bounds);
      const floor = open(spot);
      if (floor) {
        standAt = floor;
        body = floorBody(floor, facing);
      } else {
        // No open floor in front of it: she watches standing where she is, turned to it.
        place = 'face';
      }
    }
    // On an object she waits (and later stands up) on open ground; a standing gesture leaves her where she is.
    if (body && standAt !== here) controller.teleport(standAt);
    if (place === 'face') {
      const [mx, , mz] = this.middle(obj);
      controller.facing = Math.atan2(mx - controller.position.x, mz - controller.position.z);
    } else if (body) {
      controller.facing = body.facing;
    }

    this.bubble.show(line);
    if (multiplayer && def.emoji) multiplayer.sendEmote('cheer');
    this.gesture = gesture;
    this.active = {
      def,
      object: obj,
      elapsed: 0,
      // A switch flipped or a screen turned off is a short gesture; sitting down to watch lasts until she gets up;
      // standing inside something (a shower) lasts its while, then she steps out.
      duration: body && place !== 'inside' ? 0 : (def.duration ?? 0) > 0 ? (def.duration ?? 0) : 1.2,
      bubbleText: line,
      body,
      swing,
    };
  }

  /**
   * Frame update: the doors that open by themselves, the swing's seat, the gesture; she is let go when she
   * pushes the stick or the gesture is over.
   */
  update(dt: number, controller: PlayerController, isMoving: boolean): InteractionVisualState {
    this.updateDoors(dt, controller.position);
    const active = this.active;
    let body: BodyPlacement | null = active?.body ?? null;
    const lying = liesDown(this.gesture);
    const base = body ? body.position : [controller.position.x, controller.position.y, controller.position.z];
    const bubblePos = { x: base[0] ?? 0, y: (base[1] ?? 0) + (lying ? 1.2 : 1.9), z: base[2] ?? 0 };
    if (!active) return { poseOverride: null, bubblePos, action: null, body: null };

    active.elapsed += dt;
    // A push of the stick after a short grace (the tap itself may still carry a little speed) gets her up.
    if ((isMoving && active.elapsed > 0.25) || (active.duration > 0 && active.elapsed >= active.duration)) {
      this.finish();
      return { poseOverride: null, bubblePos, action: null, body: null };
    }
    if (active.swing && active.body) {
      const angle = swingAngle(active.elapsed, this.deps.reduced === true);
      body = swingBody(active.body, active.swing.pivot, active.swing.yaw, angle);
      this.deps.effects?.swing(active.object, active.swing.part, angle);
    }
    const behaviour = POSE_BEHAVIOURS[active.def.pose];
    return { poseOverride: body ? behaviour.seated : null, bubblePos, action: this.gesture, body };
  }

  /** House doors: open while she is near (unless she shut one by hand), closed a moment after she leaves. */
  private updateDoors(dt: number, at: { x: number; y: number; z: number }): void {
    for (const door of this.doors) {
      const [x, y, z] = this.middle(door);
      if (Math.abs(y - at.y) > 3) continue;
      const d = Math.hypot(x - at.x, z - at.z);
      const key = door.stateKey;
      if (d <= DOOR_OPEN_RADIUS) {
        this.doorAway.set(key, 0);
        if (!this.heldShut.has(key)) this.states.set(key, true, false);
      } else if (d >= DOOR_CLOSE_RADIUS) {
        this.heldShut.delete(key);
        const away = (this.doorAway.get(key) ?? 0) + dt;
        this.doorAway.set(key, away);
        if (away >= DOOR_CLOSE_DELAY) this.states.set(key, false, false);
      }
    }
  }

  /** Ends the interaction: one-off answers stop, a swing comes to rest. She is already on open ground. */
  private finish(): void {
    const active = this.active;
    this.active = null;
    this.gesture = null;
    if (!active) return;
    if (active.swing) this.deps.effects?.swing(active.object, active.swing.part, 0);
    if (active.def.effect && !isToggle(active.def)) this.deps.effects?.stop(active.object);
  }

  /** Lets her go at once (a ride, a gate, the rescue button moving her): her body is no longer drawn on the object. */
  cancel(): void {
    this.finish();
  }

  get isInteracting(): boolean {
    return this.active !== null;
  }

  get activeDef(): ObjectInteractionDef | null {
    return this.active?.def ?? null;
  }

  get activeObject(): CandidateObject | null {
    return this.active?.object ?? null;
  }

  /** The object she is on (seated, lying, watching): its prompt stays hers to get up, wherever she waits. */
  get holding(): CandidateObject | null {
    return this.active?.body ? this.active.object : null;
  }

  /** The gesture she is making now (the pose's, or a tap when switching a screen off), else null. */
  get activeGesture(): ExtraPlayerAction {
    return this.active ? this.gesture : null;
  }

  /** The drawing of the objects' answers, once it exists (it needs the objects this manager found). */
  attachEffects(effects: EffectsChannel): void {
    this.deps.effects = effects;
  }

  /** The object's middle on the ground (a corner-pivot model's pivot is its corner). */
  middle(obj: CandidateObject): Point {
    return obj.middle;
  }
}

/** The decor spot (its index among its slot's spots) a piece of her home stands at: the nearest one of its slot. */
function nearestAnchor(anchors: NonNullable<WorldEntities['decorAnchors']>, slot: string, at: Point): { slot: string; index: number } | null {
  let best: { slot: string; index: number } | null = null;
  let bestD = Infinity;
  let index = 0;
  for (const anchor of anchors) {
    if (anchor.slot !== slot) continue;
    const d = Math.hypot(anchor.position[0] - at[0], anchor.position[1] - at[1], anchor.position[2] - at[2]);
    if (d < bestD) {
      bestD = d;
      best = { slot, index };
    }
    index++;
  }
  return best;
}
