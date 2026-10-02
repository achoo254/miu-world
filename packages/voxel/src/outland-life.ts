// Life on the outer land (outland-plan.ts lays it out), computed when a map loads and merged with the core's
// own: the people of every village at trades fitting the map's theme and their animals, small scenes away
// from the villages (kites on a hill, a picnic, fishers at a lake, the theme's own), viewpoints with a
// signpost, the props of yards and scenes, and the rides: from the middle of each core side out to far
// villages, and from every village back to the core. Each person or animal gets a home on open ground and
// the places its routine uses (everyday-routines.ts in the web app: `work-a`, `work-b`, `work-c` and
// `focus` for people, `graze-a`, `graze-b` for animals), each a straight clear walk from home. Only models
// the map's spec measured (`spec.models`) are placed. Deterministic for a plan.
import { createRng, hashSeed } from './noise';
import { type OutlandTheme } from './outland';
import {
  coreDistance, drawTree, fieldAt, forEachTree, RAIL, ROAD, ROAD_HALF, roadDistance, sampleColumn, structureExtent, WATER,
  type Clearing, type ColumnSample, type Field, type OutlandPlan, type Structure, type Village,
} from './outland-plan';
import type { Ambient, AmbientRoutine, Interactable, WorldEntities } from './world-entities';

type Prop = WorldEntities['props'][number];
type Landmark = WorldEntities['landmarks'][number];
type Vec3 = [number, number, number];

const PEOPLE = 'packs/kenney-blocky-characters/2.0';
const PETS = 'packs/kenney-cube-pets/2.0';
const NATURE = 'packs/kenney-nature-kit/2.1';
const SURVIVAL = 'packs/kenney-survival-kit/2.0';
const PROPS = 'generated/props';
/** The models life places (all listed in OUTLAND_MODEL_HEIGHTS, outland.ts). */
const MODEL = {
  car: `${PROPS}/automobile.glb`,
  basket: `${PROPS}/basket.glb`,
  book: `${PROPS}/open-book.glb`,
  sailboat: `${PROPS}/sailboat.glb`,
  signpost: `${SURVIVAL}/signpost.glb`,
  bucket: `${SURVIVAL}/bucket.glb`,
  barrel: `${SURVIVAL}/barrel.glb`,
  hoe: `${SURVIVAL}/tool-hoe.glb`,
  axe: `${SURVIVAL}/tool-axe.glb`,
  campfire: `${SURVIVAL}/campfire-pit.glb`,
  tent: `${SURVIVAL}/tent.glb`,
  canoe: `${NATURE}/canoe.glb`,
  paddle: `${NATURE}/canoe_paddle.glb`,
  fence: `${NATURE}/fence_simple.glb`,
  bush: `${NATURE}/plant_bushLarge.glb`,
  bamboo: `${NATURE}/crops_bambooStageB.glb`,
  logs: `${NATURE}/log_stack.glb`,
} as const;
const FLOWERS = [`${NATURE}/flower_redA.glb`, `${NATURE}/flower_yellowB.glb`, `${NATURE}/flower_purpleA.glb`] as const;

/** Life keeps this far from ride stops and where rides arrive, so the stop's prompt is never crowded. */
const STOP_CLEARANCE = 6;

/** Character models by how a name starts (Kenney Blocky Characters, as the core maps cast them). */
const LOOKS_BY_TITLE: Readonly<Record<string, readonly string[]>> = {
  Bác: ['a', 'b', 'm'],
  Chú: ['j', 'k', 'm', 'c'],
  Anh: ['k', 'c', 'd'],
  Cô: ['e', 'h'],
  Bà: ['i'],
  Ông: ['a'],
  Chị: ['h', 'l'],
  Mẹ: ['l', 'e'],
  Bố: ['m', 'j'],
  Bạn: ['f', 'n', 'o', 'p', 'q', 'r'],
  Bé: ['f', 'n', 'o', 'q'],
  Thầy: ['a', 'b'],
};

type Anchor = 'yard' | 'stall' | 'field' | 'pasture' | 'water' | 'centre' | 'orchard';
interface Trade {
  routine: AmbientRoutine;
  names: readonly string[];
  held: readonly string[];
  anchor: Anchor;
}

