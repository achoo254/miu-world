// The script of the static lesson and subject pages (written by vite-lesson-pages.ts), a bundle entry of its own so
// the page stays plain HTML with one same-origin script. It reports the page view for the usage numbers, and when
// the visitor goes to play it saves the quest they came for, so the game opens it once they are signed in.
import '../zod-config';
import '../ui/fonts.css';
import '../ui/tokens.css';
import '../ui/styles.css';
import './lesson-page.css';
import { trackPageView } from '../analytics/track';
import { playTarget, savePostLoginTarget } from '../post-login-target';

/** The "play this lesson" link of a pointer or key event, if that is what it hit. */
function playLink(event: Event): HTMLElement | null {
  return event.target instanceof Element ? event.target.closest<HTMLElement>('[data-play-quest]') : null;
}

function rememberQuest(event: Event): void {
  const { playRegion, playQuest } = playLink(event)?.dataset ?? {};
  if (playRegion && playQuest) savePostLoginTarget({ next: playTarget(playRegion, playQuest) });
}

trackPageView(window.location.pathname);
// A click or Enter follows the link; a middle click opens it in a new tab: both leave the page's quest behind.
document.addEventListener('click', rememberQuest);
document.addEventListener('auxclick', rememberQuest);
