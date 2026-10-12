import { describe, expect, it } from 'vitest';
import { MUSIC_MOODS } from '../../apps/web/src/ui/sound/music';
import { CLIP_FPS, CLIP_SECONDS, FADE_S, FLIGHT_FRAMES, FLIGHT_S, TITLE_S, END_S, ffmpegArgs, pickTrack, trackFile } from './clip-encode';
import { existsSync } from 'node:fs';

describe('the timeline', () => {
  it('makes a clip of 15 to 30 seconds, whose parts overlap by the fade at each join', () => {
    expect(CLIP_SECONDS).toBe(TITLE_S + FLIGHT_S + END_S - 2 * FADE_S);
    expect(CLIP_SECONDS).toBeGreaterThanOrEqual(15);
    expect(CLIP_SECONDS).toBeLessThanOrEqual(30);
    expect(FLIGHT_FRAMES).toBe(FLIGHT_S * CLIP_FPS);
  });
});

describe('the ffmpeg command', () => {
  const args = ffmpegArgs({ titleCard: '/w/title.png', flightPattern: '/w/flight/frame-%05d.jpg', endCard: '/w/end.png', music: '/m/track.mp3', output: '/o/clip.mp4' });
  const graph = args[args.indexOf('-filter_complex') + 1] ?? '';

  it('reads the two cards, the flight pictures and the music, and writes the one output', () => {
    expect(args.filter((a) => a === '-i')).toHaveLength(4);
    expect(args).toContain('/w/flight/frame-%05d.jpg');
    expect(args.at(-1)).toBe('/o/clip.mp4');
  });

  it('joins the parts where each one starts to end, so the fades land inside the picture', () => {
    expect(graph).toContain(`xfade=transition=fade:duration=${FADE_S}:offset=${TITLE_S - FADE_S}`);
    expect(graph).toContain(`xfade=transition=fade:duration=${FADE_S}:offset=${TITLE_S + FLIGHT_S - 2 * FADE_S}`);
  });

  it('cuts the music to the clip and fades it at both ends', () => {
    expect(graph).toContain(`atrim=0:${CLIP_SECONDS}`);
    expect(graph).toContain('afade=t=in');
    expect(graph).toContain(`afade=t=out:st=${CLIP_SECONDS - 2}`);
  });

  it('makes a standard h264 / aac file for Shorts and Reels', () => {
    expect(args).toEqual(expect.arrayContaining(['libx264', 'yuv420p', 'aac', '+faststart']));
  });
});

describe('the music', () => {
  it('is the same for a lesson every time, and always a track of the licensed pack that is on disk', () => {
    expect(pickTrack('toan2-t1-b07')).toBe(pickTrack('toan2-t1-b07'));
    const pool = new Set<string>([...MUSIC_MOODS.forest, ...MUSIC_MOODS.home]);
    for (const id of ['toan2-t1-b01', 'toan2-t1-b02', 'tv2-t1-b07', 'tv2-t1-on-cuoi-ki']) {
      expect(pool.has(pickTrack(id)), id).toBe(true);
      expect(existsSync(trackFile(pickTrack(id))), id).toBe(true);
    }
  });

  it('does not give every lesson the same track', () => {
    const tracks = new Set(Array.from({ length: 30 }, (_, i) => pickTrack(`toan2-t1-b${String(i + 1).padStart(2, '0')}`)));
    expect(tracks.size).toBeGreaterThan(5);
  });
});