/** The trades of the outer villages (routines of everyday-routines.ts), with names a child reads on the prompt. */
const TRADES = {
  fisher: { routine: 'ferryman', names: ['Bác chài', 'Chú đánh cá', 'Anh kéo lưới', 'Bác câu cá', 'Chú thả lưới', 'Ông lão đánh cá', 'Anh chài lưới', 'Cô vá lưới'], held: [MODEL.paddle, MODEL.bucket], anchor: 'water' },
  ferry: { routine: 'ferryman', names: ['Bác lái đò', 'Chú chèo đò', 'Ông lái đò', 'Cô chèo đò', 'Anh chèo thuyền'], held: [MODEL.paddle], anchor: 'water' },
  planter: { routine: 'rice-planter', names: ['Cô cấy lúa', 'Chị cấy lúa', 'Bác gặt lúa', 'Bà nhổ mạ', 'Cô hái chè', 'Chị gánh mạ', 'Cô tát nước'], held: [MODEL.basket], anchor: 'field' },
  plough: { routine: 'ploughman', names: ['Chú cày ruộng', 'Bác làm đất', 'Anh trồng ngô', 'Chú vun luống', 'Bác trồng khoai', 'Anh gieo hạt'], held: [MODEL.hoe, MODEL.basket], anchor: 'field' },
  milker: { routine: 'milker', names: ['Cô vắt sữa', 'Chú chăn bò', 'Chị cho bò ăn', 'Bác vắt sữa', 'Anh chăn bò'], held: [MODEL.bucket, MODEL.bucket], anchor: 'pasture' },
  hens: { routine: 'hen-keeper', names: ['Bà cho gà ăn', 'Cô nhặt trứng', 'Chị nuôi gà', 'Bà nuôi gà', 'Cô cho gà ăn'], held: [MODEL.basket], anchor: 'yard' },
  woodcutter: { routine: 'ploughman', names: ['Chú tiều phu', 'Bác đốn củi', 'Anh bổ củi', 'Chú trồng rừng', 'Bác kiểm lâm'], held: [MODEL.axe], anchor: 'centre' },
  firewood: { routine: 'porter', names: ['Anh vác củi', 'Chú gánh củi', 'Cô kiếm củi', 'Bác chở gỗ'], held: [MODEL.basket], anchor: 'centre' },
  forager: { routine: 'waterer', names: ['Cô hái nấm', 'Bà hái măng', 'Chị hái thuốc', 'Cô trồng cây', 'Ông tưới cây con'], held: [MODEL.basket, MODEL.bucket], anchor: 'orchard' },
  vendor: { routine: 'vendor', names: ['Cô bán rau', 'Bác bán xôi', 'Bà bán bánh đa', 'Chị bán hoa', 'Cô bán quả', 'Bà bán nước chè', 'Chú bán kem', 'Cô bán bún'], held: [MODEL.basket], anchor: 'stall' },
  shopper: { routine: 'shopper', names: ['Cô đi chợ', 'Bà đi chợ', 'Chị mua rau', 'Chú mua cá', 'Mẹ đi chợ', 'Bác mua gạo'], held: [MODEL.basket], anchor: 'stall' },
  porter: { routine: 'porter', names: ['Chú gánh hàng', 'Anh khuân hàng', 'Bác chở hàng', 'Chú khuân thóc', 'Anh gánh nước'], held: [MODEL.basket], anchor: 'centre' },
  pupil: { routine: 'pupil', names: ['Bạn học trò', 'Bé đá cầu', 'Bạn nhảy dây', 'Bé đọc bài', 'Bạn lớp Hai', 'Bé chơi ô ăn quan', 'Bạn đá bóng'], held: [MODEL.book], anchor: 'centre' },
  teacher: { routine: 'teacher', names: ['Cô giáo làng', 'Thầy giáo làng', 'Cô dạy chữ', 'Thầy dạy hát'], held: [MODEL.book], anchor: 'centre' },
  guard: { routine: 'school-guard', names: ['Bác bảo vệ', 'Chú gác trường', 'Ông trông cổng'], held: [], anchor: 'centre' },
  sweeper: { routine: 'sweeper', names: ['Cô quét sân', 'Chú quét lá', 'Bà quét ngõ', 'Cô lao công'], held: [MODEL.basket], anchor: 'yard' },
  cook: { routine: 'home-cook', names: ['Bà nấu cơm', 'Mẹ nấu canh', 'Bà luộc ngô', 'Cô nấu chè', 'Chị nướng khoai', 'Mẹ thổi xôi'], held: [MODEL.basket], anchor: 'yard' },
  laundry: { routine: 'laundry', names: ['Cô phơi đồ', 'Chị giặt áo', 'Mẹ phơi chăn', 'Cô phơi khăn', 'Chị gấp áo'], held: [MODEL.basket, MODEL.bucket], anchor: 'yard' },
  waterer: { routine: 'waterer', names: ['Ông tưới cây', 'Bà tưới rau', 'Cô làm vườn', 'Ông chăm hoa', 'Bác trồng rau', 'Chị hái rau'], held: [MODEL.bucket], anchor: 'yard' },
  kite: { routine: 'kite-flyer', names: ['Bạn thả diều', 'Bé thả diều', 'Bạn chạy diều', 'Bé làm diều'], held: [], anchor: 'centre' },
  reader: { routine: 'reader', names: ['Bạn đọc truyện', 'Bé đọc sách', 'Ông đọc báo', 'Chị đọc thơ', 'Bạn mê truyện'], held: [MODEL.book], anchor: 'orchard' },
  librarian: { routine: 'librarian', names: ['Cô thủ thư', 'Bác giữ sách', 'Cô cho mượn sách'], held: [MODEL.book], anchor: 'centre' },
  sentry: { routine: 'sentry', names: ['Chú lính gác', 'Cô lính gác', 'Anh gác đồi', 'Chú canh tháp'], held: [MODEL.axe], anchor: 'centre' },
  trumpeter: { routine: 'trumpeter', names: ['Chú thổi kèn', 'Anh thổi sáo', 'Bác đánh trống'], held: [], anchor: 'centre' },
} as const satisfies Record<string, Trade>;
type TradeId = keyof typeof TRADES;

