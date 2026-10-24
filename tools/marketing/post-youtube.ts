// Posts a clip to the YouTube channel through the YouTube Data API v3 with `fetch` alone (no Google SDK): the refresh token
// of the owner's OAuth grant is traded for a short-lived access token, then the video goes up as one resumable upload. It
// reaches only the channel the owner granted `youtube.upload` for. A dry run (the default) describes the post and touches
// neither the secret nor the network. Posts are public by default (`DEFAULT_PRIVACY`), the owner's choice of 24/10/2026.
import { openAsBlob, statSync } from 'node:fs';
import path from 'node:path';
import { readChannelKit } from './channels';
import { PostError, describeFailure, type PostEnvironment, type PostOutcome, type PostRequest } from './post-common';
import { YOUTUBE_ENTRY, YoutubeSecret, readSecret, tokenFilePath } from './marketing-credentials';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
/** YouTube's category id for "Education". */
const EDUCATION_CATEGORY = '27';
const HASHTAG = /#[\p{L}\p{N}_]+/gu;

/** The metadata the upload starts with: title, description, `#hashtags` of the description as tags, privacy and the audience declaration. */
export function videoResource(request: PostRequest, madeForKids: boolean, language: string): Record<string, unknown> {
  return {
    snippet: {
      title: request.title,
      description: request.description,
      tags: [...new Set((request.description.match(HASHTAG) ?? []).map((tag) => tag.slice(1)))],
      categoryId: EDUCATION_CATEGORY,
      defaultLanguage: language,
      defaultAudioLanguage: language,
    },
    status: { privacyStatus: request.privacy, selfDeclaredMadeForKids: madeForKids },
  };
}

/** An access token for the granted refresh token. */
export async function refreshAccessToken(secret: YoutubeSecret, doFetch: typeof fetch): Promise<string> {
  const response = await doFetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: secret.client_id, client_secret: secret.client_secret, refresh_token: secret.refresh_token, grant_type: 'refresh_token' }),
  });
  const secrets = [secret.client_secret, secret.refresh_token];
  if (!response.ok) throw new PostError(`YouTube refused the refresh token (${await describeFailure(response, secrets)}); grant the app access again`, response.status);
  const body = (await response.json().catch(() => null)) as { access_token?: unknown } | null;
  if (typeof body?.access_token !== 'string' || body.access_token === '') throw new PostError('Google answered the token request without an access token');
  return body.access_token;
}

export async function postYoutube(request: PostRequest, env: PostEnvironment): Promise<PostOutcome> {
  const kit = readChannelKit().youtube;
  const resource = videoResource(request, kit.madeForKids, kit.language);
  if (!env.publish) {
    return { status: 'dry-run', summary: `YouTube: would upload ${path.basename(request.clipFile)} as ${request.privacy} "${request.title}" (nothing was sent)` };
  }
  const doFetch = env.fetch ?? fetch;
  const secret = readSecret(env.tokenFile ?? tokenFilePath(), YOUTUBE_ENTRY, YoutubeSecret);
  const accessToken = await refreshAccessToken(secret, doFetch);
  const secrets = [secret.client_secret, secret.refresh_token, accessToken];
  const size = statSync(request.clipFile).size;

  // The upload session: YouTube answers with the address to send the bytes to.
  const start = await doFetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(size),
      'X-Upload-Content-Type': 'video/mp4',
    },
    body: JSON.stringify(resource),
  });
  if (!start.ok) throw new PostError(`YouTube would not start the upload (${await describeFailure(start, secrets)})`, start.status);
  const session = start.headers.get('location');
  if (!session) throw new PostError('YouTube started the upload without an address to send the video to');

  const upload = await doFetch(session, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) }, body: await openAsBlob(request.clipFile, { type: 'video/mp4' }) });
  if (!upload.ok) throw new PostError(`YouTube did not take the video (${await describeFailure(upload, secrets)})`, upload.status);
  const video = (await upload.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof video?.id !== 'string' || video.id === '') throw new PostError('YouTube took the video but answered without its id; check the channel before posting again');
  return { status: 'posted', id: video.id, url: `https://www.youtube.com/shorts/${video.id}` };
}
