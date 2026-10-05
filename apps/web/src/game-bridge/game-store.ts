// Game → React bridge. The game emits discrete, typed events; the store folds them into an
// immutable snapshot that React reads through useSyncExternalStore. Nothing per-frame goes through
// here: per-frame positions are written by the game straight into a DOM anchor React registers.
//
// Every event and command the vertical slice needs is declared here up front, so screens built in
// parallel only add handlers and never reshape these unions.

import type { InteractableKind } from '@miu/voxel/world-entities';

export type { InteractableKind };

export interface InteractionPrompt {
  targetId: string;
  /**
   * `ambient`: a villager or animal of the map's everyday life, handled in the game (no quest step); `player`:
   * another player or a companion bot (the online menu).
   */
  kind: InteractableKind | 'ambient' | 'player';
  /** Display name of the target (e.g. "Vẹt"). */
  name: string;
  /** Action label (e.g. "Nói chuyện"). */
  label: string;
}

/** Why the game stopped; `context-lost` means the GPU dropped the WebGL context (low memory, background tab). */
export type GameErrorCode = 'load-failed' | 'context-lost';

/**
 * Walking to the quest target on her own (tapping the quest card): `finding` the way, `walking` it, then
 * `arrived` or `failed` for a moment before `idle` again.
 */
export type AutowalkState = 'idle' | 'finding' | 'walking' | 'arrived' | 'failed';

/**
 * A place to walk to, picked on the full map: a target of this map by id (a gate, a ride stop, a character, the
 * quest's place), or a spot on the ground (a named place).
 */
export type WalkGoal = { targetId: string } | { position: readonly [number, number, number] };

/** Server-backed state of region targets, pushed by React after each quest response. */
export type TargetState = 'found' | 'open' | 'hidden';

/** The vehicle the child has equipped on this map (the HUD offers "Lái xe" / "Xuống xe"), and whether she rides it. */
export interface VehicleState {
  name: string;
  riding: boolean;
}
export type WorldState = Readonly<Record<string, TargetState>>;

export type GameEvent =
  /** A game starts loading (the first, or the next map's after a gate): everything about the last one is gone. */
  | { type: 'loading' }
  | { type: 'ready' }
  | { type: 'error'; code: GameErrorCode; message: string }
  /** Boot progress: `done` of `total` loading steps finished. */
  | { type: 'loading-progress'; done: number; total: number }
  | { type: 'interaction-prompt'; prompt: InteractionPrompt | null }
  | { type: 'interaction'; targetId: string }
  /** The child went through a gate to another map (its region). */
  | { type: 'travel'; region: string }
  /** Miu cannot get out on her own (stuck in water, or the stick gets her nowhere). */
  | { type: 'stuck'; stuck: boolean }
  /** Whether the quest's target stands on this map, so the quest card can walk her there. */
  | { type: 'autowalk-available'; available: boolean }
  | { type: 'autowalk'; state: AutowalkState }
  /** The equipped vehicle and whether she is on it (null: no vehicle equipped). */
  | { type: 'vehicle'; vehicle: VehicleState | null }
  /** What is switched on in her home changed (a lamp, the television): every kept key that is on now. */
  | { type: 'object-states'; states: Readonly<Record<string, true>> };

export interface GameSnapshot {
  status: 'loading' | 'ready' | 'error';
  error: { code: GameErrorCode; message: string } | null;
  loading: { done: number; total: number };
  prompt: InteractionPrompt | null;
  /** Last target the player interacted with, and how many interactions happened (for UI reactions). */
  lastInteraction: { targetId: string; count: number } | null;
  /** The HUD offers "Quay lại" while this is true. */
  stuck: boolean;
  /** Last gate gone through: the region it leads to, and how many gates so far (the play screen moves maps). */
  travel: { region: string; count: number } | null;
  /** The quest card offers to walk her to the target while this is true. */
  autowalkAvailable: boolean;
  autowalk: AutowalkState;
  /** The equipped vehicle, while the game is up. */
  vehicle: VehicleState | null;
  /** What she switched on in her home, as last reported by the game (null until it reports): the play screen saves it. */
  objectStates: Readonly<Record<string, true>> | null;
}

