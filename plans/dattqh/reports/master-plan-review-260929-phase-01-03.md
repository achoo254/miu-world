# Review Master Plan: phase 1–3 (Foundation)

Ngày: 2026-09-29. Người review: master-plan-reviewer. Phạm vi: `plans/dattqh/260929-1911-foundation-after-poc-gate/` phase 1, 2, 3 (thay đổi chưa commit).

## Verdict

| Phase | Verdict | Lý do ngắn |
| --- | --- | --- |
| 1 DOCS-01 | PASS | Master Plan, docs, rules, CLAUDE.md, README khớp plan; 4 rule có `paths:` |
| 2 FOUNDATION-01 | CẦN LÀM TIẾP | `vite build` của `apps/web` đỏ (thiếu `styles.css`); chưa có gate nào bắt lỗi build web |
| 3 FOUNDATION-03 | PASS (có điều kiện) | Đạt mọi tiêu chí kiểm được ở máy local; phần Postgres 17 trên CI chưa xác minh được tới khi push |

## Lệnh đã chạy và kết quả

| Lệnh | Kết quả |
| --- | --- |
| `pnpm assets:check` | OK, 12 packs, 1060 files |
| `pnpm typecheck` | xanh (poc-voxel, server, web) |
| `pnpm lint` | xanh (exit 0, `--max-warnings=0`) |
| `pnpm test` (toàn bộ) | 92 pass, 1 skip, **1 fail**: `apps/server/src/auth/auth-routes.test.ts:84` (phase 4 đang làm, ngoài phạm vi review này) |
| `pnpm vitest run apps/server/src/db apps/server/src/app.test.ts apps/server/src/config.test.ts apps/web packages` | 10 file, 55 test pass |
| `pnpm --filter @miu/server db:check` | "Everything's fine" |
| `pnpm audit --prod --audit-level=high` | No known vulnerabilities |
| `pnpm --filter @miu/poc-voxel e2e --project poc` | 5/5 pass (POC không bị hỏng) |
| `pnpm --filter @miu/server start` (25 giây, đã tự dừng) | `/api/health` 200, route lạ 404 `{"error":"not-found"}`, PGlite dev tạo ở `.data/pglite` (bị ignore) |
| `pnpm --filter @miu/web build` | **ĐỎ**: `[UNRESOLVED_IMPORT] Could not resolve './ui/styles.css' in src/main.tsx` |

## Phase 1 — chi tiết

