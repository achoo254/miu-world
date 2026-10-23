import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from '../../apps/web/vite.config';
import { leaksIn, lessonPageIssues, nativeBundleIssues, publicBookTitles, questSecrets, scanDist, scanLessonPages } from './scan-dist';

const quest = {
  id: 'q',
  steps: [
    { id: 'a', support: { guide: ['x'], hint: 'y', answer: { text: '5 viên kẹo', explanation: '8 − 3 = 5. Tặng đi 3 viên thì còn 5 viên.' } } },
    { id: 'b', support: { guide: ['x'], hint: 'y', answer: { text: 'Bạn Hải ly ở bên suối nhé', explanation: 'Lá thư viết Hải ly sẽ chỉ đường.' } } },
  ],
};

let dir: string | null = null;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = null;
});

describe('dist answer scan', () => {
  it('collects only distinctive answer-layer text', () => {
    expect(questSecrets([quest])).toEqual(['8 − 3 = 5. Tặng đi 3 viên thì còn 5 viên.', 'Bạn Hải ly ở bên suối nhé', 'Lá thư viết Hải ly sẽ chỉ đường.']);
  });

  it("collects a boss question's explanation, and its answer unless that is only one of its choices", () => {
    const turn = (answer: string) => ({
      id: 't',
      choices: [{ id: 'a', text: 'Các bạn nhỏ chơi rồng rắn lên mây' }, { id: 'b', text: 'Khu rừng yên tĩnh' }],
      support: { guide: ['x'], hint: 'y', answer: { text: answer, explanation: 'Câu kể một hoạt động đang diễn ra.' } },
    });
    const boss = { id: 'q', steps: [{ id: 'trum', kind: 'boss', turns: [turn('Các bạn nhỏ chơi rồng rắn lên mây')] }] };
    expect(questSecrets([boss])).toEqual(['Câu kể một hoạt động đang diễn ra.']);
    const own = { id: 'q', steps: [{ id: 'trum', kind: 'boss', turns: [turn('Chơi rồng rắn là một hoạt động')] }] };
    expect(questSecrets([own])).toEqual(['Chơi rồng rắn là một hoạt động', 'Câu kể một hoạt động đang diễn ra.']);
  });

  it('flags a bundle carrying answer text or a raw quest with support layers', () => {
    const secrets = questSecrets([quest]);
    expect(leaksIn('const a="Bạn Hải ly ở bên suối nhé"', secrets)).toHaveLength(1);
    expect(leaksIn('{"id":"q","support":{"guide":["x"]}}', secrets)).toEqual(['a quest object with its support layers']);
    expect(leaksIn('z.object({answer:StepAnswer.optional()})', secrets)).toEqual([]);
  });

  it('scans a dist folder and a quest folder', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'miu-dist-'));
    dir = root;
    mkdirSync(path.join(root, 'dist/assets'), { recursive: true });
    mkdirSync(path.join(root, 'quests'));
    writeFileSync(path.join(root, 'quests/q.json'), JSON.stringify(quest));
    writeFileSync(path.join(root, 'dist/assets/app.js'), 'console.log("hello")');
    expect(scanDist(path.join(root, 'dist'), path.join(root, 'quests'))).toEqual([]);
    writeFileSync(path.join(root, 'dist/assets/leak.js'), 'x="Lá thư viết Hải ly sẽ chỉ đường."');
    expect(scanDist(path.join(root, 'dist'), path.join(root, 'quests'))).toHaveLength(1);
  });
});