/** Commands from React to the game. The game ignores commands it does not handle yet. */
export type GameCommand =
  /** Tapping the interaction label on a touch screen. */
  | { type: 'interact' }
  /** Equipped accessory ids (`id` or `id:variant`); swaps outfit without a remount. */
  | { type: 'set-outfit'; equipped: readonly string[] }
  /** The pet beside the character in the creator preview (`content/pets.json`), or none. */
  | { type: 'set-pet'; pet: string | null }
  | { type: 'set-world-state'; state: WorldState }
  /** Target the quest tracker points at (direction arrow), or none. */
  | { type: 'set-target-hint'; targetId: string | null }
  /** Put Miu back where she last stood safely (the "Quay lại" button, the pause menu). */
  | { type: 'rescue' }
  /** A quest was just finished: the world around Miu cheers (villagers, animals, confetti). */
  | { type: 'celebrate' }
  /** Walk Miu to the target the tracker points at, along the ways (tapping the quest card). */
  | { type: 'autowalk-start' }
  /** Stop that walk where she is (tapping the card again). */
  | { type: 'autowalk-stop' }
  /** Walk Miu to a place picked on the full map, along the ways (the same walk, its line on the quest card). */
  | { type: 'autowalk-to'; to: WalkGoal }
  /** Get on the equipped vehicle, or off it (the HUD's "Lái xe" / "Xuống xe"). */
  | { type: 'ride'; on: boolean };

export interface GameStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): GameSnapshot;
  emit(event: GameEvent): void;
  /** React registers (or clears) the element the game positions under the active prompt each frame. */
  setPromptAnchor(el: HTMLElement | null): void;
  getPromptAnchor(): HTMLElement | null;
  send(command: GameCommand): void;
  onCommand(handler: (command: GameCommand) => void): () => void;
}

export const INITIAL_SNAPSHOT: GameSnapshot = {
  status: 'loading',
  error: null,
  loading: { done: 0, total: 0 },
  prompt: null,
  lastInteraction: null,
  stuck: false,
  travel: null,
  autowalkAvailable: false,
  autowalk: 'idle',
  vehicle: null,
  objectStates: null,
};

function samePrompt(a: InteractionPrompt | null, b: InteractionPrompt | null): boolean {
  return (
    a === b ||
    (a !== null && b !== null && a.targetId === b.targetId && a.kind === b.kind && a.name === b.name && a.label === b.label)
  );
}

export function reduce(state: GameSnapshot, event: GameEvent): GameSnapshot {
  switch (event.type) {
    case 'loading':
      // A new map loads: the loading screen shows again, and "ready" will be news to every listener (the quest
      // sends its target to the new game then, so the card can walk her there).
      return { ...state, status: 'loading', error: null, loading: { done: 0, total: state.loading.total }, prompt: null, stuck: false, autowalkAvailable: false, autowalk: 'idle', vehicle: null, objectStates: null };
    case 'ready':
      return state.status === 'ready' ? state : { ...state, status: 'ready', error: null };
    case 'error':
      return { ...state, status: 'error', error: { code: event.code, message: event.message }, prompt: null };
    case 'loading-progress': {
      const done = Math.min(event.done, event.total);
      if (state.loading.done === done && state.loading.total === event.total) return state;
      return { ...state, loading: { done, total: event.total } };
    }
    case 'interaction-prompt':
      return samePrompt(state.prompt, event.prompt) ? state : { ...state, prompt: event.prompt };
    case 'interaction':
      return {
        ...state,
        lastInteraction: { targetId: event.targetId, count: (state.lastInteraction?.count ?? 0) + 1 },
      };
    case 'stuck':
      return state.stuck === event.stuck ? state : { ...state, stuck: event.stuck };
    case 'travel':
      return { ...state, travel: { region: event.region, count: (state.travel?.count ?? 0) + 1 } };
    case 'autowalk-available':
      return state.autowalkAvailable === event.available ? state : { ...state, autowalkAvailable: event.available };
    case 'autowalk':
      return state.autowalk === event.state ? state : { ...state, autowalk: event.state };
    case 'vehicle': {
      const same = state.vehicle?.name === event.vehicle?.name && state.vehicle?.riding === event.vehicle?.riding;
      return same ? state : { ...state, vehicle: event.vehicle };
    }
    case 'object-states':
      return { ...state, objectStates: event.states };
  }
}

export function createGameStore(): GameStore {
  let snapshot = INITIAL_SNAPSHOT;
  let anchor: HTMLElement | null = null;
  const listeners = new Set<() => void>();
  const commandHandlers = new Set<(command: GameCommand) => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    emit(event) {
      const next = reduce(snapshot, event);
      if (next === snapshot) return; // unchanged state: no React work
      snapshot = next;
      for (const listener of [...listeners]) listener();
    },
    setPromptAnchor(el) {
      anchor = el;
    },
    getPromptAnchor: () => anchor,
    send(command) {
      for (const handler of [...commandHandlers]) handler(command);
    },
    onCommand(handler) {
      commandHandlers.add(handler);
      return () => commandHandlers.delete(handler);
    },
  };
}
