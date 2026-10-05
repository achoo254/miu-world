// Read-aloud with the browser's speech synthesis, in Vietnamese (vi-VN) or English (en-US), and only with a
// voice that runs on the device: "remote" voices (localService = false, e.g. some Chrome/Edge voices) send the
// text to the vendor's servers, which Master Plan §9 rules out. No local voice for a language → nothing is read
// in it (the "Nghe" button hides). The speed follows the voice setting, the sound switch silences it, and a
// screen that closes stops it (listen-button.tsx, app-shell.tsx).
import { useEffect, useState } from 'react';
import type { Lang, LangMode } from '../i18n/i18n';
import { duckMusic } from '../sound/music-player';
import { onSoundSettingChange, readSoundOn } from '../system/sound-setting';
import { VOICE_RATE, readVoiceSpeed } from '../system/voice-setting';

type VoiceLike = Pick<SpeechSynthesisVoice, 'lang' | 'localService' | 'name'> & Partial<Pick<SpeechSynthesisVoice, 'default'>>;

const LOCALE: Readonly<Record<Lang, string>> = { vi: 'vi-VN', en: 'en-US' };
/** Names of the better-sounding voices some systems ship next to the basic ones (macOS, iOS, Windows). */
const RICH_VOICE = /premium|enhanced|natural|neural/i;

const tag = (voice: VoiceLike): string => voice.lang.toLowerCase().replace('_', '-');

/**
 * The best on-device voice for `lang`, or null: the exact locale (vi-VN, en-US) before another of the same
 * language (en-GB), a richer voice before a basic one, the system's default before the rest. Never a remote voice.
 */
export function bestVoice<V extends VoiceLike>(voices: readonly V[], lang: Lang): V | null {
  const exact = LOCALE[lang].toLowerCase();
  const score = (v: V): number => (tag(v) === exact ? 4 : 0) + (RICH_VOICE.test(v.name) ? 2 : 0) + (v.default ? 1 : 0);
  const candidates = voices.filter((v) => v.localService && tag(v).split('-')[0] === lang);
  return candidates.reduce<V | null>((best, v) => (best === null || score(v) > score(best) ? v : best), null);
}

function synthesis(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null;
}

/** One line to read, in its language. */
export interface SpokenLine {
  text: string;
  lang: Lang;
}

/** Lets the music come back once the reading ends or is cut short. */
let releaseMusic: (() => void) | null = null;

function release(): void {
  releaseMusic?.();
  releaseMusic = null;
}

export function stopSpeaking(): void {
  const speech = synthesis();
  if (speech && (speech.speaking || speech.pending)) speech.cancel();
  release();
}

/**
 * Reads `lines` one after the other, cutting off whatever was being read. Lines without an on-device voice are
 * skipped; returns false when nothing could be read (no synthesis, sound off, no voice).
 */
export function speakLines(lines: readonly SpokenLine[]): boolean {
  const speech = synthesis();
  if (!speech || !readSoundOn()) return false;
  const voices = speech.getVoices();
  const queue = lines.flatMap((line) => {
    const voice = bestVoice(voices, line.lang);
    return voice && line.text.trim() !== '' ? [{ ...line, voice }] : [];
  });
  if (queue.length === 0) return false;
  stopSpeaking();
  const rate = VOICE_RATE[readVoiceSpeed()];
  // The music steps back while the lines are read.
  releaseMusic = duckMusic();
  queue.forEach((line, i) => {
    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.voice = line.voice;
    utterance.lang = line.voice.lang;
    utterance.rate = rate;
    if (i === queue.length - 1) utterance.onend = release;
    utterance.onerror = release;
    speech.speak(utterance);
  });
  return true;
}

/** Reads one line in `lang`. */
export const speak = (text: string, lang: Lang): boolean => speakLines([{ text, lang }]);

/**
 * A companion bot's line in a voice channel, in its own voice (pitch and rate) at `volume`, with an on-device voice
 * only. It never cuts off a reading under way: while something is read, the line is skipped (false), as it is with
 * the sound off or no voice for `lang`. `ended` is called once it is over (or cut short).
 */
export function speakVoiceLine(text: string, lang: Lang, voice: { pitch: number; rate: number }, volume: number, ended: () => void): boolean {
  const speech = synthesis();
  if (!speech || !readSoundOn() || volume <= 0 || text.trim() === '' || speech.speaking || speech.pending) return false;
  const local = bestVoice(speech.getVoices(), lang);
  if (!local) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = local;
  utterance.lang = local.lang;
  utterance.pitch = voice.pitch;
  utterance.rate = voice.rate;
  utterance.volume = Math.min(1, volume);
  let done = false;
  const end = (): void => {
    if (done) return;
    done = true;
    ended();
  };
  utterance.onend = end;
  utterance.onerror = end;
  speech.speak(utterance);
  return true;
}

/**
 * What a "Nghe" tap reads in `mode`: the line shown. In Song ngữ the Vietnamese, then the English when there is
 * one; untranslated text (textbook wording: `en` equal to `vi`, or no `en`) is read in Vietnamese in every mode.
 */
export function linesToRead(text: Readonly<{ vi: string; en?: string }>, mode: LangMode): SpokenLine[] {
  const english = text.en !== undefined && text.en !== text.vi ? text.en : null;
  if (mode === 'en' && english !== null) return [{ text: english, lang: 'en' }];
  if (mode === 'both' && english !== null) return [{ text: text.vi, lang: 'vi' }, { text: english, lang: 'en' }];
  return [{ text: text.vi, lang: 'vi' }];
}

/** The languages the device can read aloud now (none while the sound is off); follows `voiceschanged` and the sound switch. */
export function useSpeakableLangs(): ReadonlySet<Lang> {
  const [voices, setVoices] = useState<readonly SpeechSynthesisVoice[]>(() => synthesis()?.getVoices() ?? []);
  const [soundOn, setSoundOn] = useState(readSoundOn);
  useEffect(() => {
    const speech = synthesis();
    const offSound = onSoundSettingChange(() => setSoundOn(readSoundOn()));
    if (!speech) return offSound;
    // Voices load asynchronously in some browsers.
    const update = (): void => setVoices(speech.getVoices());
    update();
    speech.addEventListener('voiceschanged', update);
    return () => {
      offSound();
      speech.removeEventListener('voiceschanged', update);
    };
  }, []);
  if (!soundOn) return new Set();
  return new Set((['vi', 'en'] as const).filter((lang) => bestVoice(voices, lang) !== null));
}

// Switching the sound off stops a reading under way.
onSoundSettingChange(() => {
  if (!readSoundOn()) stopSpeaking();
});
