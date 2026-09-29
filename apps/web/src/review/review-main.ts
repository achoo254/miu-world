// Final review page: renders the preview gallery, perf table vs budget and license table from the
// manifest, and collects the reviewer's keep / adjust / fallback decisions as copyable text.
import { ASSET_PREFIX } from '../game/asset-loader';
import palette from '../../../../content/palette.json';
import '../ui/fonts.css';
import './review.css';

interface ManifestJson {
  packs: Array<{ id: string; name: string; author: string; version: string; license: string; homepage: string }>;
  files: Array<{ path: string; pack: string }>;
  generated: Array<{ path: string; generator: string }>;
}

interface PerfRun {
  device?: string;
  cpuThrottle: number;
  quality: string;
  seconds: number;
  loadMs: number;
  fpsAvg: number;
  fpsMin1s: number;
  fpsP5Median: number;
  fpsP5Worst: number;
  drawCallsMax: number;
  trianglesMax: number;
  firstAreaRawBytes: number;
  firstAreaGzipBytes: number;
}

interface PerfReport {
  generatedAt: string;
  environment: { gpu: string; note: string; viewport: string; route: string };
  budget: { minFps: number; maxDrawCalls: number; maxTriangles: number; maxFirstAreaBytes: number };
  runs: PerfRun[];
}

const EXTRA_CLIPS = ['wave', 'jump', 'yawn', 'cheer'];
const CLIP_LABEL: Record<string, string> = { wave: 'Vẫy tay', jump: 'Nhảy', yawn: 'Ngáp', cheer: 'Vui mừng', walk: 'Đi', sprint: 'Chạy' };
const DECISIONS = [
  { id: 'palette', label: 'Bảng màu block pastel ấm', fallback: 'Quay lại bảng màu POC' },
  { id: 'accessories', label: 'Mũ, balo co theo biến thể', fallback: 'Giữ cỡ phụ kiện cũ' },
  { id: 'account', label: 'Luồng tài khoản phụ huynh, hồ sơ trẻ, cổng PIN', fallback: 'Đơn giản hơn (ghi rõ ở ghi chú)' },
  { id: 'play', label: 'Chơi thử trong app web (điều khiển, nhãn Vẹt)', fallback: 'Ghi vấn đề ở ghi chú' },
];
const UI_STEPS: Record<string, string> = {
  '01-login': 'Đăng nhập phụ huynh: chỉ nút Google',
  '02-set-pin': 'Sau khi đăng nhập Google lần đầu: đặt PIN phụ huynh',
  '03-consent': 'Đồng ý của phụ huynh (bản nháp)',
  '04-parent-area': 'Khu phụ huynh: tạo hồ sơ từ danh sách tên',
  '05-profiles': 'Bé chọn hồ sơ',
  '06-play-parrot': 'Vào game, đứng gần Vẹt: nhãn React',
  '07-parent-gate': 'Bé mở khu phụ huynh: cần PIN',
};
const STORAGE_KEY = 'miu-review-decisions';

/** Chibi variants under review (content/characters.json); the chosen one becomes `miu-cat`. */
const VARIANTS = [
  { id: 'miu-cat-chibi-a', label: 'Biến thể A · đầu 1.0×, thân và chân ngắn nhẹ' },
  { id: 'miu-cat-chibi-b', label: 'Biến thể B · đầu 1.15×, thân và chân ngắn vừa' },
  { id: 'miu-cat-chibi-c', label: 'Biến thể C · đầu 1.3×, thân và chân ngắn nhiều' },
];
const VARIANT_CHOICE = 'miu-variant';

/** Block palette shipped with the POC (before the warm pastel pass), for the before/after table. */
const POC_PALETTE: Record<string, string> = {"grass": "#7cc453", "leaf": "#4fa94a", "autumn": "#f09a3e", "dirt": "#a8703f", "stone": "#9aa3ad", "sand": "#f1d49a", "wood": "#a56d3b", "bark": "#7a5230", "birch": "#ece6d8", "path": "#bfb6a5", "water": "#4aa8e8", "moss": "#6f9a58"};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, children: Array<Node | string> = []): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

