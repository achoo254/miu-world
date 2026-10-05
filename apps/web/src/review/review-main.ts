// Final review page: renders the preview gallery, perf table vs budget and license table from the
// manifest, and lists the review decisions TypeSafe Jev took on the owner's behalf.
import { MANIFEST_VERSION, manifestVersions, versioned } from '../asset-versions';
import { ASSET_PREFIX } from '../game/asset-loader';
import { ACCESSORIES } from '../game/content/accessories';
import palette from '../../../../content/palette.json';
import '../ui/fonts.css';
import './review.css';

interface ManifestJson {
  packs: Array<{ id: string; name: string; author: string; version: string; license: string; homepage: string }>;
  files: Array<{ path: string; pack: string; sha256?: string }>;
  generated: Array<{ path: string; generator: string; sha256?: string }>;
}

/** The owner's school mock frames (designs/truong-hoc/), bundled into the review build by Vite. */
const SCHOOL_MOCKS = import.meta.glob<string>('../../../../designs/truong-hoc/{khu,lop,nha}-*.png', { eager: true, query: '?url', import: 'default' });
const SCHOOL_CAPTIONS: Record<string, string> = {
  'khu-01-toan-canh': 'Toàn cảnh khu trường',
  'khu-02-cong-truong': 'Cổng trường (nhìn từ ngoài)',
  'khu-03-san-truong-loi-vao': 'Sân trường, lối vào chính',
  'khu-04-nha-da-nang-san-bong-ro': 'Nhà đa năng, sân bóng rổ',
  'khu-05-san-choi': 'Sân chơi',
  'khu-06-vuon-khoa-hoc': 'Vườn khoa học',
  'khu-07-duong-truoc-truong': 'Đường trước trường',
  'khu-08-goc-nhin-phia-sau': 'Góc nhìn phía sau',
  'lop-01-mat-truoc': 'Tòa nhà chính, mặt trước',
  'lop-02-goc-nhin-cheo': 'Góc nhìn chéo',
  'lop-03-mat-sau-hanh-lang': 'Mặt sau, hành lang',
  'lop-04-trong-lop-nhin-bang': 'Trong lớp, nhìn về bảng',
  'lop-05-trong-lop-goc-cheo': 'Trong lớp, góc chéo',
  'lop-06-hanh-lang-trong': 'Hành lang lớp học',
  'lop-07-cau-thang-tang-2': 'Cầu thang lên tầng 2',
  'nha-03-cheo-truoc-trai': 'Góc chéo trước trái',
  'nha-05-ben-phai-loi-hong': 'Bên phải, lối đi bên hông',
};

