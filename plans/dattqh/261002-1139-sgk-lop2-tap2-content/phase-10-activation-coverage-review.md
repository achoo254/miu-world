---
phase: 10
title: "Kích hoạt, cổng phủ 100%, trang review"
status: pending
priority: P1
effort: "M"
dependencies: [4, 5, 6, 7, 8, 9]
---

# Phase 10: Kích hoạt, cổng phủ 100%, trang review

## Goal
Mọi quest tập 2 chuyển `active`, phủ 100% hai sách tập 2 thành cổng lỗi trong `content:check` (cùng tập 1), trang review và roadmap cập nhật, merge worktree vào `main`.

## Khuôn
Phase 10 của tập 1 (`plans/dattqh/260930-0846-sgk-lop2-game-content/phase-10-completeness-review-gate.md`).

## Requirements
- `content:check`: độ phủ 100% bốn sách là lỗi khi tụt; `pnpm content:gaps --review` ghi số liệu cho trang review.
- E2E `sgk-content`: đếm 70 + 71 quest đang chơi; chương đầu và cuối mỗi vùng (9 vùng) thấy chỗ đầu tiên; hai quest tập 2 chơi trọn.
- Trang review `apps/web/review.html`: mục tập 2 (bảng bài → map, ảnh trò chơi mới, ảnh Đảo bí ẩn cạnh mock, độ phủ), dependency mới nếu có.
- `docs/project-roadmap.md`, Master Plan §4 (bảng bài theo map), `CLAUDE.md` (giai đoạn hiện tại, map thứ 9).
- Merge worktree `../miu-world-sgk2` vào `main` (rebase trước), dọn worktree sau khi người duyệt.

## Validation
- Đủ gate: `assets:check` → `content:check` → `test` → `typecheck` → `lint`, build web, `security:dist`, `e2e:ci` (≤ 480 s).
