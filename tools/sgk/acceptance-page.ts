// `pnpm sgk:acceptance`: the owner's acceptance page for the sample textbook quests, built straight
// from the quest files and the inventory (what the page shows is what the game shows). Book wording is
// marked with the same phrase cutting the content gate uses. Screenshots come from the textbook E2E
// (.data/sgk/review-shots; run `pnpm --filter @miu/web e2e --project setup --project sgk-mechanics`)
// and the vertical slice review shots, scaled down with macOS `sips` into `shots/` next to the page.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readQuestDefinitions } from '../../apps/server/src/content/content-catalog';
import { readCurriculum } from '../../apps/server/src/worksheet/curriculum-books';
import type { QuestDefinition, QuestStep } from '../../packages/schema/src/content';
import { checkCurriculumLinks, indexInventory, printedPhrases, stepMechanic } from '../content/curriculum-links';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(ROOT, 'plans/dattqh/260930-0846-sgk-lop2-game-content/nghiem-thu');
const SAMPLES = ['tv2-t01-b01', 'tv2-t01-b02', 'tv2-t05-b10', 'tv2-t10-b17', 'tv2-t14-b25', 'toan2-cd1-b01'];

/** What only a teacher or the owner can settle, from the writers' reports. */
const NOTES: Record<string, string[]> = {
  'tv2-t01-b01': ['Bài đọc hiểu số 2 và 3 là câu trả lời tự do trong sách; game cho chọn trong 3 đáp án, đáp án đúng là câu của sách, 2 đáp án sai do người viết đặt.'],
  'tv2-t01-b02': [
    'Bài xếp từ chỉ người / chỉ vật: sách không in đáp án, cách xếp (mẹ, bạn nhỏ là người; cánh đồng, nón, đèn bàn… là vật) do người viết chọn.',
    'Bài tìm từ chỉ hoạt động: ngoài ví dụ của sách, người viết thêm "giảng bài", "chải tóc" đọc từ tranh 3 và tranh 6.',
  ],
  'tv2-t05-b10': [
    'Câu hỏi xem lịch "Lớp mình có tiết Mĩ thuật vào thứ mấy?" là câu người viết đặt theo mẫu sách, không phải chữ SGK.',
    'Câu 4 (khó khăn khi không có thời khoá biểu), thẻ từ chỉ sự vật / hoạt động và câu mẫu "Giờ ra chơi, bạn gái nhảy dây ở sân trường." là đáp án người viết chọn.',
    'Sách in ví dụ "7 giờ 30 phút" nhưng đồng hồ tranh 1 chỉ 7 giờ; game giữ chữ sách và dùng tranh 3 (9 giờ 30) cho bước xem đồng hồ.',
  ],
  'tv2-t10-b17': [
    'Bước chọn nhiều ý (trời hạn hán, suối cạn, cỏ héo khô) cắt từ câu trả lời của sách; máy chưa tự so được dạng này.',
    'Bước xếp 8 dòng thơ là bước ôn thêm do người viết thêm; bước nói mới là bước tính cho yêu cầu "Học thuộc lòng".',
  ],
  'tv2-t14-b25': ['Bước chọn nhiều ý: 4 ý đúng cắt từ câu trả lời của sách, 2 ý sai là câu trích từ bài đọc do người viết chọn.'],
  'toan2-cd1-b01': [
    'Bài bình hoa: game thêm nhóm "Không thuộc nhóm nào" cho bông số 50 (sách hỏi 3 câu riêng).',
    'Bài lập số từ ba thẻ: game cho chọn trong 9 số, 3 số sai (33, 77, 375) do người viết đặt.',
    'Bảng số hiện theo từng dòng, các ô cách nhau bằng dấu "|".',
  ],
};

const MECHANIC_NAMES: Record<string, string> = {
  dialogue: 'Hội thoại', search: 'Tìm đồ', read: 'Đọc bài', riddle: 'Câu đố', speak: 'Nói', worksheet: 'Phiếu viết', reward: 'Phần thưởng', unlock: 'Mở bài sau',
  quiz: 'Trắc nghiệm', 'multi-select': 'Chọn nhiều', classify: 'Phân loại', 'fill-blank': 'Điền chỗ trống', sort: 'Sắp xếp', clock: 'Đồng hồ', calendar: 'Lịch', connect: 'Nối điểm', 'drag-drop': 'Kéo thả',
};
const GAME_ONLY = new Set(['dialogue', 'search', 'reward', 'unlock']);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** `{name}` shown as the child's character name placeholder. */
const withName = (html: string) => html.replace(/\{name\}/g, '<span class="who">tên bé</span>');

