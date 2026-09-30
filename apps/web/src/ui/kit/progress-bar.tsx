// Progress bar (loading, later XP): a real progressbar role, the fill scales instead of resizing.
import type { CSSProperties } from 'react';

/** Whole percent of `done` out of `total`; 0 before the total is known. */
export const progressPercent = (done: number, total: number): number => (total > 0 ? Math.round((Math.min(done, total) / total) * 100) : 0);

export function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const percent = progressPercent(done, total);
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <span className="progress-fill" style={{ '--progress': percent / 100 } as CSSProperties} />
    </div>
  );
}
