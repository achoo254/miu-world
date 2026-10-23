// Whether the game is in front of the player: what pauses a minigame round, the music and the microphone, saves where
// she stands, and reconnects online play when she comes back. On the web that is the page's visibility
// (`visibilitychange`). The iPhone/Android app also has the app's own background/foreground events (`pause` /
// `resume` of @capacitor/app), which a WebView does not always turn into a visibility change; either one counts.

/** The part of `document` this needs (injectable for tests). */
export interface VisibilitySource {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
}

type Listener = () => void;

export class AppVisibility {
  private nativeHidden = false;
  private readonly listeners = new Set<Listener>();

  constructor(private readonly source: VisibilitySource) {
    source.addEventListener('visibilitychange', () => this.notify());
  }

  /** True while the page is hidden or the app is in the background. */
  hidden(): boolean {
    return this.nativeHidden || this.source.visibilityState === 'hidden';
  }

  /** The app went to the background (`true`) or came back (`false`). Told once if the page visibility already said so. */
  setNativeHidden(hidden: boolean): void {
    if (this.nativeHidden === hidden) return;
    const before = this.hidden();
    this.nativeHidden = hidden;
    if (this.hidden() !== before) this.notify();
  }

  /** Calls `listener` on each change (read `hidden()` there); returns the unsubscribe. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

const visibility: AppVisibility | null = typeof document === 'undefined' ? null : new AppVisibility(document);

/** True while the game is not in front of the player (page hidden, or the app in the background). */
export function appHidden(): boolean {
  return visibility?.hidden() ?? false;
}

/** Calls `listener` whenever the game goes to or comes back from the background; returns the unsubscribe. */
export function onAppVisibilityChange(listener: () => void): () => void {
  return visibility?.subscribe(listener) ?? (() => undefined);
}

/** The app's background/foreground events (from @capacitor/app in native-app.ts) feed in here. */
export function setAppInBackground(hidden: boolean): void {
  visibility?.setNativeHidden(hidden);
}