/** Each theme's own trades (most of a village), then everyday ones round them. */
const THEME_TRADES: Readonly<Record<OutlandTheme, readonly TradeId[]>> = {
  river: ['fisher', 'ferry', 'fisher', 'planter', 'laundry', 'porter'],
  forest: ['woodcutter', 'firewood', 'forager', 'woodcutter', 'cook'],
  school: ['pupil', 'pupil', 'teacher', 'guard', 'sweeper', 'pupil'],
  hamlet: ['cook', 'laundry', 'waterer', 'hens', 'cook', 'sweeper'],
  market: ['vendor', 'vendor', 'shopper', 'shopper', 'porter'],
  farm: ['planter', 'plough', 'milker', 'hens', 'plough'],
  library: ['reader', 'reader', 'librarian', 'waterer'],
  castle: ['sentry', 'trumpeter', 'sentry', 'porter', 'plough'],
};
const EVERYDAY_TRADES: readonly TradeId[] = ['cook', 'laundry', 'waterer', 'hens', 'sweeper', 'kite', 'pupil', 'plough', 'planter', 'porter'];

type AnimalKind = 'cow' | 'pig' | 'dog' | 'cat' | 'chick';
const ANIMAL_NAMES: Readonly<Record<AnimalKind, readonly string[]>> = {
  cow: ['Bò vàng', 'Bò sữa', 'Bê con', 'Bò đốm', 'Bò nâu', 'Bò mẹ', 'Bê vàng', 'Bò kéo xe'],
  pig: ['Lợn ỉ', 'Lợn con', 'Lợn mẹ', 'Lợn đốm', 'Heo con', 'Lợn hồng', 'Lợn ủn ỉn'],
  dog: ['Chó Vàng', 'Chó Mực', 'Cún con', 'Chó Đốm', 'Cún Bông', 'Chó Lu', 'Cún Mít'],
  cat: ['Mèo mướp', 'Mèo tam thể', 'Mèo mun', 'Mèo vàng', 'Mèo con', 'Mèo Mi', 'Mèo trắng'],
  chick: ['Gà con', 'Gà mái', 'Gà trống', 'Gà mái mơ', 'Gà ri', 'Gà tre', 'Gà mái tơ', 'Gà con lông vàng'],
};
const THEME_ANIMALS: Readonly<Record<OutlandTheme, Readonly<Record<AnimalKind, number>>>> = {
  river: { chick: 3, dog: 2, cat: 2, pig: 1, cow: 1 },
  forest: { dog: 2, chick: 2, pig: 1.5, cat: 1, cow: 1 },
  school: { chick: 2, dog: 2, cat: 2, pig: 1, cow: 1 },
  hamlet: { chick: 3, dog: 2, cat: 2, pig: 2, cow: 1 },
  market: { chick: 3, pig: 2, dog: 2, cat: 2, cow: 1 },
  farm: { cow: 3, pig: 2.5, chick: 3, dog: 1, cat: 1 },
  library: { cat: 3, chick: 2, dog: 2, pig: 1, cow: 1 },
  castle: { dog: 2, chick: 2, cow: 2, pig: 1, cat: 1 },
};

interface Spot {
  x: number;
  z: number;
  /** Ground under it. */
  g: number;
}

/** Places everything; one per `outlandEntities` call. */
class Life {
  readonly props: Prop[] = [];
  readonly ambients: Ambient[] = [];
  readonly interactables: Interactable[] = [];
  readonly landmarks: Landmark[] = [];
  private readonly rng: () => number;
  private readonly used = new Set<number>();
  private readonly reserved: Spot[] = [];
  private readonly counts = new Map<string, number>();
  private readonly ground = new Map<number, number>();
  private readonly sample: ColumnSample = { ground: 0, deck: -1, flags: 0 };

  constructor(private readonly plan: OutlandPlan) {
    this.rng = createRng(hashSeed(`outland:${plan.spec.seed}:life`));
  }

  private key(x: number, z: number): number {
    return (x - this.plan.bounds.x0) * 8192 + (z - this.plan.bounds.z0);
  }

  roll(): number {
    return this.rng();
  }

  pick<T>(items: readonly T[]): T | undefined {
    return items[Math.floor(this.rng() * items.length)];
  }

  scaleOf(model: string): number | undefined {
    return this.plan.spec.models[model];
  }

  /**
   * Ground a body can stand on at a column (a solid top, two free blocks over it): not water or a bridge,
   * not in or next to a building, under no trunk or low leaves; off the roads unless `road`. Null otherwise.
   */
  standing(x: number, z: number, road = false): number | null {
    const k = this.key(x, z);
    // Cached as ground * 2 + 1 for open ground, ground * 2 for a road column, -1 for no footing.
    let code = this.ground.get(k);
    if (code === undefined) {
      code = this.footing(x, z);
      this.ground.set(k, code);
    }
    if (code < 0 || (!road && code % 2 === 0)) return null;
    return Math.floor(code / 2);
  }

