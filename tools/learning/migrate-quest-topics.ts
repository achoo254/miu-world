// One-off: names the topic (content/learning/topics) of each of the first 70 learning quests. Only adds `topic`
// after `lesson`; no wording, quest id or step id changes. Removed with the textbook inventory.
//   pnpm exec tsx tools/learning/migrate-quest-topics.ts
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CONTENT_DIR } from '../../apps/server/src/content/content-dir';

const MATH: Record<string, string> = {
  b01: 'so-den-100',
  b02: 'so-den-100',
  b03: 'thanh-phan-phep-tinh',
  b04: 'bai-toan-co-loi-van',
  b05: 'cong-tru-khong-nho',
  b06: 'so-den-100',
  b07: 'cong-tru-qua-10',
  b08: 'cong-tru-qua-10',
  b09: 'bai-toan-co-loi-van',
  b10: 'cong-tru-qua-10',
  b11: 'cong-tru-qua-10',
  b12: 'cong-tru-qua-10',
  b13: 'bai-toan-co-loi-van',
  b14: 'cong-tru-qua-10',
  b15: 'khoi-luong-dung-tich',
  b16: 'khoi-luong-dung-tich',
  b17: 'khoi-luong-dung-tich',
  b18: 'khoi-luong-dung-tich',
  b19: 'cong-tru-co-nho',
  b20: 'cong-tru-co-nho',
  b21: 'cong-tru-co-nho',
  b22: 'cong-tru-co-nho',
  b23: 'cong-tru-co-nho',
  b24: 'cong-tru-co-nho',
  b25: 'hinh-phang',
  b26: 'hinh-phang',
  b27: 'hinh-phang',
  b28: 'hinh-phang',
  b29: 'gio-va-lich',
  b30: 'gio-va-lich',
  b31: 'gio-va-lich',
  b32: 'gio-va-lich',
  b33: 'cong-tru-co-nho',
  b34: 'hinh-phang',
  b35: 'khoi-luong-dung-tich',
  b36: 'cong-tru-co-nho',
};

const VIETNAMESE: Record<string, string> = {
  'tv2-t01-b01': 'doc-truyen',
  'tv2-t01-b02': 'bang-chu-cai',
  'tv2-t02-b03': 'doc-truyen',
  'tv2-t02-b04': 'tu-chi-su-vat-hoat-dong',
  'tv2-t03-b05': 'doc-truyen',
  'tv2-t03-b06': 'tu-chi-dac-diem',
  'tv2-t04-b07': 'doc-truyen',
  'tv2-t04-b08': 'bang-chu-cai',
  'tv2-t05-b09': 'doc-tho',
  'tv2-t05-b10': 'doc-van-ban-thong-tin',
  'tv2-t06-b11': 'doc-tho',
  'tv2-t06-b12': 'doc-van-ban-thong-tin',
  'tv2-t07-b13': 'doc-tho',
  'tv2-t07-b14': 'dau-cau',
  'tv2-t08-b15': 'doc-van-ban-thong-tin',
  'tv2-t08-b16': 'tu-chi-dac-diem',
  'tv2-t09-on-giua-ki': 'doc-truyen',
  'tv2-t10-b17': 'doc-tho',
  'tv2-t10-b18': 'tu-ngu-tinh-cam',
  'tv2-t11-b19': 'doc-truyen',
  'tv2-t11-b20': 'tu-ngu-tinh-cam',
  'tv2-t12-b21': 'doc-tho',
  'tv2-t12-b22': 'cau',
  'tv2-t13-b23': 'doc-van-ban-thong-tin',
  'tv2-t13-b24': 'dau-cau',
  'tv2-t14-b25': 'doc-truyen',
  'tv2-t14-b26': 'tu-ngu-tinh-cam',
  'tv2-t15-b27': 'doc-tho',
  'tv2-t15-b28': 'dau-cau',
  'tv2-t16-b29': 'doc-tho',
  'tv2-t16-b30': 'tu-chi-su-vat-hoat-dong',
  'tv2-t17-b31': 'doc-truyen',
  'tv2-t17-b32': 'dau-cau',
  'tv2-t18-on-cuoi-ki': 'doc-truyen',
};

export function topicOfQuest(id: string): string | undefined {
  const math = /^toan2-cd\d+-(b\d+)$/.exec(id);
  return math?.[1] ? MATH[math[1]] : VIETNAMESE[id];
}

function main(): void {
  const dir = path.join(CONTENT_DIR, 'quests');
  let changed = 0;
  for (const name of readdirSync(dir).filter((f) => /^(toan2|tv2)-.*\.json$/.test(f))) {
    const file = path.join(dir, name);
    const quest = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    const topic = topicOfQuest(String(quest.id));
    if (!topic) throw new Error(`${name}: no topic in the map`);
    if (quest.topic === topic) continue;
    // Keep key order: `topic` right after `lesson`.
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(quest)) {
      if (k === 'topic') continue;
      out[k] = v;
      if (k === 'lesson') out.topic = topic;
    }
    if (!('topic' in out)) out.topic = topic;
    writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
    changed += 1;
  }
  console.log(`topic added to ${changed} quest(s)`);
}

main();
