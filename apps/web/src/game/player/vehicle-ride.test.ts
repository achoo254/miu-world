import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import type { VehicleRideSpec } from '@miu/voxel/accessory-schema';
import type { SolidAt } from '@miu/voxel/grid-collision';
import { rasterizeAccessory } from '@miu/voxel/voxel-accessory';
import { createGameStore } from '../../game-bridge/game-store';
import { ACCESSORIES } from '../content/accessories';
import { PlayerController, RIDE_RUN_SPEED, RIDE_SPEED, RUN_SPEED, WALK_SPEED } from './player-controller';
import { VehicleRide, createRideControl, createVehicleMesh, equippedVehicle, rideLift, seatedPose } from './vehicle-ride';

const board: VehicleRideSpec = { height: 0.3125, pose: 'stand' };
const cloud: VehicleRideSpec = { height: 0.5, pose: 'sit', float: true };
const VEHICLES = [...ACCESSORIES.values()].filter((item) => item.slot === 'vehicle');

/** Flat ground: her feet stand at y = 1. */
const flat: SolidAt = (_x, y) => y < 1;

/** Holds the stick forward (+x) for `seconds`, then returns her speed. */
function cruise(player: PlayerController, run: boolean, seconds = 2): number {
  for (let i = 0; i < seconds * 60; i++) player.update(1 / 60, { dirX: 1, dirZ: 0, run, jump: false });
  return player.speed;
}

describe('riding speed', () => {
  it('goes about 8.5 blocks a second on a vehicle, a little faster with Run, and walks as before off it', () => {
    const rider = new PlayerController(flat, [0.5, 1, 0.5], 90);
    rider.riding = true;
    expect(cruise(rider, false)).toBeCloseTo(RIDE_SPEED, 1);
    expect(cruise(rider, true)).toBeCloseTo(RIDE_RUN_SPEED, 1);
    expect(RIDE_RUN_SPEED).toBeGreaterThan(RIDE_SPEED);
    const walker = new PlayerController(flat, [0.5, 1, 0.5], 90);
    expect(cruise(walker, false)).toBeCloseTo(WALK_SPEED, 1);
    expect(cruise(walker, true)).toBeCloseTo(RUN_SPEED, 1);
  });
});

describe('VehicleRide', () => {
  it('gets on and off with the toggle, and not without a vehicle', () => {
    const ride = new VehicleRide(board, false);
    expect(ride.set(true, false)).toBe(true);
    expect(ride.riding).toBe(true);
    expect(ride.set(true, false)).toBe(false);
    expect(ride.set(false, false)).toBe(true);
    expect(ride.riding).toBe(false);
    const none = new VehicleRide(null, false);
    expect(none.available).toBe(false);
    expect(none.set(true, false)).toBe(false);
    expect(none.riding).toBe(false);
  });

  it('puts her off in water and will not take her on there', () => {
    const ride = new VehicleRide(board, false);
    ride.set(true, false);
    expect(ride.update(1 / 60, false)).toBe(false);
    expect(ride.riding).toBe(true);
    expect(ride.update(1 / 60, true)).toBe(true);
    expect(ride.riding).toBe(false);
    expect(ride.set(true, true)).toBe(false);
  });

  it('lifts her onto the deck, or seats her on the seat, and holds still for less motion', () => {
    const standing = new VehicleRide(board, false);
    expect(standing.lift).toBe(0);
    standing.set(true, false);
    expect(standing.lift).toBe(board.height);
    const still = new VehicleRide(cloud, true);
    still.set(true, false);
    const lifts = Array.from({ length: 120 }, () => (still.update(1 / 60, false), still.lift));
    expect(new Set(lifts).size).toBe(1);
    expect(lifts[0]).toBe(rideLift(cloud));
    const bobbing = new VehicleRide(cloud, false);
    bobbing.set(true, false);
    const bobs = Array.from({ length: 120 }, () => (bobbing.update(1 / 60, false), bobbing.lift));
    expect(Math.max(...bobs)).toBeGreaterThan(Math.min(...bobs));
    expect(Math.max(...bobs) - Math.min(...bobs)).toBeLessThan(0.1);
  });

  it('holds the pose of the vehicle: standing on a board, sitting on a cloud, driving a car', () => {
    const pose = (entry: string): string | null => {
      const vehicle = equippedVehicle([entry]);
      if (!vehicle) throw new Error(`${entry} is not a vehicle`);
      const ride = new VehicleRide(vehicle.ride, false);
      const before = ride.pose;
      ride.set(true, false);
      expect(before).toBeNull();
      return ride.pose;
    };
    expect(pose('vehicle-skateboard-red')).toBeNull();
    expect(pose('vehicle-scooter-pink')).toBeNull();
    expect(pose('vehicle-cloud-white')).toBe('sit');
    expect(pose('vehicle-carpet-red')).toBe('sit');
    expect(pose('vehicle-toy-car-red')).toBe('drive');
    expect(pose('vehicle-train-red')).toBe('drive');
  });
});

