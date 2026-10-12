// The timeline of a lesson clip and the ffmpeg command that joins its parts: a title card, the camera flight (a numbered
// run of pictures) and an end card, cross-faded, over a music track. ffmpeg is a tool of the machine, not a dependency of
// the repo: `assertFfmpeg` stops with a clear message when it is missing.
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { MUSIC_MOODS, MUSIC_SOURCE_DIR } from '../../apps/web/src/ui/sound/music';
import { ASSETS_DIR, REPO_ROOT } from '../assets/asset-lib';

/** Where finished clips go: git-ignored, never committed. */
export const CLIP_DIR = path.join(REPO_ROOT, '.data/marketing/clips');

export const CLIP_SIZE = { width: 1080, height: 1920 } as const;
export const CLIP_FPS = 24;
/** Seconds each part is on screen; the cross-fades eat `FADE_S` from each join, so a clip runs 19.5 s (Shorts take up to 3 minutes; 15 to 30 s keeps people to the end). */
export const TITLE_S = 3.5;
export const FLIGHT_S = 13;
export const END_S = 4;
export const FADE_S = 0.5;

export const FLIGHT_FRAMES = FLIGHT_S * CLIP_FPS;
export const CLIP_SECONDS = TITLE_S + FLIGHT_S + END_S - 2 * FADE_S;

/** The calm tracks of the game's own pools (walking about a region, the menus): the clip's music, from the licensed Komiku pack. */
const CLIP_TRACKS: readonly string[] = [...MUSIC_MOODS.forest, ...MUSIC_MOODS.home];

/** The track of a lesson: the same one every time, and consecutive lessons seldom share one. */
export function pickTrack(lessonId: string): string {
  const hash = createHash('sha256').update(lessonId).digest();
  const track = CLIP_TRACKS[hash.readUInt32BE(0) % CLIP_TRACKS.length];
  if (!track) throw new Error('no clip track');
  return track;
}

export const trackFile = (track: string): string => path.join(ASSETS_DIR, MUSIC_SOURCE_DIR, `${track}.mp3`);

export interface EncodeInputs {
  titleCard: string;
  /** printf pattern of the flight pictures (`…/frame-%05d.jpg`), `FLIGHT_FRAMES` of them from 1. */
  flightPattern: string;
  endCard: string;
  music: string;
  output: string;
}

/** The arguments of the one ffmpeg run that makes the clip. */
export function ffmpegArgs(input: EncodeInputs): string[] {
  // Pictures are full-range JPEGs and PNGs: scale to the video (limited) range so every player shows the same colours.
  const normal = `fps=${CLIP_FPS},scale=${CLIP_SIZE.width}:${CLIP_SIZE.height}:out_range=tv,setsar=1,format=yuv420p`;
  const firstJoin = TITLE_S - FADE_S;
  const secondJoin = TITLE_S + FLIGHT_S - FADE_S - FADE_S;
  const graph = [
    `[0:v]${normal}[title]`,
    `[1:v]${normal}[flight]`,
    `[2:v]${normal}[end]`,
    `[title][flight]xfade=transition=fade:duration=${FADE_S}:offset=${firstJoin}[joined]`,
    `[joined][end]xfade=transition=fade:duration=${FADE_S}:offset=${secondJoin}[video]`,
    `[3:a]atrim=0:${CLIP_SECONDS},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1,afade=t=out:st=${CLIP_SECONDS - 2}:d=2[audio]`,
  ].join(';');
  return [
    '-y', '-loglevel', 'error',
    '-loop', '1', '-framerate', String(CLIP_FPS), '-t', String(TITLE_S), '-i', input.titleCard,
    '-framerate', String(CLIP_FPS), '-i', input.flightPattern,
    '-loop', '1', '-framerate', String(CLIP_FPS), '-t', String(END_S), '-i', input.endCard,
    '-i', input.music,
    '-filter_complex', graph,
    '-map', '[video]', '-map', '[audio]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart', '-t', String(CLIP_SECONDS),
    input.output,
  ];
}

/** Stops with an install hint when `ffmpeg` is not on the PATH. */
export function assertFfmpeg(): void {
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (probe.error || probe.status !== 0) {
    throw new Error('ffmpeg is not installed or not on the PATH: the clip needs it to join the pictures and the music (macOS: brew install ffmpeg)');
  }
}

export function encodeClip(input: EncodeInputs): void {
  assertFfmpeg();
  execFileSync('ffmpeg', ffmpegArgs(input), { stdio: ['ignore', 'inherit', 'inherit'] });
}
