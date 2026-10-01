// `pnpm assets:music`: the background music (apps/web/src/ui/sound/music.ts) as 96 kbps stereo AAC in
// assets/generated/music/, from the Komiku "Poupi's Incredible Adventures" pack (CC0). The pack's MP3s are
// 320 kbps with cover art: re-encoding the audio alone cuts what a tablet downloads to a third. Needs
// ffmpeg; regenerates the manifest.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MUSIC_SOURCE_DIR, MUSIC_TRACKS, musicPath } from '../../apps/web/src/ui/sound/music';
import { ASSETS_DIR } from './asset-lib';
import { writeManifest } from './build-manifest';

function main(): void {
  const out = path.join(ASSETS_DIR, 'generated/music');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const track of MUSIC_TRACKS) {
    const input = path.join(ASSETS_DIR, MUSIC_SOURCE_DIR, `${track}.mp3`);
    const target = path.join(ASSETS_DIR, musicPath(track));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vn', '-map_metadata', '-1', '-fflags', '+bitexact', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', target]);
  }
  console.log(`${MUSIC_TRACKS.length} tracks in assets/generated/music`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
  await writeManifest();
}