  private footing(x: number, z: number): number {
    const plan = this.plan;
    const b = plan.bounds;
    if (x < b.x0 + 3 || z < b.z0 + 3 || x >= b.x1 - 3 || z >= b.z1 - 3) return -1;
    const cx = x + 0.5;
    const cz = z + 0.5;
    if (coreDistance(plan, cx, cz) < 3) return -1;
    const s = sampleColumn(plan, x, z, this.sample);
    if (s.flags & (WATER | RAIL) || s.ground + 3 >= plan.height) return -1;
    const g = s.ground;
    const onRoad = (s.flags & ROAD) !== 0 || roadDistance(plan, cx, cz) <= ROAD_HALF + 0.8;
    for (const id of plan.grid.structures.at(cx, cz)) {
      const st = plan.structures[id];
      if (!st) continue;
      const [ex0, ez0, ex1, ez1] = structureExtent(st);
      if (x >= ex0 - 1 && x <= ex1 + 1 && z >= ez0 - 1 && z <= ez1 + 1) return -1;
    }
    if (this.underTree(x, z, g)) return -1;
    return g * 2 + (onRoad ? 0 : 1);
  }

  /** A trunk in the column, or leaves within two blocks over the ground. */
  private underTree(x: number, z: number, g: number): boolean {
    const plan = this.plan;
    // Villages, clearings and fields other than orchards keep trees well away (outland-plan.ts treeRoom).
    const cx = x + 0.5;
    const cz = z + 0.5;
    const field = plan.fields[fieldAt(plan, x, z)];
    if (field && field.kind !== 'orchard') return false;
    if (!field && plan.grid.villages.at(cx, cz).some((id) => {
      const v = plan.villages[id];
      return v !== undefined && Math.hypot(cx - v.x, cz - v.z) < v.radius + 5;
    })) return false;
    let low = Infinity;
    forEachTree(plan, x, z, x, z, (t) => {
      drawTree(plan, t, (_x, y) => {
        if (y > g && y < low) low = y;
      }, x, z, x, z);
    });
    return low <= g + 2;
  }

  /** A straight walk with no wall, water or tree in the way and no step higher than one block (roads may be crossed). */
  private clearWalk(a: Spot, b: Spot): boolean {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 2);
    let last = a.g;
    for (let i = 1; i <= steps; i++) {
      const x = Math.round(a.x + ((b.x - a.x) * i) / steps);
      const z = Math.round(a.z + ((b.z - a.z) * i) / steps);
      const g = this.standing(x, z, true);
      if (g === null || Math.abs(g - last) > 1) return false;
      last = g;
    }
    return true;
  }

  private nearStop(x: number, z: number): boolean {
    return this.reserved.some((r) => Math.hypot(r.x - x, r.z - z) < STOP_CLEARANCE);
  }

  /** The nearest free open spot to (x, z) within `ring` blocks (a straight walk from `from` when given); marked used. */
  nearest(x: number, z: number, ring: number, from?: Spot, keepFromStops = true): Spot | null {
    const x0 = Math.round(x);
    const z0 = Math.round(z);
    for (let r = 0; r <= ring; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const cx = x0 + dx;
          const cz = z0 + dz;
          if (this.used.has(this.key(cx, cz))) continue;
          const g = this.standing(cx, cz);
          if (g === null || (keepFromStops && this.nearStop(cx, cz))) continue;
          const spot = { x: cx, z: cz, g };
          if (from && !this.clearWalk(from, spot)) continue;
          this.used.add(this.key(cx, cz));
          return spot;
        }
      }
    }
    return null;
  }

  reserve(spot: Spot): void {
    this.reserved.push(spot);
  }

  at(s: Spot): Vec3 {
    return [s.x + 0.5, s.g + 1, s.z + 0.5];
  }

  /** A prop on open ground at a column (skipped when the map has not measured the model or the ground is taken). */
  prop(model: string, x: number, z: number, yaw = 0): void {
    const scale = this.scaleOf(model);
    if (scale === undefined) return;
    const k = this.key(Math.round(x), Math.round(z));
    if (this.used.has(k)) return;
    const g = this.standing(Math.round(x), Math.round(z));
    if (g === null || this.nearStop(x, z)) return;
    this.used.add(k);
    this.props.push({ model, position: [Math.round(x) + 0.5, g + 1, Math.round(z) + 0.5], yaw: Math.round(yaw) % 360, scale });
  }

  /** A prop at a fixed point (a boat on the water). */
  propAt(model: string, position: Vec3, yaw = 0): void {
    const scale = this.scaleOf(model);
    if (scale !== undefined) this.props.push({ model, position, yaw: Math.round(yaw) % 360, scale });
  }

  /** A person or an animal living round `anchor`, with the places its routine uses. False when there is no room. */
  resident(routine: AmbientRoutine, name: string, model: string, held: readonly string[], anchor: readonly [number, number], ring = 10, facing?: readonly [number, number]): boolean {
    const scale = this.scaleOf(model);
    if (scale === undefined) return false;
    const home = this.nearest(anchor[0], anchor[1], ring);
    if (!home) return false;
    const animal = routine === 'cow' || routine === 'pig' || routine === 'dog' || routine === 'cat' || routine === 'chick';
    const spots: Record<string, Vec3> = {};
    for (const spot of animal ? ['graze-a', 'graze-b'] : ['work-a', 'work-b', 'work-c']) {
      const a = this.rng() * Math.PI * 2;
      const r = (animal ? 4 : 3) + this.rng() * 4;
      const c = this.nearest(home.x + Math.cos(a) * r, home.z + Math.sin(a) * r, 4, home) ?? home;
      spots[spot] = this.at(c);
    }
    if (!animal) {
      const work = spots['work-a'] ?? this.at(home);
      const [fx, fz] = facing ? [facing[0] + 0.5, facing[1] + 0.5] : [work[0], work[2] + 1];
      const fg = sampleColumn(this.plan, Math.floor(fx), Math.floor(fz), this.sample).ground;
      spots.focus = [fx, fg + 1.8, fz];
    }
    const n = (this.counts.get(routine) ?? 0) + 1;
    this.counts.set(routine, n);
    const hands = held.filter((m) => this.scaleOf(m) !== undefined);
    this.ambients.push({
      id: `ngoai-${routine}-${n}`,
      routine,
      name,
      model,
      scale,
      ...(hands.length > 0 ? { held: [...hands] } : {}),
      position: this.at(home),
      yaw: Math.floor(this.rng() * 360),
      spots,
    });
    return true;
  }

  /** A person by name: the model follows how the name starts (Bác, Cô, Bạn…). */
  person(routine: AmbientRoutine, name: string, held: readonly string[], anchor: readonly [number, number], ring = 10, facing?: readonly [number, number]): boolean {
    const letters = LOOKS_BY_TITLE[name.split(' ')[0] ?? ''] ?? ['a'];
    const letter = this.pick(letters) ?? 'a';
    return this.resident(routine, name, `${PEOPLE}/character-${letter}.glb`, held, anchor, ring, facing);
  }

  animal(kind: AnimalKind, name: string, anchor: readonly [number, number], ring = 10): boolean {
    return this.resident(kind, name, `${PETS}/animal-${kind}.glb`, [], anchor, ring);
  }

  /** A ride stop: the car at a spot, taking the child to `to`. */
  ride(id: string, name: string, at: Spot, to: Spot): void {
    const scale = this.scaleOf(MODEL.car);
    this.interactables.push({
      id,
      kind: 'object',
      name,
      label: 'Lên xe',
      position: this.at(at),
      yaw: 0,
      radius: 2.5,
      ...(scale !== undefined ? { model: MODEL.car, scale } : {}),
      ride: this.at(to),
    });
  }
}

