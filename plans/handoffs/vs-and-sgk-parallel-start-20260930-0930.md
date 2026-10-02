---
handoff-version: 1
created: 2026-09-30 09:30 (Asia/Saigon)
focus: "Chạy song song: vertical slice MVP (main) và nội dung SGK lớp 2 (worktree) bằng /ak:cook"
supersedes: plans/handoffs/vertical-slice-mvp-start-20260930-0758.md
---

# Handoff — hai phiên cook song song

## Current state (đã kiểm lúc 09:30)
- `main` tại `77f7b30` (docs trỏ hai phiên), chưa push; worktree branch đã fast-forward tới cùng commit. Commit gần đây của phiên này: `639b1a3` quest schema v2, `03ad4a8` docs phase 2, `992d783` API gameplay (VS phase 3), `7a1b379` plan SGK + report Jev. Một phiên khác cũng commit lên `main` (deploy: `1d429b5`, `b1e676b`, `4c3bf06`) — chỉ `git add` file mình sở hữu, không `-A`/stash/reset.
- Worktree: `/Users/hoandat/inet-gitlab/miu-world-sgk`, branch `dattqh/feat/sgk-lop2-content` (ở `77f7b30`), đã `pnpm install`. File handoff này chỉ nằm ở thư mục `main` (untracked) — phiên B đọc bằng đường dẫn tuyệt đối.
- Gate trên `main` sau khi gộp commit deploy: `assets:check`, `content:check`, `test` (31 file/232 test), `typecheck`, `lint` xanh; E2E setup/account/play 8/8; `drizzle-kit check` sạch; `pnpm --filter @miu/server bundle` build được.

## Phiên A — Vertical slice (thư mục `/Users/hoandat/inet-gitlab/miu-world`, branch `main`)
- Plan: `plans/dattqh/260929-2141-vertical-slice-mvp/plan.md`. Xong: phase 2 (quest schema v2), phase 3 (API gameplay). Tiếp theo: **phase 1** (design token + UI kit + màn hệ thống; khai báo trước project Playwright và `e2e:ci`), rồi 4 ‖ 5, 6, 7, 8, 9, 10.
- Lệnh: `/ak:cook plans/dattqh/260929-2141-vertical-slice-mvp/plan.md`
- Lưu ý: phase 5 đã có hợp đồng chương gom nhiều quest (D6 của plan SGK). Phase 1 nên để `e2e:ci` chạy mọi project trừ `perf` để các project SGK (`speak`, `sgk-mechanics`, `sgk-content`) tự vào CI.

## Phiên B — Nội dung SGK (thư mục `/Users/hoandat/inet-gitlab/miu-world-sgk`, branch `dattqh/feat/sgk-lop2-content`)
- Plan: `plans/dattqh/260930-0846-sgk-lop2-game-content/plan.md` (10 phase, red team + validation Jev xong, không câu chặn). Bắt đầu được ngay: **phase 1** (kiểm kê SGK, đọc 2 lượt) ‖ **phase 2** (schema cơ chế mới + `draft`).
- Lệnh (chạy trong worktree): `/ak:cook plans/dattqh/260930-0846-sgk-lop2-game-content/plan.md`
- Nguồn PDF ở iCloud (đường dẫn trong phase 1); script phase 1 copy về `.data/sgk/` rồi tách trang. `.data/` của worktree là riêng, không dùng chung với `main`.
- Merge về `main` sau mỗi phase (rebase lên `main` trước). Tôn trọng bảng "File dùng chung với VS" trong `plan.md`.

## Quyết định và chỉ thị
- Người sở hữu: bảo mật, dữ liệu trẻ, bản quyền SGK chưa phải mối quan tâm; dùng nội dung SGK nguyên văn là quyết định đã chốt. Quyết định treo giao TypeSafe Jev (`tools/decisions/jev-decide.py`, `TYPESAFE_TOKEN_FILE` trỏ file token trong iCloud, không in khóa), dùng lựa chọn Jev kể cả khi `escalate`. Chi tiết: `plans/dattqh/reports/jev-260930-sgk-plan-decisions.md`.

## Rủi ro đã biết
- Test chập chờn khi máy tải nặng (có từ trước): `apps/server/src/auth/auth-routes.test.ts` (khóa PIN/rate limit nhận 404 hoặc 401 thay vì 423/429, ~1/5–1/8 lần; tái hiện cả trên code gốc) và thỉnh thoảng 503 `server-busy` (hàng đợi hash) trong test quest. Chưa điều tra nguồn 404 (không đến từ handler unlock). CI Ubuntu ít tải hơn.
- Hook môi trường chặn mọi lệnh Bash chứa chữ "cover-age" (viết liền) và đọc `node_modules`: vì vậy lệnh đo phủ tên là `pnpm content:gaps`, file HTML là `.data/sgk/phu-noi-dung.html`; không đặt tên file/script chứa chữ đó.
- `pnpm audit`, Semgrep chỉ chạy trên CI.
