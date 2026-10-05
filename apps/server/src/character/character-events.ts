// In-process news that a player saved her character (name, species, outfit, pet), so the multiplayer hub can
// redress her on the other players' screens at once. A listener that throws never breaks the save.
import type { CharacterDto } from '@miu/schema/game';

export type CharacterSaved = (childId: string, character: CharacterDto) => void;

export class CharacterEvents {
  private readonly listeners = new Set<CharacterSaved>();

  on(listener: CharacterSaved): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(childId: string, character: CharacterDto): void {
    for (const listener of this.listeners) {
      try {
        listener(childId, character);
      } catch (err) {
        console.error('character listener failed', err instanceof Error ? err.name : typeof err);
      }
    }
  }
}