/** The owner's mocks of the world and its maps (designs/the-gioi/, designs/<map>/; docs/design-cac-map.md). */
const MAP_MOCKS = import.meta.glob<string>('../../../../designs/{the-gioi,lang-ven-song,cho-phien,nong-trai,khu-rung-bi-mat,nui-tuyet}/{a,b}-*.png', { eager: true, query: '?url', import: 'default' });
/** The frames of the owner's detail mocks (02/10/2026, designs/<folder>/{c,d}-*.png), set beside the same view in the game. */
const DETAIL_MOCKS = import.meta.glob<string>('../../../../designs/*/{c,d}-*.png', { eager: true, query: '?url', import: 'default' });
/** The eleven maps (owner, 01/10/2026: each ten times the area, alive like real life; 02/10/2026: Trung tâm, Núi tuyết, Đảo bí ẩn), their mock folders and preview group. */
const WORLD_MAPS: ReadonlyArray<{ map: string; name: string; mocks: readonly string[]; note: string }> = [
  { map: 'trung-tam', name: 'Trung tâm (nơi các bạn gặp nhau)', mocks: [], note: 'Map riêng ở giữa thế giới, theo tấm Trung tâm: quảng trường lát đá có đài phun tượng mèo, dãy cổng dịch chuyển sang mười map, cửa hàng, khu giao dịch, bảng nhiệm vụ, chòi chờ tổ đội, cầu và biển chỉ đường, khu sự kiện theo mùa, lâu đài làm phông; đông bạn nhỏ như người chơi online. Mỗi cặp: khung mock chi tiết bên trái, cùng góc trong game bên phải.' },
  { map: 'truong-hoc', name: 'Trường học', mocks: ['the-gioi/a-01-', 'the-gioi/b-01-', 'the-gioi/b-10-'], note: 'Trường như mock toàn cảnh, phố chính, quảng trường có cổng vòm sang 7 map và cổng về Trung tâm; lớp học, thư viện, phòng chức năng đi vào được.' },
  { map: 'lang-ven-song', name: 'Làng Ven Sông', mocks: ['lang-ven-song/a-', 'lang-ven-song/b-', 'the-gioi/b-04-', 'the-gioi/b-09-'], note: 'Theo các khung ngoài trời của tấm Làng: cổng làng, quảng trường có đài phun tượng mèo, chợ nhỏ, tháp chuông, cối xay giữa ruộng lúa, cầu đá, đường làng có nhà hai bên; hồ có bến tàu và hải đăng.' },
  { map: 'khu-rung-bi-mat', name: 'Khu rừng bí mật', mocks: ['khu-rung-bi-mat/a-', 'khu-rung-bi-mat/b-'], note: 'Góc chương 1 giữ nguyên; rừng xanh đậm, suối có cầu gỗ, vách đá có thác, lối mòn viền hoa.' },
  { map: 'cho-phien', name: 'Chợ phiên', mocks: ['cho-phien/a-', 'cho-phien/b-'], note: 'Theo tấm Chợ: quảng trường đài phun tượng mèo, cổng chợ, các gian theo loại hàng, nhà lồng chợ đi vào được; người bán ở mọi sạp, người mua đi giữa các gian.' },
  { map: 'nong-trai', name: 'Nông trại', mocks: ['nong-trai/a-', 'nong-trai/b-'], note: 'Theo tấm Nông trại: ruộng lúa vàng, chuồng đỏ, nhà kính và nhà kho đi vào được, vườn táo, ao cá, bảng nhiệm vụ.' },
  { map: 'xom-mai-am', name: 'Xóm Mái Ấm', mocks: [], note: 'Theo các khung nhà của tấm Làng: nhà dân có vườn, giếng có mái, vườn rau, chuồng; nội thất nhà dân và chuồng đi vào được.' },
  { map: 'thu-vien', name: 'Thư viện', mocks: [], note: 'Theo tấm Thư viện: tòa thư viện đi vào được (sảnh có quả địa cầu, phòng đọc, góc thiếu nhi, khu máy tính, phòng sách quý, ban công tầng 2), vườn, hồ, cầu đá.' },
  { map: 'lau-dai', name: 'Lâu đài', mocks: [], note: 'Theo tấm Lâu đài: tháp mái nhọn có cờ, cổng có lính gác, hào và cầu đá vòm, sân lát đá có đài phun; đại sảnh, phòng ăn, thư viện, phòng nghỉ, tháp canh, hầm ngục đi vào được.' },
  { map: 'nui-tuyet', name: 'Núi tuyết', mocks: ['nui-tuyet/b-'], note: 'Theo tấm Núi tuyết: làng nhà gỗ mái tuyết, cổng vào có cờ bông tuyết, khu trượt tuyết, cáp treo lên đỉnh núi có đài quan sát, hồ băng dưới thác, hang động băng pha lê phát sáng, trạm thám hiểm; cửa hàng đồ ấm, nhà nghỉ, trạm nhiệm vụ đi vào được.' },
  { map: 'dao-bi-an', name: 'Đảo bí ẩn', mocks: [], note: 'Theo tấm Đảo bí ẩn: quần đảo trên biển xanh, bến tàu có thuyền buồm, bãi biển có rương, rừng nhiệt đới có cầu treo, thác giữa tàn tích, khu di tích cổ, hang và đền thờ pha lê phát sáng, khu thử thách trên dung nham, núi lửa, hang hải tặc, rừng đêm, phòng kho báu.' },
];

/** Content versions of the review material (asset-versions.ts), read from the manifest on load. */
let versions: ReadonlyMap<string, string> = new Map();
const assetHref = (manifestPath: string): string => versioned(`${ASSET_PREFIX}${manifestPath}`, versions.get(manifestPath));

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
/**
 * Review decisions, taken by TypeSafe Jev on the owner's behalf (plans/dattqh/reports/jev-261001-0941-review-decisions.md).
 * The owner's one criterion: a game built 100% by AI that is lively, so children never get bored.
 */
