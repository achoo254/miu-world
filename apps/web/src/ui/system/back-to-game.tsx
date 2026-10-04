// "Quay lại game": on every child screen outside the game (Home, map, region, backpack, shop pages, creator...)
// a floating button returns to the game she was playing (owner, 04/10/2026: no way back from those screens).
// The play screen records its address for the session; the button shows only when there is one.
import { Link, useLocation } from 'react-router';
import { T } from '../i18n/use-t';
import './back-to-game.css';

const KEY = 'miu.lastPlay';

/** Remembers the game address (path and query) of this browser session. */
export function rememberPlay(address: string): void {
  try {
    window.sessionStorage.setItem(KEY, address);
  } catch {
    // No storage: the button just stays away.
  }
}

export function lastPlay(): string | null {
  try {
    const saved = window.sessionStorage.getItem(KEY);
    return saved?.startsWith('/play') ? saved : null;
  } catch {
    return null;
  }
}

export function BackToGame() {
  const { pathname } = useLocation();
  const target = lastPlay();
  if (!target || pathname === '/play') return null;
  return (
    <Link className="back-to-game" data-id="back-to-game" to={target}>
      <span aria-hidden="true">🎮</span>
      <T k="common.backToGame" />
    </Link>
  );
}