/** Unit vector of a door's side. */
const DOOR_DIR: Readonly<Record<Structure['door'], readonly [number, number]>> = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] };

/** The middle of the ground just outside a structure's door (or a stall's counter), `out` blocks out. */
function doorstep(s: Structure, out: number): [number, number] {
  const [dx, dz] = DOOR_DIR[s.door];
  const mx = Math.floor((s.x0 + s.x1 + 1) / 2);
  const mz = Math.floor((s.z0 + s.z1 + 1) / 2);
  if (dz !== 0) return [mx, dz < 0 ? s.z0 - 1 - out : s.z1 + 1 + out];
  return [dx < 0 ? s.x0 - 1 - out : s.x1 + 1 + out, mz];
}

function fieldCentre(f: Field): [number, number] {
  return [Math.round((f.x0 + f.x1) / 2), Math.round((f.z0 + f.z1) / 2)];
}

/** A point on the shore of the water nearest a village (within `within` blocks), a few blocks back on land. */
function shoreNear(plan: OutlandPlan, v: Village, within: number): [number, number] | null {
  const waters: Array<[number, number, number]> = plan.lakes.map((l) => [l.x, l.z, l.r]);
  for (const river of plan.rivers) for (let i = 0; i < river.pts.length; i += 2) waters.push([river.pts[i] ?? 0, river.pts[i + 1] ?? 0, river.half[i / 2] ?? 0]);
  let best: [number, number] | null = null;
  let bestBack = within;
  for (const [x, z, edge] of waters) {
    const d = Math.hypot(x - v.x, z - v.z);
    const back = d - edge - 5;
    if (d === 0 || back < 0 || back > bestBack) continue;
    bestBack = back;
    best = [v.x + ((x - v.x) * back) / d, v.z + ((z - v.z) * back) / d];
  }
  return best;
}

