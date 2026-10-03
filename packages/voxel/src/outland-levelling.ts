// Levelling a way's heights along its length (owner, 03/10/2026: "tất cả map phần đường đang hơi nhấp nhô, sửa
// lại hết thành mặt phẳng", the ways flat except where the land really climbs): the core maps' ways
// (tools/world/zone-map.ts) and the outer land's roads (outland-plan.ts) both run their ground through it.

/**
 * A way's ground heights along its length (whole blocks) with the small bumps and dips levelled: a run of at
 * most `maxRun` points one block above or below the same height on both sides takes that height, over and over,
 * as long as no point ends more than `maxShift` blocks from its own ground (a real hill or hollow stays). NaN
 * (water under a bridge) is kept and ends a run.
 */
export function levelProfile(ground: readonly number[], options: { maxRun: number; maxShift: number }): number[] {
  const out = [...ground];
  const runEnd = (i: number): number => {
    let j = i;
    while (j + 1 < out.length && out[j + 1] === out[i]) j++;
    return j;
  };
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 1; i < out.length; i = runEnd(i) + 1) {
      const j = runEnd(i);
      const [v, before, after] = [out[i] ?? NaN, out[i - 1] ?? NaN, out[j + 1] ?? NaN];
      if (before !== after || Math.abs(v - before) !== 1 || j - i + 1 > options.maxRun) continue;
      let within = true;
      for (let k = i; k <= j; k++) within &&= Math.abs(before - (ground[k] ?? NaN)) <= options.maxShift;
      if (!within) continue;
      for (let k = i; k <= j; k++) out[k] = before;
      changed = true;
    }
  }
  return out;
}
