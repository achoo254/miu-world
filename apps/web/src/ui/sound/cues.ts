// Which Kenney Interface Sounds (CC0) make each UI cue. `pnpm assets:sounds` turns them into AAC under
// assets/generated/sounds/ (Safari on the iPad plays no Ogg Vorbis); the game plays `soundPath(cue, n)`.
// Plain data on purpose: the asset tool and vite.config import it.

export const SOUND_SOURCE_DIR = 'packs/kenney-interface-sounds/1.0/Audio';

/** Several variants per cue, played in rotation, so a child never hears the same sound twice in a row. */
export const SOUND_CUES = {
  tap: ['click_002', 'click_003', 'click_004'],
  place: ['drop_001', 'drop_002', 'drop_003', 'drop_004'],
  right: ['confirmation_001', 'confirmation_002', 'confirmation_003'],
  /** Soft and curious rather than a buzzer. */
  wrong: ['question_001', 'question_002', 'question_003'],
  star: ['glass_001', 'glass_002', 'glass_003'],
  complete: ['maximize_004', 'maximize_006', 'maximize_008'],
} as const;
export type SoundCue = keyof typeof SOUND_CUES;

export function soundPath(cue: SoundCue, variant: number): string {
  return `generated/sounds/${cue}-${variant + 1}.m4a`;
}

/** Every generated sound file, for the build to ship. */
export const SOUND_PATHS: readonly string[] = (Object.keys(SOUND_CUES) as SoundCue[]).flatMap((cue) => SOUND_CUES[cue].map((_, i) => soundPath(cue, i)));
