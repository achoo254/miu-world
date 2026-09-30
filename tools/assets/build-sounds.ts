// `pnpm assets:sounds`: the UI sound cues (apps/web/src/ui/sound/cues.ts) as mono AAC in
// assets/generated/sounds/, from the Kenney Interface Sounds pack (CC0). Safari on the iPad cannot play
// the pack's Ogg Vorbis. Needs ffmpeg; regenerates the manifest when done.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SOUND_CUES, SOUND_SOURCE_DIR, soundPath, type SoundCue } from '../../apps/web/src/ui/sound/cues';
import { ASSETS_DIR } from './asset-lib';
import { writeManifest } from './build-manifest';

function main(): void {
  const out = path.join(ASSETS_DIR, 'generated/sounds');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  let count = 0;
  for (const cue of Object.keys(SOUND_CUES) as SoundCue[]) {
    SOUND_CUES[cue].forEach((source, i) => {
      const input = path.join(ASSETS_DIR, SOUND_SOURCE_DIR, `${source}.ogg`);
      const target = path.join(ASSETS_DIR, soundPath(cue, i));
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-map_metadata', '-1', '-fflags', '+bitexact', '-c:a', 'aac', '-b:a', '64k', '-ac', '1', target]);
      count += 1;
    });
  }
  console.log(`${count} sounds in assets/generated/sounds`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
  await writeManifest();
}
