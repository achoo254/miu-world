// Types and schemas for object interactions.
// Allows grade 2 children to interact with objects and furniture across maps
// (sleeping in bed, sitting on chairs, using toilets, washing hands, cooking, playing piano, etc.).
// Designed to be easily extensible for 100+ future custom interactions.

export type InteractionCategory =
  | 'rest'
  | 'hygiene'
  | 'kitchen'
  | 'study'
  | 'entertainment'
  | 'outdoor'
  | 'chores'
  | 'pet';

export type InteractionPose =
  | 'sit'
  | 'lay'
  | 'wash'
  | 'study'
  | 'cook'
  | 'play'
  | 'wave'
  | 'cheer'
  | 'stretch'
  | 'none';

export interface ObjectInteractionMatcher {
  /** Regex pattern matching model path (e.g. /chair|bench/i) */
  modelRegex?: RegExp;
  /** Match exact slot in home-decor (e.g. 'bed', 'chair', 'desk') */
  slots?: readonly string[];
  /** Keywords matching model path, prop name or target ID */
  keywords?: readonly string[];
  /** Match specific model filenames */
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
  /** Matching rules against 3D props and furniture */
  match: ObjectInteractionMatcher;
  /** Interaction radius in blocks (typically 1.5 - 2.5 blocks) */
  radius?: number;
  /** Character pose held during interaction */
  pose?: InteractionPose;
  /** Duration in seconds (0 = held until child walks away) */
  duration?: number;
  /** Emoji shown in speech bubble and reaction */
  emoji: string;
  /** Canned speech lines the child happily says when interacting */
  dialoguesVi: readonly string[];
  dialoguesEn: readonly string[];
  /** Optional sound effect name or tone pitch */
  sound?: string;
  /** Positional offset relative to prop center [x, y, z] */
  offset?: readonly [number, number, number];
}

export interface ActiveInteraction {
  readonly def: ObjectInteractionDef;
  readonly objectPos: readonly [number, number, number];
  readonly objectYaw: number;
  elapsed: number;
  readonly duration: number;
  readonly bubbleText: string;
  /** Where the child stood before sitting or lying on the object: she is put back there on getting up (the object itself is solid). */
  readonly standAt: readonly [number, number, number] | null;
}

export interface CandidateObject {
  id: string;
  name: string;
  model: string;
  slot?: string;
  position: readonly [number, number, number];
  yaw: number;
  scale?: number;
  def: ObjectInteractionDef;
}
