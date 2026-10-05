// Voice chat settings, remembered per device like the sound settings: voice on or off (off: no microphone button,
// calls are declined for her), push-to-talk instead of voice activity, and how loud the others sound. Storage can be
// blocked (private mode): reads fall back to the defaults and writes are skipped.
export interface VoiceSettings {
  /** Voice chat available (the microphone still stays off until she taps it). */
  enabled: boolean;
  /** Talk only while holding the button, instead of whenever she talks. */
  pushToTalk: boolean;
  /** How loud other players and bots sound, 0 … 1. */
  volume: number;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = { enabled: true, pushToTalk: false, volume: 1 };

const KEY = 'miu.voiceChat';
const listeners = new Set<() => void>();

const clampVolume = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOICE_SETTINGS.volume);

export function readVoiceSettings(): VoiceSettings {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_VOICE_SETTINGS;
    const kept: unknown = JSON.parse(raw);
    if (typeof kept !== 'object' || kept === null) return DEFAULT_VOICE_SETTINGS;
    const k = kept as Partial<Record<keyof VoiceSettings, unknown>>;
    return {
      enabled: typeof k.enabled === 'boolean' ? k.enabled : DEFAULT_VOICE_SETTINGS.enabled,
      pushToTalk: typeof k.pushToTalk === 'boolean' ? k.pushToTalk : DEFAULT_VOICE_SETTINGS.pushToTalk,
      volume: clampVolume(k.volume),
    };
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

export function writeVoiceSettings(patch: Partial<VoiceSettings>): VoiceSettings {
  const next = { ...readVoiceSettings(), ...patch };
  next.volume = clampVolume(next.volume);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Blocked storage: the choice lasts until the page closes (listeners still hear it).
  }
  for (const listener of [...listeners]) listener();
  return next;
}

/** Calls `listener` after every change of the settings. */
export function onVoiceSettingsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
