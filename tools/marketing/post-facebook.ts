// Posts a clip to the Facebook Page "Miu World" through the Graph API with `fetch` alone (no Facebook SDK). The owner's
// rules for Facebook are strict, so the code keeps to them itself:
//   - it posts to `/{page-id}/videos` of the one Page whose id is configured, with that Page's own access token, never to a
//     profile, a group or any other id;
//   - before it posts it asks the token who it is (`/me`) and stops unless the answer is that Page: a user token answers with
//     the person's id (and has no Page category), so it is refused;
//   - it sends no invitation, no message and no tag, only the video.
// A dry run (the default) describes the post and touches neither the secret nor the network.
import { openAsBlob } from 'node:fs';
import path from 'node:path';
import { PostError, describeFailure, scrub, type PostEnvironment, type PostOutcome, type PostRequest } from './post-common';
import { FACEBOOK_ENTRY, FacebookSecret, readSecret, tokenFilePath } from './marketing-credentials';

/** Graph API version; Meta keeps each for about two years, so bump it when a post starts failing with a version error. */
export const GRAPH_VERSION = 'v23.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const GRAPH_VIDEO = `https://graph-video.facebook.com/${GRAPH_VERSION}`;

interface GraphIdentity {
  id?: unknown;
  category?: unknown;
  error?: { message?: unknown };
}

/**
 * Stops unless `token` is the access token of the Page `pageId`. A Page has an id and a category; a user token gets the
 * user's id, or an error for asking a person for a category, so either way it is not accepted.
 */
export async function assertPageToken(pageId: string, token: string, doFetch: typeof fetch): Promise<void> {
  const response = await doFetch(`${GRAPH}/me?${new URLSearchParams({ fields: 'id,category', access_token: token })}`);
  const body = (await response.json().catch(() => null)) as GraphIdentity | null;
  if (!response.ok || body === null || body.error !== undefined) {
    throw new PostError(
      `Facebook did not accept the token as a Page's: it is probably a user token. Use the Page access token of the Page ${pageId}. (${scrub(`HTTP ${response.status}`, [token])})`,
      response.status,
    );
  }
  if (typeof body.category !== 'string' || body.category === '') {
    throw new PostError(`the token is not a Page's (it has no Page category), so nothing was posted. Use the Page access token of the Page ${pageId}.`);
  }
  if (body.id !== pageId) {
    throw new PostError(`the token belongs to the Page ${String(body.id)}, not the configured Page ${pageId}, so nothing was posted`);
  }
}

export async function postFacebook(request: PostRequest, env: PostEnvironment): Promise<PostOutcome> {
  // Only `public` publishes; anything else leaves the video unpublished, visible to the Page's admins alone.
  const published = request.privacy === 'public';
  if (!env.publish) {
    return { status: 'dry-run', summary: `Facebook Page: would upload ${path.basename(request.clipFile)} as ${published ? 'published' : 'an unpublished draft'} "${request.title}" (nothing was sent)` };
  }
  const doFetch = env.fetch ?? fetch;
  const secret = readSecret(env.tokenFile ?? tokenFilePath(), FACEBOOK_ENTRY, FacebookSecret);
  await assertPageToken(secret.page_id, secret.page_access_token, doFetch);

  const form = new FormData();
  form.set('access_token', secret.page_access_token);
  form.set('title', request.title);
  form.set('description', request.description);
  form.set('published', String(published));
  form.set('source', await openAsBlob(request.clipFile, { type: 'video/mp4' }), path.basename(request.clipFile));
  const response = await doFetch(`${GRAPH_VIDEO}/${secret.page_id}/videos`, { method: 'POST', body: form });
  const secrets = [secret.page_access_token];
  if (!response.ok) throw new PostError(`Facebook did not take the video (${await describeFailure(response, secrets)})`, response.status);
  const video = (await response.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof video?.id !== 'string' || video.id === '') throw new PostError('Facebook took the video but answered without its id; check the Page before posting again');
  return { status: 'posted', id: video.id, url: `https://www.facebook.com/${secret.page_id}/videos/${video.id}` };
}
