import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { FACEBOOK_ENTRY } from './marketing-credentials';
import { PostError, type PostRequest } from './post-common';
import { assertPageToken, postFacebook } from './post-facebook';

const PAGE = '1234567890123';
const TOKEN = 'fake-page-token-value';
const dir = mkdtempSync(path.join(os.tmpdir(), 'miu-facebook-'));
const clip = path.join(dir, 'clip.mp4');
writeFileSync(clip, 'fake video bytes');
const tokenFile = path.join(dir, 'access-tokens.json');
writeFileSync(tokenFile, JSON.stringify({ tokens: [{ service: FACEBOOK_ENTRY.service, used_by: FACEBOOK_ENTRY.usedBy, token: { page_id: PAGE, page_access_token: TOKEN } }] }));

const request: PostRequest = { clipFile: clip, title: 'Toán 2 Bài 7', description: 'Chơi bài này', privacy: 'public' };
const json = (body: unknown, init: ResponseInit = {}): Response => new Response(JSON.stringify(body), { status: 200, ...init });

function fakeGraph(answers: Array<Response | Error>): { fetch: typeof fetch; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const impl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const next = answers.shift();
    if (!next) throw new Error('unexpected request');
    if (next instanceof Error) throw next;
    return next;
  });
  return { fetch: impl as unknown as typeof fetch, calls };
}

const pageIdentity = (): Response => json({ id: PAGE, category: 'Video Game' });

describe('posting to the Facebook Page', () => {
  it('does nothing in a dry run: no network, no secret read', async () => {
    const { fetch: f, calls } = fakeGraph([]);
    const outcome = await postFacebook(request, { publish: false, fetch: f, tokenFile: path.join(dir, 'does-not-exist.json') });
    expect(calls).toHaveLength(0);
    expect(outcome.status).toBe('dry-run');
  });

  it('asks who the token is, then uploads the video to the configured Page and nowhere else', async () => {
    const { fetch: f, calls } = fakeGraph([pageIdentity(), json({ id: '98765' })]);
    const outcome = await postFacebook(request, { publish: true, fetch: f, tokenFile });
    expect(outcome).toEqual({ status: 'posted', id: '98765', url: `https://www.facebook.com/${PAGE}/videos/98765` });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toContain('/me?');
    expect(calls[0]?.url).toContain('fields=id%2Ccategory');
    expect(calls[1]?.url).toMatch(new RegExp(`^https://graph-video\\.facebook\\.com/v[\\d.]+/${PAGE}/videos$`));
    const form = calls[1]?.init?.body as FormData;
    expect(form.get('access_token')).toBe(TOKEN);
    expect(form.get('title')).toBe('Toán 2 Bài 7');
    expect(form.get('description')).toBe('Chơi bài này');
    expect(form.get('published')).toBe('true');
    expect(form.get('source')).toBeInstanceOf(Blob);
    // Only the video: no field that invites, messages or tags anyone.
    expect([...form.keys()].sort()).toEqual(['access_token', 'description', 'published', 'source', 'title']);
  });

  it('leaves the video unpublished (an admin-only draft) unless the post is public', async () => {
    for (const privacy of ['private', 'unlisted'] as const) {
      const { fetch: f, calls } = fakeGraph([pageIdentity(), json({ id: '1' })]);
      await postFacebook({ ...request, privacy }, { publish: true, fetch: f, tokenFile });
      expect((calls[1]?.init?.body as FormData).get('published')).toBe('false');
    }
  });

  it('refuses a token that belongs to another Page, and posts nothing', async () => {
    const { fetch: f, calls } = fakeGraph([json({ id: '999999999999', category: 'Video Game' })]);
    await expect(postFacebook(request, { publish: true, fetch: f, tokenFile })).rejects.toThrow(/belongs to the Page 999999999999, not the configured Page/);
    expect(calls).toHaveLength(1);
  });

  it('refuses a user token whether Facebook answers with an error or with the person\'s id, and posts nothing', async () => {
    const asked = fakeGraph([json({ error: { message: '(#100) Tried accessing nonexisting field (category) on node type (User)', code: 100 } }, { status: 400 })]);
    await expect(postFacebook(request, { publish: true, fetch: asked.fetch, tokenFile })).rejects.toThrow(/user token/);
    expect(asked.calls).toHaveLength(1);

    const person = fakeGraph([json({ id: '4444444444' })]);
    await expect(postFacebook(request, { publish: true, fetch: person.fetch, tokenFile })).rejects.toThrow(/not a Page's/);
    expect(person.calls).toHaveLength(1);

    const sameIdNoCategory = fakeGraph([json({ id: PAGE })]);
    await expect(postFacebook(request, { publish: true, fetch: sameIdNoCategory.fetch, tokenFile })).rejects.toThrow(/not a Page's/);
  });

  it('keeps the token out of every error message', async () => {
    const identity = fakeGraph([json({ error: { message: `Invalid OAuth access token ${TOKEN}` } }, { status: 401 })]);
    const first = await postFacebook(request, { publish: true, fetch: identity.fetch, tokenFile }).catch((e: unknown) => e);
    expect((first as PostError).message).not.toContain(TOKEN);

    const upload = fakeGraph([pageIdentity(), json({ error: { message: `token ${TOKEN} may not post` } }, { status: 403 })]);
    const second = await postFacebook(request, { publish: true, fetch: upload.fetch, tokenFile }).catch((e: unknown) => e);
    expect((second as PostError).message).toContain('did not take the video');
    expect((second as PostError).message).toContain('403');
    expect((second as PostError).message).not.toContain(TOKEN);
  });

  it('stops when the upload answers without a video id, or the network fails', async () => {
    await expect(postFacebook(request, { publish: true, fetch: fakeGraph([pageIdentity(), json({})]).fetch, tokenFile })).rejects.toThrow('without its id');
    await expect(postFacebook(request, { publish: true, fetch: fakeGraph([pageIdentity(), new Error('network down')]).fetch, tokenFile })).rejects.toThrow('network down');
  });

  it('checks a token on its own too', async () => {
    await expect(assertPageToken(PAGE, TOKEN, fakeGraph([pageIdentity()]).fetch)).resolves.toBeUndefined();
  });
});