describe('app build contents', () => {
  it('lets the fonts in and reports any other game asset packed into the app', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'miu-dist-'));
    dir = root;
    expect(nativeBundleIssues(root)).toEqual([]);
    mkdirSync(path.join(root, 'game-assets/packs/font-nunito/5.3.0'), { recursive: true });
    writeFileSync(path.join(root, 'game-assets/packs/font-nunito/5.3.0/nunito-latin-400.woff2'), 'font');
    expect(nativeBundleIssues(root)).toEqual([]);
    mkdirSync(path.join(root, 'game-assets/generated/world/forest'), { recursive: true });
    writeFileSync(path.join(root, 'game-assets/generated/world/forest/horizon.bin'), 'map');
    writeFileSync(path.join(root, 'game-assets/manifest.json'), '{}');
    expect(nativeBundleIssues(root)).toHaveLength(2);
  });
});

/** A lesson page's head as the build writes it: the policy in its meta with its quotes escaped, the data block, one script file. */
const page = (extra = '', policy = CONTENT_SECURITY_POLICY.replaceAll("'", '&#39;')) =>
  `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"><script type="application/ld+json">{"@type":"LearningResource"}</script></head><body>${extra}<script type="module" crossorigin src="/assets/lesson-page-1.js"></script></body></html>`;

describe('lesson pages', () => {
  it('accept the policy of the game, a data block and a script of this site', () => {
    expect(lessonPageIssues(page())).toEqual([]);
  });

  it('flag a missing or different policy, an inline script and a script from elsewhere', () => {
    expect(lessonPageIssues('<html><head></head></html>')).toEqual(['no Content-Security-Policy meta']);
    expect(lessonPageIssues(page('', "default-src *"))).toEqual(["its Content-Security-Policy is not the game's"]);
    expect(lessonPageIssues(page('<script>alert(1)</script>'))).toEqual(['inline script: alert(1)']);
    expect(lessonPageIssues(page('<script type="module">import("/x")</script>'))).toHaveLength(1);
    expect(lessonPageIssues(page('<script src="https://evil.example/x.js"></script>'))).toEqual(['script from another origin: https://evil.example/x.js']);
    expect(lessonPageIssues(page('<script src="//evil.example/x.js"></script>'))).toHaveLength(1);
  });

  it('are checked page by page in a build, and a build without any is flagged', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'miu-dist-'));
    dir = root;
    expect(scanLessonPages(root)).toEqual(['no lesson page in dist/bai: the build did not write them']);
    mkdirSync(path.join(root, 'bai/toan-2-bai-1'), { recursive: true });
    mkdirSync(path.join(root, 'bai/toan-2-bai-2'), { recursive: true });
    writeFileSync(path.join(root, 'bai/toan-2-bai-1/index.html'), page());
    writeFileSync(path.join(root, 'bai/toan-2-bai-2/index.html'), page('<script>x()</script>'));
    expect(scanLessonPages(root)).toHaveLength(1);
    expect(scanLessonPages(root)[0]).toContain('toan-2-bai-2');
  });
});

describe('answers that are public titles', () => {
  it('are left out of the scan: the lesson pages print the books\' titles', () => {
    expect(publicBookTitles()).toContain('Bài 2. Ngày hôm qua đâu rồi?');
    const root = mkdtempSync(path.join(tmpdir(), 'miu-dist-'));
    dir = root;
    mkdirSync(path.join(root, 'dist'), { recursive: true });
    mkdirSync(path.join(root, 'quests'));
    const titled = { id: 'q', steps: [{ id: 'a', support: { guide: ['x'], hint: 'y', answer: { text: 'Ngày hôm qua đâu rồi?', explanation: 'Tên bài thơ của bài học này.' } } }] };
    writeFileSync(path.join(root, 'quests/q.json'), JSON.stringify(titled));
    writeFileSync(path.join(root, 'dist/lesson.html'), '<h1>Bài 2. Ngày hôm qua đâu rồi?</h1>');
    expect(scanDist(path.join(root, 'dist'), path.join(root, 'quests'))).toEqual([]);
    writeFileSync(path.join(root, 'dist/leak.xml'), '<note>Tên bài thơ của bài học này.</note>');
    expect(scanDist(path.join(root, 'dist'), path.join(root, 'quests'))).toHaveLength(1);
  });
});
