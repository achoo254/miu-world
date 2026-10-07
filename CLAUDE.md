# CLAUDE.md — Miu World

Quy tắc hành vi cho agent trong repo này. Lý do và bối cảnh nằm ở `docs/` (bản đồ: `docs/README.md`); nguồn quyết định sản phẩm là Master Plan v3 ở gốc repo.

Giai đoạn hiện tại: Vertical slice MVP đã xong 10 phase; nội dung SGK lớp 2 tập 1 (70 quest) đã kích hoạt, chia trên 8 map rộng (plan `plans/dattqh/261001-2106-more-maps-lesson-regroup/`); chờ người duyệt (report `plans/dattqh/reports/mvp-slice-review-260930.md`, trang `apps/web/review.html`; việc của người: DEVICE-01, giáo viên, designer) — `apps/web` (Vite + React, runtime Three.js ở `src/game`, UI ở `src/ui`), `apps/server` (Express + Drizzle), `packages/{voxel,quest,schema}`. Plan: `plans/dattqh/260929-2141-vertical-slice-mvp/` (trên `main`). Song song: nội dung SGK lớp 2 — `plans/dattqh/260930-0846-sgk-lop2-game-content/`, chạy trong worktree `../miu-world-sgk` (branch `dattqh/feat/sgk-lop2-content`); tôn trọng bảng file dùng chung trong `plan.md` của plan đó.

## Lệnh

- Chỉ dùng `pnpm` (workspace, `packageManager` khóa trong `package.json`), Node ≥ 22. Không dùng `npm`/`yarn`.
- Dữ liệu ngoài git (font HP001 của phiếu viết, PDF SGK gốc) nằm trong iCloud Drive của người phụ trách, danh sách kèm sha256 ở `tools/private/private-files.json`. Máy mới hoặc khi hook đầu phiên báo thiếu: chạy `pnpm private:sync` (macOS và Windows; iCloud ở chỗ khác thì đặt `MIU_ICLOUD_DIR`). Không commit các file đó.
- Gate trước khi báo xong — chạy đủ 5 lệnh, đúng thứ tự CI (`.github/workflows/ci.yml`):
  `pnpm assets:check` → `pnpm content:check` → `pnpm test` → `pnpm typecheck` → `pnpm lint`
  (CI còn chạy `pnpm audit --prod --audit-level=high` và Semgrep CE; máy dev không có Docker nên Semgrep kiểm trên CI.)
