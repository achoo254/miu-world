---
handoff-version: 1
created: 2026-09-30 07:58 (Asia/Saigon)
focus: "pull code mới từ git về sau đó xem đang cần làm plan nào tiếp theo"
---

# Handoff — Bắt đầu Vertical slice MVP

## Mission and current status

Task focus (nguyên văn): "pull code mới từ git về sau đó xem đang cần làm plan nào tiếp theo".

- Đã xong trong phiên này: `git pull --ff-only` trên `main`, từ `45ac8ec` lên `4cb10fb` (24 commit mới, fast-forward, không xung đột). Đã rà mọi `plans/dattqh/*/plan.md`.
- Trạng thái plan:
  - `260929-0842-asset-sourcing-and-voxel-poc`: completed.
  - `260929-1911-foundation-after-poc-gate`: completed.
  - `260929-2141-vertical-slice-mvp`: **pending, là plan cần làm tiếp**. Đã có Red Team (38 phát hiện, 29 Accept đã sửa vào phase) và Validation (10 quyết định Jev); plan ghi "Không còn câu chặn".
- Còn lại: toàn bộ 10 phase của Vertical slice MVP, chưa phase nào bắt đầu (xác minh: `apps/web/src/ui/tokens.css`, `content/quests/`, `tools/content/` đều chưa tồn tại).
- Ưu tiên: P1, effort ghi trong plan "5-6w".

## Scope and guardrails

- Repo: `/Users/hoandat/inet-gitlab/miu-world`, remote `origin` = GitHub `achoo254/miu-world`, làm trên `main` (plan ghi `branch: main`; rule người dùng: không tự tạo branch/worktree/PR khi chưa được yêu cầu).
- Theo `CLAUDE.md`: chỉ dùng `pnpm`; gate trước khi báo xong `pnpm assets:check` → `pnpm test` → `pnpm typecheck` → `pnpm lint`; sửa `apps/web/**` chạy thêm `pnpm --filter @miu/web build` và E2E; không chạy project Playwright `perf` nếu không được yêu cầu.
- Không sửa tay `assets/manifest.json`, `assets/LICENSES.md` (sinh lại bằng `pnpm assets:manifest`).
- Không tính thưởng/XP/mở khóa ở client; đáp án quest không được vào bundle web.
- Thay đổi thu thập dữ liệu trẻ em, chi phí, pháp lý, phạm vi sản phẩm: hỏi người trước (gom một lần).
- Tôn trọng bảng sở hữu file giữa các phase trong `plan.md` khi chạy song song.
- Commit: conventional commits tiếng Anh, không nhắc AI, không ghi mã plan/phase trong code/test/commit.

## Current state

Quan sát trực tiếp từ probe:

- Branch: `main`
- HEAD: `4cb10fbb3f1cea7ca9f183282054c523c60ff86d` ("docs(plans): add the vertical slice MVP plan with red-team review and validation")
- Worktree: sạch trước và sau pull (`git status --short` rỗng), ngoài file handoff này (untracked, `plans/handoffs/` mới tạo).
- Code hiện có liên quan: `apps/web/src/ui/{account,play,api-client.ts,app-shell.tsx,fonts.css,styles.css}`, `packages/{quest,schema,voxel}`, `content/{accessories,animations,blocks.json,characters.json,faces,learning,legal,names,palette.json,progression}`.
- `CLAUDE.md` dòng "Giai đoạn hiện tại" vẫn ghi Foundation; plan Vertical slice (phase 10) có hạng mục cập nhật docs.
- Chưa kiểm: dependency đã cài khớp lockfile mới chưa (hook chặn đọc `node_modules`); pull mang về workspace `apps/web`, `apps/server` mới.

## Decisions and rationale

- Plan tiếp theo = Vertical slice MVP, vì hai plan trước `status: completed` và plan này `status: pending`, `blockedBy: []`, dependency ghi rõ tiếp nối Foundation.
- Thứ tự khởi động theo plan: phase 1 (SLICE-00, design token + UI kit + màn hệ thống, tier M) và phase 2 (SLICE-06, quest schema v2 + runtime + nội dung ch1, tier L) độc lập, chạy được song song; phase 3 (API gameplay) phụ thuộc 2, có thể song song với 1.
- Các quyết định đã chốt trong Validation (không mở lại): Home là màn React với ảnh đảo render sẵn; xem đáp án giảm 10% XP; không streak ở MVP; outfit chỉ Mũ + Balo + biến thể màu; Decision chỉ kể chuyện; offline chặn + thử lại; sao 3/2/1 lưu server; chỉ lưu bộ đếm theo step, không lưu nội dung trả lời; personality chỉ là nhãn; review iPad qua LAN + `PASSWORD_LOGIN=1`.
- Nguồn: `plans/dattqh/260929-2141-vertical-slice-mvp/plan.md` (Red Team Review, Validation Log), `plans/dattqh/reports/red-team-260929-vertical-slice-plan.md`, `plans/dattqh/reports/jev-260929-vertical-slice-validation.md`.

