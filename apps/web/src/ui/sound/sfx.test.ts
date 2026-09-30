import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeSoundOn } from '../system/sound-setting';
import { SOUND_CUES, SOUND_PATHS, soundPath } from './cues';
import { nextVariant, playCue } from './sfx';

afterEach(() => {
  vi.unstubAllGlobals();
  writeSoundOn(true);
});

describe('sound cues', () => {
  it('never plays the same variant of a cue twice in a row', () => {
    let previous = -1;
    for (let i = 0; i < 50; i++) {
      const pick = nextVariant('right', () => 0); // a stuck random source still alternates
      expect(pick).not.toBe(previous);
      previous = pick;
    }
  });

  it('plays the generated AAC file at a gentle volume, and nothing when sound is off', () => {
    const played: Array<{ src: string; volume: number }> = [];
    class FakeAudio {
      volume = 1;
      constructor(readonly src: string) {}
      play() {
        played.push({ src: this.src, volume: this.volume });
        return Promise.resolve();
      }
    }
    vi.stubGlobal('Audio', FakeAudio);
    playCue('wrong');
    expect(played).toHaveLength(1);
    expect(played[0]?.src).toMatch(/^\/game-assets\/generated\/sounds\/wrong-[1-3]\.m4a$/);
    expect(played[0]?.volume).toBeLessThan(0.5);
    writeSoundOn(false);
    playCue('right');
    expect(played).toHaveLength(1);
  });

  it('lists every generated file for the build', () => {
    const count = Object.values(SOUND_CUES).reduce((n, list) => n + list.length, 0);
    expect(SOUND_PATHS).toHaveLength(count);
    expect(SOUND_PATHS).toContain(soundPath('complete', 0));
  });
});
