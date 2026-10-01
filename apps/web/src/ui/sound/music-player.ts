// Plays the background music of the scene on screen (music.ts). Screens ask for a mood; the player
// shuffles that mood's tracks (never the same one twice in a row), fades between moods, and stays
// silent while the sound setting is off, the tab is hidden, or the microphone records. Volume goes
// through Web Audio because Safari on the iPad ignores `audio.volume`. A browser that refuses to play
// before a tap waits for the first tap; one with no Web Audio at all (tests) stays silent.
import { useEffect } from 'react';
import { assetUrl } from '../kit/ui-art';
import { onSoundSettingChange, readSoundOn } from '../system/sound-setting';
import { MUSIC_MOODS, musicPath, type MusicMood } from './music';

/** Under the UI cues and the read-aloud voice. */
const MUSIC_VOLUME = 0.32;
/** Share of the volume left while a line is read aloud. */
const DUCKED = 0.3;
const FADE_S = 1.2;
/** A screen giving way to another keeps the music this long, so the next screen's mood can take over without a gap. */
const RELEASE_GRACE_MS = 400;

const bags = new Map<MusicMood, string[]>();
const lastPlayed = new Map<MusicMood, string>();

/**
 * Next track of `mood`: every track of the mood once, in a shuffled order, before any repeats; the
 * first of a new round is never the one just played.
 */
export function nextTrack(mood: MusicMood, random: () => number = Math.random): string {
  let bag = bags.get(mood);
  if (!bag || bag.length === 0) {
    bag = [...MUSIC_MOODS[mood]];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [bag[i], bag[j]] = [bag[j] as string, bag[i] as string];
    }
    const previous = lastPlayed.get(mood);
    if (bag.length > 1 && bag[bag.length - 1] === previous) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1] as string, bag[0] as string];
    bags.set(mood, bag);
  }
  const track = bag.pop() as string;
  lastPlayed.set(mood, track);
  return track;
}

export interface MusicScene {
  /** Region the child walks about (content/world/regions.json id). */
  region: string;
  /** A quest is under way: at least one of its steps done, and it is not finished. */
  questStarted: boolean;
  /** A learning step covers the game. */
  learning: boolean;
  /** The quest-complete screens are up. */
  finished: boolean;
}

/** The mood of the play screen: winning, then thinking, then the quest's adventure, else the region's walk. */
export function playMood(scene: MusicScene, regionMusic: Readonly<Record<string, MusicMood>>): MusicMood {
  if (scene.finished) return 'win';
  if (scene.learning) return 'puzzle';
  if (scene.questStarted) return 'quest';
  return regionMusic[scene.region] ?? 'forest';
}

/** What the music is doing, for E2E checks (read-only). */
export interface MiuMusicStats {
  /** Mood the screens ask for (null: silence). */
  mood: MusicMood | null;
  /** Track started last, and whether the browser is playing it. */
  track: string | null;
  playing: boolean;
  /** Tracks started since the page loaded. */
  started: number;
}

declare global {
  interface Window {
    __miuMusic?: MiuMusicStats;
  }
}

const stats: MiuMusicStats = { mood: null, track: null, playing: false, started: 0 };

interface Playing {
  mood: MusicMood;
  audio: HTMLAudioElement;
  gain: GainNode;
}

let context: AudioContext | null = null;
let master: GainNode | null = null;
let wanted: MusicMood | null = null;
let playing: Playing | null = null;
let held = 0;
let ducked = 0;
let releaseTimer: number | undefined;
let owner = 0;
let listening = false;

function audioContext(): AudioContext | null {
  if (context) return context;
  const Ctor = typeof window === 'undefined' ? undefined : window.AudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
    master = context.createGain();
    master.gain.value = MUSIC_VOLUME;
    master.connect(context.destination);
  } catch {
    context = null;
  }
  return context;
}

