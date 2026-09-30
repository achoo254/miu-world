---
phase: 10
title: "Kích hoạt, cổng 100%, trang review"
status: pending
priority: P1
effort: "M"
dependencies: [1, 2, 3, 4, 5, 6, 7, 8, 9]
---

# Phase 10: Kích hoạt, cổng 100%, trang review

## Goal
Đưa toàn bộ nội dung SGK vào game thật (draft → active, nối với chương 1), khóa mục tiêu "100% nội dung hai sách có trong kịch bản game" bằng CI, và đưa bằng chứng cho người duyệt cuối.

## Điều kiện bắt đầu
VS phase 10 đã merge vào `main` (D7); phase 1–9 của plan này xong.

## Requirements
- Kích hoạt (một commit):
  - `forest-ch1.json`: `unlock` = `["tv2-t01-b01", "toan2-cd1-b01"]`; xóa `forest-ch2.json`.
  - Mọi `tv2-*`/`toan2-*` đổi `status: "active"` (target đã có trên map từ phase 9); chuỗi `unlock` đủ, không còn id chưa có file.
  - Cập nhật test đang nhắc `forest-ch2`: `apps/server/src/content/content-catalog.test.ts:22-25`, `packages/schema/src/game.test.ts` (chuyển kiểm stub sang fixture `quest-soon`), `apps/server/src/quest/quest-routes.test.ts` (đoạn chơi ch1 thật: `unlocked` mới), và spec E2E VS nhắc "mở khóa ch2".
- `content:check` LỖI khi độ phủ < 100% (bật trong `check-curriculum.ts`).
- `pnpm content:coverage --html .data/sgk/coverage.html`: bảng sách → bài → item → trang SGK → quest/bước/phiếu phủ → cơ chế, cho giáo viên đối chiếu.
- E2E `apps/web/e2e/sgk-content.spec.ts` (project `sgk-content` trong `playwright.config.ts`): chơi trọn `tv2-t01-b01` và `toan2-cd1-b01` trên web (mọi cơ chế của hai bài), có hỗ trợ học, nhận thưởng; một bước `speak` với micro giả; một bước `worksheet`.
- Trang review (`apps/web/review.html`, phần mới): độ phủ theo sách/chủ đề, ảnh từng cơ chế, 2 phiếu in mẫu, danh sách "chờ giáo viên duyệt".
- Docs: `docs/project-roadmap.md` (dòng nội dung SGK lớp 2), `docs/system-architecture.md` (kiểm kê, phủ, draft, thu âm trên máy), Master Plan §4 (Khu rừng 19 chương, Trường học có Toán lớp 2) và §15 (D1–D7), `CLAUDE.md` (lệnh `content:coverage`, thư mục `content/curriculum`, không commit PDF/ảnh trang).

## Files
- Create: `apps/web/e2e/sgk-content.spec.ts`, `plans/dattqh/reports/sgk-review-*.md`
- Modify: `content/quests/forest-ch1.json`, `content/quests/tv2-*.json`, `content/quests/toan2-*.json` (status), `tools/content/check-curriculum.ts`, test nêu trên, `apps/web/playwright.config.ts`, `apps/web/review.html`, `apps/web/src/review/review-main.ts`, docs như trên; Delete: `content/quests/forest-ch2.json`

## Steps
1. Rebase lên `main` sau VS 10; kích hoạt; sửa test theo danh sách; gate xanh.
2. Bật lỗi phủ; `content:coverage` 100%.
3. E2E, trang review, docs, report; reviewer độc lập (`code-reviewer`) theo `docs/code-standards.md`; merge vào `main`.

## Verification
- `pnpm assets:check` → `pnpm content:check` → `pnpm test` → `pnpm typecheck` → `pnpm lint`; `pnpm --filter @miu/web build`; `pnpm --filter @miu/web e2e:ci`

## Risk
- Giáo viên sửa nội dung sau duyệt: sửa quest JSON/kiểm kê, `content:check` + coverage chạy lại; id item kiểm kê không đổi.
