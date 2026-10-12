// The script of the static lesson and subject pages (written by vite-lesson-pages.ts), a bundle entry of its own so
// the page stays plain HTML with one same-origin script. It reports the page view for the usage numbers, and when
// the visitor goes to play it saves the quest they came for, so the game opens it once they are signed in. A result
// shared with an invite (`?moi=<code>`) keeps the code along with it: the game uses it once the visitor is in.
import '../zod-config';
import '../ui/fonts.css';
import '../ui/tokens.css';
import '../ui/styles.css';
import './lesson-page.css';
import { INVITE_CODE } from '@miu/schema/invites';
import { trackPageView } from '../analytics/track';
import { playTarget, savePostLoginTarget } from '../post-login-target';

/** The "play this lesson" link of a pointer or key event, if that is what it hit. */
function playLink(event: Event): HTMLElement | null {
  return event.target instanceof Element ? event.target.closest<HTMLElement>('[data-play-quest]') : null;
}

/** The invite code of a shared result's address (`?moi=`), when it has the shape of one. */
function inviteCodeOfAddress(search: string): string | undefined {
  const code = new URLSearchParams(search).get('moi');
  return code !== null && INVITE_CODE.test(code) ? code : undefined;
}

function rememberQuest(event: Event): void {
  const { playRegion, playQuest } = playLink(event)?.dataset ?? {};
  if (!playRegion || !playQuest) return;
  const inviteCode = inviteCodeOfAddress(window.location.search);
  savePostLoginTarget({ next: playTarget(playRegion, playQuest), ...(inviteCode ? { inviteCode } : {}) });
}

trackPageView(window.location.pathname);
// A click or Enter follows the link; a middle click opens it in a new tab: both leave the page's quest behind.
document.addEventListener('click', rememberQuest);
document.addEventListener('auxclick', rememberQuest);
