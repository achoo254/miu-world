// On screen while the child rides: a fade (the cut of a long trip, the short trip of reduced motion, land
// still on its way) and a "Bỏ qua" button that takes her straight to the far stop. The stick and the
// buttons step aside: the ride drives her.
import { onLangModeChange, writeText } from '../../ui/i18n/i18n';
import './ride.css';

export interface RideOverlay {
  /** Shows the skip button and hides the controls (or the reverse). */
  setRiding(riding: boolean): void;
  /** 0 clear … 1 dark. */
  setFade(amount: number): void;
  dispose(): void;
}

export function createRideOverlay(host: HTMLElement, onSkip: () => void): RideOverlay {
  const fade = document.createElement('div');
  fade.className = 'ride-fade';
  fade.dataset.id = 'game-ride-fade';
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'ride-skip';
  skip.dataset.id = 'game-ride-skip';
  writeText(skip, 'game.skipRide');
  const stopLabel = onLangModeChange(() => writeText(skip, 'game.skipRide'));
  skip.hidden = true;
  // The game's drag-to-look listens on its root: a tap here only skips.
  const swallow = (event: Event): void => event.stopPropagation();
  skip.addEventListener('pointerdown', swallow);
  skip.addEventListener('click', (event) => {
    event.stopPropagation();
    onSkip();
  });
  host.append(fade, skip);
  let shown = -1;
  return {
    setRiding(riding) {
      skip.hidden = !riding;
      host.classList.toggle('is-riding', riding);
    },
    setFade(amount) {
      const next = Math.round(Math.min(1, Math.max(0, amount)) * 100) / 100;
      if (next === shown) return;
      shown = next;
      fade.style.opacity = String(next);
    },
    dispose() {
      stopLabel();
      host.classList.remove('is-riding');
      fade.remove();
      skip.remove();
    },
  };
}
