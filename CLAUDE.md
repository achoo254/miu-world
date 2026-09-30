# CLAUDE.md — Miu World

Quy tắc hành vi cho agent trong repo này. Lý do và bối cảnh nằm ở `docs/` (bản đồ: `docs/README.md`); nguồn quyết định sản phẩm là Master Plan v3 ở gốc repo.

Giai đoạn hiện tại: Vertical slice MVP (sau Foundation) — `apps/web` (Vite + React, runtime Three.js ở `src/game`), `apps/server` (Express + Drizzle), `packages/{voxel,quest,schema}`. Plan: `plans/dattqh/260929-2141-vertical-slice-mvp/` (trên `main`). Song song: nội dung SGK lớp 2 — `plans/dattqh/260930-0846-sgk-lop2-game-content/`, chạy trong worktree `../miu-world-sgk` (branch `dattqh/feat/sgk-lop2-content`); tôn trọng bảng file dùng chung trong `plan.md` của plan đó.

## Lệnh

- Chỉ dùng `pnpm` (workspace, `packageManager` khóa trong `package.json`), Node ≥ 22. Không dùng `npm`/`yarn`.
- Gate trước khi báo xong — chạy đủ 5 lệnh, đúng thứ tự CI (`.github/workflows/ci.yml`):
  `pnpm assets:check` → `pnpm content:check` → `pnpm test` → `pnpm typecheck` → `pnpm lint`
  (CI còn chạy `pnpm audit --prod --audit-level=high` và Semgrep CE; máy dev không có Docker nên Semgrep kiểm trên CI.)
- Sửa `apps/web/**` thì chạy thêm `pnpm --filter @miu/web build` (CI chạy bước này; typecheck/test không bắt lỗi build).
- Một file test: `pnpm vitest run <đường-dẫn-file>`.
- Sửa `apps/web/**` hoặc `apps/server/**` thì chạy thêm E2E: `pnpm --filter @miu/web e2e --project setup --project account --project play` (tự chạy server với PGlite trong RAM ở 8787, build web rồi preview ở 4173).
- Chạy dev: `pnpm --filter @miu/server dev` (API cổng 8787, chỉ loopback, PGlite ở `.data/pglite`) và `pnpm --filter @miu/web dev` (cổng 5173, proxy `/api` → 8787). Trang game `/play` cần đăng nhập phụ huynh và chọn hồ sơ; trang duyệt `/review.html`, trang render công cụ `/preview.html`.
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

## Hỏi người trước khi làm

Gom lại, hỏi một lần: thay đổi cách thu thập/chia sẻ dữ liệu trẻ em; chi phí; pháp lý; phạm vi sản phẩm; việc tốn công con người; quyết định còn mở ở Master Plan v3 §15. Quyết định thường ngày thì tự quyết (có thể dùng `tools/decisions/jev-decide.py` theo ngưỡng rủi ro, xem `docs/code-standards.md`).

## Dễ vấp

- Trên Windows chưa bật Developer Mode, test symlink trong `tools/assets/check-assets.test.ts` tự skip (không tạo được symlink); CI (Ubuntu) vẫn chạy. Skip này không có nghĩa là gate symlink đã được kiểm trên máy local.
- `render-preview.ts` và perf test tự sinh lại manifest khi chạy xong; nếu tự sửa file trong `assets/generated/` bằng cách khác thì phải chạy `pnpm assets:manifest`.
- Cổng cố định: web dev 5173, preview/E2E 4173 (Vite `--strictPort`); server 8787 (cổng cố định trong config, lỗi nếu bận); render-preview 5199. Báo cổng bận thì tìm và tắt server cũ, không đổi cổng. Quy tắc này chỉ áp cho máy dev: trên máy chủ dùng chung, tiến trình giữ cổng có thể thuộc dự án khác, nên không được tắt (xem `docs/deployment-guide.md`).
- Server từ chối POST không có `Origin` trong danh sách cho phép (chống CSRF). Mặc định chỉ có localhost/127.0.0.1 ở 5173/4173 (và 5174/4174 cũ); duyệt qua LAN thì chạy server với `ALLOWED_ORIGINS=http://<ip-LAN>:<cổng>` (danh sách phân tách bằng dấu phẩy) và mở web với `--host`.
- Đăng nhập phụ huynh là Google OAuth: server cần `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (khớp đúng URI đăng ký trên Google; Google chỉ nhận https hoặc `http://localhost`). Đặt trong file env ngoài repo và chạy `pnpm --filter @miu/server exec tsx --env-file=<file> src/server.ts`; không in giá trị. Đăng nhập mật khẩu chỉ bật khi đặt `PASSWORD_LOGIN=1` (E2E đặt; bản review không đặt), bị từ chối ở production. Duyệt qua tunnel: `tunelo http 4173:miu` → `https://miu.tunnel.inetdev.io.vn`, chạy preview với `MIU_PUBLIC_HOSTS=miu.tunnel.inetdev.io.vn` và server với `ALLOWED_ORIGINS` gồm origin đó.
- `jev-decide.py` cần `TYPESAFE_API_KEY` hoặc `TYPESAFE_TOKEN_FILE`; thiếu thì dừng, đừng tự tìm key.

## Quy trình

- Plan và report: `plans/dattqh/` (plan theo `{yymmdd-hhmm}-{slug}/`, report trong `plans/dattqh/reports/`).
- Mỗi đợt giao hàng kết thúc bằng một trang review cho người duyệt cuối (ảnh, bản chơi thử, số liệu hiệu năng, báo cáo bảo mật, dependency mới, bảng license) — trang hiện có: `apps/web/review.html`.
- Commit: conventional commits tiếng Anh (`feat(assets):`, `feat(poc):`, `docs(plans):`, `build:`); không nhắc AI; không ghi mã plan/phase trong code, tên test, commit.
- Thêm dependency mới: ghi vào trang review của đợt đó để người duyệt thấy.
- Tiến độ backlog và việc đã xong: `docs/project-roadmap.md` — cập nhật khi một task Master Plan đổi trạng thái.
- Credential SSH, máy staging/production và cách deploy: [`docs/deployment-guide.md`](docs/deployment-guide.md). Deploy, migration, restart ở production phải hỏi người trước mỗi lần.