/** Whether music should be heard now (a hidden tab only pauses it, see `sync`). */
function audible(): boolean {
  return wanted !== null && held === 0 && readSoundOn();
}

function fadeTo(gain: GainNode, value: number, ctx: AudioContext): void {
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(value, now + FADE_S);
}

function stopPlaying(ctx: AudioContext): void {
  const old = playing;
  if (!old) return;
  playing = null;
  stats.playing = false;
  fadeTo(old.gain, 0, ctx);
  window.setTimeout(() => {
    old.audio.pause();
    old.audio.removeAttribute('src');
    old.gain.disconnect();
  }, FADE_S * 1000 + 50);
}

function startTrack(mood: MusicMood, ctx: AudioContext): void {
  const out = master;
  if (!out) return;
  const track = nextTrack(mood);
  const audio = new Audio(assetUrl(musicPath(track)));
  stats.track = track;
  stats.started += 1;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  ctx.createMediaElementSource(audio).connect(gain);
  gain.connect(out);
  const entry: Playing = { mood, audio, gain };
  audio.addEventListener('playing', () => {
    if (playing === entry) stats.playing = true;
  });
  audio.addEventListener('ended', () => {
    if (playing !== entry) return;
    playing = null;
    stats.playing = false;
    gain.disconnect();
    sync();
  });
  playing = entry;
  fadeTo(gain, ducked > 0 ? DUCKED : 1, ctx);
  void audio.play()?.catch(() => undefined); // retried by the next tap (see `listen`)
}

/** Brings what plays in line with what is wanted. */
function sync(): void {
  stats.mood = wanted;
  const ctx = audioContext();
  if (!ctx) return;
  window.__miuMusic = stats;
  listen();
  if (document.visibilityState === 'hidden') {
    // Paused where it is, picked up again when the child comes back.
    playing?.audio.pause();
    stats.playing = false;
    return;
  }
  if (!audible()) {
    if (playing) stopPlaying(ctx);
    return;
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  const mood = wanted;
  if (!mood) return;
  if (playing?.mood === mood) {
    if (playing.audio.paused) void playing.audio.play()?.catch(() => undefined);
    fadeTo(playing.gain, ducked > 0 ? DUCKED : 1, ctx);
    return;
  }
  stopPlaying(ctx);
  startTrack(mood, ctx);
}

/** Browsers start audio only after a tap; tab and setting changes stop or resume it. */
function listen(): void {
  if (listening) return;
  listening = true;
  const unlock = (): void => {
    if (context?.state === 'suspended') void context.resume().catch(() => undefined);
    if (playing?.audio.paused && audible()) void playing.audio.play()?.catch(() => undefined);
  };
  for (const type of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(type, unlock, { capture: true });
  document.addEventListener('visibilitychange', sync);
  onSoundSettingChange(sync);
}

/**
 * Asks for `mood` until the returned release is called (last request wins). A release followed soon
 * by a request for the same mood keeps the track playing.
 */
export function requestMusic(mood: MusicMood | null): () => void {
  const token = ++owner;
  window.clearTimeout(releaseTimer);
  wanted = mood;
  sync();
  return () => {
    if (token !== owner) return;
    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(() => {
      if (token !== owner) return;
      wanted = null;
      sync();
    }, RELEASE_GRACE_MS);
  };
}

/** Plays `mood` while the calling component is mounted (`undefined`: leaves the music to someone else). */
export function useMusicMood(mood: MusicMood | null | undefined): void {
  useEffect(() => (mood === undefined ? undefined : requestMusic(mood)), [mood]);
}

/** Silences the music until the returned function is called (the microphone is recording). */
export function holdMusic(): () => void {
  held += 1;
  sync();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    held -= 1;
    sync();
  };
}

/** Lowers the music until the returned function is called (a line is read aloud). */
export function duckMusic(): () => void {
  ducked += 1;
  sync();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    ducked -= 1;
    sync();
  };
}
