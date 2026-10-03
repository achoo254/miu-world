// Read-aloud speed (slow for a child following the words, or normal), remembered per device like the sound
// setting. Blocked storage falls back to "slow" and skips writes.
export type VoiceSpeed = 'slow' | 'normal';

const KEY = 'miu.voiceSpeed';

/** Speech-synthesis rate of each speed. */
export const VOICE_RATE: Readonly<Record<VoiceSpeed, number>> = { slow: 0.75, normal: 1 };

export function readVoiceSpeed(): VoiceSpeed {
  try {
    return window.localStorage.getItem(KEY) === 'normal' ? 'normal' : 'slow';
  } catch {
    return 'slow';
  }
}

export function writeVoiceSpeed(speed: VoiceSpeed): void {
  try {
    window.localStorage.setItem(KEY, speed);
  } catch {
    // Blocked storage: the reading goes on at the default speed.
  }
}
