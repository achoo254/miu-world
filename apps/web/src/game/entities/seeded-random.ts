// Same seed, same sequence (mulberry32): a character behaves the same in every run and review shot.
export function seededRandom(key: string): () => number {
  let a = 0;
  for (let i = 0; i < key.length; i++) a = (Math.imul(a, 31) + key.charCodeAt(i)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
