// A report from end to end: a player reports another over the connection, it waits in the moderator's queue with
// what was around it, the moderator decides, and the reported player is told by mail (and locked out, renamed or
// let back in). Also: only moderators reach any of it, the reports safeguard, the 14-day retention, the daily
// digest and the emergency switch flipped from the moderation API.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ServerWsMessage } from '@miu/schema/multiplayer';
import type { ReportListResponse, ReportView } from '@miu/schema/moderation';
import type { MailListResponse } from '@miu/schema/mail';
import { FIXTURE_CONTENT, createTestApp, fakeParent, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import { CharacterEvents } from '../character/character-events';
import { characters, mail, playerReports, playerRestrictions, reportWitnesses } from '../db/schema';
import { MultiplayerHub, WS_CLOSE, type Connection } from '../multiplayer/multiplayer-hub';
import { dbMultiplayerStore } from '../multiplayer/multiplayer-store';
import { OnlineSwitch } from '../multiplayer/online-switch';
import { PlayerEvents } from '../player/player-events';
import { runModerationChores } from './moderation-jobs';
import { INCIDENT_RETENTION_MS, fileReport, pruneModeration, sendDigests } from './moderation-store';

const moderatorAccount = fakeParent();
let t: TestApp;
let hub: MultiplayerHub;
let moderator: Agent;
let moderatorChild: string;
const online = new OnlineSwitch();

beforeAll(async () => {
  const characterEvents = new CharacterEvents();
  const playerEvents = new PlayerEvents();
  t = await createTestApp(undefined, { moderatorAccounts: new Set([moderatorAccount.email.toLowerCase()]) }, undefined, FIXTURE_CONTENT, { characterEvents, playerEvents, onlineSwitch: online });
  hub = new MultiplayerHub(undefined, { store: dbMultiplayerStore(t.db), onlineSwitch: online });
  characterEvents.on((childId, character) => hub.characterSaved(childId, character));
  playerEvents.on((event) => hub.playerEvent(event));
  const signedIn = await parentWithChild(t, true, moderatorAccount);
  moderator = signedIn.agent;
  moderatorChild = signedIn.childId;
});

afterAll(async () => {
  await hub.close();
  await t.handle.close();
});

interface Online {
  agent: Agent;
  childId: string;
  conn: Connection;
  inbox: ServerWsMessage[];
  closed: number | null;
  say(message: object): void;
}

/** A signed-up player connected to the hub and standing in Trung tâm. */
async function onlinePlayer(at: [number, number, number] = [10, 5, 10]): Promise<Online> {
  const { agent, childId } = await parentWithChild(t);
  const inbox: ServerWsMessage[] = [];
  const player = { agent, childId, inbox, closed: null } as Online;
  const conn = await hub.connect(childId, { send: (m) => inbox.push(m), close: (code) => (player.closed = code) });
  if (!conn) throw new Error('not let in');
  player.conn = conn;
  player.say = (message) => conn.receive(JSON.stringify(message));
  player.say({ type: 'join', mapId: 'trung-tam', x: at[0], y: at[1], z: at[2], yaw: 0 });
  return player;
}

const publicIdOf = (p: Online): string => p.conn.publicId;

/** Waits for the hub's database writes (the report is filed in the background). */
async function until<T>(read: () => Promise<T | undefined> | T | undefined, ms = 3_000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const value = await read();
    if (value !== undefined) return value;
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function queue(status: 'open' | 'handled' = 'open'): Promise<ReportView[]> {
  return ((await moderator.get(`/api/moderation/reports?status=${status}`).expect(200)).body as ReportListResponse).reports;
}

const reportsAgainst = async (childId: string) => t.db.select().from(playerReports).where(eq(playerReports.reportedChildId, childId));
const mailOf = async (agent: Agent): Promise<MailListResponse['mail']> => ((await agent.get('/api/mail').expect(200)).body as MailListResponse).mail;

describe('a report from the player to the moderator and back', () => {
  it('queues with the reason, the map, the witnesses and the canned lines; a warning reaches the reported player by mail', async () => {
    const reporter = await onlinePlayer([10, 5, 10]);
    const reported = await onlinePlayer([12, 5, 10]);
    const witness = await onlinePlayer([20, 5, 20]);
    await t.db.update(characters).set({ name: 'Bông' }).where(eq(characters.childId, reported.childId));
    await t.db.update(characters).set({ name: 'Mây' }).where(eq(characters.childId, witness.childId));
    reported.say({ type: 'chat', text: 'Hẹn gặp lại nhé!', to: publicIdOf(reporter) });
    reporter.say({ type: 'report', id: publicIdOf(reported), reason: 'harassment' });
    await until(async () => ((await reportsAgainst(reported.childId)).length > 0 ? true : undefined));
    expect(reporter.inbox.find((m) => m.type === 'notice')).toMatchObject({ code: 'reported' });

    const report = (await queue()).find((r) => r.reported.displayName === 'Bông');
    expect(report).toMatchObject({ reason: 'harassment', mapId: 'trung-tam', status: 'open', reported: { openReports: 1, restriction: null }, incident: { witnesses: [{ displayName: 'Mây' }], lines: [{ by: 'reported', text: 'Hẹn gặp lại nhé!' }] } });
    expect(JSON.stringify(report)).not.toContain(reported.childId);
    if (!report) return;

    const decided = await moderator.post(`/api/moderation/reports/${report.id}/action`).send({ action: 'warn', note: 'lần đầu' }).expect(200);
    expect(decided.body.report).toMatchObject({ status: 'warned', note: 'lần đầu' });
    expect((await queue()).find((r) => r.id === report.id)).toBeUndefined();
    expect((await queue('handled')).find((r) => r.id === report.id)?.status).toBe('warned');
    const letters = await mailOf(reported.agent);
    expect(letters.find((m) => m.templateId === `moderation-warning:${report.id}`)).toMatchObject({ category: 'system', isRead: false, title: 'Nhắc nhở về cách chơi cùng mọi người' });
    // The same decision again leaves no second letter; the reporter gets none.
    await moderator.post(`/api/moderation/reports/${report.id}/action`).send({ action: 'warn' }).expect(200);
    expect((await mailOf(reported.agent)).filter((m) => m.templateId.startsWith('moderation-'))).toHaveLength(1);
    expect((await mailOf(reporter.agent)).filter((m) => m.templateId.startsWith('moderation-'))).toHaveLength(0);
  });

  it('a temporary lock closes her connection at once and keeps her out; dismissing lifts it and tells her', async () => {
    const reporter = await onlinePlayer();
    const reported = await onlinePlayer([11, 5, 10]);
    reporter.say({ type: 'report', id: publicIdOf(reported), reason: 'spam' });
    const [row] = await until(async () => {
      const rows = await reportsAgainst(reported.childId);
      return rows.length > 0 ? rows : undefined;
    });
    if (!row) throw new Error('no report');
    await moderator.post(`/api/moderation/reports/${row.id}/action`).send({ action: 'lock-temp' }).expect(400);
    const locked = await moderator.post(`/api/moderation/reports/${row.id}/action`).send({ action: 'lock-temp', lockDays: 3 }).expect(200);
    expect(locked.body.report.reported.restriction).toMatchObject({ kind: 'locked' });
    expect(reported.closed).toBe(WS_CLOSE.restricted);
    expect(await hub.connect(reported.childId, { send: () => {}, close: () => {} })).toBeNull();
    await reported.agent.post('/api/online-ticket').expect(403);
    const lockLetter = (await mailOf(reported.agent)).find((m) => m.templateId === `moderation-locked-temp:${row.id}`);
    expect(lockLetter?.body).toMatch(/tạm khóa việc chơi online của bạn tới \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    // Her account's data download shows the lock too.
    const exported = (await reported.agent.get('/api/account/export').expect(200)).body as { players: Array<{ onlineLock: unknown }> };
    expect(exported.players[0]?.onlineLock).toMatchObject({ kind: 'locked', until: expect.any(String) });

    await moderator.post(`/api/moderation/reports/${row.id}/action`).send({ action: 'dismiss' }).expect(200);
    await reported.agent.post('/api/online-ticket').expect(200);
    expect((await mailOf(reported.agent)).find((m) => m.templateId === `moderation-reopened:${row.id}`)?.title).toBe('Chơi online đã mở lại');
  });

  it('resets a reported name to another one of the list, and the others see it at once', async () => {
    const reporter = await onlinePlayer();
    const reported = await onlinePlayer([11, 5, 10]);
    const [before] = await t.db.select({ name: characters.name }).from(characters).where(eq(characters.childId, reported.childId));
    reporter.say({ type: 'report', id: publicIdOf(reported), reason: 'name' });
    const [row] = await until(async () => {
      const rows = await reportsAgainst(reported.childId);
      return rows.length > 0 ? rows : undefined;
    });
    if (!row) throw new Error('no report');
    await moderator.post(`/api/moderation/reports/${row.id}/action`).send({ action: 'rename' }).expect(200);
    const [after] = await t.db.select({ name: characters.name }).from(characters).where(eq(characters.childId, reported.childId));
    expect(after?.name).not.toBe(before?.name);
    expect(FIXTURE_CONTENT.characterNames.has(after?.name ?? '')).toBe(true);
    const seen = reporter.inbox.filter((m) => m.type === 'appearance').at(-1);
    expect(seen).toMatchObject({ id: publicIdOf(reported), appearance: { displayName: after?.name } });
    const letter = (await mailOf(reported.agent)).find((m) => m.templateId === `moderation-renamed:${row.id}`);
    expect(letter?.body).toContain(after?.name ?? '?');
  });
});

describe('only moderators', () => {
  it('everyone else gets 404 on every moderation route (401 without a session), and the switch does not move', async () => {
    const other = await parentWithChild(t);
    const id = '00000000-0000-4000-8000-000000000000';
    await other.agent.get('/api/moderation/me').expect(404);
    await other.agent.get('/api/moderation/reports').expect(404);
    await other.agent.post(`/api/moderation/reports/${id}/action`).send({ action: 'dismiss' }).expect(404);
    await other.agent.put('/api/moderation/online-mode').send({ mode: 'off' }).expect(404);
    await t.agent().get('/api/moderation/reports').expect(401);
    expect(online.mode).toBe('on');
    await moderator.get('/api/moderation/me').expect(200, { onlineMode: 'on' });
    await moderator.post(`/api/moderation/reports/${id}/action`).send({ action: 'dismiss' }).expect(404);
    await moderator.get('/api/moderation/reports?status=everything').expect(400);
  });
});

describe('the reports safeguard', () => {
  it('reports from three different players within a day hide the reported player until a moderator decides', async () => {
    const reported = await onlinePlayer([10, 5, 10]);
    const reporters = [await onlinePlayer([11, 5, 10]), await onlinePlayer([12, 5, 10]), await onlinePlayer([13, 5, 10])];
    // The same reporter again (after her cooldown) counts once.
    const [first, second, third] = reporters;
    if (!first || !second || !third) throw new Error('no reporters');
    await fileReport(t.db, { childId: first.childId, reportedChildId: reported.childId, reason: 'spam', mapId: null }, new Date());
    first.say({ type: 'report', id: publicIdOf(reported), reason: 'harassment' });
    second.say({ type: 'report', id: publicIdOf(reported), reason: 'harassment' });
    await until(async () => ((await reportsAgainst(reported.childId)).length >= 3 ? true : undefined));
    expect(reported.closed).toBeNull();
    third.say({ type: 'report', id: publicIdOf(reported), reason: 'harassment' });
    await until(() => (reported.closed !== null ? true : undefined));
    expect(reported.closed).toBe(WS_CLOSE.restricted);
    const [restriction] = await t.db.select().from(playerRestrictions).where(eq(playerRestrictions.childId, reported.childId));
    expect(restriction).toMatchObject({ kind: 'hidden', until: null });
    const view = (await queue()).find((r) => r.reported.openReports === 4);
    expect(view?.reported.restriction).toEqual({ kind: 'hidden', until: null });
  });

  it('reports older than a day, or already decided, do not count', async () => {
    const { childId: reported } = await parentWithChild(t);
    const others = await Promise.all([parentWithChild(t), parentWithChild(t), parentWithChild(t)]);
    const long = new Date(Date.now() - 25 * 60 * 60_000);
    await fileReport(t.db, { childId: others[0]?.childId ?? '', reportedChildId: reported, reason: 'spam', mapId: null }, long);
    await fileReport(t.db, { childId: others[1]?.childId ?? '', reportedChildId: reported, reason: 'spam', mapId: null }, new Date());
    const filed = await fileReport(t.db, { childId: others[2]?.childId ?? '', reportedChildId: reported, reason: 'spam', mapId: null }, new Date());
    expect(filed.hidden).toBe(false);
  });
});

describe('retention and the daily digest', () => {
  it('deletes incident logs after 14 days and run-out locks, keeping the report itself', async () => {
    const a = await parentWithChild(t);
    const b = await parentWithChild(t);
    const c = await parentWithChild(t);
    const then = new Date();
    const filed = await fileReport(t.db, { childId: a.childId, reportedChildId: b.childId, reason: 'other', mapId: 'trung-tam', incident: { witnesses: [c.childId], lines: [{ by: 'reported', text: 'Cố lên nào!', secondsBefore: 3 }] } }, then);
    await t.db.insert(playerRestrictions).values({ childId: c.childId, kind: 'locked', until: new Date(then.getTime() + 60_000) }).onConflictDoNothing();
    await pruneModeration(t.db, new Date(then.getTime() + INCIDENT_RETENTION_MS - 60_000));
    const linesOf = async () => (await t.db.select({ lines: playerReports.incidentLines }).from(playerReports).where(eq(playerReports.id, filed.id)))[0]?.lines;
    expect(await linesOf()).toEqual([{ by: 'reported', text: 'Cố lên nào!', secondsBefore: 3 }]);
    expect(await t.db.select().from(reportWitnesses).where(eq(reportWitnesses.reportId, filed.id))).toHaveLength(1);
    expect(await t.db.select().from(playerRestrictions).where(eq(playerRestrictions.childId, c.childId))).toHaveLength(0);
    await pruneModeration(t.db, new Date(then.getTime() + INCIDENT_RETENTION_MS + 60_000));
    expect(await linesOf()).toBeNull();
    expect(await t.db.select().from(reportWitnesses).where(eq(reportWitnesses.reportId, filed.id))).toHaveLength(0);
    expect(await t.db.select().from(playerReports).where(eq(playerReports.id, filed.id))).toHaveLength(1);
  });

  it('leaves the moderator one letter a day counting new reports, and none when nothing new came', async () => {
    const moderators = new Set([moderatorAccount.email.toLowerCase()]);
    const day = new Date('2026-10-20T02:00:00Z');
    const a = await parentWithChild(t);
    const b = await parentWithChild(t);
    await fileReport(t.db, { childId: a.childId, reportedChildId: b.childId, reason: 'spam', mapId: null }, new Date(day.getTime() - 60_000));
    expect(await sendDigests(t.db, moderators, day)).toBe(1);
    expect(await sendDigests(t.db, moderators, new Date(day.getTime() + 3_600_000))).toBe(0);
    expect(await sendDigests(t.db, moderators, new Date(day.getTime() + 24 * 3_600_000))).toBe(0);
    const [letter] = await t.db.select().from(mail).where(eq(mail.templateId, 'moderation-digest:2026-10-20'));
    expect(letter).toMatchObject({ childId: moderatorChild, params: { count: expect.stringMatching(/^[1-9]\d*$/), open: expect.stringMatching(/^\d+$/) } });
    const shown = (await mailOf(moderator)).find((m) => m.templateId === 'moderation-digest:2026-10-20');
    expect(shown?.title).toMatch(/^Báo cáo mới cần xem: \d+$/);
    expect(shown?.body).toContain('/kiem-duyet');
    // Not a moderator: nothing. The scheduled chores run the same steps without throwing.
    expect(await sendDigests(t.db, new Set(), day)).toBe(0);
    await runModerationChores({ db: t.db, moderators, clock: () => new Date(day.getTime() + 2 * 24 * 3_600_000) });
  });
});

describe('the emergency switch from the moderation screen', () => {
  it('turns online play off within the call and back on', async () => {
    const a = await onlinePlayer();
    await moderator.put('/api/moderation/online-mode').send({ mode: 'off' }).expect(200, { onlineMode: 'off' });
    expect(a.closed).toBe(WS_CLOSE.paused);
    await a.agent.post('/api/online-ticket').expect(503);
    await moderator.put('/api/moderation/online-mode').send({ mode: 'paused' }).expect(400);
    await moderator.put('/api/moderation/online-mode').send({ mode: 'interaction-off' }).expect(200, { onlineMode: 'interaction-off' });
    await a.agent.post('/api/online-ticket').expect(200);
    const b = await onlinePlayer();
    expect(b.inbox.find((m) => m.type === 'online-mode')).toEqual({ type: 'online-mode', mode: 'interaction-off' });
    await moderator.put('/api/moderation/online-mode').send({ mode: 'on' }).expect(200, { onlineMode: 'on' });
    expect(b.inbox.filter((m) => m.type === 'online-mode').at(-1)).toEqual({ type: 'online-mode', mode: 'on' });
  });
});