/** Escapes the text and marks every book phrase found in it verbatim. */
function marked(text: string, phrases: readonly string[]): string {
  const shown = text.replace(/\{\{[a-z0-9-]+\}\}/g, '▢');
  const spans: Array<[number, number]> = [];
  for (const phrase of [...phrases].sort((a, b) => b.length - a.length)) {
    const p = phrase.replace(/\?/g, '▢').trim();
    if (p.length < 2) continue;
    for (let at = shown.indexOf(p); at >= 0; at = shown.indexOf(p, at + 1)) {
      if (!spans.some(([s, e]) => at < e && at + p.length > s)) spans.push([at, at + p.length]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  let out = '';
  let last = 0;
  for (const [s, e] of spans) {
    out += withName(esc(shown.slice(last, s))) + `<mark class="book">${esc(shown.slice(s, e))}</mark>`;
    last = e;
  }
  return (out + withName(esc(shown.slice(last)))).replace(/\n/g, '<br>');
}

const { books } = readCurriculum(path.join(ROOT, 'content/curriculum'));
const inventory = indexInventory(books);
const allQuests = readQuestDefinitions(path.join(ROOT, 'content/quests'));
const links = checkCurriculumLinks(books, allQuests);
const lessonTitle = new Map(books.flatMap(({ units }) => units.flatMap((u) => u.lessons.map((l) => [l.id, l.title] as const))));

function stepCard(step: QuestStep, index: number, quest: Extract<QuestDefinition, { status: 'draft' }>): string {
  const mechanic = stepMechanic(step);
  const refs = 'curriculumRef' in step ? (step.curriculumRef ?? []) : [];
  const phrases = refs.flatMap((r) => { const item = inventory.get(r)?.item; return item ? printedPhrases(item.prompt) : []; });
  const m = (t: string) => marked(t, phrases);
  const parts: string[] = [];
  if (step.kind === 'dialogue') {
    parts.push(`<dl class="script">${step.lines.map((l) => `<div><dt>${esc(l.speaker)}</dt><dd>${withName(esc(l.text))}</dd></div>`).join('')}</dl>`);
    for (const c of step.choices) parts.push(`<p class="reply">Bé chọn: “${withName(esc(c.text))}”${c.reply ? ` → ${withName(esc(c.reply))}` : ''}</p>`);
  }
  if (step.kind === 'search') parts.push(`<p class="muted">Tìm trên bản đồ: ${step.targets.map(esc).join(', ')}</p>`);
  if ('prompt' in step) parts.push(`<p class="prompt">${m(step.prompt)}</p>`);
  if ('question' in step) parts.push(`<p class="prompt">${m(step.question)}</p>`);
  if (step.kind === 'read' && step.textRef) {
    const t = quest.texts[step.textRef];
    if (t) parts.push(`<details class="passage"><summary>Bài đọc: <mark class="book">${esc(t.title)}</mark>${t.author ? ` — ${esc(t.author)}` : ''}</summary><div class="passage-body"><mark class="book">${esc(t.body).replace(/\n/g, '<br>')}</mark>${t.glossary?.length ? `<dl class="glossary">${t.glossary.map((g) => `<div><dt><mark class="book">${esc(g.term)}</mark></dt><dd><mark class="book">${esc(g.meaning)}</mark></dd></div>`).join('')}</dl>` : ''}</div></details>`);
  }
  if (step.kind === 'challenge' && step.mechanic === 'fill-blank') parts.push(`<p class="template">${m(step.template)}</p>`);
  if ('choices' in step && step.kind !== 'dialogue') {
    const right = new Set(step.kind === 'read' || (step.kind === 'challenge' && step.mechanic === 'quiz') ? [step.answer.choice] : step.kind === 'challenge' && step.mechanic === 'multi-select' ? step.answer.choices : []);
    parts.push(`<ul class="chips">${step.choices.map((c) => `<li class="${right.has(c.id) ? 'right' : ''}">${m(c.text)}</li>`).join('')}</ul>`);
  }
  if (step.kind === 'challenge' && (step.mechanic === 'sort' || step.mechanic === 'classify')) {
    parts.push(`<ul class="chips">${step.items.map((i) => `<li>${m(i.label)}</li>`).join('')}</ul>`);
    if (step.mechanic === 'classify') parts.push(`<p class="muted">Nhóm: ${step.groups.map((g) => m(g.label)).join(' · ')}</p>`);
  }
  if (step.kind === 'speak' && step.hints.length) parts.push(`<ul class="hints">${step.hints.map((h) => `<li>${m(h)}</li>`).join('')}</ul>`);
  if (step.kind === 'worksheet' || step.kind === 'reward' || step.kind === 'unlock') parts.push(`<p>${withName(esc(step.text))}</p>`);
  if ('support' in step) {
    parts.push(`<p class="muted"><b>Gợi ý:</b> ${withName(esc(step.support.hint))} · <b>Đáp án:</b> ${withName(esc(step.support.answer.text))}</p>`);
    if (step.feedback) {
      parts.push(`<div class="feedback"><div><h5>Khi đúng</h5><ul>${step.feedback.right.map((l) => `<li>${withName(esc(l))}</li>`).join('')}</ul></div><div><h5>Khi sai (mỗi lần một câu khác)</h5><ul>${step.feedback.wrong.map((l) => `<li>${withName(esc(l))}</li>`).join('')}</ul></div></div>`);
    }
  }
  const refLine = refs.length ? `<p class="refs">Phủ bài tập SGK: ${refs.map((r) => { const it = inventory.get(r)?.item; return `<span title="${esc(it?.prompt ?? '')}">tr. ${it?.page ?? '?'} · ${esc(r.replace(/^(toan2|tv2)-t1-b\d+-/, ''))}</span>`; }).join(', ')}</p>` : '';
  const kindClass = GAME_ONLY.has(mechanic) ? 'story' : mechanic === 'worksheet' || mechanic === 'speak' ? 'soft' : 'play';
  return `<li class="step ${kindClass}"><div class="step-head"><span class="n">${index + 1}</span><span class="kind">${esc(MECHANIC_NAMES[mechanic] ?? mechanic)}</span><h4>${withName(esc(step.title))}</h4></div>${parts.join('')}${refLine}</li>`;
}

function questSection(quest: QuestDefinition): string {
  if (quest.status !== 'draft') return '';
  const lesson = quest.steps.flatMap((s) => ('curriculumRef' in s ? (s.curriculumRef ?? []) : [])).map((r) => inventory.get(r)?.lesson).find(Boolean) ?? '';
  const gaps = links.lessons.find((l) => l.lesson === lesson);
  const book = quest.id.startsWith('toan2') ? 'Toán 2' : 'Tiếng Việt 2';
  const where = quest.region === 'truong-hoc' ? `Trường học · chủ đề ${quest.chapter}` : `Khu rừng bí mật · chương ${quest.chapter}`;
  const sequence = quest.steps.map((s) => MECHANIC_NAMES[stepMechanic(s)] ?? stepMechanic(s));
  const notes = NOTES[quest.id] ?? [];
  return `<section class="quest" id="${quest.id}">
  <header class="quest-head">
    <p class="eyebrow">${book} · ${esc(lessonTitle.get(lesson) ?? lesson)}</p>
    <h3>${withName(esc(quest.title))}</h3>
    <p class="summary">${withName(esc(quest.summary))}</p>
    <dl class="facts">
      <div><dt>Ở đâu</dt><dd>${where}</dd></div>
      <div><dt>Nhân vật</dt><dd>${esc(quest.sevenQuestions.who)}</dd></div>
      <div><dt>Bài tập SGK</dt><dd>${gaps ? `${gaps.items} mục · ${gaps.inGame} trong game · ${gaps.onWorksheet} qua phiếu · thiếu ${gaps.missing.length}` : '—'}</dd></div>
      <div><dt>Thưởng</dt><dd>${quest.reward.xp} XP · ${quest.reward.coin} xu</dd></div>
    </dl>
    <p class="sequence">${sequence.map((s) => `<span>${esc(s)}</span>`).join('<i>›</i>')}</p>
    ${notes.length ? `<div class="notes"><h5>Cần người duyệt xem</h5><ul>${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
  </header>
  <ol class="steps">${quest.steps.map((s, i) => stepCard(s, i, quest)).join('')}</ol>
</section>`;
}

const SHOT_CAPTIONS: Array<[string, string]> = [
  ['mvp-04-dialogue', 'Hội thoại NPC: chân dung, bong bóng lời có tên, nút lớn'],
  ['mvp-09-riddle', 'Câu đố ở vật thể: NPC ra đề, đáp số khắc trên bảng gỗ'],
  ['mvp-08-sort', 'Qua suối: viên đá số xếp trên dòng suối, nối bằng mũi tên'],
  ['read', 'Đọc bài: bài đọc, ô Từ ngữ, nút nghe, câu hỏi'],
  ['classify', 'Phân loại: kéo thẻ vào nhóm hoặc chạm thẻ rồi chạm nhóm'],
  ['fill-blank', 'Điền chỗ trống: chạm ô trống rồi chọn'],
  ['multi-select', 'Chọn nhiều đáp án'],
  ['clock', 'Đồng hồ: đọc giờ, chỉnh giờ bằng nút + / −'],
  ['calendar', 'Lịch: chọn ngày hoặc thứ'],
  ['connect', 'Nối điểm: chạm hai điểm để vẽ đoạn, hiện độ dài'],
  ['sort-pictures', 'Xếp tranh theo thứ tự câu chuyện'],
  ['speak', 'Nói và nghe: câu hỏi, gợi ý của sách, nút nghe'],
  ['worksheet', 'Phiếu viết: nhắc bố mẹ in phiếu'],
  ['completion', 'Hoàn thành nhiệm vụ: phần thưởng do server tính'],
];
/** Where each screenshot comes from: the textbook E2E, or (prefix `mvp-`) the vertical slice review shots. */
const shotSource = (file: string): string =>
  file.startsWith('mvp-') ? path.join(ROOT, 'assets/generated/review/mvp', `${file.slice(4)}.png`) : path.join(ROOT, '.data/sgk/review-shots', `${file}.png`);
rmSync(path.join(OUT_DIR, 'shots'), { recursive: true, force: true });
mkdirSync(path.join(OUT_DIR, 'shots'), { recursive: true });
const shots = SHOT_CAPTIONS.map(([file, caption]) => {
  const source = shotSource(file);
  if (!existsSync(source)) throw new Error(`missing screenshot ${source}: run the textbook E2E first`);
  const out = path.join(OUT_DIR, 'shots', `${file}.jpg`);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '72', '--resampleWidth', '560', source, '--out', out], { stdio: 'ignore' });
  return `<figure><img src="shots/${file}.jpg" alt="${esc(caption)}" loading="lazy" width="560"><figcaption>${esc(caption)}</figcaption></figure>`;
}).join('');

/** The samples are drafts: written in full, not yet switched on in the game. */
type DraftQuest = Extract<QuestDefinition, { status: 'draft' }>;
const quests = SAMPLES.map((id) => allQuests.find((q) => q.id === id)).filter((q): q is DraftQuest => q?.status === 'draft');
const totals = { tv: books.find((b) => b.book.id === 'tv2-t1'), toan: books.find((b) => b.book.id === 'toan2-t1') };
const itemCount = (b: typeof totals.tv) => b?.units.flatMap((u) => u.lessons.flatMap((l) => l.sections.flatMap((s) => s.items))).length ?? 0;

const template = readFileSync(path.join(ROOT, 'tools/sgk/acceptance-template.html'), 'utf8');
const html = template
  .replace('{{TOC}}', quests.map((q) => `<li><a href="#${q.id}">${withName(esc(q.title))}</a> <span class="muted">${q.id.startsWith('toan2') ? 'Toán' : 'Tiếng Việt'} · ${q.steps.length} bước</span></li>`).join(''))
  .replace('{{QUESTS}}', quests.map(questSection).join('\n'))
  .replace('{{SHOTS}}', shots)
  .replace('{{TV_ITEMS}}', String(itemCount(totals.tv)))
  .replace('{{TOAN_ITEMS}}', String(itemCount(totals.toan)))
  .replace('{{SAMPLE_COUNT}}', String(quests.length));
writeFileSync(path.join(OUT_DIR, 'index.html'), html);
console.log(`${path.relative(ROOT, path.join(OUT_DIR, 'index.html'))}: ${quests.length} quests, ${SHOT_CAPTIONS.length} screenshots`);
