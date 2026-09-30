// Plays the UI sound cues (see cues.ts): each cue rotates through its variants, never the same one
// twice in a row, at a gentle volume; nothing plays while the sound setting is off, and a browser that
// refuses to play (no gesture yet, no audio device) is simply silent.
import { assetUrl } from '../kit/ui-art';
import { readSoundOn } from '../system/sound-setting';
import { SOUND_CUES, soundPath, type SoundCue } from './cues';

/** Quieter for frequent taps and for the "try again" tone, fuller for successes. */
const VOLUME: Record<SoundCue, number> = { tap: 0.35, place: 0.5, right: 0.7, wrong: 0.45, star: 0.6, complete: 0.75 };

const last = new Map<SoundCue, number>();

/** The variant to play next: any but the one played last. */
export function nextVariant(cue: SoundCue, random: () => number = Math.random): number {
  const count = SOUND_CUES[cue].length;
  const previous = last.get(cue);
  let pick = Math.floor(random() * count);
  if (count > 1 && pick === previous) pick = (pick + 1) % count;
  last.set(cue, pick);
  return pick;
}

export function playCue(cue: SoundCue): void {
  if (!readSoundOn() || typeof Audio === 'undefined') return;
  try {
    const audio = new Audio(assetUrl(soundPath(cue, nextVariant(cue))));
    audio.volume = VOLUME[cue];
    void audio.play()?.catch(() => undefined);
  } catch {
    // No audio here (tests, a locked-down browser): stay silent.
  }
}
