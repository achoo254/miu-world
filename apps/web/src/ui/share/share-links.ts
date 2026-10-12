// The addresses the game hands out to share: an invite link, a lesson page to show a result off, the home page for
// the week's card. They carry a random invite code at most and never an id, a name or a number of hers; the `utm_*`
// labels say how the visitor came (`source`, `medium` and `campaign` as the usage numbers read them).
import { invitePath } from '@miu/schema/invites';
import { lessonPagePath } from '@miu/schema/lesson-pages';

/** How a shared link is read in the usage numbers. */
export type ShareCampaign = 'invite' | 'result' | 'weekly';

const attribution = (campaign: ShareCampaign): Record<string, string> => ({ utm_source: 'share', utm_medium: 'share', utm_campaign: campaign });

function withQuery(origin: string, path: string, query: Record<string, string>): string {
  const url = new URL(path, origin);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url.toString();
}

/** `https://miu.hoandat.com/moi/<code>?utm_…` */
export const inviteLink = (origin: string, code: string): string => withQuery(origin, invitePath(code), attribution('invite'));

/**
 * Where a shared result leads. A textbook lesson's result points at the lesson's public page (`slug`); `inviteCode`
 * adds `moi=<code>`, which the page keeps through sign-in so the visitor and the one who shared become friends. A
 * result with no lesson page (a story, a minigame) leads to the home page, or, with an invite, to the invite page.
 */
export function resultLink(origin: string, slug: string | null, inviteCode?: string): string {
  const query = attribution('result');
  if (slug) return withQuery(origin, lessonPagePath(slug), inviteCode ? { ...query, moi: inviteCode } : query);
  return withQuery(origin, inviteCode ? invitePath(inviteCode) : '/', query);
}

/** The home page, for the week's card. */
export const weeklyLink = (origin: string): string => withQuery(origin, '/', attribution('weekly'));
