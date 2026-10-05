import { beforeEach, describe, expect, it } from 'vitest';
import type { CatalogModel } from '@miu/voxel/model-catalog';
import type { WorldEntities } from '@miu/voxel/world-entities';
import type { SpeechBubble } from '../ambient/speech-bubble';
import type { PlayerController } from '../player/player-controller';
import { HIPS_ABOVE_FEET, WATCH_DISTANCE, type Point } from './interaction-geometry';
import { DOOR_OPEN_RADIUS, ObjectInteractionManager, type EffectsChannel } from './object-interaction-manager';
import { BUILTIN_OBJECT_INTERACTIONS, getAllInteractions, matchInteraction, registerInteraction } from './object-interaction-registry';
import type { CandidateObject, ObjectInteractionDef } from './object-interaction-types';

const K = 'packs/kenney-furniture-kit/2.0/';
const BX = 'generated/box-props/';

describe('matching furniture and props', () => {
  it('finds the interaction of key furniture by model or home slot', () => {
    expect(matchInteraction(`${BX}ncb-bed-pink.glb`, 'bed')?.id).toBe('bed-sleep');
    expect(matchInteraction(`${K}chair.glb`, 'chair')?.id).toBe('chair-sit');
    expect(matchInteraction(`${K}toilet.glb`)?.id).toBe('toilet-use');
    expect(matchInteraction(`${K}bathtub.glb`)?.id).toBe('bathtub-soak');
    expect(matchInteraction(`${K}kitchenFridge.glb`)?.id).toBe('fridge-open');
    expect(matchInteraction(`${K}kitchenStove.glb`)?.id).toBe('stove-cook');
    expect(matchInteraction(`${K}bathroomSink.glb`)?.id).toBe('sink-wash-hands');
    expect(matchInteraction(`${K}kitchenSink.glb`)?.id).toBe('kitchen-sink-dish');
    expect(matchInteraction(`${BX}ncb-desk-oak.glb`, 'desk')?.id).toBe('desk-study');
    expect(matchInteraction(`${K}televisionVintage.glb`)?.id).toBe('tv-watch');
    expect(matchInteraction(`${BX}ncb-door-left.glb`)?.id).toBe('front-door');
    expect(matchInteraction(`${BX}ncb-under-stair-door.glb`)?.id).toBe('stair-cupboard-open');
    expect(matchInteraction(`${BX}swing-set.glb`)?.id).toBe('swing-play');
  });

  it('reads whole words, so a word inside another never matches (workbench, garden, cardboard, fireflies)', () => {
    expect(matchInteraction('packs/kenney-survival-kit/2.0/workbench.glb')).toBeNull();
    expect(matchInteraction('packs/kenney-nature-kit/2.1/flower_redA.glb', 'garden')?.id).toBe('flower-smell');
    expect(matchInteraction(`${K}cardboardBoxClosed.glb`)).toBeNull();
    expect(matchInteraction(`${BX}dba-fireflies.glb`)).toBeNull();
    expect(matchInteraction(`${BX}tt-sign-nha-cua-be.glb`)).toBeNull();
    expect(matchInteraction(`${BX}cp-awning-orange.glb`)).toBeNull();
    expect(matchInteraction(`${BX}cp-crate-eggplant.glb`)).toBeNull();
    expect(matchInteraction(`${BX}tv-shelf-khoa-hoc.glb`)).toBeNull();
    // A bedside cabinet and a television's cabinet are not a bed and a television.
    expect(matchInteraction(`${K}cabinetBed.glb`)).toBeNull();
    expect(matchInteraction(`${K}cabinetTelevision.glb`)).toBeNull();
  });

  it('gives each home ornament its own interaction, not the teddy bear for all of them', () => {
    expect(matchInteraction('generated/props/teddy-bear.glb', 'ornament')?.id).toBe('teddy-hug');
    expect(matchInteraction('generated/props/globe.glb', 'ornament')?.id).toBe('globe-spin');
    expect(matchInteraction('generated/props/alarm-clock.glb', 'ornament')?.id).toBe('alarm-clock-tap');
    expect(matchInteraction('generated/props/gift-red.glb', 'ornament')?.id).toBe('gift-open');
    expect(matchInteraction('generated/props/spiral-shell.glb', 'ornament')?.id).toBe('shell-listen');
  });

  it('takes a soup bowl for eating, and a docks lantern for fishing off the dock (a lamp only in the home)', () => {
    expect(matchInteraction('generated/props/bowl-soup.glb')?.id).toBe('soup-eat');
    expect(matchInteraction(`${BX}dba-dock-lantern.glb`)?.id).toBe('dock-fish');
    expect(matchInteraction(`${BX}dba-dock-lantern.glb`, 'lights')?.id).toBe('lamp-toggle');
  });

  it('allows registering more interactions', () => {
    const before = getAllInteractions().length;
    const telescope: ObjectInteractionDef = {
      id: 'telescope-stargaze',
      category: 'entertainment',
      nameVi: 'Kính thiên văn',
      nameEn: 'Telescope',
      verbVi: 'Ngắm sao',
      verbEn: 'Stargaze',
      match: { keywords: ['telescope'] },
      pose: 'study',
      effect: { kind: 'symbols', glyph: 'star' },
      emoji: '🔭',
      dialoguesVi: ['Ngắm các chòm sao lấp lánh! 🔭'],
      dialoguesEn: ['Looking at the sparkling stars! 🔭'],
    };
    registerInteraction(telescope);
    expect(getAllInteractions().length).toBe(before + 1);
    expect(matchInteraction('packs/science/telescope.glb')?.id).toBe('telescope-stargaze');
    expect(BUILTIN_OBJECT_INTERACTIONS.some((d) => d.id === 'telescope-stargaze')).toBe(false);
  });
});