- Sửa `apps/web/**` thì chạy thêm `pnpm --filter @miu/web build` (CI chạy bước này; typecheck/test không bắt lỗi build).
- Một file test: `pnpm vitest run <đường-dẫn-file>`.
- Nội dung SGK: kiểm kê sách ở `content/curriculum/`, độ phủ `pnpm content:gaps [--book …] [--missing]` (`--review` ghi số liệu cho trang review). Mục tiêu quest trên map đặt từ `content/world/targets.json` + `looks.json` khi chạy `pnpm world:<map>` (`forest`, `school`, `trung-tam`, `lang-ven-song`, `xom-mai-am`, `cho-phien`, `nong-trai`, `thu-vien`, `lau-dai`, `nui-tuyet`, `dao-bi-an`, `nha-cua-be`); quest mới thì thêm mục trong `targets.json` rồi sinh lại map đó. Sinh lại map nào thì chạy thêm `pnpm world:walk <map>` (lưới chỗ đứng cho bạn máy tự đi, ở `content/world/walk/`; test báo đỏ khi lưới cũ hơn map); số liệu "Bạn máy tự học" trên trang review sinh bằng `pnpm bots:learning` rồi `pnpm assets:manifest`. Mọi model map đặt (đồ vật, người, vật, xe) có một dòng trong `content/world/models.json` (chiều cao, `clip`, `centred`, `traversal`: `walk-through` cho cây, cỏ, hoa, ruộng, thảm; `blocking` cho rào, cửa, lan can, đá lớn; mặc định `auto-step` — bé tự bước 1 khối, tự trèo 2 khối; khối khai `traversal` trong `content/blocks.json`, luật ở `packages/voxel/src/traversal.ts`). Không vật nào mờ đi vì che bé: camera tự tiến lại trước tường, mái. Thêm đồ mới hay đổi cỡ ở đó là áp cho mọi map; map nào cố ý dùng cỡ khác thì khai `sizes` trong generator của map đó; test `tools/world/model-catalog.test.ts` báo model thiếu. Vật pack 3D không có thì thêm prop vào `content/world/emoji-props.json` (ảnh emoji khai trong `tools/assets/sources.json`), chạy `pnpm assets:props` rồi `pnpm assets:manifest`; cùng một nhân vật ở chỗ khác của bài thì khai `character`. Mười hai map chơi được: lõi 800 × 48 × 800 (Nhà của bé `nha-cua-be` lõi 160 × 160) ghi thành vùng 128 × 128 (`regions/r<x>-<z>.bin`) cộng `horizon.bin`, và vùng ngoài quanh lõi tới 5.760 × 5.760 (tọa độ −2.432…3.328) sinh theo seed lúc chơi trong worker (`packages/voxel/src/outland-*.ts`, spec ở `outland` của `entities.json`; không có file); game chỉ giữ các vùng gần bé (`sparse-world.ts`); Trung tâm (`trung-tam`) là map trung tâm có cổng sang mười map và cổng về Nhà của bé, nơi các bạn gặp nhau khi chơi online; Nhà của bé có thời khóa biểu và lịch đồng phục theo hồ sơ (mục tiêu `nha-thoi-khoa-bieu`, `nha-lich-dong-phuc`; API `/api/timetable`, mặc định trống, không đưa dữ liệu thật vào repo); Trường học dựng theo mock ở `designs/truong-hoc/` và `designs/the-gioi/` (`docs/design-cac-map.md`), map mới dựng bằng `tools/world/zone-map.ts`; ảnh so sánh `pnpm assets:preview <map>` (`forest-ch1` cho Khu rừng, `school` cho khung trường). Ảnh toàn cảnh Home: `pnpm world:overview` rồi `pnpm assets:home`. Không commit PDF hay ảnh trang sách.
- Sửa `apps/web/**` hoặc `apps/server/**` thì chạy thêm E2E trên máy dev: `pnpm --filter @miu/web e2e:smoke` (toàn bộ E2E: bộ smoke chín luồng chính, chặn deploy, khoảng 2 phút) hoặc đúng project đang sửa: `pnpm --filter @miu/web e2e --project setup --project <tên>` (tự chạy server với PGlite trong RAM ở 8787, build web rồi preview ở 4173). CI chạy cùng bộ (`e2e:ci`), chia 2 máy; hằng đêm CI mở mọi map (`E2E_ALL_MAPS=1`). Kiểm theo nội dung viết ở Node, không thêm E2E (audit mục tiêu quest `pnpm world:quest-targets` nằm trong `content:check`). Sau build web, `pnpm security:dist` kiểm không có đáp án quest trong bundle.
- Chạy dev: `pnpm dev` chạy cả hai và tự nạp Google OAuth client từ `access-tokens.json` trong iCloud (không in, không ghi file); từng phần: `pnpm --filter @miu/server dev` (API cổng 8787, chỉ loopback, PGlite ở `.data/pglite`) và `pnpm --filter @miu/web dev` (cổng 5173, proxy `/api` → 8787). Trang game `/play` cần đăng nhập phụ huynh và chọn hồ sơ; trang duyệt `/review.html`, trang render công cụ `/preview.html`.
- Ngân sách thời gian test: một test chạy quá 30 s phải khai `test.setTimeout` kèm lý do; mỗi phần (shard) `e2e:ci` trên CI không quá 240 s (reporter đánh đỏ khi vượt). Máy dev chỉ chạy 1 worker, không chạy song song nhiều bộ test. Kiểm tra tăng theo lượng nội dung đặt ở Node; E2E chỉ giữ luồng chính. Chi tiết: `docs/code-standards.md`.
- KHÔNG chạy project `perf` trừ khi được yêu cầu đo hiệu năng: mất tới ~30 phút và ghi đè `assets/generated/review/perf.json`.

