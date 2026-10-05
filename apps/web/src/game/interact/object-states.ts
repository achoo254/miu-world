// The switched state of the objects she has used (a lamp on, a wardrobe open, a television on). In her own home
// the kept ones go to the server and come back next time (Jev, 05/10/2026); elsewhere they last this visit and
// only she sees them. A key is the object's place (interaction-geometry.ts `stateKey`), true meaning on or open.
import { HomeObjectStates } from '@miu/schema/home-objects';

export type StatesListener = (key: string, on: boolean) => void;

export class ObjectStates {
  /** What shows now. */
  private readonly on = new Set<string>();
  /** What her home keeps switched on (only changed while `keeping`). */
  private readonly kept = new Set<string>();
  private keeping = true;
  private sortedOn: string[] | null = null;
  private readonly listeners = new Set<StatesListener>();

  /** `saved`: what the server kept for her home (anything malformed is dropped, not trusted). */
  constructor(saved?: Readonly<Record<string, boolean>>) {
    const parsed = HomeObjectStates.safeParse(saved ?? {});
    if (!parsed.success) return;
    for (const [key, value] of Object.entries(parsed.data)) {
      if (!value) continue;
      this.on.add(key);
      this.kept.add(key);
    }
  }

  isOn(key: string): boolean {
    return this.on.has(key);
  }

  /** Sets one state; `keep` it among the saved ones (the default) or not (a door that opens by itself). */
  set(key: string, value: boolean, keep = true): void {
    if (this.isOn(key) === value) return;
    if (value) this.on.add(key);
    else this.on.delete(key);
    this.sortedOn = null;
    if (keep && this.keeping) {
      if (value) this.kept.add(key);
      else this.kept.delete(key);
    }
    for (const listener of [...this.listeners]) listener(key, value);
  }

  toggle(key: string, keep = true): boolean {
    const next = !this.isOn(key);
    this.set(key, next, keep);
    return next;
  }

  /**
   * Keeping (her own home) or not (visiting another player's home): away, everything shows off and her switches
   * there last the visit; back home, her home is as she left it.
   */
  setKeeping(keeping: boolean): void {
    if (keeping === this.keeping) return;
    this.keeping = keeping;
    const show = keeping ? this.kept : new Set<string>();
    for (const key of [...this.on]) if (!show.has(key)) this.set(key, false, false);
    for (const key of show) if (!this.on.has(key)) this.set(key, true, false);
  }

  /** The kept states that are on, of the keys `known` allows (a key of an object the map no longer has is dropped). */
  saved(known?: ReadonlySet<string>): Record<string, true> {
    const out: Record<string, true> = {};
    for (const key of [...this.kept].sort()) if (!known || known.has(key)) out[key] = true;
    return out;
  }

  /** Keys on now, sorted (kept until the next change). */
  keysOn(): readonly string[] {
    this.sortedOn ??= [...this.on].sort();
    return this.sortedOn;
  }

  onChange(listener: StatesListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
