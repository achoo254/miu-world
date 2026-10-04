// Display preferences (reduced motion for sensitive children, font size for readability),
// remembered per device like sound and voice settings.
export type FontSizeChoice = 'normal' | 'large';

const REDUCE_MOTION_KEY = 'miu.reduceMotion';
const FONT_SIZE_KEY = 'miu.fontSize';

const listeners = new Set<() => void>();

export function onDisplaySettingChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readReduceMotion(): boolean {
  try {
    const val = window.localStorage.getItem(REDUCE_MOTION_KEY);
    if (val !== null) return val === 'true';
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

export function writeReduceMotion(reduce: boolean): void {
  try {
    window.localStorage.setItem(REDUCE_MOTION_KEY, String(reduce));
  } catch {
    // Blocked storage
  }
  applyDisplaySettings();
  for (const listener of listeners) listener();
}

export function readFontSize(): FontSizeChoice {
  try {
    const val = window.localStorage.getItem(FONT_SIZE_KEY);
    return val === 'large' ? 'large' : 'normal';
  } catch {
    return 'normal';
  }
}

export function writeFontSize(size: FontSizeChoice): void {
  try {
    window.localStorage.setItem(FONT_SIZE_KEY, size);
  } catch {
    // Blocked storage
  }
  applyDisplaySettings();
  for (const listener of listeners) listener();
}

export function applyDisplaySettings(): void {
  if (typeof document === 'undefined') return;
  const reduce = readReduceMotion();
  const font = readFontSize();
  document.documentElement.dataset.reducedMotion = reduce ? 'true' : 'false';
  document.documentElement.dataset.fontSize = font;
}

// Auto-apply on load in browser environments
if (typeof document !== 'undefined') {
  applyDisplaySettings();
}