const DECISIONS = [
  { label: 'Vòng chơi chương 1', verdict: 'Chỉnh', direction: 'sự kiện bất ngờ trong rừng giữa các bước (thỏ cuỗm manh mối, mưa rồi cầu vồng, đom đóm)' },
  { label: 'Tạo nhân vật', verdict: 'Chỉnh', direction: 'thú cưng đi theo nhân vật' },
  { label: 'Home trên ảnh đảo render sẵn', verdict: 'Chỉnh (giữ ảnh đảo)', direction: 'sự sống trên đảo: thác chảy, chim và bướm bay, nhân vật vẫy tay' },
  { label: '3 thử thách Toán và ba lớp hỗ trợ', verdict: 'Chỉnh (giữ ba lớp hỗ trợ)', direction: 'đồ vật phản ứng khi chơi (táo nảy, đá lắc lư, hũ kẹo cười)' },
  { label: 'Màn thưởng, lên cấp, mở khóa; 90 XP sau Đáp án', verdict: 'Chỉnh (giữ 90 XP)', direction: 'cả thế giới 3D ăn mừng khi xong quest' },
  { label: 'Quest mẫu SGK', verdict: 'Chấp nhận kèm chỉnh sửa', direction: 'lời thoại vui nhộn hơn; đáp án AI tự chọn được đánh dấu cho giáo viên; mở viết các quest còn lại' },
];
const MVP_STEPS: Record<string, string> = {
  '01-creator': 'Tạo nhân vật: đổi mũ thấy ngay trên nhân vật voxel, chọn tên (M1.3)',
  '02-home': 'Home: đảo, khu vực mở/khóa, nhiệm vụ hôm nay, Lv/XP/Xu (M1.1)',
  '03-region': 'Khu rừng bí mật: biển gỗ, tiến độ có rương, bảng nhiệm vụ theo chương trên nền map của khu (M2.1)',
  '04-dialogue': 'Hội thoại với Vẹt, gọi bé bằng tên nhân vật (M3.3)',
  '05-letter': 'Đọc lá thư: câu hỏi đọc hiểu',
  '06-drag-drop': 'Kéo 10 quả táo vào giỏ bằng tay (M2.4)',
  '07-quiz': 'Trắc nghiệm chia kẹo (M2.6)',
  '08-sort': 'Xếp đá qua suối từ bé đến lớn (M2.5)',
  '09-riddle': 'Câu đố cây cổ thụ 8 + 5, bàn phím số (M3.4)',
  '10-reward': 'Hoàn thành: 3 sao, +100 XP, Xu, Lá thần, Skill XP (M2.9)',
  '11-level-up': 'Lên cấp Lv.1 → Lv.2 (NEW SCREEN)',
  '12-backpack': 'Ba lô có Lá thần (M3.5)',
};
const UI_STEPS: Record<string, string> = {
  '01-login': 'Đăng nhập: chỉ nút Google',
  '03-consent': 'Đồng ý chính sách (kèm dòng phụ huynh chịu trách nhiệm)',
  '04-parent-area': 'Quản lý tài khoản: tạo hồ sơ người chơi từ danh sách tên',
  '05-profiles': 'Đưa máy cho bé: bé chọn hồ sơ',
  '06-creator': 'Hồ sơ mới: tạo nhân vật (loài, tên) trước khi chơi',
  '07-home': 'Home: đảo nổi mỗi vùng một đảo, nhiệm vụ hôm nay (M1.1)',
  '08-world-map': 'Bản đồ thế giới: chọn khu vực (M1.4)',
  '09-region': 'Khu rừng bí mật: biển gỗ, tiến độ, bảng nhiệm vụ trên nền chính map của khu (M2.1)',
  '10-play-parrot': 'Vào game, đứng gần Vẹt: nhãn tương tác',
  '11-parent-gate': 'Bé mở khu phụ huynh: cần PIN',
  '12-delete-account': 'Phụ huynh tải dữ liệu, rồi xóa hẳn tài khoản',
};

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
  const img = el('img', { src: assetHref(path), alt: caption, loading: 'lazy', decoding: 'async' });
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
  const camera = reviewPaths.find((x) => x.endsWith('/miu-cat-gameplay-camera.png'));
  if (camera) byId('character-turn').append(figure(camera, 'Góc camera khi chơi'));
  for (const clip of EXTRA_CLIPS) {
    const p = reviewPaths.find((x) => x.endsWith(`/miu-cat-anim-${clip}.png`));
    if (p) byId('character-extra').append(figure(p, CLIP_LABEL[clip] ?? clip));
  }
  for (const p of reviewPaths.filter((x) => x.includes('/miu-cat-anim-') && !EXTRA_CLIPS.some((c) => x.endsWith(`-${c}.png`)))) {
    byId('character-base').append(figure(p, name(p).replace('miu-cat-anim-', '')));
  }
  for (const p of reviewPaths.filter((x) => x.includes('/review/ui/')).sort()) byId('account-flow').append(figure(p, UI_STEPS[name(p)] ?? name(p)));
  for (const p of reviewPaths.filter((x) => x.includes('/review/mvp/')).sort()) byId('mvp-flow').append(figure(p, MVP_STEPS[name(p)] ?? name(p)));
  const accessoryCaption = (key: string): string => {
    if (key.startsWith('miu-outfit-turn-')) return `Trọn bộ · góc ${key.split('-').pop() ?? ''}°`;
    if (key.startsWith('miu-variant-')) return `Biến thể màu: ${key.replace('miu-variant-', '').replace('-', ' + ')}`;
    if (key.startsWith('item-')) return ACCESSORIES.get(key.replace('item-', ''))?.name ?? key;
    const clip = key.replace('miu-outfit-', '');
    return `Trọn bộ · ${CLIP_LABEL[clip] ?? clip}`;
  };
  for (const p of reviewPaths.filter((x) => x.includes('/accessories/'))) byId('accessories').append(figure(p, accessoryCaption(name(p))));
  const propsCaption: Record<string, string> = {
    'toan2-cd1-b05': 'Phong bì đỏ, vàng, xanh (Toán bài 5)',
    'toan2-cd4-b20': 'Toa hàng ba màu (Toán bài 20)',
    'toan2-cd7-b36': 'Hộp huy hiệu vàng, bạc, đồng (Toán bài 36)',
    'toan2-cd2-b09': 'Bê con: nhỏ hơn bò, mỗi con một màu (Toán bài 9)',
    'tv2-t08-b15': 'Sách Dế Mèn, sách Thế giới quanh em (Tiếng Việt bài 15)',
    'tv2-t18-on-cuoi-ki': 'Nhịp cầu đầu, giữa, cuối (Tiếng Việt ôn cuối kì)',
  };
  for (const p of reviewPaths.filter((x) => x.includes('/review/props/')).sort()) byId('sgk-props').append(figure(p, propsCaption[name(p)] ?? name(p)));
  // The school beside the owner's mock frames (bundled with the review page only, from designs/).
  for (const p of reviewPaths.filter((x) => x.includes('/review/school/')).sort()) {
    const key = name(p);
    const mock = SCHOOL_MOCKS[`../../../../designs/truong-hoc/${key}.png`];
    const caption = SCHOOL_CAPTIONS[key] ?? key;
    const pair = el('div', { className: 'pair' }, [
      ...(mock ? [el('figure', {}, [el('img', { src: mock, alt: `Mock: ${caption}`, loading: 'lazy', decoding: 'async' }), el('figcaption', { textContent: `Mock · ${caption}` })])] : []),
      figure(p, `Trong game · ${caption}`),
    ]);
    byId('school-pairs').append(pair);
  }
  // The eight maps: the owner's mock frames beside in-game previews of each (`pnpm assets:preview <map>`).
  const previewGroup = (map: string): string => (map === 'khu-rung-bi-mat' ? 'forest-ch1' : map);
  for (const m of WORLD_MAPS) {
    const mocks = Object.entries(MAP_MOCKS).filter(([key]) => m.mocks.some((prefix) => key.includes(`/designs/${prefix}`))).map(([, url]) => url);
    // The map's own pictures, then the village nearest it on the land round it (the outer land).
    const shots = [...reviewPaths.filter((x) => x.includes(`/review/${previewGroup(m.map)}/`)).sort(), ...reviewPaths.filter((x) => x.endsWith(`/review/outland/${previewGroup(m.map)}-ngoai.png`))];
    // Pictures named mock__<folder>__<frame> stand beside that frame of the detail mocks.
    const isPair = (p: string): boolean => name(p).startsWith('mock__');
    const pairs = shots.filter(isPair).flatMap((p) => {
      const frame = name(p).replace('mock__', '').replace('__', '/');
      const mock = DETAIL_MOCKS[`../../../../designs/${frame}.png`];
      if (!mock) return [];
      const caption = frame.split('/')[1]?.replace(/^[a-z]-\d+-/, '').replaceAll('-', ' ') ?? frame;
      return [
        el('div', { className: 'pair' }, [
          el('figure', {}, [el('img', { src: mock, alt: `Mock: ${caption}`, loading: 'lazy', decoding: 'async' }), el('figcaption', { textContent: `Mock · ${frame}` })]),
          figure(p, `Trong game · ${caption}`),
        ]),
      ];
    });
    const block = el('div', { className: 'map-block' }, [
      el('h3', { textContent: m.name }),
      el('p', { className: 'sub', textContent: m.note }),
      ...(pairs.length > 0 ? [el('div', { className: 'pairs' }, pairs)] : []),
      el('div', { className: 'grid grid-4' }, [
        ...mocks.map((url) => el('figure', {}, [el('img', { src: url, alt: `Mock ${m.name}`, loading: 'lazy', decoding: 'async' }), el('figcaption', { textContent: 'Mock' })])),
        ...shots.filter((p) => !isPair(p)).map((p) => figure(p, `Trong game · ${name(p).replace(`${previewGroup(m.map)}-`, '').replace(/^ngoai$/, 'làng ở vùng ngoài')}`)),
      ]),
    ]);
    byId('world-maps').append(block);
  }
  const mapCaption: Record<string, string> = { top: 'Nhìn từ trên', iso: 'Toàn cảnh', bridge: 'Cầu gỗ qua suối', tree: 'Cây cổ thụ', npc: 'Vẹt và lối đá', overview: 'Góc chương 1 của khu rừng (cả rừng 800 × 800 ở mục các map)' };
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

