import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { leaksIn, questSecrets, scanDist } from './scan-dist';

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