/** A controller on open floor at y 10: teleports and facing as the game's. */
function fakeController(at: Point): PlayerController & { teleported: Point[] } {
  const c = {
    teleported: [] as Point[],
    position: {
      x: at[0],
      y: at[1],
      z: at[2],
      set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
      },
    },
    facing: 0,
    teleport(p: Point) {
      c.teleported.push(p);
      c.position.set(p[0], p[1], p[2]);
    },
  };
  return c as unknown as PlayerController & { teleported: Point[] };
}

const CATALOG: Record<string, CatalogModel> = {
  [`${BX}ncb-sofa.glb`]: { height: 1, front: 180, seats: [{ at: [-0.6, 0.55, -0.05] }, { at: [0.6, 0.55, -0.05] }] },
  [`${BX}ncb-bed-pink.glb`]: { height: 2.56, lie: { at: [0, 0.7, 0.3], feet: 180 } },
  [`${K}televisionVintage.glb`]: { height: 0.55, screen: { at: [0.2, 0.13, 0], size: [0.3, 0.2] } },
  [`${BX}swing-set.glb`]: { height: 3.06, seats: [{ at: [-1.2, 0.62, 0], part: 'seat-a', pivot: [-1.2, 2.97, 0] }] },
};

describe('ObjectInteractionManager', () => {
  let said = '';
  const bubble: SpeechBubble = {
    sprite: {} as SpeechBubble['sprite'],
    show(text: string) {
      said = text;
    },
    hide() {},
    update() {},
    showing: true,
  };
  /** Every spot asked about is open floor at y 10 (the room's floor). */
  const standSpot = (at: Point): Point => [at[0], 10, at[2]];
  const effects = (): EffectsChannel & { played: string[]; swung: number[] } => {
    const e = {
      played: [] as string[],
      swung: [] as number[],
      play(o: CandidateObject) {
        e.played.push(o.def.id);
      },
      stop() {},
      swing(_o: CandidateObject, _part: string, angle: number) {
        e.swung.push(angle);
      },
    };
    return e;
  };
  const manager = (props: WorldEntities['props'], more: { reduced?: boolean; fx?: EffectsChannel } = {}): ObjectInteractionManager =>
    new ObjectInteractionManager({ props } as unknown as WorldEntities, bubble, { catalog: (m) => CATALOG[m], standSpot, effects: more.fx, reduced: more.reduced });

  beforeEach(() => {
    said = '';
  });

  it('finds the nearest object in reach and labels its prompt', () => {
    const m = manager([
      { model: `${K}toilet.glb`, position: [10, 10, 10], yaw: 0, scale: 1 },
      { model: `${K}chair.glb`, position: [20, 10, 20], yaw: 90, scale: 1 },
    ]);
    const near = m.nearest({ x: 10.5, y: 10, z: 10.2 });
    expect(near?.def.id).toBe('toilet-use');
    if (!near) return;
    expect(m.toPrompt(near)).toMatchObject({ name: 'Bồn cầu', label: 'Đi vệ sinh' });
    expect(m.nearest({ x: 50, y: 10, z: 50 })).toBeNull();
  });

  it('sits her hips on the sofa seat nearest her, facing out, and keeps her controller on open floor in front', () => {
    const m = manager([{ model: `${BX}ncb-sofa.glb`, position: [20, 10, 30], yaw: 0, scale: 1 }]);
    const sofa = m.nearest({ x: 20.6, y: 10, z: 28.8 });
    if (!sofa) throw new Error('no sofa');
    const c = fakeController([20.6, 10, 28.8]);
    m.interact(sofa, c);
    const frame = m.update(0.1, c, false);
    expect(frame.poseOverride).toBe('sit');
    expect(frame.action).toBe('rest');
    expect(frame.body?.position[0]).toBeCloseTo(20.6);
    expect(frame.body?.position[1]).toBeCloseTo(10.55 - HIPS_ABOVE_FEET);
    expect(frame.body?.facing).toBeCloseTo(Math.PI);
    // Her prompt stays on the sofa to get up, wherever her controller waits.
    expect(m.holding).toBe(sofa);
    expect(m.toPrompt(sofa).label).toBe('Đứng dậy');
    // The controller waits in front of the seat (toward -z), on the floor, never inside the sofa.
    expect(c.position.z).toBeLessThan(30 - 0.5);
    expect(c.position.y).toBe(10);
    // A push of the stick gets her up where she waits.
    const waiting = [c.position.x, c.position.z];
    m.update(0.5, c, true);
    expect(m.isInteracting).toBe(false);
    expect([c.position.x, c.position.z]).toEqual(waiting);
  });

  it('lays her on the mattress, feet to its foot, and a second tap gets her up beside the bed', () => {
    const m = manager([{ model: `${BX}ncb-bed-pink.glb`, slot: 'bed', position: [12, 10, 15], yaw: 180, scale: 1 }]);
    const bed = m.nearest({ x: 12.2, y: 10, z: 13.4 });
    if (!bed) throw new Error('no bed');
    const c = fakeController([12.2, 10, 13.4]);
    m.interact(bed, c);
    expect(said).toBeTruthy();
    const frame = m.update(0.1, c, false);
    expect(frame.action).toBe('sleep');
    expect(frame.body?.position[1]).toBeGreaterThan(10.7);
    // Turned 180°, the feet point to +z.
    expect(frame.body?.facing).toBeCloseTo(2 * Math.PI);
    m.interact(bed, c);
    expect(m.isInteracting).toBe(false);
    expect([c.position.x, c.position.y, c.position.z]).toEqual([12.2, 10, 13.4]);
  });

  it('switches the television on and sits her on the floor in front of it; later a tap switches it off', () => {
    const m = manager([{ model: `${K}televisionVintage.glb`, position: [40, 10.6, 40], yaw: 0, scale: 2 }]);
    const tv = m.nearest({ x: 40.4, y: 10, z: 41.5 });
    if (!tv) throw new Error('no tv');
    const c = fakeController([40.4, 10, 41.5]);
    m.interact(tv, c);
    expect(m.states.isOn(tv.stateKey)).toBe(true);
    const frame = m.update(0.1, c, false);
    expect(frame.action).toBe('watch');
    expect(frame.body?.position[2]).toBeCloseTo(40 + WATCH_DISTANCE);
    expect(frame.body?.position[1]).toBeCloseTo(10 - HIPS_ABOVE_FEET);
    // She faces the screen (−z), and the controller waits where she sits.
    expect(Math.cos(frame.body?.facing ?? 0)).toBeCloseTo(-1);
    expect(m.toPrompt(tv).label).toBe('Đứng dậy');
    m.interact(tv, c);
    expect(m.isInteracting).toBe(false);
    expect(m.states.isOn(tv.stateKey)).toBe(true);
    expect(m.toPrompt(tv).label).toBe('Tắt tivi');
    m.interact(tv, c);
    expect(m.states.isOn(tv.stateKey)).toBe(false);
    const off = m.update(0.1, c, false);
    expect(off.action).toBe('tap');
    expect(off.body).toBeNull();
  });

  it('lights a lamp and puts it out again, with her gesture each time and the label following', () => {
    const m = manager([{ model: `${K}lampRoundFloor.glb`, slot: 'lamp', position: [5, 10, 5], yaw: 0, scale: 2 }]);
    const lamp = m.nearest({ x: 6, y: 10, z: 5 });
    if (!lamp) throw new Error('no lamp');
    const c = fakeController([6, 10, 5]);
    expect(m.toPrompt(lamp).label).toBe('Bật đèn');
    m.interact(lamp, c);
    expect(m.states.isOn(lamp.stateKey)).toBe(true);
    expect(m.update(0.1, c, false).action).toBe('tap');
    expect(m.toPrompt(lamp).label).toBe('Tắt đèn');
    // Turned toward the lamp to switch it.
    expect(Math.sin(c.facing)).toBeLessThan(0);
    m.update(2, c, false);
    expect(m.isInteracting).toBe(false);
    m.interact(lamp, c);
    expect(m.states.isOn(lamp.stateKey)).toBe(false);
    expect(m.states.saved()).toEqual({});
  });

  it('never moves her for a gesture made standing, and never stands her up behind a wall', () => {
    const lamp = manager([{ model: `${K}lampRoundFloor.glb`, position: [5, 10, 5], yaw: 0, scale: 2 }]);
    const c = fakeController([6, 10.4, 5]);
    const near = lamp.nearest({ x: 6, y: 10, z: 5 });
    if (!near) throw new Error('no lamp');
    lamp.interact(near, c);
    expect(c.teleported).toEqual([]);

    const walled = new ObjectInteractionManager({ props: [{ model: `${BX}ncb-sofa.glb`, position: [20, 10, 30], yaw: 0, scale: 1 }] } as unknown as WorldEntities, bubble, {
      catalog: (m) => CATALOG[m],
      standSpot,
      wallBetween: () => true,
    });
    const sofa = walled.nearest({ x: 20.6, y: 10, z: 28.8 });
    if (!sofa) throw new Error('no sofa');
    const sitter = fakeController([20.6, 10, 28.8]);
    walled.interact(sofa, sitter);
    // The spot in front was refused: she waits (and gets up) where she tapped.
    expect([sitter.position.x, sitter.position.z]).toEqual([20.6, 28.8]);
  });

  it('plays a one-off answer for a gesture with no switch (water from the tap)', () => {
    const fx = effects();
    const m = manager([{ model: `${K}bathroomSink.glb`, position: [5, 10, 5], yaw: 0, scale: 1 }], { fx });
    const sink = m.nearest({ x: 5.5, y: 10, z: 5.5 });
    if (!sink) throw new Error('no sink');
    m.interact(sink, fakeController([5.5, 10, 5.5]));
    expect(fx.played).toEqual(['sink-wash-hands']);
    expect(m.update(0.1, fakeController([5.5, 10, 5.5]), false).action).toBe('wash');
  });

  it('opens the front door as she comes near and closes it a moment after she leaves; shut by hand, it stays shut until she leaves', () => {
    const m = manager([{ model: `${BX}ncb-door-left.glb`, position: [79, 10, 56.5], yaw: 0, scale: 1 }]);
    const door = m.objects[0];
    if (!door) throw new Error('no door');
    const far = fakeController([79, 10, 50]);
    m.update(0.1, far, false);
    expect(m.states.isOn(door.stateKey)).toBe(false);
    const near = fakeController([79.5, 10, 56.5 - (DOOR_OPEN_RADIUS - 1)]);
    m.update(0.1, near, false);
    expect(m.states.isOn(door.stateKey)).toBe(true);
    // A door that opens by itself is not one of the states her home keeps.
    expect(m.states.saved()).toEqual({});
    m.interact(door, near);
    expect(m.states.isOn(door.stateKey)).toBe(false);
    m.update(0.5, near, false);
    expect(m.states.isOn(door.stateKey)).toBe(false);
    m.update(0.5, far, false);
    m.update(1.5, far, false);
    m.update(0.1, near, false);
    expect(m.states.isOn(door.stateKey)).toBe(true);
    m.update(0.5, far, false);
    m.update(1, far, false);
    expect(m.states.isOn(door.stateKey)).toBe(false);
  });

  it('swings her with the swing seat (still when less motion is asked), and the seat comes to rest when she gets off', () => {
    const fx = effects();
    const m = manager([{ model: `${BX}swing-set.glb`, position: [64, 10, 37], yaw: 90, scale: 1 }], { fx });
    const swing = m.objects[0];
    if (!swing) throw new Error('no swing');
    const c = fakeController([64, 10, 38.5]);
    m.interact(swing, c);
    const positions: number[] = [];
    for (let i = 0; i < 20; i++) {
      const frame = m.update(0.1, c, false);
      expect(frame.action).toBe('swing');
      positions.push(frame.body?.position[0] ?? 0);
    }
    expect(Math.max(...positions) - Math.min(...positions)).toBeGreaterThan(0.3);
    expect(fx.swung.some((a) => Math.abs(a) > 0.1)).toBe(true);
    m.update(0.5, c, true);
    expect(fx.swung.at(-1)).toBe(0);

    const still = effects();
    const calm = manager([{ model: `${BX}swing-set.glb`, position: [64, 10, 37], yaw: 90, scale: 1 }], { fx: still, reduced: true });
    const seat = calm.objects[0];
    if (!seat) throw new Error('no swing');
    calm.interact(seat, fakeController([64, 10, 38.5]));
    for (let i = 0; i < 10; i++) calm.update(0.1, fakeController([64, 10, 38.5]), false);
    expect(still.swung.every((a) => a === 0)).toBe(true);
  });

  it('keys a piece of her home by its decor spot, the same whatever style she picks', () => {
    const anchors = [{ slot: 'lamp', position: [5, 10, 5] as [number, number, number], yaw: 0 }];
    const make = (model: string, x: number): CandidateObject | undefined =>
      new ObjectInteractionManager({ props: [{ model, slot: 'lamp', position: [x, 10, 5], yaw: 0, scale: 1 }], decorAnchors: anchors } as unknown as WorldEntities, bubble).objects[0];
    expect(make(`${K}lampRoundFloor.glb`, 4.9)?.stateKey).toBe('lamp-toggle@lamp#0');
    expect(make(`${BX}ncb-lamp-star.glb`, 5)?.stateKey).toBe('lamp-toggle@lamp#0');
  });
});