/** Rides: stops at the middle of each core side out to far villages, and a stop in every village back. */
function placeRides(life: Life, plan: OutlandPlan): void {
  const homeStops = new Map<number, { stop: Spot; arrive: Spot }>();
  for (const v of plan.villages) {
    let stop: Spot | null = null;
    for (let k = 0; k < 24 && !stop; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.3;
      const r = 7 + Math.floor(k / 8) * 2;
      stop = life.nearest(v.x + Math.cos(a) * r, v.z + Math.sin(a) * r, 1, undefined, false);
    }
    if (!stop) continue;
    life.reserve(stop);
    const arrive = life.nearest(stop.x + 3, stop.z + 2, 5, undefined, false);
    if (!arrive) continue;
    life.reserve(arrive);
    homeStops.set(v.index, { stop, arrive });
  }
  const returns: Array<{ x: number; z: number; spot: Spot }> = [];
  const taken = new Set<number>();
  for (const g of plan.sides) {
    const back = life.nearest(g.x + g.nx * 9 - g.ax * 6, g.z + g.nz * 9 - g.az * 6, 6, undefined, false);
    if (back) {
      life.reserve(back);
      returns.push({ x: g.x, z: g.z, spot: back });
    }
    // Far villages on this side, the farthest first; each side its own when there are enough.
    const far = plan.villages
      .filter((v) => (v.x - g.x) * g.nx + (v.z - g.z) * g.nz > 0 && homeStops.has(v.index))
      .sort((p, q) => Math.hypot(q.x - g.x, q.z - g.z) - Math.hypot(p.x - g.x, p.z - g.z));
    const chosen = [...far.filter((v) => !taken.has(v.index)), ...far.filter((v) => taken.has(v.index))].slice(0, 4);
    for (const [i, v] of chosen.entries()) {
      const target = homeStops.get(v.index);
      const stop = life.nearest(g.x + g.nx * (7 + 4 * i) + g.ax * 5, g.z + g.nz * (7 + 4 * i) + g.az * 5, 5, undefined, false);
      if (!target || !stop) continue;
      taken.add(v.index);
      life.reserve(stop);
      life.ride(`ngoai-xe-${g.side}-${i + 1}`, `Xe ra ${v.name}`, stop, target.arrive);
    }
  }
  if (returns.length === 0) return;
  for (const v of plan.villages) {
    const home = homeStops.get(v.index);
    if (!home) continue;
    const back = [...returns].sort((p, q) => Math.hypot(p.x - v.x, p.z - v.z) - Math.hypot(q.x - v.x, q.z - v.z))[0];
    if (back) life.ride(`ngoai-xe-lang-${v.index + 1}`, 'Xe về trung tâm', home.stop, back.spot);
  }
}

/** Pick by weight with the life's random numbers. */
function weighted<K extends string>(life: Life, weights: Readonly<Record<K, number>>): K {
  const entries = Object.entries(weights) as Array<[K, number]>;
  let t = life.roll() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) {
    t -= w;
    if (t < 0) return k;
  }
  const first = entries[0];
  if (!first) throw new Error('weighted: no weights');
  return first[0];
}

