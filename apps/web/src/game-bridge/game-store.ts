// Game → React bridge. The game emits discrete, typed events; the store folds them into an
// immutable snapshot that React reads through useSyncExternalStore. Nothing per-frame goes through
// here: per-frame positions are written by the game straight into a DOM anchor React registers.
//
// Every event and command the vertical slice needs is declared here up front, so screens built in
// parallel only add handlers and never reshape these unions.

/** What the player can interact with in a region (world entities, version 2). */
export type InteractableKind = 'object' | 'npc' | 'riddle' | 'chest' | 'gate';

export interface InteractionPrompt {
  targetId: string;
  kind: InteractableKind;
  /** Display name of the target (e.g. "Vẹt"). */
  name: string;
  /** Action label (e.g. "Nói chuyện"). */
  label: string;
}

/** Why the game stopped; `context-lost` means the GPU dropped the WebGL context (low memory, background tab). */
export type GameErrorCode = 'load-failed' | 'context-lost';

/** Server-backed state of region targets, pushed by React after each quest response. */
export type TargetState = 'found' | 'open' | 'hidden';
export type WorldState = Readonly<Record<string, TargetState>>;

export type GameEvent =
  | { type: 'ready' }
  | { type: 'error'; code: GameErrorCode; message: string }
  /** Boot progress: `done` of `total` loading steps finished. */
  | { type: 'loading-progress'; done: number; total: number }
  | { type: 'interaction-prompt'; prompt: InteractionPrompt | null }
  | { type: 'interaction'; targetId: string };

export interface GameSnapshot {
  status: 'loading' | 'ready' | 'error';
  error: { code: GameErrorCode; message: string } | null;
  loading: { done: number; total: number };
  prompt: InteractionPrompt | null;
  /** Last target the player interacted with, and how many interactions happened (for UI reactions). */
  lastInteraction: { targetId: string; count: number } | null;
}

/** Commands from React to the game. The game ignores commands it does not handle yet. */
export type GameCommand =
  /** Tapping the interaction label on a touch screen. */
  | { type: 'interact' }
  /** Equipped accessory ids (`id` or `id:variant`); swaps outfit without a remount. */
  | { type: 'set-outfit'; equipped: readonly string[] }
  | { type: 'set-world-state'; state: WorldState }
  /** Target the quest tracker points at (direction arrow), or none. */
  | { type: 'set-target-hint'; targetId: string | null };

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
};

function samePrompt(a: InteractionPrompt | null, b: InteractionPrompt | null): boolean {
  return (
    a === b ||
    (a !== null && b !== null && a.targetId === b.targetId && a.kind === b.kind && a.name === b.name && a.label === b.label)
  );
}

export function reduce(state: GameSnapshot, event: GameEvent): GameSnapshot {
  switch (event.type) {
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