describe('equippedVehicle', () => {
  it('finds the vehicle among worn items, colour variants included', () => {
    expect(equippedVehicle(['hat-witch-pink', 'backpack-brown'])).toBeNull();
    const blue = equippedVehicle(['hat-witch-pink', 'vehicle-skateboard-blue']);
    expect(blue).toMatchObject({ entry: 'vehicle-skateboard-blue', name: 'Ván trượt xanh dương', variant: 'blue' });
    expect(equippedVehicle(['vehicle-skateboard-red:green'])?.variant).toBe('green');
  });
});

describe('createRideControl', () => {
  it('toggles from the HUD command, shows the vehicle under her, speeds the controller, and gets her off in water', () => {
    const store = createGameStore();
    const root = new Group();
    root.scale.setScalar(0.5);
    const rider = { riding: false, inWater: false };
    const control = createRideControl({ store, outfit: ['vehicle-toy-car-red'], root, rider, castShadow: false, reduced: true });
    expect(store.getSnapshot().vehicle).toEqual({ name: 'Ô tô tí hon đỏ', riding: false });
    store.send({ type: 'ride', on: true });
    control.update(1 / 60);
    expect(control.riding).toBe(true);
    expect(rider.riding).toBe(true);
    expect(control.pose).toBe('drive');
    expect(store.getSnapshot().vehicle?.riding).toBe(true);
    const mesh = root.getObjectByName('vehicle:vehicle-toy-car-red');
    expect(mesh?.visible).toBe(true);
    expect(control.liftWorld).toBeCloseTo(0.5 * (6 / 16 - 0.1));

    rider.inWater = true;
    control.update(1 / 60);
    expect(control.riding).toBe(false);
    expect(rider.riding).toBe(false);
    expect(mesh?.visible).toBe(false);
    expect(control.liftWorld).toBe(0);
    expect(store.getSnapshot().vehicle).toEqual({ name: 'Ô tô tí hon đỏ', riding: false });

    control.dispose();
    expect(root.getObjectByName('vehicle:vehicle-toy-car-red')).toBeUndefined();
    expect(store.getSnapshot().vehicle).toBeNull();
  });

  it('offers nothing and ignores the command without a vehicle', () => {
    const store = createGameStore();
    const rider = { riding: false, inWater: false };
    const control = createRideControl({ store, outfit: ['hat-witch-pink'], root: new Group(), rider, castShadow: false, reduced: false });
    store.send({ type: 'ride', on: true });
    control.update(1 / 60);
    expect(control.riding).toBe(false);
    expect(rider.riding).toBe(false);
    expect(store.getSnapshot().vehicle).toBeNull();
  });
});

/** Whether the vehicle has a voxel at (x, y, z) (voxel units, in its own space). */
function voxelAt(volume: ReturnType<typeof rasterizeAccessory>, x: number, y: number, z: number): boolean {
  const [sx, sy, sz] = volume.dims;
  const [ix, iy, iz] = [x - volume.min[0], y - volume.min[1], z - volume.min[2]];
  if (ix < 0 || iy < 0 || iz < 0 || ix >= sx || iy >= sy || iz >= sz) return false;
  return (volume.cells[ix + sx * (iy + sy * iz)] ?? 0) > 0;
}

describe('every vehicle fits the child riding it', () => {
  it('has at least 50 vehicles, with distinct names', () => {
    expect(VEHICLES.length).toBeGreaterThanOrEqual(50);
    expect(new Set(VEHICLES.map((v) => v.name)).size).toBe(VEHICLES.length);
  });

  for (const item of VEHICLES.filter((v) => !v.variant)) {
    it(`${item.id}: on the ground, her feet or seat right under her, room for her legs, hands on the wheel`, () => {
      const ride = item.def.ride;
      if (!ride) throw new Error('no ride');
      const volume = rasterizeAccessory(item.def);
      const top = Math.round(ride.height / item.def.voxelSize);
      // Wheels on the ground; a floating one hovers, never below the ground.
      expect(volume.min[1]).toBeGreaterThanOrEqual(0);
      if (!ride.float) expect(volume.min[1]).toBe(0);
      // Deck or seat under her centre, open air right above it.
      expect(voxelAt(volume, 0, top - 1, 0)).toBe(true);
      expect(voxelAt(volume, 0, top, 0)).toBe(false);
      const pose = seatedPose(ride);
      if (pose) {
        // Seated legs lie straight out in front (x ±6, seat + 1 … + 6, z 0 … 8): nothing there to cut through them.
        for (let x = -6; x < 6; x++) for (let y = top + 1; y < top + 7; y++) for (let z = 0; z < 8; z++) expect(voxelAt(volume, x, y, z)).toBe(false);
      }
      if (pose === 'drive') {
        // Something to hold where the `drive` pose puts her hands (in front of her, at her sides).
        let grip = false;
        for (const x of [-9, -8, -7, 6, 7, 8]) for (let y = top + 8; y <= top + 13; y++) grip ||= voxelAt(volume, x, y, 8);
        expect(grip).toBe(true);
      }
      // The mesh hangs from her lifted root back down to the ground.
      expect(createVehicleMesh({ entry: item.id, name: item.name, def: item.def, ride }, false).position.y).toBeCloseTo(-rideLift(ride));
    });
  }
});
