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

/** Synthesised note voices for minigames (piano tiles, drums, call and answer); no sound files. */
export type NoteVoice = 'piano' | 'bell' | 'drum' | 'clap' | 'whistle';

let noteContext: AudioContext | null = null;

function notes(): AudioContext | null {
  if (noteContext) return noteContext;
  const Ctor = typeof window === 'undefined' ? undefined : window.AudioContext;
  if (!Ctor) return null;
  try {
    noteContext = new Ctor();
  } catch {
    noteContext = null;
  }
  return noteContext;
}

/** Frequency of a MIDI note (69 = A4 = 440 Hz). */
export function noteFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** A short burst of noise, for the drum's skin and the clap. */
function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/**
 * Plays one note: a gentle plucked piano (triangle, quick decay), a bell (sine with a fifth above), a drum
 * (a falling sine thump with a little skin noise), a clap (filtered noise) or a whistle (pure sine). Silent
 * while the sound setting is off or where the browser has no Web Audio.
 */
export function playNote(midi: number, voice: NoteVoice = 'piano'): void {
  if (!readSoundOn()) return;
  const ctx = notes();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.connect(ctx.destination);
    const envelope = (peak: number, length: number): void => {
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(peak, now + 0.01);
      out.gain.exponentialRampToValueAtTime(0.0001, now + length);
    };
    const tone = (type: OscillatorType, frequency: number, length: number, to: AudioNode = out): OscillatorNode => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now);
      osc.connect(to);
      osc.start(now);
      osc.stop(now + length);
      return osc;
    };
    const frequency = noteFrequency(midi);
    if (voice === 'piano') {
      envelope(0.35, 0.6);
      tone('triangle', frequency, 0.65);
    } else if (voice === 'bell') {
      envelope(0.3, 1.2);
      tone('sine', frequency, 1.25);
      tone('sine', frequency * 1.5, 0.6);
    } else if (voice === 'whistle') {
      envelope(0.25, 0.35);
      tone('sine', frequency * 2, 0.4);
    } else if (voice === 'drum') {
      envelope(0.6, 0.35);
      const thump = tone('sine', frequency, 0.4);
      thump.frequency.exponentialRampToValueAtTime(Math.max(30, frequency / 3), now + 0.3);
      const skin = ctx.createBufferSource();
      skin.buffer = noiseBuffer(ctx, 0.08);
      const skinGain = ctx.createGain();
      skinGain.gain.value = 0.15;
      skin.connect(skinGain).connect(out);
      skin.start(now);
    } else {
      envelope(0.45, 0.15);
      const clap = ctx.createBufferSource();
      clap.buffer = noiseBuffer(ctx, 0.16);
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1500;
      clap.connect(band).connect(out);
      clap.start(now);
    }
  } catch {
    // A browser that refuses (no gesture yet, no audio device): stay silent.
  }
}

const held = new Map<string, { osc: OscillatorNode; gain: GainNode }>();

/**
 * Starts a held note (a bamboo-zither slide, a music box key held down): sounds until `stopNote(id)`, and
 * `bendNote(id, midi)` glides its pitch (MIDI numbers may be fractional). One note per id; silent where the sound
 * setting is off or there is no Web Audio.
 */
export function startNote(id: string, midi: number, voice: 'piano' | 'bell' | 'whistle' = 'whistle'): void {
  if (!readSoundOn()) return;
  const ctx = notes();
  if (!ctx) return;
  stopNote(id);
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(voice === 'whistle' ? 0.25 : 0.3, ctx.currentTime + 0.03);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = voice === 'piano' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(noteFrequency(midi), ctx.currentTime);
    osc.connect(gain);
    osc.start();
    held.set(id, { osc, gain });
  } catch {
    // No audio here: stay silent.
  }
}

/** Glides a held note to another pitch (a slide on the đàn bầu). */
export function bendNote(id: string, midi: number): void {
  const note = held.get(id);
  const ctx = noteContext;
  if (!note || !ctx) return;
  note.osc.frequency.linearRampToValueAtTime(noteFrequency(midi), ctx.currentTime + 0.06);
}

/** Lets a held note fade out. */
export function stopNote(id: string): void {
  const note = held.get(id);
  const ctx = noteContext;
  if (!note || !ctx) return;
  held.delete(id);
  try {
    note.gain.gain.cancelScheduledValues(ctx.currentTime);
    note.gain.gain.setValueAtTime(Math.max(note.gain.gain.value, 0.0001), ctx.currentTime);
    note.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    note.osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Already stopped.
  }
}

/** Stops every held note (a round ends, the tab hides). */
export function stopAllNotes(): void {
  for (const id of [...held.keys()]) stopNote(id);
}
