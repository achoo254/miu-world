// Background music: which track plays in which scene. Every track is from Komiku's album "Poupi's
// Incredible Adventures" (CC0, OpenGameArt), downloaded as the `komiku-poupi` pack. `pnpm assets:music`
// turns its 320 kbps MP3s into 96 kbps AAC under assets/generated/music/ (a third of the download on a
// tablet). Plain data on purpose: vite.config and the asset tools import it.

export const MUSIC_SOURCE_DIR = 'packs/komiku-poupi/1.0/music';

/**
 * Track pools by scene. A scene plays its pool in a shuffled order (never the same track twice in a
 * row) and loops when it runs out.
 * - home: menus, the Home island, the map, the creator — warm and unhurried.
 * - forest / school: walking about a region before a quest starts, or after it is done.
 * - quest: a quest is under way (at least one step done) — adventure.
 * - puzzle: a learning step is open — light and focused, so the child can think.
 * - win: the quest-complete screens.
 */
export const MUSIC_MOODS = {
  home: ['poupis-theme', 'chillin-poupi', 'tea-with-granma', 'quiet-saturday', 'love-planet', 'tender-lover-poupi'],
  forest: ['time-for-the-walk-of-the-day', 'fetch-land', 'bicycle', 'good-fellow', 'the-horizon', 'the-beach', 'the-strawberry', 'night-in-a-seashell', 'sunset-on-the-beach'],
  school: ['the-weekly-fair', 'disco-cat', 'mr-paillettes-theme', 'princess-cheese-burger', 'poupi-on-a-scooter', 'the-adventure', 'cat-race-challenge', 'gang-of-alley-cats', 'first-dance'],
  quest: ['opening', 'super-poupi', 'treasure-finding', 'travel-to-the-horizon', 'paddle-boat', 'space-bicycle', 'space-good-fellow', 'poupi-great-adventures', 'time-attack', 'time-to-go-to-space', 'this-is-happening'],
  puzzle: ['intensive-puzzle-resolution', 'merfolk-music-box', 'a-maze-that-smells-fruits', 'the-zone', 'fetch-contest', 'time-flutes-place', 'tetros-arcade-cabinet'],
  win: ['win', 'fetch-dance', 'fetch-fever'],
} as const;
export type MusicMood = keyof typeof MUSIC_MOODS;

/** Every track, once (a track may serve several scenes). */
export const MUSIC_TRACKS: readonly string[] = [...new Set(Object.values(MUSIC_MOODS).flat())];

export function musicPath(track: string): string {
  return `generated/music/${track}.m4a`;
}

/** Every track file, for the build to ship. */
export const MUSIC_PATHS: readonly string[] = MUSIC_TRACKS.map(musicPath);