## Work performed

- `git fetch --all --prune` → `45ac8ec..4cb10fb main -> origin/main`.
- `git pull --ff-only` → thành công, thêm nhiều file (apps web/server, packages/schema, packages/quest, plans, reports, journals).
- Đọc `plan.md` của 3 plan, `phase-01-*.md`, `phase-02-*.md` của Vertical slice, `CLAUDE.md`.
- Không sửa code, không cài dependency, không chạy test.

## Verification

- Đã chạy: chỉ các lệnh git đọc/pull; kết quả như trên.
- Chưa chạy: `pnpm install`, 4 gate (`assets:check`, `test`, `typecheck`, `lint`), web build, E2E. Lý do: phiên này chỉ pull và xác định plan kế tiếp. Trạng thái xanh/đỏ của `main` sau pull chưa được xác minh cục bộ.
- Commit `6ae4d3c` sửa E2E movement (chờ theo quãng đường thay vì thời gian) — gợi ý E2E đó từng flaky.

## Open risks and blockers

- Không có blocker kỹ thuật trong plan. Việc của người (ngoài plan): giáo viên duyệt nội dung học, pháp chế duyệt consent draft-3, đo iPad Gen 10 (DEVICE-01), designer duyệt UI/mock voxel (#23), chơi thử với trẻ (#24), Google OAuth cho hostname https cố định nếu muốn thử Google trên iPad.
- Phase 1 cần tải thêm icon Fluent Emoji (ghim URL + sha256, `pnpm assets:fetch`) — cần mạng.
- `jev-decide.py` cần `TYPESAFE_API_KEY`/`TYPESAFE_TOKEN_FILE` nếu phát sinh quyết định mới; thiếu thì dừng, không tự tìm key.
- Phase 3 là phase duy nhất được sinh migration DB (`apps/server/drizzle/0002_*`); backup trước khi đụng dữ liệu thật.

## Exact next actions

1. **First safe step**: chạy `pnpm install` (lockfile mới từ pull), rồi chạy gate `pnpm assets:check && pnpm test && pnpm typecheck && pnpm lint` để xác nhận `main` xanh trước khi sửa gì.
2. Đọc đầy đủ `plans/dattqh/260929-2141-vertical-slice-mvp/phase-01-design-tokens-and-ui-kit.md` và `phase-02-quest-schema-runtime-content.md`, cùng `docs/design-guidelines.md`, `docs/code-standards.md`, `.claude/rules/web-ui.md`.
3. Bắt đầu phase 1 và phase 2 (độc lập; nếu chạy song song thì giữ đúng bảng sở hữu file trong `plan.md`). Mỗi phase làm test trước theo mục Steps, rồi chạy Verification của phase đó.
4. Sau phase 2: phase 3 (API gameplay, migration `0002_*`, consent draft-3); sau phase 1: phase 4 (Character Creator) song song được với 3.
5. Cập nhật `status` trong phase file và bảng Phases của `plan.md` khi mỗi phase xong; cập nhật `docs/project-roadmap.md` khi task Master Plan đổi trạng thái.

## Source pointers

- Plan kế tiếp: `plans/dattqh/260929-2141-vertical-slice-mvp/plan.md` và `phase-01` … `phase-10`.
- Plan đã xong: `plans/dattqh/260929-1911-foundation-after-poc-gate/plan.md`, `plans/dattqh/260929-0842-asset-sourcing-and-voxel-poc/plan.md`.
- Reports: `plans/dattqh/reports/red-team-260929-vertical-slice-plan.md`, `plans/dattqh/reports/jev-260929-vertical-slice-validation.md`, `plans/dattqh/reports/foundation-review-260929.md`, `plans/dattqh/reports/brainstorm-260929-1905-next-steps-after-poc-gate.md`.
- Quy tắc repo: `CLAUDE.md`, `docs/README.md`, `docs/code-standards.md`, `docs/design-guidelines.md`, `docs/project-roadmap.md`, `.claude/rules/`.
- CI: `.github/workflows/ci.yml`.
- Master Plan v3: ở gốc repo (theo `CLAUDE.md`).