function renderDecisions(): void {
  const list = el('ul', { className: 'decisions' });
  for (const d of DECISIONS) {
    list.append(el('li', {}, [el('strong', { textContent: `${d.label}: ${d.verdict}` }), ` — ${d.direction}`]));
  }
  byId('decisions').append(list);
}

interface CoverageTotals {
  items: number;
  inGame: number;
  onWorksheet: number;
  missing: number;
}
interface CoverageSummary {
  books: Array<{ title: string; totals: CoverageTotals; percent: number; units: Array<{ title: string; totals: CoverageTotals; percent: number; lessons: number }> }>;
}

/** Textbook coverage per book and unit (assets/generated/review/sgk-coverage.json, from `pnpm content:gaps --review`). */
async function renderCoverage(generated: readonly string[]): Promise<void> {
  if (!generated.includes('generated/review/sgk-coverage.json')) return;
  const summary = (await (await fetch(assetHref('generated/review/sgk-coverage.json'))).json()) as CoverageSummary;
  for (const book of summary.books) {
    const table = el('table', { className: 'coverage' });
    const head = el('tr');
    for (const h of ['Chủ đề', 'Bài', 'Bài tập', 'Trong game', 'Phiếu', 'Phủ']) head.append(el('th', { textContent: h }));
    table.append(head);
    for (const u of [...book.units, { title: 'Cả sách', totals: book.totals, percent: book.percent, lessons: book.units.reduce((n, x) => n + x.lessons, 0) }]) {
      const row = el('tr');
      for (const cell of [u.title, String(u.lessons), String(u.totals.items), String(u.totals.inGame), String(u.totals.onWorksheet), `${u.percent}%`]) row.append(el('td', { textContent: cell }));
      table.append(row);
    }
    byId('sgk-coverage').append(el('figure', {}, [el('figcaption', { textContent: book.title }), table]));
  }
}

async function main(): Promise<void> {
  renderDecisions();
  const manifest = (await (await fetch(versioned(`${ASSET_PREFIX}manifest.json`, MANIFEST_VERSION))).json()) as ManifestJson;
  versions = manifestVersions([...manifest.files, ...manifest.generated]);
  const generated = manifest.generated.map((g) => g.path);
  await renderCoverage(generated);
  renderGallery(generated);
  renderPalette();
  renderLicenses(manifest);
  const perfPath = generated.find((p) => p === 'generated/review/perf.json');
  const perf = perfPath ? ((await (await fetch(assetHref(perfPath))).json()) as PerfReport) : null;
  renderPerf(perf);
}

main().catch((err: unknown) => {
  console.error(err);
  document.body.prepend(el('p', { textContent: `Lỗi tải trang duyệt: ${err instanceof Error ? err.message : String(err)}` }));
});
