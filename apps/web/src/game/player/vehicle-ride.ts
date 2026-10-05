// The vehicle the child drives (owner, 03/10/2026: vehicles to drive, facing where she faces and sitting
// right under her; she sits or stands by the vehicle). A `vehicle` outfit item is not worn on a rig node:
// when she gets on, its mesh hangs under the character root (front toward the model's +z, her forward),
// she stands on its deck or holds the rig's `sit` / `drive` pose on its seat, goes faster, and gets off
// on her own in water. Her collision body never changes.
import type { Mesh, Object3D } from 'three';
import type { AccessoryDef, VehicleRideSpec } from '@miu/voxel/accessory-schema';
import type { GameStore } from '../../game-bridge/game-store';
import { createAccessoryMesh } from '../character/character-accessories';
import { ACCESSORIES } from '../content/accessories';
import type { SeatedPose } from '../entities/player-character';

/** A floating vehicle (a cloud, a carpet) bobs this high (model units) and this often; still for less motion. */
const FLOAT_BOB = 0.06;
const FLOAT_HZ = 0.6;
/**
 * In the rig's `sit` and `drive` clips (Kenney character-a, every species) the root drops 0.2 and the seat
 * of her trousers rests this far above the feet origin (model units), legs straight out in front.
 */
export const SEAT_ABOVE_FEET = 0.1;

/** How far her feet origin stands above the ground on this vehicle (model units): on the deck, or seated on the seat. */
export function rideLift(ride: VehicleRideSpec): number {
  return ride.pose === 'stand' ? ride.height : ride.height - SEAT_ABOVE_FEET;
}

/** The rig pose she holds on this vehicle: seated ones, or none (standing: her idle). */
export function seatedPose(ride: VehicleRideSpec): SeatedPose | null {
  return ride.pose === 'stand' ? null : ride.pose;
}

export interface EquippedVehicle {
  /** The outfit entry (catalogue id, or `id:variant` in dev switches). */
  entry: string;
  name: string;
  def: AccessoryDef;
  variant?: string;
  ride: VehicleRideSpec;
}

/** The vehicle among outfit entries, if any. Unknown entries are left to the outfit (it skips and warns). */
export function equippedVehicle(entries: readonly string[]): EquippedVehicle | null {
  for (const entry of entries) {
    const [id = '', variant] = entry.split(':');
    const item = ACCESSORIES.get(id);
    if (item?.slot !== 'vehicle' || !item.def.ride) continue;
    return { entry, name: item.name, def: item.def, variant: variant ?? item.variant, ride: item.def.ride };
  }
  return null;
}

/**
 * The vehicle's mesh, placed for a parent that is the character root lifted by `rideLift`: its ground
 * (voxel y = 0) lands back on the ground under her. The caller adds it, and frees its geometry.
 */
export function createVehicleMesh(vehicle: EquippedVehicle, castShadow: boolean): Mesh {
  const mesh = createAccessoryMesh(vehicle.def, vehicle.variant);
  const [x, y, z] = vehicle.def.offset;
  mesh.position.set(x, y - rideLift(vehicle.ride), z);
  mesh.castShadow = castShadow;
  mesh.name = `vehicle:${vehicle.def.id}`;
  return mesh;
}

/** How far the vehicle's front reaches ahead of her centre, in world units (`scale`: the character root's). */
export function noseReach(mesh: Mesh, scale: number): number {
  mesh.geometry.computeBoundingBox();
  const front = mesh.geometry.boundingBox?.max.z ?? 0;
  return Math.max(0, (front + mesh.position.z) * scale);
}

/** Riding state, apart from three.js: on and off, off in water, and how high her feet stand. */
export class VehicleRide {
  riding = false;
  private time = 0;

  constructor(
    private readonly spec: VehicleRideSpec | null,
    /** The child asked for less motion: a floating vehicle holds still. */
    private readonly reduced: boolean,
  ) {}

