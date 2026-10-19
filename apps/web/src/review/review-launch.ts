// Launch-readiness parts of the review page: the table of contents, the render budget of every map
// (map-budget.json from the `budget` E2E project) and the DEVICE-01 form whose answers the person copies back.

interface BudgetRun {
  region: string;
  point: string;
  quality: string;
  calls: number;
  triangles: number;
  textures: number;
  geometries: number;
  worstYaw: number;
}

export interface BudgetReport {
  generatedAt: string;
  environment: { gpu: string; viewport: string; note: string; route: string };
  budget: { maxDrawCalls: number; maxTriangles: number };
  over: string[];
  runs: BudgetRun[];
}

const QUALITY_NAMES: Record<string, string> = { low: 'Thấp', mid: 'Vừa', high: 'Cao' };
const DEVICE_DRAFT_KEY = 'miu-review-device-01';

function cell(text: string, ok?: boolean): HTMLTableCellElement {
  const td = document.createElement('td');
  if (ok === undefined) {
    td.textContent = text;
  } else {
    const badge = document.createElement('span');
    badge.className = `badge ${ok ? 'ok' : 'bad'}`;
    badge.textContent = text;
    td.append(badge);
  }
  return td;
}

/** One link per section heading, in page order. */
export function renderToc(): void {
  const toc = document.getElementById('toc');
  if (!toc) return;
  for (const section of document.querySelectorAll<HTMLElement>('main > section[data-id]')) {
    const heading = section.querySelector('h2');
    if (!heading) continue;
    section.id ||= section.dataset.id ?? '';
    const link = document.createElement('a');
    link.href = `#${section.id}`;
    link.textContent = heading.textContent ?? section.id;
    toc.append(link);
  }
}

/** The highest draw calls of each map and point, worst first, against the budget. */
export function renderBudget(report: BudgetReport | null): void {
  const env = document.getElementById('budget-env');
  const table = document.getElementById('budget');
  if (!env || !table) return;
  if (!report) {
    env.textContent = 'Chưa có map-budget.json: chạy `pnpm --filter @miu/web e2e --project setup --project budget`.';
    return;
  }
  const b = report.budget;
  const overText = report.over.length ? `Vượt ngân sách: ${report.over.join(', ')}.` : 'Mọi điểm đo trong ngân sách.';
  env.textContent =
    `Đo ngày ${report.generatedAt.slice(0, 10)}; ${report.environment.viewport}; GPU máy đo: ${report.environment.gpu}. ${report.environment.note} ` +
    `Lộ trình: ${report.environment.route}. Ngân sách: ≤ ${b.maxDrawCalls} draw call, ≤ ${b.maxTriangles / 1000}k tam giác. ${overText}`;
  const head = document.createElement('tr');
  for (const h of ['Map', 'Điểm đo', 'Chất lượng', 'Draw call (cao nhất)', 'Hướng nặng nhất', 'Tam giác', 'Texture', 'Geometry']) {
    const th = document.createElement('th');
    th.textContent = h;
    head.append(th);
  }
  const body = document.createElement('tbody');
  table.append(document.createElement('thead'), body);
  table.querySelector('thead')?.append(head);
  for (const r of [...report.runs].sort((x, y) => y.calls - x.calls)) {
    const row = document.createElement('tr');
    row.append(
      cell(r.region),
      cell(r.point),
      cell(QUALITY_NAMES[r.quality] ?? r.quality),
      cell(String(r.calls), r.calls <= b.maxDrawCalls),
      cell(`${r.worstYaw}°`),
      cell(`${(r.triangles / 1000).toFixed(1)}k`, r.triangles <= b.maxTriangles),
      cell(String(r.textures)),
      cell(String(r.geometries)),
    );
    body.append(row);
  }
}

function readDraft(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_DRAFT_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function saveDraft(values: Record<string, string>): void {
  try {
    localStorage.setItem(DEVICE_DRAFT_KEY, JSON.stringify(values));
  } catch {
    // Private browsing: the form still works, it just is not remembered.
  }
}

/** The words of a field's label, without the options of a select inside it. */
function labelText(field: HTMLElement): string {
  const label = field.closest('label');
  if (!label) return field.getAttribute('name') ?? '';
  const words = [...label.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE || (n instanceof HTMLElement && !n.matches('input, select, textarea')));
  return words.map((n) => n.textContent ?? '').join(' ').replace(/\s+/g, ' ').trim();
}

/** The DEVICE-01 form keeps its draft on this device and copies a plain-text result for the chat. */
export function wireDeviceForm(): void {
  const form = document.getElementById('device-form');
  const copy = document.getElementById('device-copy');
  const status = document.getElementById('device-status');
  if (!(form instanceof HTMLFormElement) || !copy || !status) return;
  const fields = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name]')];
  const draft = readDraft();
  for (const field of fields) field.value = draft[field.name] ?? '';
  const values = (): Record<string, string> => Object.fromEntries(fields.map((f) => [f.name, f.value.trim()]));
  form.addEventListener('input', () => saveDraft(values()));
  copy.addEventListener('click', () => {
    const lines = fields.map((f) => `${labelText(f)}: ${f.value.trim() || '(trống)'}`);
    const text = [`DEVICE-01 · iPad Gen 10 · ${new Date().toLocaleString('vi-VN')}`, navigator.userAgent, ...lines].join('\n');
    navigator.clipboard
      .writeText(text)
      .then(() => (status.textContent = 'Đã sao chép. Dán vào chat để gửi lại.'))
      .catch(() => (status.textContent = 'Không sao chép được: chụp màn hình phần này và gửi lại.'));
  });
}
