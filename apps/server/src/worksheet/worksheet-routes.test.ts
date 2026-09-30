import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_PIN, createTestApp, parentWithChild, type TestApp } from '../../test/test-app';

let app: TestApp;
// Only the regular weight is installed, as on a server where the bold file was never copied.
// Under a dot folder, like the default `.data/fonts`.
const fontRoot = mkdtempSync(path.join(tmpdir(), 'miu-fonts-'));
const fontDir = path.join(fontRoot, '.data', 'fonts');
mkdirSync(fontDir, { recursive: true });
writeFileSync(path.join(fontDir, 'chu-mau-tieu-hoc.woff2'), 'wOF2 test bytes');
beforeAll(async () => {
  app = await createTestApp(undefined, { handwritingFontDir: fontDir });
});
afterAll(async () => {
  await app.handle.close();
  rmSync(fontRoot, { recursive: true, force: true });
});

describe('worksheet routes', () => {
  it('lists and returns worksheets only behind the parent PIN', async () => {
    const { agent } = await parentWithChild(app, false);
    const list = await agent.get('/api/worksheets').expect(200);
    expect(list.body.worksheets.map((w: { lessonId: string }) => w.lessonId)).toEqual(['toan2-t1-b17', 'tv2-t1-b02', 'tv2-t1-b03']);
    expect(list.body.worksheets[0]).toMatchObject({ bookId: 'toan2-t1', blockCount: 1 });
    const tv = await agent.get('/api/worksheets?book=tv2-t1').expect(200);
    expect(tv.body.worksheets).toHaveLength(2);
    const sheet = await agent.get('/api/worksheets/tv2-t1-b02').expect(200);
    expect(sheet.body.blocks[0]).toMatchObject({ kind: 'dictation', curriculumRef: ['tv2-t1-b02-nghe-viet-1'] });

    await agent.post('/api/parent-gate/lock').expect(200);
    await agent.get('/api/worksheets').expect(403, { error: 'parent-gate-closed' });
    await agent.get('/api/worksheets/tv2-t1-b02').expect(403, { error: 'parent-gate-closed' });
    await agent.post('/api/parent-gate/unlock').send({ pin: TEST_PIN }).expect(200);
    await agent.get('/api/worksheets/tv2-t1-b02').expect(200);
  });

  it('answers 404 for an unknown lesson, 400 for an unknown book, 401 when signed out', async () => {
    const { agent } = await parentWithChild(app, false);
    await agent.get('/api/worksheets/toan2-t1-b18').expect(404, { error: 'worksheet-not-found' });
    await agent.get('/api/worksheets/Bài 1').expect(404, { error: 'worksheet-not-found' });
    await agent.get('/api/worksheets?book=toan3').expect(400, { error: 'invalid-book' });
    await app.agent().get('/api/worksheets').expect(401);
  });

  it('has no way to write', async () => {
    const { agent } = await parentWithChild(app, false);
    await agent.post('/api/worksheets/tv2-t1-b02').send({ text: 'bài viết' }).expect(404);
  });

  it('serves the installed handwriting font to a signed-in parent, and only the known font files', async () => {
    const { agent } = await parentWithChild(app, false);
    const font = await agent.get('/api/worksheets/fonts/chu-mau-tieu-hoc.woff2').expect(200);
    expect(font.headers['content-type']).toBe('font/woff2');
    expect(font.headers['cache-control']).toBe('private, max-age=86400');
    await agent.get('/api/worksheets/fonts/chu-mau-tieu-hoc-dam.woff2').expect(404, { error: 'font-not-found' });
    await agent.get('/api/worksheets/fonts/..%2F..%2Fpackage.json').expect(404);
    await agent.get('/api/worksheets/fonts/other.woff2').expect(404, { error: 'font-not-found' });
    await app.agent().get('/api/worksheets/fonts/chu-mau-tieu-hoc.woff2').expect(401);
  });
});
