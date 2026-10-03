// What carries the child on a map's ride (owner, 03/10/2026: the child really travels on the balloon, the bus,
// the train…): told apart by the stop's model, else by its name ("Khinh khí cầu tới…", "Đò về cổng"). Each kind
// travels its own way: through the air straight over everything, along the ways on the ground, or on the water.

export const RIDE_KINDS = ['balloon', 'cable-car', 'boat', 'train', 'bus'] as const;
export type RideKind = (typeof RIDE_KINDS)[number];

export interface RideProfile {
  /** `air`: straight over everything at a cruise height; `ground`: the ways first; `water`: rivers and sea first. */
  travel: 'air' | 'ground' | 'water';
  /** Top cruising speed (blocks a second): a longer trip shows its two ends and cuts the middle with a fade. */
  maxSpeed: number;
  /** Air rides: height over the highest ground under the line (blocks). */
  cruise: number;
}

export const RIDE_PROFILES: Readonly<Record<RideKind, RideProfile>> = {
  balloon: { travel: 'air', maxSpeed: 40, cruise: 16 },
  'cable-car': { travel: 'air', maxSpeed: 45, cruise: 10 },
  boat: { travel: 'water', maxSpeed: 40, cruise: 0 },
  train: { travel: 'ground', maxSpeed: 55, cruise: 0 },
  bus: { travel: 'ground', maxSpeed: 50, cruise: 0 },
};

/** The kind of a ride stop. A stop that names nothing known is a bus (the wide maps' default ride). */
export function rideKind(stop: { readonly model?: string; readonly name: string }): RideKind {
  const model = stop.model ?? '';
  const name = stop.name.trim().toLowerCase();
  if (/balloon/.test(model) || name.startsWith('khinh khí cầu')) return 'balloon';
  if (/cable/.test(model) || name.startsWith('cáp treo')) return 'cable-car';
  if (/boat|canoe|raft|ferry/.test(model) || /^(thuyền|đò|phà|ghe)(\s|$)/u.test(name)) return 'boat';
  if (/railway|train|tram/.test(model) || name.startsWith('tàu')) return 'train';
  return 'bus';
}