## Không được làm

- Không sửa tay `assets/manifest.json` hay `assets/LICENSES.md` — sinh lại bằng `pnpm assets:manifest`. Gate so manifest với bản build mới và sẽ đỏ.
- Không thả file vào `assets/` ngoài quy trình pack/generator (xem `.claude/rules/assets-pipeline.md`). Mọi file phải có trong manifest, license trong allowlist.
- Không đặt thư mục tên `vendor` hay `build` dưới `assets/` — hook của môi trường AI chặn các từ đó; dùng `assets/packs/` và `assets/generated/`.
- Không dùng tên, texture, asset của Minecraft. Không nhận license CC-BY, CC-BY-SA, NC. Không tự vẽ, không dùng AI tạo ảnh trả phí.
- Không hotlink: runtime chỉ tải từ origin, và chỉ file có trong manifest.
- Không cho quest/nội dung phụ thuộc Three.js; `packages/voxel` giữ thuần TypeScript (không import `three`).
- Không tính thưởng, XP, mở khóa ở client — server là nguồn sự thật (áp dụng ngay khi có backend).
- Không đưa secret hay dữ liệu thật của trẻ vào prompt, code, fixture hoặc commit.
- **Repo công khai** trên GitHub (`github.com/achoo254/miu-world`, MIT, từ 30/09/2026): mọi commit và push ai cũng đọc được, và lịch sử không rút lại được. Không commit, push hay dán vào issue/PR bất kỳ credential, token, API key, mật khẩu, private key, tệp env thật, bản dump database, dữ liệu cá nhân, cũng như IP public, cổng SSH hay user của máy chủ, **trừ khi người dùng cho phép rõ ràng cho đúng lần đó**. Giá trị cần dùng thì đọc lúc chạy từ tệp credential ngoài repo (`docs/STAG-DEV-README.md` §3). Trước mỗi lần push, quét phần sắp push (`git log -p origin/main..HEAD`) tìm secret; thấy thì dừng và báo người.

## Đối tượng

Game dành cho mọi lứa tuổi (trẻ em và người lớn), online kiểu Minecraft, sau này có mobile app; không đòi hỏi phụ huynh giám sát, phụ huynh tự chịu trách nhiệm. Chi tiết: `.claude/rules/product-audience.md`.

## Hỏi người trước khi làm

Gom lại, hỏi một lần: thay đổi cách thu thập/chia sẻ dữ liệu trẻ em; chi phí; pháp lý; phạm vi sản phẩm; việc tốn công con người; quyết định còn mở ở Master Plan v3 §15. Quyết định thường ngày thì tự quyết (có thể dùng `tools/decisions/jev-decide.py` theo ngưỡng rủi ro, xem `docs/code-standards.md`).

## Dễ vấp

