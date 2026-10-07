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
const BOSS_SHOTS: Record<string, string> = {
  '0-trum-canh-khu-tren-map': 'Trùm canh khu Cánh Cụt Đưa Thư đứng cạnh phố làng, nút Thách đấu (chất lượng cao)',
  '1-ban-do-cac-trum': 'Bản đồ lớn: nhóm Trùm (vương miện), trùm lớn và bốn trùm canh khu trong danh sách',
  '2-gap-trum-canh-khu': 'Nói chuyện với trùm canh khu: trận đấu của nó bắt đầu ngay',
  '3-dau-tri': 'Đấu trí trong thế giới đang chạy: trùm thật đứng trước bé, tên và HP ở trên, đáp án là khiên quanh trùm, câu hỏi ở thẻ dưới',
  '3b-ho-tro-dap-an': 'Mỗi câu của trùm có Hướng dẫn, Gợi ý, Đáp án kèm giải thích; Đáp án mở sau hai lần trượt câu đó, đòn vẫn đánh được',
  '4-sau-mot-don': 'Sau một đòn trúng: HP giảm, trùm nói câu mới, câu sau đổi động tác chơi',
  '6-cau-dai-lau-dai-360x740': 'Điện thoại dọc 360 × 740: câu hỏi dài nhất của trùm canh khu (105 ký tự, Lâu đài), đích chạm ≥ 48 px',
  '6-cau-dai-dao-bi-an-360x740': 'Điện thoại dọc 360 × 740: đáp án dài (32 ký tự, Đảo bí ẩn), nạp chiêu',
  '6-cau-dai-lau-dai-820x1180': 'iPad dọc 820 × 1180: câu hỏi dài nhất của trùm canh khu (Lâu đài)',
  '6-cau-dai-dao-bi-an-820x1180': 'iPad dọc 820 × 1180: đáp án dài (Đảo bí ẩn)',
  '5-chep-vao-vo': 'Thắng: mọi câu của trận để chép vào vở, rồi phần thưởng do server tính',
};
const PET_SCENES: Record<string, string> = {
  board: 'Bảng chăm sóc: hình và tên thú, cấp thân thiết, lời của thú, ba chỉ số, bốn tab',
  'care-feed': 'Cho ăn: bát hiện ra, thú cúi ăn, vụn bay',
  'care-pet': 'Vuốt ve: thú dụi vào tay, tim bay lên',
  'care-bath': 'Tắm: chậu nước, bong bóng, rồi lắc khô',
  'care-play': 'Ném bóng: thú chạy nhặt bóng ngậm về',
  'care-nap': 'Ngủ trưa: đệm mang ra, Zzz',
  'care-nap-bed': 'Ở nhà: ngủ trong ổ của nó cạnh giường bé',
};
const PET_NAMES: Record<string, string> = { 'meo-xam': 'Mèo xám', 'cun-con': 'Cún con', 'tho-nau': 'Thỏ nâu', 'gau-truc': 'Gấu trúc', 'ga-con': 'Gà con', 'huou-cao-co': 'Hươu cao cổ', 'voi-con': 'Voi con', 'ho-con': 'Hổ con' };
const GEAR_NAMES: Record<string, string> = {
  'pet-party-hat': 'mũ sinh nhật',
  'pet-sun-hat': 'mũ rộng vành',
  'pet-crown': 'vương miện',
  'pet-bow-pink': 'nơ hồng',
  'pet-bow-blue': 'nơ xanh',
  'pet-flower': 'hoa cài',
  'pet-collar-bell': 'vòng cổ chuông',
  'pet-collar-medal': 'vòng cổ huy chương',
  'pet-scarf': 'khăn quàng',
};
const UI_STEPS: Record<string, string> = {
  '01-login': 'Đăng nhập: chỉ nút Google',
  '03-consent': 'Đồng ý chính sách (kèm dòng phụ huynh chịu trách nhiệm)',
  '04-parent-area': 'Quản lý tài khoản: người chơi chính, thêm người chơi phụ, PIN tùy chọn',
  '05-profiles': 'Đổi người chơi trên máy dùng chung',
  '06-creator': 'Đồng ý xong: người chơi chính tạo nhân vật (loài, tên) trước khi chơi',
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
  const sceneOrder = Object.keys(PET_SCENES);
  for (const p of reviewPaths.filter((x) => x.includes('/review/bosses/')).sort()) byId('boss-shots').append(figure(p, BOSS_SHOTS[name(p)] ?? name(p)));
  for (const p of reviewPaths.filter((x) => x.includes('/review/pet-scenes/')).sort((a, b) => sceneOrder.indexOf(name(a)) - sceneOrder.indexOf(name(b)))) byId('pet-scenes').append(figure(p, PET_SCENES[name(p)] ?? name(p)));
  for (const p of reviewPaths.filter((x) => x.includes('/review/pets/')).sort()) {
    const [pet = '', ...gear] = name(p).split('--');
    byId('pet-gear').append(figure(p, `${PET_NAMES[pet] ?? pet}: ${gear.map((g) => GEAR_NAMES[g] ?? g).join(', ')}`));
  }
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

/** The fleet's numbers at one moment of the measuring simulation (tools/bots/learning-report.ts; means are per bot). */
interface BotsLearningSample {
  minute: number;
  placesKnown: number;
  shortcuts: number;
  firstTripDirectness: number | null;
  againTripDirectness: number | null;
  firstTrips: number;
  againTrips: number;
  stuckShare: number;
  stepsDone: number;
}
interface BotsLearningReport {
  settings: { bots: number; minutes: number; sampleMinutes: number; tickS: number; seed: string };
  maps: Array<{ map: string; bots: number; places: number; quests: number; samples: BotsLearningSample[]; badSteps: number }>;
}

const LEARNING_MAP_NAMES: Record<string, string> = { 'truong-hoc': 'Trường học', 'trung-tam': 'Trung tâm', 'forest-ch1': 'Khu rừng bí mật' };
const LEARNING_COLORS = ['#e0559a', '#3a7fd0', '#2f9e5b', '#c77800'];

/** A number the Vietnamese way (decimal comma). */
const vn = (n: number, digits = 1): string => n.toFixed(digits).replace('.', ',');

interface ChartSeries {
  label: string;
  color: string;
  dashed?: boolean;
  /** [minute, value]; null: nothing measured yet (the line starts later). */
  points: ReadonlyArray<readonly [number, number | null]>;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, children: Array<Node | string> = []): SVGElementTagNameMap[K] {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  node.append(...children);
  return node;
}

/** A line chart over the simulated time (plain SVG): one line per series, a legend under it. */
function lineChart(title: string, series: readonly ChartSeries[], minutes: number, format: (v: number) => string): HTMLElement {
  const width = 480;
  const height = 240;
  const pad = { left: 48, right: 12, top: 12, bottom: 30 };
  const values = series.flatMap((s) => s.points.flatMap(([, v]) => (v === null ? [] : [v])));
  // A round top just above the highest value (a power of ten times one of these).
  const highest = Math.max(...values, 0) * 1.05 || 1;
  const step = 10 ** Math.floor(Math.log10(highest));
  const yMax = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].map((m) => m * step).find((m) => m >= highest) ?? highest;
  const x = (minute: number): number => pad.left + (minute / minutes) * (width - pad.left - pad.right);
  const y = (v: number): number => height - pad.bottom - (v / yMax) * (height - pad.top - pad.bottom);
  const chart = svg('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': title, style: 'width:100%;height:auto;display:block' });
  for (let i = 0; i <= 4; i++) {
    const v = (yMax * i) / 4;
    chart.append(
      svg('line', { x1: pad.left, x2: width - pad.right, y1: y(v), y2: y(v), stroke: '#e2e6f0' }),
      svg('text', { x: pad.left - 6, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#6b6480' }, [format(v)]),
    );
  }
  for (let m = 0; m <= minutes; m += 30) {
    const label = m === 0 ? '0' : `${vn(m / 60, m % 60 === 0 ? 0 : 1)} giờ`;
    chart.append(svg('text', { x: x(m), y: height - 10, 'text-anchor': 'middle', 'font-size': 11, fill: '#6b6480' }, [label]));
  }
  for (const s of series) {
    // Unbroken runs of measured points, each drawn as one line.
    const runs: Array<Array<readonly [number, number]>> = [[]];
    for (const [m, v] of s.points) {
      if (v === null) runs.push([]);
      else runs.at(-1)?.push([m, v]);
    }
    for (const run of runs.filter((r) => r.length > 0)) {
      const points = run.map(([m, v]) => `${x(m).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      chart.append(svg('polyline', { points, fill: 'none', stroke: s.color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', ...(s.dashed ? { 'stroke-dasharray': '6 4' } : {}) }));
    }
  }
  const legend = el(
    'figcaption',
    {},
    series.map((s) => {
      const key = svg('svg', { viewBox: '0 0 24 8', width: 24, height: 8, style: 'margin:0 4px 0 12px;vertical-align:middle' }, [
        svg('line', { x1: 0, x2: 24, y1: 4, y2: 4, stroke: s.color, 'stroke-width': 3, ...(s.dashed ? { 'stroke-dasharray': '6 4' } : {}) }),
      ]);
      return el('span', {}, [key, s.label]);
    }),
  );
  return el('figure', {}, [el('h3', { textContent: title }), chart, legend]);
}

/**
 * How companion bots learn a map on their own (assets/generated/review/bots-learning.json, from `pnpm bots:learning`):
 * three charts over a measuring simulation and a table of first and last numbers.
 */
async function renderBotsLearning(generated: readonly string[]): Promise<void> {
  const file = 'generated/review/bots-learning.json';
  const head = byId('bots-learning-head');
  if (!generated.includes(file)) {
    head.textContent = 'Chưa có số liệu: chạy `pnpm bots:learning` rồi `pnpm assets:manifest`.';
    return;
  }
  const report = (await (await fetch(assetHref(file))).json()) as BotsLearningReport;
  const { settings } = report;
  head.textContent =
    `Mô phỏng đo tất định (seed "${settings.seed}"): mỗi map ${settings.bots} bạn máy bắt đầu từ trí nhớ trống, sống ${vn(settings.minutes / 60, 0)} giờ với đúng bộ não của server ` +
    `trên lưới chỗ đứng và nhiệm vụ thật của map, mỗi bước ${vn(settings.tickS)} s, không có người chơi; số liệu lấy mỗi ${settings.sampleMinutes} phút. ` +
    'Đây là đo, không phải huấn luyện: không ghi gì vào database, bạn máy trong game không bắt đầu từ kết quả này.';
  const named = report.maps.map((m, i) => ({ ...m, name: LEARNING_MAP_NAMES[m.map] ?? m.map, color: LEARNING_COLORS[i % LEARNING_COLORS.length] ?? '#2b2140' }));
  const line = (m: (typeof named)[number], label: string, pick: (s: BotsLearningSample) => number | null, dashed = false): ChartSeries => ({
    label,
    color: m.color,
    dashed,
    points: m.samples.map((s) => [s.minute, pick(s)] as const),
  });
  const charts = byId('bots-learning');
  charts.append(
    lineChart('Số nơi đã biết (trung bình mỗi bạn máy)', named.map((m) => line(m, `${m.name} (map có ${m.places} nơi)`, (s) => s.placesKnown)), settings.minutes, (v) => vn(v, 0)),
    lineChart(
      'Độ thẳng của chuyến tới điểm nhiệm vụ (khoảng cách thẳng ÷ quãng đã đi)',
      named.flatMap((m) => [line(m, `${m.name}: tới nơi đã từng tới`, (s) => s.againTripDirectness), line(m, `${m.name}: lần đầu tới nơi đó`, (s) => s.firstTripDirectness, true)]),
      settings.minutes,
      (v) => vn(v, 2),
    ),
    lineChart('Đường tắt tự tìm ra (cộng dồn, trung bình mỗi bạn máy)', named.map((m) => line(m, m.name, (s) => s.shortcuts)), settings.minutes, (v) => vn(v, 0)),
  );

  const table = el('table');
  const columns = ['Map', 'Bạn máy', 'Nơi đã biết', 'Chuyến đầu', 'Chuyến đi lại', 'Thẳng hơn', 'Đường tắt', 'Kẹt', 'Bước nhiệm vụ', 'Sai luật'];
  table.append(el('thead', {}, [el('tr', {}, columns.map((h) => el('th', { textContent: h })))]));
  const body = el('tbody');
  for (const m of named) {
    const first = m.samples[0];
    const last = m.samples.at(-1);
    if (!first || !last) continue;
    const gain = last.firstTripDirectness && last.againTripDirectness ? last.againTripDirectness / last.firstTripDirectness : null;
    const trips = (d: number | null, n: number): string => (d === null ? '—' : `${vn(d, 2)} (${n})`);
    body.append(
      el('tr', {}, [
        el('td', { textContent: m.name }),
        el('td', { textContent: String(m.bots) }),
        el('td', { textContent: `${vn(first.placesKnown)} → ${vn(last.placesKnown)} / ${m.places}` }),
        el('td', { textContent: trips(last.firstTripDirectness, last.firstTrips) }),
        el('td', { textContent: trips(last.againTripDirectness, last.againTrips) }),
        el('td', {}, [gain === null ? '—' : badge(gain >= 1.3, `×${vn(gain, 2)}`)]),
        el('td', { textContent: vn(last.shortcuts) }),
        el('td', {}, [badge(last.stuckShare < 0.02, `${vn(last.stuckShare * 100)}%`)]),
        el('td', { textContent: String(last.stepsDone) }),
        el('td', {}, [badge(m.badSteps === 0, String(m.badSteps))]),
      ]),
    );
  }
  table.append(body);
  byId('bots-learning-table').append(table);
}

/** One review of the screens before a release (assets/generated/review/screens/review.json, docs/screen-review.md). */
interface ScreenReview {
  capturedFrom: string;
  capturedAt: string;
  reviewedAt: string;
  reviewer: string;
  verdict: 'pass' | 'fail';
  findings: Array<{ shot: string; kind: string; severity: 'block' | 'note'; text: string; fixedIn: string | null }>;
}
interface ScreenShots {
  viewport: string;
  capturedFrom: string;
  capturedAt: string;
  shots: Array<{ shot: string; screen: string; status: 'ok' | 'missing'; reason?: string }>;
}

const SCREEN_SIZES = ['360x740', '820x1180'] as const;
const SCREEN_NAMES: Record<string, string> = {
  '01-login': 'Đăng nhập',
  '02-players': 'Chọn người chơi',
  '03-creator': 'Tạo nhân vật',
  '04-home': 'Home',
  '05-world-map': 'Bản đồ thế giới',
  '06-region': 'Chi tiết vùng',
  '07-play-hud': 'Chơi: HUD ở chỗ xuất hiện',
  '08-play-prompt': 'Chơi: nhãn Tương tác cạnh mục tiêu',
  '09-dialogue': 'Lời thoại',
  '10-question': 'Câu hỏi (Hướng dẫn, Gợi ý, Đáp án)',
  '11-reward': 'Màn thưởng',
  '12-event-panel': 'Panel sự kiện Olympic',
  '13-olympiad-practice': 'Luyện tập Olympic',
  '14-boss': 'Trận trùm (câu hỏi dài)',
  '15-shop': 'Cửa hàng',
  '16-backpack': 'Ba lô',
  '17-pet-care': 'Chăm thú cưng',
  '18-party': 'Tổ đội',
  '19-worksheets': 'Phiếu viết (khu phụ huynh)',
};

/** The screens pictured before a release, phone and iPad side by side, with the agent's findings under each. */
async function renderScreens(generated: readonly string[]): Promise<void> {
  const fetchJson = async <T>(p: string): Promise<T | null> => (generated.includes(p) ? ((await (await fetch(assetHref(p))).json()) as T) : null);
  const review = await fetchJson<ScreenReview>('generated/review/screens/review.json');
  const sizes = await Promise.all(SCREEN_SIZES.map((size) => fetchJson<ScreenShots>(`generated/review/screens/${size}/shots.json`)));
  const head = byId('screens-head');
  if (sizes.every((s) => s === null)) {
    head.textContent = 'Chưa có ảnh: chạy `pnpm --filter @miu/web screens`.';
    return;
  }
  const first = sizes.find((s) => s !== null);
  head.append(
    `Chụp ở commit ${first?.capturedFrom.slice(0, 8) ?? '?'} lúc ${first?.capturedAt ?? '?'}. `,
    review ? badge(review.verdict === 'pass', review.verdict === 'pass' ? 'Duyệt: đạt' : 'Duyệt: còn lỗi chặn') : badge(false, 'Chưa duyệt'),
    review ? ` ${review.reviewer}, ${review.reviewedAt}${review.capturedFrom === first?.capturedFrom ? '' : ` (lần duyệt ứng với commit ${review.capturedFrom.slice(0, 8)})`}.` : '',
  );
  for (const screen of Object.keys(SCREEN_NAMES)) {
    const row = el('div', { className: 'screen-row' }, [el('h3', { textContent: `${screen} · ${SCREEN_NAMES[screen] ?? screen}` })]);
    for (const [i, size] of SCREEN_SIZES.entries()) {
      const shot = `${size}/${screen}.png`;
      const entry = sizes[i]?.shots.find((s) => s.shot === shot);
      const findings = (review?.findings ?? []).filter((f) => f.shot === shot);
      const list = el(
        'ul',
        { className: 'findings' },
        findings.map((f) => el('li', { className: f.fixedIn ? 'fixed' : f.severity }, [`${f.fixedIn ? `đã sửa ở ${f.fixedIn.slice(0, 8)} · ` : ''}${f.severity === 'block' ? 'chặn' : 'ghi chú'} · ${f.kind}: ${f.text}`])),
      );
      const path = `generated/review/screens/${shot}`;
      const picture = entry?.status === 'ok' && generated.includes(path) ? figure(path, size) : el('p', { className: 'sub', textContent: `${size}: chưa chụp được${entry?.reason ? ` (${entry.reason})` : ''}` });
      row.append(el('div', {}, [picture, list]));
    }
    byId('screens').append(row);
  }
}

async function main(): Promise<void> {
  renderDecisions();
  const manifest = (await (await fetch(versioned(`${ASSET_PREFIX}manifest.json`, MANIFEST_VERSION))).json()) as ManifestJson;
  versions = manifestVersions([...manifest.files, ...manifest.generated]);
  const generated = manifest.generated.map((g) => g.path);
  await renderCoverage(generated);
  await renderBotsLearning(generated);
  await renderScreens(generated);
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
