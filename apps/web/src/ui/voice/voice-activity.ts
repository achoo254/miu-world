// Voice activity on the device: whether she is talking now, from the loudness of her own microphone. Only the
// yes/no goes to the others (their rings and the bots' turns); the sound is never recorded or sent to the server.

/** Loudness (RMS of the samples, 0 … 1) above which she counts as talking. */
export const SPEAKING_LEVEL = 0.02;
/** Loud this long before it counts (a click or a bump is not talking). */
export const START_MS = 120;
/** Quiet this long before she counts as stopped (the pauses between words). */
export const HANGOVER_MS = 700;

/** Turns loudness samples over time into talking / not talking, with a short start and a longer end. */
export class VoiceActivityGate {
  private speaking = false;
  private loudSince: number | null = null;
  private quietSince: number | null = null;

  get on(): boolean {
    return this.speaking;
  }

  /** One sample; returns the new state when it changed, null otherwise. */
  update(level: number, now: number): boolean | null {
    const loud = level >= SPEAKING_LEVEL;
    if (loud) {
      this.quietSince = null;
      this.loudSince ??= now;
      if (!this.speaking && now - this.loudSince >= START_MS) {
        this.speaking = true;
        return true;
      }
      return null;
    }
    this.loudSince = null;
    this.quietSince ??= now;
    if (this.speaking && now - this.quietSince >= HANGOVER_MS) {
      this.speaking = false;
      return false;
    }
    return null;
  }

  reset(): void {
    this.speaking = false;
    this.loudSince = null;
    this.quietSince = null;
  }
}

/** Root mean square of time-domain samples (−1 … 1). */
export function rms(samples: Float32Array): number {
  let sum = 0;
  for (const s of samples) sum += s * s;
  return samples.length === 0 ? 0 : Math.sqrt(sum / samples.length);
}
