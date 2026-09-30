// Lines that come back again and again (NPC chatter, encouragement, retry prompts) never repeat
// back-to-back: each pick shuffles through the whole pool before any line comes round again, and
// a new round never starts with the line that ended the last one.

export interface FreshPicker<T> {
  next(): T;
}

/** `random` is injectable so tests are deterministic. */
export function freshPicker<T>(pool: readonly T[], random: () => number = Math.random): FreshPicker<T> {
  if (pool.length === 0) throw new Error('freshPicker needs at least one item');
  let bag: T[] = [];
  let last: T | undefined;
  const refill = (): void => {
    bag = [...pool];
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [bag[i], bag[j]] = [bag[j] as T, bag[i] as T];
    }
    // The first line of the new round must not be the one just said.
    if (bag.length > 1 && bag[bag.length - 1] === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1] as T, bag[0] as T];
  };
  return {
    next() {
      if (bag.length === 0) refill();
      const item = bag.pop() as T;
      last = item;
      return item;
    },
  };
}
