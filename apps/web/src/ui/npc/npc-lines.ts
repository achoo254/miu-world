// What a character says when the child stops for a chat: a line for this moment (the player's own clock, the
// weather where she plays, how close they are), never the same line twice in a row for that character.
import { momentLines } from '@miu/quest/friendship';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import { timeOfDay, type NpcLine, type NpcWeather } from '@miu/schema/npc';

/** The weather a line may be about: a shower when it rains, snow on a snowy map, fine otherwise. */
export function weatherNow(raining: boolean, climate: 'mild' | 'snowy'): NpcWeather {
  if (raining && climate === 'mild') return 'rain';
  return climate === 'snowy' ? 'snow' : 'fine';
}

/** One picker per character and moment, kept for the visit: a pool goes round before a line comes back. */
const pickers = new Map<string, FreshPicker<NpcLine>>();

/** The character's next line for now; null when it has none for this moment (it then just says hello). */
export function nextLine(npcId: string, lines: readonly NpcLine[], moment: { now: Date; raining: boolean; climate: 'mild' | 'snowy'; hearts: number }): NpcLine | null {
  const time = timeOfDay(moment.now.getHours());
  const weather = weatherNow(moment.raining, moment.climate);
  const pool = momentLines(lines, { time, weather, hearts: moment.hearts });
  if (pool.length === 0) return null;
  const key = `${npcId}|${time}|${weather}|${moment.hearts}|${pool.length}`;
  let picker = pickers.get(key);
  if (!picker) {
    picker = freshPicker(pool);
    pickers.set(key, picker);
  }
  return picker.next();
}