- Trên Windows chưa bật Developer Mode, test symlink trong `tools/assets/check-assets.test.ts` tự skip (không tạo được symlink); CI (Ubuntu) vẫn chạy. Skip này không có nghĩa là gate symlink đã được kiểm trên máy local.
- Dữ liệu dev (tài khoản, hồ sơ, tiến độ) nằm ở `.data/pglite` của **từng** worktree: `../miu-world-sgk` có database riêng, không dùng chung với `main`. Không xóa `.data/pglite`; lần duyệt cần dữ liệu giả thì chạy server với `PGLITE_DIR=.data/pglite-review` và chỉ xóa thư mục đó. E2E dùng database trong RAM (`PGLITE_DIR=memory`), tắt là mất. Lúc khởi động server in dòng `database: …` cho biết đang mở database nào và có phải vừa tạo rỗng không.
- `render-preview.ts` và perf test tự sinh lại manifest khi chạy xong; nếu tự sửa file trong `assets/generated/` bằng cách khác thì phải chạy `pnpm assets:manifest`.
- Cổng cố định: web dev 5173, preview/E2E 4173 (Vite `--strictPort`); server 8787 (cổng cố định trong config, lỗi nếu bận); render-preview 5199. Báo cổng bận thì tìm và tắt server cũ, không đổi cổng. Quy tắc này chỉ áp cho máy dev: trên máy chủ dùng chung, tiến trình giữ cổng có thể thuộc dự án khác, nên không được tắt (xem `docs/deployment-guide.md`).
- Server từ chối POST không có `Origin` trong danh sách cho phép (chống CSRF). Mặc định chỉ có localhost/127.0.0.1 ở 5173/4173 (và 5174/4174 cũ); duyệt qua LAN thì chạy server với `ALLOWED_ORIGINS=http://<ip-LAN>:<cổng>` (danh sách phân tách bằng dấu phẩy) và mở web với `--host`.
- Đăng nhập phụ huynh là Google OAuth: server cần `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (khớp đúng URI đăng ký trên Google; Google chỉ nhận https hoặc `http://localhost`). Đặt trong file env ngoài repo và chạy `pnpm --filter @miu/server exec tsx --env-file=<file> src/server.ts`; không in giá trị. Đăng nhập mật khẩu chỉ bật khi đặt `PASSWORD_LOGIN=1` (E2E đặt; bản review không đặt), bị từ chối ở production. Duyệt qua tunnel: `tunelo http 4173:miu` → `https://miu.tunnel.inetdev.io.vn`, chạy preview với `MIU_PUBLIC_HOSTS=miu.tunnel.inetdev.io.vn` và server với `ALLOWED_ORIGINS` gồm origin đó.
- `jev-decide.py` cần `TYPESAFE_API_KEY` hoặc `TYPESAFE_TOKEN_FILE`. `TYPESAFE_TOKEN_FILE` trỏ tới file token `access-tokens.json` trong iCloud của người phụ trách (đường dẫn trong `docs/STAG-DEV-README.md` §3, cùng thư mục với các file credential khác); script lấy mục `api.typesafe.ai` và không in khóa. Không có file đó thì dừng, đừng tự tìm key ở nơi khác.

## Quy trình

- Plan và report: `plans/dattqh/` (plan theo `{yymmdd-hhmm}-{slug}/`, report trong `plans/dattqh/reports/`).
- Mỗi đợt giao hàng kết thúc bằng một trang review cho người duyệt cuối (ảnh, bản chơi thử, số liệu hiệu năng, báo cáo bảo mật, dependency mới, bảng license) — trang hiện có: `apps/web/review.html`.
- Commit: conventional commits tiếng Anh (`feat(assets):`, `feat(poc):`, `docs(plans):`, `build:`); không nhắc AI; không ghi mã plan/phase trong code, tên test, commit.
- Thêm dependency mới: ghi vào trang review của đợt đó để người duyệt thấy.
- Tiến độ backlog và việc đã xong: `docs/project-roadmap.md` — cập nhật khi một task Master Plan đổi trạng thái.
- Deploy (staging và production) đi qua cổng release `tools/deploy/release-gate.sh`: CI của commit xanh và ảnh các màn chính đã chụp, đã duyệt theo `docs/screen-review.md`; thứ tự và `MIU_RELEASE_FORCE` ở `docs/deployment-guide.md` §5.
- SSH vào lab/máy chủ và credential SSH: [`docs/STAG-DEV-README.md`](docs/STAG-DEV-README.md); máy staging/production và cách deploy: [`docs/deployment-guide.md`](docs/deployment-guide.md). Deploy, migration, restart ở production phải hỏi người trước mỗi lần.