Đạt:
- Master Plan §1 (Q3–Q8 + stack web), §5 (Subject/Skill, Kim cương không dùng), §7 (Vite + React, bridge, Drizzle + PGlite, cấu trúc repo, luồng dữ liệu), §14 (ghi chú mã ổn định, `pnpm audit`), §15 (#3–#8 và #16–#18 chuyển sang "Đã chốt", "Còn cần bạn chốt: Không còn"). Nội dung khớp `brainstorm-260929-1905-next-steps-after-poc-gate.md:14-22`.
- `grep "Next.js"` trong docs, CLAUDE.md, README, `.claude`: chỉ còn `docs/system-architecture.md:55` (cột phương án bị loại) — đúng tiêu chí.
- 3 rule mới + `voxel-runtime.md` sửa đều có front matter `paths:` hợp lệ, nội dung khớp yêu cầu phase (server-and-child-safety, web-ui, quest-content).
- `docs/`: project-overview-pdr (bỏ "chờ chốt", thêm luồng tài khoản), system-architecture (kiến trúc đích + sổ quyết định), project-roadmap (task #1 xong, bảng mã ổn định, gate kế tiếp), code-standards (mục Backend, React), codebase-summary, design-guidelines đều đã cập nhật.

Ghi chú nhỏ (không chặn PASS):
- `CLAUDE.md` "Cổng cố định ... (`--strictPort`)" gộp cả server 8787 vào; server không dùng `--strictPort` (listen thẳng, lỗi EADDRINUSE tự dừng). Nên sửa câu cho đúng.
- Master Plan §1 danh sách "Đã chốt" đánh số 1–9 riêng, không trùng số §15 (ví dụ §1 #9 = stack web, §15 #9 = nguồn asset). Lệch này có từ trước; chỉ cần đổi "chi tiết ở mục 15" thành không ám chỉ số trùng, hoặc bỏ qua.
- `docs/system-architecture.md` sổ quyết định đã ghi session cookie + scrypt (phase 4 đang làm). Chấp nhận vì nằm ở "sổ quyết định", nhưng phải đúng khi phase 4 xong.

## Phase 2 — chi tiết

Đạt:
- `apps/server`: Express 5, cổng 8787 chỉ loopback, `app.ts` tách `server.ts`, config Zod fail-sớm (production bắt buộc `ALLOWED_ORIGINS`, `DATABASE_URL`), helmet, JSON limit 32kb, handler lỗi không lộ stack. Test `apps/server/src/app.test.ts`: health 200, 404 JSON, 413, JSON hỏng 400 không stack, header bảo mật.
- `apps/web`: Vite 8, React 19, React Router (`react-router` ^8), cổng dev 5174 / preview 4174 `--strictPort`, proxy `/api` → 8787. Test shell bằng Testing Library + jsdom (2 case).
- Root: `typecheck` chạy mọi project, vitest 2 project (node + web/jsdom), ESLint `react-hooks` cho `apps/web/**`, `.gitignore` có `.data/`.
- CI `.github/workflows/ci.yml` (đổi tên từ `assets.yml`): 4 gate + `pnpm audit --prod --audit-level=high`, job Semgrep CE (`p/typescript`, `p/nodejs`, `--error`, chỉ quét `apps packages`), job integration Postgres 17.
- `packages/quest` không bị tạo sớm (đúng yêu cầu).

Thiếu / sai (làm tiếp theo thứ tự nghiêm trọng):

1. [CAO] `apps/web/src/main.tsx:5` import `./ui/styles.css` nhưng file không tồn tại (`ls apps/web/src/ui` chỉ có `app-shell.test.tsx`, `app-shell.tsx`, `use-server-health.ts`, thư mục `account/` mới thêm cũng không có css). Hậu quả: `pnpm --filter @miu/web build` đỏ, và `dev` cũng sẽ lỗi khi tải trang. Không gate nào bắt được vì typecheck/lint/test không build. Việc phải làm: tạo `apps/web/src/ui/styles.css` (biến CSS token dùng lại từ `apps/poc-voxel/src/styles.css` theo `docs/design-guidelines.md`, không hardcode màu mới), rồi chạy lại `pnpm --filter @miu/web build` tới khi xanh.
2. [CAO] Thêm bước build web vào gate để lỗi loại này không lọt lần nữa: một step `pnpm --filter @miu/web build` trong job `check` của `ci.yml` (và ghi vào mục Lệnh của `CLAUDE.md`). Không có step này thì tiêu chí "web hiển thị shell" không có gate bảo vệ.
3. [TRUNG BÌNH] Tiêu chí "`pnpm --filter @miu/web dev` hiển thị shell ở 5174 và gọi được `/api/health` qua proxy" chưa có bằng chứng: reviewer không xác minh được vì web không tải được (mục 1). Sau khi sửa mục 1, chạy web dev + server dev, `curl http://127.0.0.1:5174/api/health` phải trả `{"status":"ok"}`; ghi kết quả vào phase file hoặc report của implementer. Nhắc: cổng 5173 hiện đang có tiến trình khác giữ (PID 11604) — không phải cổng web, không đụng.
4. [THẤP] CSP của web chỉ được chèn khi build (`apply: 'build'`), khác plan ghi "`index.html` với CSP như POC". Lý do (preamble Fast Refresh inline) hợp lý và đã ghi trong comment `vite.config.ts`; chấp nhận, nhưng cần: một test/E2E kiểm `dist/index.html` có meta CSP đúng chuỗi (`CONTENT_SECURITY_POLICY` đã export sẵn). Hiện chưa có test nào giữ điều này.
5. [THẤP] Semgrep và CI chưa từng chạy (chưa push, máy không có Docker). Tiêu chí "CI xanh với `pnpm audit` và Semgrep" chỉ đóng được sau lần push đầu; giữ mục này mở trong phase 8, không đánh dấu xong sớm.

Cần cập nhật `plan.md` / phase file: trạng thái phase còn ghi `Pending` (plan.md bảng Phases, phase-0x front matter). Implementer nên đánh dấu tiến độ trung thực (phase 2 chưa "completed" cho tới khi mục 1–3 xong).

## Phase 3 — chi tiết

Đạt:
- `apps/server/src/db/schema.ts` đủ 9 bảng theo phase (parents, sessions, consents, child_profiles, characters, quest_progress, reward_ledger, inventory_items, skill_progress); mọi bảng con FK `ON DELETE CASCADE`; `reward_ledger` unique `(child_id, source)`; `child_profiles` chỉ `display_name` (không tuổi/lớp/năm sinh — đúng quyết định Jev #1 và Master Plan §9); id sinh ở ứng dụng, không cần extension. `sessions.parent_gate_until` là cột thêm cho PIN phụ huynh (phase 4), hợp lý.
- Migration `apps/server/drizzle/0000_initial-schema.sql` + `meta/` được commit-ready; `drizzle-kit check` sạch; không dùng `push`.
- `db/client.ts`: `DATABASE_URL` → node-postgres; không có → PGlite file `.data/pglite` (dev) hoặc in-memory (test); migrate lúc mở; `createTestDb()` tạo DB riêng mỗi file khi có `DATABASE_URL` (cùng một file test chạy được trên cả hai backend).
- Test `apps/server/src/db/schema.test.ts`: email trùng bị từ chối, ledger unique + `onConflictDoNothing`, xóa hồ sơ trẻ xóa sạch 5 bảng con và null hóa `active_child_id`, xóa parent xóa sạch profile/session/consent/dữ liệu con. Cả 4 pass.
- `packages/schema`: Zod cho Id, Email (lower-case), mật khẩu 10–128, PIN 4–6 số, DTO (`ParentDto` loại hash — có test), `QuestDefinition`, `SkillCatalog`, `NameList`, `ConsentDocument`. `content/learning/skills.json` được validate trong `packages/schema/src/content.test.ts`.
- `.data/` bị ignore (`git check-ignore` xác nhận); fixture chỉ dữ liệu giả (`example.vn`, `test-password-*`).
- CI job `integration` dùng `postgres:17`, `DATABASE_URL`, chạy `pnpm vitest run --project node apps/server`.

Còn mở (không chặn, nhưng phải đóng sau lần push đầu):
- Nhánh Postgres của `createTestDb()` (CREATE DATABASE theo file, DROP khi đóng) chưa từng chạy vì máy dev không có Postgres. Đây là rủi ro lớn nhất của phase 3; sau khi push phải xem job `integration` xanh. Nếu đỏ, sửa ngay ở `client.ts`, không nới test.
- Tiêu chí "cùng file test pass trên Postgres 17" do đó là điều kiện, chưa phải bằng chứng.

## Quyết định Jev

Không có câu hỏi mới cần người quyết trong lần review này; không gọi Jev. Các quyết định trước (plan.md Validation Log) được triển khai đúng: chỉ tên hiển thị, PIN phụ huynh, xóa cứng cascade, email hoãn, Semgrep CE, React Router.

## Việc implementer phải làm (ưu tiên)

1. Tạo `apps/web/src/ui/styles.css`; `pnpm --filter @miu/web build` xanh.
2. Thêm step build web vào CI (job `check`) và vào mục Lệnh `CLAUDE.md`.
3. Xác minh web dev + proxy `/api/health` qua 5174 và ghi bằng chứng.
4. Thêm test giữ CSP của bản build web (đọc `dist/index.html` hoặc gọi plugin).
5. Sửa câu `--strictPort` trong `CLAUDE.md` mục "Dễ vấp" cho đúng với server.
6. Cập nhật trạng thái phase trong `plan.md` trung thực.
7. Sau push đầu: đọc kết quả CI (`check`, `integration`, `sast`) và báo lại reviewer.

Câu hỏi chưa giải quyết: không có.