/** A village: its yards dressed, its people at their trades, its animals. */
function placeVillage(life: Life, plan: OutlandPlan, v: Village): void {
  const own = v.structures.map((i) => plan.structures[i]).filter((s): s is Structure => s !== undefined);
  const houses = own.filter((s) => s.kind === 'house');
  const stalls = own.filter((s) => s.kind === 'stall');
  const fields = v.fields.map((i) => plan.fields[i]).filter((f): f is Field => f !== undefined);
  const theme = plan.spec.theme;
  life.landmarks.push({ id: `ngoai-lang-${v.index + 1}`, name: v.name, position: [v.x + 0.5, v.pad + 1, v.z + 0.5] });

  // Yards: a fence before half the doors (a gap at the door), flowers by the wall, a barrel or a bucket.
  for (const [i, h] of houses.entries()) {
    const [dx, dz] = DOOR_DIR[h.door];
    const [sx, sz] = doorstep(h, 0);
    const along: [number, number] = [Math.abs(dz), Math.abs(dx)];
    if (i % 2 === 0) {
      const [fx, fz] = doorstep(h, 4);
      for (const off of [-5, -3, 3, 5]) life.prop(MODEL.fence, fx + along[0] * off, fz + along[1] * off, dz !== 0 ? 0 : 90);
    }
    for (const off of [-3, 3]) life.prop(FLOWERS[(i + off + 6) % FLOWERS.length] ?? FLOWERS[0], sx + along[0] * off, sz + along[1] * off, i * 47 + off * 13);
    life.prop(i % 3 === 0 ? MODEL.barrel : MODEL.bucket, sx + along[0] * 2 + dx, sz + along[1] * 2 + dz, i * 31);
    if (i % 4 === 1) life.prop(MODEL.logs, sx - along[0] * 4 + dx * 2, sz - along[1] * 4 + dz * 2, 90 * (i % 2));
  }
  for (const s of stalls) {
    const [cx, cz] = doorstep(s, 1);
    life.prop(MODEL.basket, cx + 2, cz, 0);
    life.prop(MODEL.barrel, cx - 2, cz, 0);
  }
  // A hedge of bamboo round part of the pad and a few bushes.
  const clumps = theme === 'forest' || theme === 'hamlet' ? 8 : 4;
  for (let k = 0; k < clumps; k++) {
    const a = life.roll() * Math.PI * 2;
    life.prop(k % 2 === 0 ? MODEL.bamboo : MODEL.bush, v.x + Math.cos(a) * (v.radius + 2), v.z + Math.sin(a) * (v.radius + 2), k * 53);
  }
  // Pastures fenced every four blocks round their edge.
  for (const f of fields) {
    if (f.kind !== 'pasture') continue;
    for (let x = f.x0; x <= f.x1; x += 4) for (const z of [f.z0, f.z1]) life.prop(MODEL.fence, x, z, 0);
    for (let z = f.z0 + 4; z < f.z1; z += 4) for (const x of [f.x0, f.x1]) life.prop(MODEL.fence, x, z, 90);
  }

  const anchorOf = (anchor: Anchor): [number, number] => {
    const yard = (): [number, number] => {
      const h = life.pick(houses);
      return h ? doorstep(h, 2) : [v.x + 8, v.z + 8];
    };
    const pickField = (kinds: readonly Field['kind'][]): Field | undefined => life.pick(fields.filter((f) => kinds.includes(f.kind)));
    switch (anchor) {
      case 'yard':
        return yard();
      case 'stall': {
        const s = life.pick(stalls);
        return s ? doorstep(s, 2) : [v.x + 6, v.z - 6];
      }
      case 'field': {
        const f = pickField(['paddy', 'crop']) ?? pickField(['pasture', 'orchard']);
        return f ? fieldCentre(f) : yard();
      }
      case 'pasture': {
        const f = pickField(['pasture']) ?? pickField(['crop', 'paddy']);
        return f ? fieldCentre(f) : [v.x + v.radius * 0.7, v.z];
      }
      case 'orchard': {
        const f = pickField(['orchard']);
        return f ? [f.x0 + 4, f.z0 + 4] : yard();
      }
      case 'water':
        return shoreNear(plan, v, 140) ?? [v.x - 8, v.z + 8];
      case 'centre': {
        const a = life.roll() * Math.PI * 2;
        const r = 6 + life.roll() * 10;
        return [v.x + Math.cos(a) * r, v.z + Math.sin(a) * r];
      }
    }
  };

  // People: most at the theme's trades, the rest at everyday ones; no two with the same name.
  const names = new Set<string>();
  const wanted = 7 + Math.floor(life.roll() * 4);
  const ownTrades = THEME_TRADES[theme];
  let placed = 0;
  for (let attempt = 0; placed < wanted && attempt < wanted * 3; attempt++) {
    const list = placed < Math.ceil(wanted * 0.6) ? ownTrades : EVERYDAY_TRADES;
    const id = list[(placed + attempt) % list.length] ?? 'cook';
    const trade: Trade = TRADES[id];
    const name = trade.names.find((n) => !names.has(n) && life.roll() < 0.6) ?? trade.names.find((n) => !names.has(n));
    if (!name) continue;
    const anchor = anchorOf(trade.anchor);
    const facing = trade.anchor === 'stall' ? anchor : undefined;
    if (!life.person(trade.routine, name, trade.held, anchor, 10, facing)) continue;
    names.add(name);
    placed++;
  }
  // Animals of the theme, round the yards and on the pastures.
  const beasts = 8 + Math.floor(life.roll() * 5);
  let animals = 0;
  for (let attempt = 0; animals < beasts && attempt < beasts * 3; attempt++) {
    const kind = weighted(life, THEME_ANIMALS[theme]);
    const name = ANIMAL_NAMES[kind].find((n) => !names.has(n) && life.roll() < 0.5) ?? ANIMAL_NAMES[kind].find((n) => !names.has(n));
    if (!name) continue;
    const anchor = anchorOf(kind === 'cow' ? 'pasture' : kind === 'dog' ? 'centre' : 'yard');
    if (!life.animal(kind, name, anchor)) continue;
    names.add(name);
    animals++;
  }
}

/** The crew of a scene by name: who, at which routine, holding what. */
type Crew = ReadonlyArray<readonly [AmbientRoutine, string, readonly string[]]>;

const KITE_CREW: Crew = [['kite-flyer', 'Bạn thả diều', []], ['kite-flyer', 'Bé thả diều', []], ['kite-flyer', 'Anh thả diều', []], ['kite-flyer', 'Chị thả diều', []]];
const FISHING_CREW: Crew = [['ferryman', 'Bác câu cá', [MODEL.paddle, MODEL.bucket]], ['ferryman', 'Chú thả lưới', [MODEL.paddle]], ['kite-flyer', 'Bé xem câu cá', []]];