function byId(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} missing`);
  return node;
}

function figure(path: string, caption: string): HTMLElement {
  const img = el('img', { src: `${ASSET_PREFIX}${path}`, alt: caption, loading: 'lazy', decoding: 'async' });
  return el('figure', {}, [img, el('figcaption', { textContent: caption })]);
}

function badge(ok: boolean, text: string): HTMLElement {
  return el('span', { className: `badge ${ok ? 'ok' : 'bad'}`, textContent: text });
}

function renderGallery(generated: string[]): void {
  const reviewPaths = generated.filter((p) => p.startsWith('generated/review/') && p.endsWith('.png'));
  const name = (p: string): string => p.split('/').pop()?.replace('.png', '') ?? p;
  const angle = (p: string): number => Number(name(p).split('-').pop());
  const turns = reviewPaths.filter((x) => x.includes('/character/miu-cat-turn-')).sort((a, b) => angle(a) - angle(b));
  for (const p of turns) byId('character-turn').append(figure(p, `Góc ${angle(p)}°`));
  for (const clip of EXTRA_CLIPS) {
    const p = reviewPaths.find((x) => x.endsWith(`/miu-cat-anim-${clip}.png`));
    if (p) byId('character-extra').append(figure(p, CLIP_LABEL[clip] ?? clip));
  }
  for (const p of reviewPaths.filter((x) => x.includes('/miu-cat-anim-') && !EXTRA_CLIPS.some((c) => x.endsWith(`-${c}.png`)))) {
    byId('character-base').append(figure(p, name(p).replace('miu-cat-anim-', '')));
  }
  for (const v of VARIANTS) {
    const grid = el('div', { className: 'grid grid-4' });
    const variantTurns = reviewPaths.filter((x) => x.includes(`/character/${v.id}-turn-`)).sort((a, b) => angle(a) - angle(b));
    for (const p of variantTurns) grid.append(figure(p, `Góc ${angle(p)}°`));
    const camera = reviewPaths.find((x) => x.endsWith(`/${v.id}-gameplay-camera.png`));
    if (camera) grid.append(figure(camera, 'Góc camera khi chơi'));
    for (const clip of EXTRA_CLIPS) {
      const p = reviewPaths.find((x) => x.endsWith(`/${v.id}-anim-${clip}.png`));
      if (p) grid.append(figure(p, CLIP_LABEL[clip] ?? clip));
    }
    for (const p of reviewPaths.filter((x) => x.includes(`/accessories/${v.id}-outfit-`))) grid.append(figure(p, `Mũ + balo · góc ${angle(p)}°`));
    byId('variants').append(el('article', { className: 'variant' }, [el('h3', { textContent: v.label }), grid]));
  }
  for (const p of reviewPaths.filter((x) => x.includes('/review/ui/')).sort()) byId('account-flow').append(figure(p, UI_STEPS[name(p)] ?? name(p)));
  const accessoryCaption = (key: string): string => {
    if (key.startsWith('miu-outfit-turn-')) return `Trọn bộ · góc ${key.split('-').pop() ?? ''}°`;
    if (key.startsWith('miu-variant-')) return `Biến thể màu: ${key.replace('miu-variant-', '').replace('-', ' + ')}`;
    const clip = key.replace('miu-outfit-', '');
    return `Trọn bộ · ${CLIP_LABEL[clip] ?? clip}`;
  };
  for (const p of reviewPaths.filter((x) => x.includes('/accessories/') && !x.includes('-chibi-'))) byId('accessories').append(figure(p, accessoryCaption(name(p))));
  const mapCaption: Record<string, string> = { top: 'Nhìn từ trên', iso: 'Toàn cảnh', bridge: 'Cầu gỗ qua suối', tree: 'Cây cổ thụ', npc: 'Vẹt và lối đá' };
  for (const p of reviewPaths.filter((x) => x.includes('/map/'))) {
    const key = name(p).replace('forest-ch1-', '');
    byId('map').append(figure(p, mapCaption[key] ?? key));
  }
}

function renderPalette(): void {
  const table = byId('palette');
  table.append(el('thead', {}, [el('tr', {}, ['Màu', 'Trước (POC)', 'Sau (pastel ấm)'].map((h) => el('th', { textContent: h })))]));
  const body = el('tbody');
  const swatch = (hex: string | undefined): HTMLElement => {
    const chip = el('span', { className: 'swatch', title: hex ?? '' });
    chip.style.background = hex ?? 'transparent';
    return el('td', {}, [chip, hex ?? '—']);
  };
  for (const [name, hex] of Object.entries(palette as Record<string, string>)) {
    body.append(el('tr', {}, [el('td', { textContent: name }), swatch(POC_PALETTE[name]), swatch(hex)]));
  }
  table.append(body);
}

function renderPerf(report: PerfReport | null): void {
  const table = byId('perf');
  if (!report) {
    byId('perf-env').textContent = 'Chưa có perf.json — chạy `pnpm --filter @miu/web e2e --project perf`.';
    return;
  }
  const b = report.budget;
  byId('perf-env').textContent =
    `${report.environment.viewport}; GPU máy đo: ${report.environment.gpu}. ${report.environment.note} ` +
    `Lộ trình: ${report.environment.route}. Ngân sách: ≥${b.minFps} FPS, ≤${b.maxDrawCalls} draw call, ≤${b.maxTriangles / 1000}k tam giác, ≤${b.maxFirstAreaBytes / 1024 / 1024} MB tải đầu.`;
  const head = ['Thiết bị (viewport)', 'CPU chậm', 'Chất lượng', 'FPS TB', 'FPS thấp nhất (1s)', 'FPS p5 (trung vị / tệ nhất)', 'Draw call', 'Tam giác', 'Tải (ms)', 'Tải đầu (gzip)'];
  table.append(el('thead', {}, [el('tr', {}, head.map((h) => el('th', { textContent: h })))]));
  const body = el('tbody');
  for (const r of report.runs) {
    body.append(
      el('tr', {}, [
        el('td', { textContent: r.device ?? 'phone' }),
        el('td', { textContent: `${r.cpuThrottle}×` }),
        el('td', { textContent: r.quality }),
        el('td', {}, [badge(r.fpsAvg >= b.minFps, String(r.fpsAvg))]),
        el('td', { textContent: String(r.fpsMin1s) }),
        el('td', { textContent: `${r.fpsP5Median} / ${r.fpsP5Worst}` }),
        el('td', {}, [badge(r.drawCallsMax <= b.maxDrawCalls, String(r.drawCallsMax))]),
        el('td', {}, [badge(r.trianglesMax <= b.maxTriangles, `${(r.trianglesMax / 1000).toFixed(1)}k`)]),
        el('td', { textContent: String(r.loadMs) }),
        el('td', {}, [badge(r.firstAreaGzipBytes <= b.maxFirstAreaBytes, `${(r.firstAreaGzipBytes / 1024 / 1024).toFixed(2)} MB`)]),
      ]),
    );
  }
  table.append(body);
}

function renderLicenses(manifest: ManifestJson): void {
  const counts = new Map<string, number>();
  for (const f of manifest.files) counts.set(f.pack, (counts.get(f.pack) ?? 0) + 1);
  byId('license-summary').textContent =
    `${manifest.packs.length} pack, ${manifest.files.length} file tải về, ${manifest.generated.length} file sinh ra. ` +
    'Mọi file đều có hash trong manifest; CI chặn file lạ hoặc license ngoài CC0-1.0 / MIT / OFL-1.1.';
  const table = byId('licenses');
  table.append(el('thead', {}, [el('tr', {}, ['Pack', 'Tác giả', 'Phiên bản', 'License', 'Số file', 'Nguồn'].map((h) => el('th', { textContent: h })))]));
  const body = el('tbody');
  for (const p of manifest.packs) {
    body.append(
      el('tr', {}, [
        el('td', { textContent: p.name }),
        el('td', { textContent: p.author }),
        el('td', { textContent: p.version }),
        el('td', {}, [badge(true, p.license)]),
        el('td', { textContent: String(counts.get(p.id) ?? 0) }),
        el('td', {}, [el('a', { href: p.homepage, textContent: new URL(p.homepage).hostname, rel: 'noreferrer', target: '_blank' })]),
      ]),
    );
  }
  table.append(body);
}

function readSaved(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function renderDecisions(): void {
  const saved = readSaved();
  const container = byId('decisions');
  for (const d of DECISIONS) {
    const options = [
      ['keep', 'Giữ'],
      ['adjust', 'Chỉnh'],
      ['fallback', `Chuyển phương án dự phòng (${d.fallback})`],
    ];
    const fieldset = el('fieldset', {}, [el('legend', { textContent: d.label })]);
    for (const [value, text] of options) {
      const input = el('input', { type: 'radio', name: d.id, value: value ?? '', checked: saved[d.id] === value });
      input.dataset.id = `review-decision-${d.id}-${value ?? ''}`;
      input.addEventListener('change', () => {
        const next = { ...readSaved(), [d.id]: value ?? '' };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Private mode: the choice still lives in the form until the page closes.
        }
      });
      fieldset.append(el('label', {}, [input, text ?? '']));
    }
    container.append(el('div', { className: 'decision' }, [fieldset]));
  }
  const variantSet = el('fieldset', {}, [el('legend', { textContent: 'Chọn biến thể Miu (một lần)' })]);
  for (const [value, text] of [...VARIANTS.map((v) => [v.id, v.label]), ['adjust', 'Chỉnh thêm (ghi rõ ở ghi chú)']]) {
    const input = el('input', { type: 'radio', name: VARIANT_CHOICE, value: value ?? '', checked: saved[VARIANT_CHOICE] === value });
    input.dataset.id = `review-decision-variant-${value ?? ''}`;
    input.addEventListener('change', () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSaved(), [VARIANT_CHOICE]: value ?? '' }));
      } catch {
        // Private mode: the choice still lives in the form until the page closes.
      }
    });
    variantSet.append(el('label', {}, [input, text ?? '']));
  }
  container.prepend(el('div', { className: 'decision' }, [variantSet]));
  byId('copy-decision').addEventListener('click', () => {
    const variant = document.querySelector<HTMLInputElement>(`input[name="${VARIANT_CHOICE}"]:checked`);
    const lines = [
      `- Biến thể Miu: ${variant?.parentElement?.textContent ?? 'chưa chọn'}`,
      ...DECISIONS.map((d) => {
        const picked = document.querySelector<HTMLInputElement>(`input[name="${d.id}"]:checked`);
        return `- ${d.label}: ${picked?.parentElement?.textContent ?? 'chưa chọn'}`;
      }),
    ];
    const fps = (byId('ipad-fps') as HTMLInputElement).value.trim();
    lines.push(`- FPS iPad Gen 10 (mức Vừa): ${fps || 'chưa đo'}`);
    const note = (byId('decision-note') as HTMLTextAreaElement).value.trim();
    const text = `Kết quả duyệt đợt Foundation Miu World\n${lines.join('\n')}${note ? `\nGhi chú: ${note}` : ''}`;
    const status = byId('copy-status');
    navigator.clipboard.writeText(text).then(
      () => (status.textContent = 'Đã sao chép — dán vào cuộc trò chuyện với AI.'),
      () => (status.textContent = text),
    );
  });
}

async function main(): Promise<void> {
  renderDecisions();
  const manifest = (await (await fetch(`${ASSET_PREFIX}manifest.json`)).json()) as ManifestJson;
  const generated = manifest.generated.map((g) => g.path);
  renderGallery(generated);
  renderPalette();
  renderLicenses(manifest);
  const perfPath = generated.find((p) => p === 'generated/review/perf.json');
  const perf = perfPath ? ((await (await fetch(`${ASSET_PREFIX}${perfPath}`)).json()) as PerfReport) : null;
  renderPerf(perf);
}

main().catch((err: unknown) => {
  console.error(err);
  document.body.prepend(el('p', { textContent: `Lỗi tải trang duyệt: ${err instanceof Error ? err.message : String(err)}` }));
});
