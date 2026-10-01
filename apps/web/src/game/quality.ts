// ?quality=low|mid|high — view distance, render resolution, shadows and the far horizon.
export type QualityLevel = 'low' | 'mid' | 'high';

export interface QualityPreset {
  level: QualityLevel;
  viewDistance: number;
  maxPixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  /** The coarse far horizon beyond the view distance (one draw call, ~2 triangles per 4 x 4 cell of the map). */
  horizon: boolean;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: { level: 'low', viewDistance: 40, maxPixelRatio: 1, antialias: false, shadows: false, horizon: false },
  mid: { level: 'mid', viewDistance: 64, maxPixelRatio: 1.5, antialias: true, shadows: false, horizon: true },
  high: { level: 'high', viewDistance: 110, maxPixelRatio: 2, antialias: true, shadows: true, horizon: true },
};

export function readQuality(search: string): QualityPreset {
  const value = new URLSearchParams(search).get('quality');
  return value === 'low' || value === 'high' ? QUALITY_PRESETS[value] : QUALITY_PRESETS.mid;
}