/** The small scenes between the villages, and the viewpoints. */
function placeClearing(life: Life, plan: OutlandPlan, c: Clearing, index: number): void {
  const at = (dx: number, dz: number): [number, number] => [Math.round(c.x + dx), Math.round(c.z + dz)];
  const crew = (members: Crew, ring = 6): void => {
    for (const [k, [routine, name, held]] of members.entries()) {
      const a = (k / members.length) * Math.PI * 2;
      life.person(routine, name, held, at(Math.cos(a) * 4, Math.sin(a) * 4), ring);
    }
  };
  const flowers = (r: number, n: number): void => {
    for (let k = 0; k < n; k++) life.prop(FLOWERS[k % FLOWERS.length] ?? FLOWERS[0], ...at(Math.cos((k / n) * 6.28) * r, Math.sin((k / n) * 6.28) * r), k * 40);
  };
  switch (c.kind) {
    case 'viewpoint': {
      life.prop(MODEL.signpost, ...at(0, 0), 45);
      flowers(3, 5);
      const g = life.standing(...at(0, 0), true) ?? sampleColumn(plan, ...at(0, 0), { ground: 0, deck: -1, flags: 0 }).ground;
      life.landmarks.push({ id: `ngoai-ngam-${index + 1}`, name: c.name, position: [Math.round(c.x) + 0.5, g + 1, Math.round(c.z) + 0.5] });
      return;
    }
    case 'kites':
      crew(KITE_CREW.slice(0, 3 + Math.floor(life.roll() * 2)));
      return;
    case 'picnic':
      life.prop(MODEL.tent, ...at(-3, 0), 90);
      life.prop(MODEL.campfire, ...at(1, 1));
      life.prop(MODEL.logs, ...at(2, -2), 30);
      life.prop(MODEL.basket, ...at(-1, 2));
      crew([['home-cook', 'Mẹ nướng ngô', [MODEL.basket]], ['home-cook', 'Bố nướng khoai', [MODEL.basket]], ['reader', 'Bạn đọc truyện', [MODEL.book]], ['kite-flyer', 'Bé thả diều', []]]);
      return;
    case 'fishing': {
      const lake = plan.lakes[c.lake];
      if (lake) {
        // Boats on the water a little way out from the bank.
        const d = Math.hypot(lake.x - c.x, lake.z - c.z);
        const ux = (lake.x - c.x) / d;
        const uz = (lake.z - c.z) / d;
        let boats = 0;
        for (let s = 4; s < d && boats < (lake.r > 22 ? 2 : 1); s += 1) {
          const x = Math.floor(c.x + ux * s);
          const z = Math.floor(c.z + uz * s);
          if ((sampleColumn(plan, x, z, { ground: 0, deck: -1, flags: 0 }).flags & WATER) === 0) continue;
          life.propAt(boats === 0 ? MODEL.canoe : MODEL.sailboat, [x + 0.5 + ux * 3, plan.waterLevel + 0.9, z + 0.5 + uz * 3], Math.round((Math.atan2(uz, ux) * 180) / Math.PI));
          boats++;
          s += 8;
        }
      }
      life.prop(MODEL.bucket, ...at(1, -1));
      life.prop(MODEL.paddle, ...at(-1, 1), 60);
      crew(FISHING_CREW.slice(0, 2 + Math.floor(life.roll() * 2)));
      return;
    }
    case 'woodcutters':
      life.prop(MODEL.logs, ...at(-2, 2), 0);
      life.prop(MODEL.logs, ...at(2, 3), 90);
      life.prop(MODEL.axe, ...at(0, -2), 20);
      crew([['ploughman', 'Chú tiều phu', [MODEL.axe]], ['porter', 'Anh vác củi', [MODEL.basket]], ['waterer', 'Cô hái nấm', [MODEL.basket]]]);
      return;
    case 'teahouse':
      life.prop(MODEL.barrel, ...at(-2, 0));
      life.prop(MODEL.basket, ...at(2, 0));
      life.prop(MODEL.bucket, ...at(0, 2));
      crew([['vendor', 'Bà bán nước chè', [MODEL.basket]], ['shopper', 'Bác uống chè', []], ['porter', 'Chú nghỉ chân', [MODEL.basket]]]);
      return;
    case 'football':
      for (const side of [-1, 1]) for (const off of [-1, 1]) life.prop(MODEL.fence, ...at(side * 9, off * 2), 90);
      crew([['pupil', 'Bạn đá bóng', []], ['pupil', 'Bé thủ môn', []], ['pupil', 'Bạn chuyền bóng', []], ['pupil', 'Bé cổ vũ', []], ['teacher', 'Thầy thể dục', []]], 8);
      return;
    case 'readers':
      life.prop(MODEL.book, ...at(1, 0), 30);
      flowers(4, 6);
      crew([['reader', 'Bạn đọc truyện', [MODEL.book]], ['reader', 'Bé đọc thơ', [MODEL.book]], ['librarian', 'Cô kể chuyện', [MODEL.book]]]);
      return;
    case 'lookout':
      life.prop(MODEL.signpost, ...at(0, 0), 0);
      life.prop(MODEL.campfire, ...at(2, 2));
      life.prop(MODEL.barrel, ...at(-2, 2));
      crew([['sentry', 'Chú canh đồi', [MODEL.axe]], ['sentry', 'Anh gác đá', [MODEL.axe]], ['trumpeter', 'Chú thổi tù và', []]]);
      return;
    case 'stops':
      return;
  }
}

/**
 * Everything placed on the outer land for the runtime: decorative props (only models from spec.models, with
 * those scales), villagers and animals (ids `ngoai-…`), ride stops (cars taking the child between the core's
 * sides and the far villages) and landmarks (village names, viewpoints). Positions are world blocks; y is the
 * standing height (ground + 1).
 */
export function outlandEntities(plan: OutlandPlan): { props: WorldEntities['props']; ambients: Ambient[]; interactables: Interactable[]; landmarks: WorldEntities['landmarks'] } {
  const life = new Life(plan);
  // Rides first: life keeps clear of the stops and of where the rides arrive.
  placeRides(life, plan);
  for (const v of plan.villages) placeVillage(life, plan, v);
  for (const [i, c] of plan.clearings.entries()) placeClearing(life, plan, c, i);
  return { props: life.props, ambients: life.ambients, interactables: life.interactables, landmarks: life.landmarks };
}
