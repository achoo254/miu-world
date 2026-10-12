import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { YOUTUBE_ENTRY } from './marketing-credentials';
import { PostError, type PostRequest } from './post-common';
import { postYoutube, refreshAccessToken, videoResource } from './post-youtube';

const dir = mkdtempSync(path.join(os.tmpdir(), 'miu-youtube-'));
const clip = path.join(dir, 'clip.mp4');
writeFileSync(clip, 'fake video bytes');
const tokenFile = path.join(dir, 'access-tokens.json');
const SECRETS = { client_id: 'fake-client-id', client_secret: 'fake-client-secret', refresh_token: 'fake-refresh-token' };
writeFileSync(tokenFile, JSON.stringify({ tokens: [{ service: YOUTUBE_ENTRY.service, used_by: YOUTUBE_ENTRY.usedBy, token: SECRETS }] }));

const request: PostRequest = { clipFile: clip, title: 'Toán 2 Bài 7: Phép cộng', description: 'Chơi bài này\n\n#Shorts #MiuWorld #Toan2', privacy: 'private' };

const json = (body: unknown, init: ResponseInit = {}): Response => new Response(JSON.stringify(body), { status: 200, ...init });
const SESSION = 'https://upload.example/session-1';

/** A fetch that plays YouTube's three answers in order and keeps what it was asked. */
function fakeYoutube(answers: Array<Response | Error>): { fetch: typeof fetch; calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    const next = answers.shift();
    if (!next) throw new Error('unexpected request');
    if (next instanceof Error) throw next;
    return next;
  });
  return { fetch: impl as unknown as typeof fetch, calls };
}

const happy = (): Array<Response> => [json({ access_token: 'fake-access-token' }), new Response(null, { status: 200, headers: { location: SESSION } }), json({ id: 'abc123' })];

describe('posting to YouTube', () => {
  it('does nothing in a dry run: no network, no secret read', async () => {
    const { fetch: f, calls } = fakeYoutube([]);
    const outcome = await postYoutube(request, { publish: false, fetch: f, tokenFile: path.join(dir, 'does-not-exist.json') });
    expect(calls).toHaveLength(0);
    expect(outcome.status).toBe('dry-run');
    expect(outcome.status === 'dry-run' && outcome.summary).toContain('private');
  });

  it('trades the refresh token for an access token, starts a resumable upload and sends the bytes', async () => {
    const { fetch: f, calls } = fakeYoutube(happy());
    const outcome = await postYoutube(request, { publish: true, fetch: f, tokenFile });
    expect(outcome).toEqual({ status: 'posted', id: 'abc123', url: 'https://www.youtube.com/shorts/abc123' });
    expect(calls.map((c) => c.url)).toEqual(['https://oauth2.googleapis.com/token', expect.stringContaining('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable'), SESSION]);
    const form = new URLSearchParams(String(calls[0]?.init.body));
    expect(Object.fromEntries(form)).toEqual({ ...SECRETS, grant_type: 'refresh_token' });
    const start = calls[1]?.init;
    expect((start?.headers as Record<string, string>).Authorization).toBe('Bearer fake-access-token');
    expect((start?.headers as Record<string, string>)['X-Upload-Content-Length']).toBe(String('fake video bytes'.length));
    expect(calls[2]?.init.method).toBe('PUT');
  });

  it('uploads as private unless told otherwise, and as made for kids with the Education category', async () => {
    const { fetch: f, calls } = fakeYoutube(happy());
    await postYoutube(request, { publish: true, fetch: f, tokenFile });
    const sent = JSON.parse(String(calls[1]?.init.body)) as { snippet: Record<string, unknown>; status: Record<string, unknown> };
    expect(sent.status).toEqual({ privacyStatus: 'private', selfDeclaredMadeForKids: true });
    expect(sent.snippet.categoryId).toBe('27');
    expect(sent.snippet.tags).toEqual(['Shorts', 'MiuWorld', 'Toan2']);
  });

  it('takes the privacy it is given', () => {
    expect((videoResource({ ...request, privacy: 'public' }, true, 'vi').status as { privacyStatus: string }).privacyStatus).toBe('public');
    expect((videoResource({ ...request, privacy: 'unlisted' }, true, 'vi').status as { privacyStatus: string }).privacyStatus).toBe('unlisted');
  });

  it('stops with a message that holds no secret when the refresh token is refused', async () => {
    const { fetch: f, calls } = fakeYoutube([json({ error: 'invalid_grant', error_description: `Token fake-refresh-token has been revoked` }, { status: 400, statusText: 'Bad Request' })]);
    const error = await postYoutube(request, { publish: true, fetch: f, tokenFile }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PostError);
    expect((error as PostError).status).toBe(400);
    expect((error as PostError).message).toContain('grant the app access again');
    expect((error as PostError).message).not.toContain('fake-refresh-token');
    expect(calls).toHaveLength(1);
  });

  it('stops when YouTube will not start the upload or does not take the video, quoting no secret', async () => {
    const refused = fakeYoutube([json({ access_token: 'fake-access-token' }), json({ error: { message: 'quota exceeded for fake-access-token' } }, { status: 403 })]);
    const first = await postYoutube(request, { publish: true, fetch: refused.fetch, tokenFile }).catch((e: unknown) => e);
    expect((first as PostError).message).toContain('would not start the upload');
    expect((first as PostError).message).toContain('403');
    expect((first as PostError).message).not.toContain('fake-access-token');

    const broken = fakeYoutube([json({ access_token: 'fake-access-token' }), new Response(null, { status: 200, headers: { location: SESSION } }), new Response('boom', { status: 500 })]);
    const second = await postYoutube(request, { publish: true, fetch: broken.fetch, tokenFile }).catch((e: unknown) => e);
    expect((second as PostError).message).toContain('did not take the video');
    expect((second as PostError).status).toBe(500);
  });

  it('stops when the answer is missing the pieces it needs', async () => {
    await expect(postYoutube(request, { publish: true, fetch: fakeYoutube([json({})]).fetch, tokenFile })).rejects.toThrow('without an access token');
    await expect(postYoutube(request, { publish: true, fetch: fakeYoutube([json({ access_token: 'a-token' }), new Response(null, { status: 200 })]).fetch, tokenFile })).rejects.toThrow('without an address');
    await expect(
      postYoutube(request, { publish: true, fetch: fakeYoutube([json({ access_token: 'a-token' }), new Response(null, { status: 200, headers: { location: SESSION } }), json({})]).fetch, tokenFile }),
    ).rejects.toThrow('without its id');
  });

  it('lets a network failure through as an error rather than swallowing it', async () => {
    await expect(postYoutube(request, { publish: true, fetch: fakeYoutube([new Error('network down')]).fetch, tokenFile })).rejects.toThrow('network down');
  });

  it('asks for the token file when it posts for real and none is named', async () => {
    const before = process.env.MIU_MARKETING_TOKEN_FILE;
    delete process.env.MIU_MARKETING_TOKEN_FILE;
    try {
      await expect(postYoutube(request, { publish: true, fetch: fakeYoutube([]).fetch })).rejects.toThrow('MIU_MARKETING_TOKEN_FILE');
    } finally {
      if (before !== undefined) process.env.MIU_MARKETING_TOKEN_FILE = before;
    }
  });

  it('refreshes with the standalone function too', async () => {
    const { fetch: f } = fakeYoutube([json({ access_token: 'fresh' })]);
    expect(await refreshAccessToken(SECRETS, f)).toBe('fresh');
  });
});
