import { afterAll, assert, beforeAll, describe, expect, it } from 'vitest';
import { MailClaimResponse, MailListResponse } from '@miu/schema/mail';
import { createTestApp, parentWithChild, type Agent, type TestApp } from '../../test/test-app';

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.handle.close();
});

async function playingChild(): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/players/${childId}/select`).expect(200);
  return { agent, childId };
}

describe('mail routes', () => {
  it('lists seeded mail and counts unread', async () => {
    const { agent } = await playingChild();
    const res = await agent.get('/api/mail').expect(200);
    const body = MailListResponse.parse(res.body);

    expect(body.mail.length).toBeGreaterThanOrEqual(1);
    expect(body.unreadCount).toBe(body.mail.length);
    const first = body.mail[0];
    assert(first);
    expect(first.isRead).toBe(false);
    expect(first.isClaimed).toBe(false);
  });

  it('marks mail as read and decreases unread count', async () => {
    const { agent } = await playingChild();
    const listBefore = (await agent.get('/api/mail').expect(200)).body as MailListResponse;
    const firstMail = listBefore.mail[0];
    assert(firstMail);

    await agent.post(`/api/mail/${firstMail.id}/read`).expect(200, { success: true });

    const listAfter = (await agent.get('/api/mail').expect(200)).body as MailListResponse;
    expect(listAfter.unreadCount).toBe(listBefore.unreadCount - 1);
    const updated = listAfter.mail.find((m) => m.id === firstMail.id);
    expect(updated?.isRead).toBe(true);
  });

  it('claims rewards idempotently and records coins in ledger', async () => {
    const { agent } = await playingChild();
    const listRes = (await agent.get('/api/mail').expect(200)).body as MailListResponse;
    const giftMail = listRes.mail.find((m) => (m.reward?.coins ?? 0) > 0) || listRes.mail[0];
    assert(giftMail);

    const claimRes = await agent.post(`/api/mail/${giftMail.id}/claim`).expect(200);
    const claimBody = MailClaimResponse.parse(claimRes.body);

    expect(claimBody.claimed).toBe(true);
    expect(claimBody.coins).toBe(giftMail.reward?.coins ?? 0);
    expect(claimBody.totalCoins).toBeGreaterThanOrEqual(giftMail.reward?.coins ?? 0);

    // Repeated claim is idempotent and does not award extra coins
    const repeatClaim = await agent.post(`/api/mail/${giftMail.id}/claim`).expect(200);
    const repeatBody = MailClaimResponse.parse(repeatClaim.body);
    expect(repeatBody.claimed).toBe(true);
    expect(repeatBody.totalCoins).toBe(claimBody.totalCoins);

    // Verify in mail list that it is marked claimed and read
    const afterList = (await agent.get('/api/mail').expect(200)).body as MailListResponse;
    const afterItem = afterList.mail.find((m) => m.id === giftMail.id);
    expect(afterItem?.isClaimed).toBe(true);
    expect(afterItem?.isRead).toBe(true);
  });

  it('returns 404 for non-existent mail id', async () => {
    const { agent } = await playingChild();
    await agent.post('/api/mail/00000000-0000-4000-8000-000000000000/read').expect(404);
    await agent.post('/api/mail/00000000-0000-4000-8000-000000000000/claim').expect(404);
  });

  it('prevents IDOR: child cannot read or claim another child mail', async () => {
    const childA = await playingChild();
    const childB = await playingChild();

    const listA = (await childA.agent.get('/api/mail').expect(200)).body as MailListResponse;
    const mailA = listA.mail[0];
    assert(mailA);

    // Child B tries to read Child A's mail
    await childB.agent.post(`/api/mail/${mailA.id}/read`).expect(404);
    // Child B tries to claim Child A's mail
    await childB.agent.post(`/api/mail/${mailA.id}/claim`).expect(404);
  });
});
