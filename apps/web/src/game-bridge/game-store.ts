// Game → React bridge. The game emits discrete, typed events; the store folds them into an
// immutable snapshot that React reads through useSyncExternalStore. Nothing per-frame goes through
// here: per-frame positions are written by the game straight into a DOM anchor React registers.

export interface InteractionPrompt {
  npcId: string;
  name: string;
  label: string;
}

export type GameEvent =
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'interaction-prompt'; prompt: InteractionPrompt | null }
  | { type: 'interaction'; npcId: string };

export interface GameSnapshot {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  prompt: InteractionPrompt | null;
  /** Last NPC the player interacted with, and how many interactions happened (for UI reactions). */
  lastInteraction: { npcId: string; count: number } | null;
}

/** Commands from React to the game (e.g. tapping the interaction label on a touch screen). */
export type GameCommand = { type: 'interact' };

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

export const INITIAL_SNAPSHOT: GameSnapshot = { status: 'loading', error: null, prompt: null, lastInteraction: null };

function samePrompt(a: InteractionPrompt | null, b: InteractionPrompt | null): boolean {
  return a === b || (a !== null && b !== null && a.npcId === b.npcId && a.name === b.name && a.label === b.label);
}

export function reduce(state: GameSnapshot, event: GameEvent): GameSnapshot {
  switch (event.type) {
    case 'ready':
      return state.status === 'ready' ? state : { ...state, status: 'ready', error: null };
    case 'error':
      return { ...state, status: 'error', error: event.message };
    case 'interaction-prompt':
      return samePrompt(state.prompt, event.prompt) ? state : { ...state, prompt: event.prompt };
    case 'interaction':
      return {
        ...state,
        lastInteraction: { npcId: event.npcId, count: (state.lastInteraction?.count ?? 0) + 1 },
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
