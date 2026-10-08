// Types of the everyday interactions with furniture and props on every map (sleeping in a bed, sitting on a
// chair, washing hands, cooking, switching a lamp on...). Each one is data: what it matches, the pose the
// child holds (interaction-poses.ts turns it into her gesture and where she goes), and how the object answers
// (object-effects.ts draws it). Adding one is adding an entry to object-interaction-registry.ts.

export type InteractionCategory =
  | 'rest'
  | 'hygiene'
  | 'kitchen'
  | 'study'
  | 'entertainment'
  | 'outdoor'
  | 'chores'
  | 'pet'
  | 'fishing'
  | 'dining';

/**
 * What the child does: `sit`, `lay`, `sleep`, `swing` and `watch` put her on (or in front of) the object,
 * `shower` stands her inside it; the others are gestures where she stands, turned toward it. interaction-poses.ts maps each to her gesture.
 */
export const INTERACTION_POSES = [
  'sit',
  'lay',
  'sleep',
  'swing',
  'watch',
  'wash',
  'shower',
  'cook',
  'study',
  'stretch',
  'open',
  'tap',
  'hug',
  'dance',
  'smell',
  'kick',
  'eat',
  'drink',
  'fish',
  'pet',
  'water',
  'sweep',
  'cheer',
  'wave',
] as const;
export type InteractionPose = (typeof INTERACTION_POSES)[number];

/** Little shapes that float up from an object (hearts from a hugged teddy, notes from a radio). */
export const EFFECT_GLYPHS = ['heart', 'note', 'star', 'bubble', 'zzz', 'sparkle'] as const;
export type EffectGlyph = (typeof EFFECT_GLYPHS)[number];

/**
 * How the object answers. Switched ones (`toggle`) stay as she left them: in her own home until she switches
 * them back (saved on the server), on the other maps for this visit and only for her.
 * - `light`: a lamp lights (a glow round its bulb; the nearest lit one also lights the room).
 * - `glow`: a warm glow while she uses it (a microwave running).
 * - `screen`: a television or computer screen comes alive with moving colours.
 * - `open`: its doors, lid or flap swing open (the model's moving parts).
 * - `door`: a house door that opens as she comes near (or taps it) and closes behind her.
 * - `spin`: it turns round (a globe, a fan).
 * - `sway`: the part she sits on swings with her (a swing).
 * - `water`: water runs from it (a tap, a shower, a watering).
 * - `steam`: steam rises from it (a pot, a kettle).
 * - `symbols`: `glyph`s float up from it.
 */
export type ObjectEffect =
  | { kind: 'light'; toggle: true; color?: string }
  | { kind: 'screen'; toggle: true }
  | { kind: 'open'; toggle: true }
  | { kind: 'door'; toggle: true }
  | { kind: 'spin'; toggle: boolean }
  | { kind: 'glow'; toggle?: false; color?: string }
  | { kind: 'sway'; toggle?: false }
  | { kind: 'water'; toggle?: false }
  | { kind: 'steam'; toggle?: false }
  | { kind: 'symbols'; toggle?: false; glyph: EffectGlyph; color?: string };
export type ObjectEffectKind = ObjectEffect['kind'];

export interface ObjectInteractionMatcher {
  /** Tested against the model file's name without folder and `.glb` (e.g. `/^chair(cushion|rounded)?$/i`). */
  modelRegex?: RegExp;
  /** Match exact slot in home-decor (e.g. 'bed', 'chair', 'desk') */
  slots?: readonly string[];
  /**
   * Whole words of the model's file name (`kitchenFridgeLarge` reads as kitchen, fridge, large; `park-bench` as
   * park, bench), of its slot or of a name: a keyword is one word or several joined by `-` (`pet-bowl`).
   */
  keywords?: readonly string[];
  /** Exact model file names (without folder and `.glb`). */
  modelNames?: readonly string[];
}

export interface ObjectInteractionDef {
  /** Unique action identifier (e.g. 'bed-sleep', 'chair-sit', 'toilet-use') */
  id: string;
  category: InteractionCategory;
  /** Human readable name */
  nameVi: string;
  nameEn: string;
  /** Label shown on prompt button (e.g. 'Nằm ngủ', 'Ngồi xuống', 'Đi vệ sinh') */
  verbVi: string;
  verbEn: string;
  /** The label while a switched effect is on (e.g. 'Tắt đèn'); the plain verb when absent. */
  offVi?: string;
  offEn?: string;
  /** Matching rules against 3D props and furniture */
  match: ObjectInteractionMatcher;
  /** Interaction radius in blocks (typically 1.5 - 2.5 blocks) */
  radius?: number;
  /** What the child does (her gesture and where she goes). */
  pose: InteractionPose;
  /** Duration in seconds (0 = held until child walks away) */
  duration?: number;
  /** How the object answers; absent only with `noEffect`. */
  effect?: ObjectEffect;
  /** Why the object itself does not change (a chair holds her and stays a chair): required when `effect` is absent. */
  noEffect?: string;
  /** Emoji shown in speech bubble and reaction */
  emoji: string;
  /** Canned speech lines the child happily says when interacting */
  dialoguesVi: readonly string[];
  dialoguesEn: readonly string[];
  /** Optional sound effect name or tone pitch */
  sound?: string;
}

type Point = readonly [number, number, number];

/**
 * Where her body is drawn while she holds a pose on or in front of the object: the feet origin (the seated clip
 * lowers her hips onto it), which way she faces, how far she is tipped back (lying) or swung (radians).
 */
export interface BodyPlacement {
  position: Point;
  facing: number;
  pitch: number;
}

export interface ActiveInteraction {
  readonly def: ObjectInteractionDef;
  readonly object: CandidateObject;
  elapsed: number;
  readonly duration: number;
  readonly bubbleText: string;
  /** Her body on the seat, the bed or the floor in front of a screen; null for the gestures she makes standing. */
  readonly body: BodyPlacement | null;
  /** A seat on a moving part (a swing): the part, its pivot (world) and the seat (world) at rest. */
  readonly swing: { part: string; pivot: Point; seat: Point; yaw: number } | null;
}

export interface CandidateObject {
  id: string;
  name: string;
  model: string;
  slot?: string;
  /** Its index in the map's props (what the prop field draws it as). */
  propIndex: number;
  position: Point;
  yaw: number;
  scale: number;
  def: ObjectInteractionDef;
  /** Its key in the saved switched states (stays the same across visits and restyles of a home piece). */
  stateKey: string;
  /** Its middle on the ground (a corner-pivot model's pivot is its corner), worked out once. */
  middle: Point;
}