  get available(): boolean {
    return this.spec !== null;
  }

  /** Gets on or off; she cannot get on without a vehicle or in water. True when that changed anything. */
  set(on: boolean, inWater: boolean): boolean {
    const next = on && this.spec !== null && !inWater;
    if (next === this.riding) return false;
    this.riding = next;
    this.time = 0;
    return true;
  }

  /** Each frame: water puts her off the vehicle (she swims as usual). True when she just got off. */
  update(dt: number, inWater: boolean): boolean {
    this.time += dt;
    return this.riding && inWater ? this.set(false, inWater) : false;
  }

  /** How far her feet origin stands above the ground, in model units (0 on foot). */
  get lift(): number {
    if (!this.riding || !this.spec) return 0;
    const bob = this.spec.float && !this.reduced ? FLOAT_BOB * (1 - Math.cos(this.time * FLOAT_HZ * 2 * Math.PI)) * 0.5 : 0;
    return rideLift(this.spec) + bob;
  }

  /** The seated pose she holds while riding, or none (on foot, or standing on a board). */
  get pose(): SeatedPose | null {
    return this.riding && this.spec ? seatedPose(this.spec) : null;
  }
}

/** What the game loop needs from the ride. */
export interface RideControl {
  readonly riding: boolean;
  /** The seated pose to hold while riding, or none. */
  readonly pose: SeatedPose | null;
  /** Feet above the ground in world units (the root is lifted by this). */
  readonly liftWorld: number;
  /** Applies the HUD's toggle, gets her off in water, shows the vehicle and sets the controller's pace. */
  update(dt: number): void;
  /** Gets her off at the next update (she boards one of the map's rides). */
  dismount(): void;
  dispose(): void;
}

/**
 * Hooks the equipped vehicle into a game: the HUD toggle arrives as the bridge command `ride`, the HUD
 * hears `vehicle` events. `rider` is the controller (its pace and water); `root` the character root.
 */
export function createRideControl(options: {
  store: GameStore;
  outfit: readonly string[];
  root: Object3D;
  rider: { riding: boolean; rideReach: number; readonly inWater: boolean };
  castShadow: boolean;
  reduced: boolean;
}): RideControl {
  const { store, root, rider } = options;
  const vehicle = equippedVehicle(options.outfit);
  const ride = new VehicleRide(vehicle?.ride ?? null, options.reduced);
  let mesh: Mesh | null = null;
  let wanted: boolean | null = null;
  const report = (): void => store.emit({ type: 'vehicle', vehicle: vehicle ? { name: vehicle.name, riding: ride.riding } : null });
  const show = (): void => {
    rider.riding = ride.riding;
    if (ride.riding && !mesh && vehicle) {
      mesh = createVehicleMesh(vehicle, options.castShadow);
      root.add(mesh);
    }
    if (mesh) mesh.visible = ride.riding;
    rider.rideReach = ride.riding && mesh ? noseReach(mesh, root.scale.z) : 0;
    report();
  };
  const unsubscribe = store.onCommand((command) => {
    if (command.type === 'ride') wanted = command.on;
  });
  report();
  return {
    get riding() {
      return ride.riding;
    },
    get pose() {
      return ride.pose;
    },
    get liftWorld() {
      return ride.lift * root.scale.y;
    },
    update(dt) {
      let changed = false;
      if (wanted !== null) {
        changed = ride.set(wanted, rider.inWater);
        wanted = null;
      }
      if (ride.update(dt, rider.inWater)) changed = true;
      if (changed) show();
    },
    dismount() {
      if (ride.riding) wanted = false;
    },
    dispose() {
      unsubscribe();
      rider.riding = false;
      rider.rideReach = 0;
      if (mesh) {
        mesh.removeFromParent();
        mesh.geometry.dispose();
        mesh = null;
      }
      store.emit({ type: 'vehicle', vehicle: null });
    },
  };
}
