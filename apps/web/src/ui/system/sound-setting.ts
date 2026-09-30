// Sound on/off, remembered per device. Storage can be blocked (private mode, site data off): reads
// fall back to "on" and writes are skipped, so the setting never breaks the game.
const KEY = 'miu.sound';

export function readSoundOn(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function writeSoundOn(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Blocked storage: the choice lasts until the page closes.
  }
}
