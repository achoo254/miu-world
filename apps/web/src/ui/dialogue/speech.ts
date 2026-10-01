// "Nghe lại" reads a line aloud with the browser's speech synthesis, and only with a voice that runs
// on the device: "remote" voices (localService = false, e.g. some Chrome/Edge voices) send the text
// to the vendor's servers, which Master Plan §9 rules out. No local Vietnamese voice → no button.
import { useEffect, useState } from 'react';
import { duckMusic } from '../sound/music-player';
import { readSoundOn } from '../system/sound-setting';

type VoiceLike = Pick<SpeechSynthesisVoice, 'lang' | 'localService' | 'name'>;

/** First on-device Vietnamese voice, or null. */
export function localVietnameseVoice<V extends VoiceLike>(voices: readonly V[]): V | null {
  return voices.find((v) => v.localService && v.lang.toLowerCase().startsWith('vi')) ?? null;
}

function synthesis(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

/**
 * The voice to read with, or null (no local Vietnamese voice, or sound switched off): callers hide
 * "Nghe lại" then. Voices load asynchronously in some browsers, so it follows `voiceschanged`.
 */
export function useLocalVoice(): SpeechSynthesisVoice | null {
  const voice = useDeviceVoice();
  return readSoundOn() ? voice : null;
}

function useDeviceVoice(): SpeechSynthesisVoice | null {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(() => localVietnameseVoice(synthesis()?.getVoices() ?? []));
  useEffect(() => {
    const speech = synthesis();
    if (!speech) return;
    const update = (): void => setVoice(localVietnameseVoice(speech.getVoices()));
    speech.addEventListener('voiceschanged', update);
    return () => speech.removeEventListener('voiceschanged', update);
  }, []);
  return voice;
}

export function speak(text: string, voice: SpeechSynthesisVoice): void {
  const speech = synthesis();
  if (!speech || !readSoundOn()) return;
  speech.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  // The music steps back while the line is read.
  const release = duckMusic();
  utterance.onend = release;
  utterance.onerror = release;
  speech.speak(utterance);
}
