---
phase: 1
title: "Đồng bộ Master Plan + docs/rules"
status: completed
priority: P1
effort: "M"
dependencies: []
---

# Phase 1: Đồng bộ Master Plan + docs/rules (DOCS-01)

## Overview
Master Plan v3 là nguồn chuẩn. Ghi các quyết định đã chốt vào Master Plan trước, rồi viết lại `docs/`, `.claude/rules/`, `CLAUDE.md`, `README.md` theo Master Plan. Hiện các file này lấy phạm vi từ plan POC (người sở hữu xác nhận đã gán nhầm).

## Requirements
- Master Plan v3:
  - §1 danh sách "Đã chốt": thêm Q3–Q8 và stack web.
  - §5: Subject/Skill đã tách, Skill XP là phần thưởng MVP; Kim cương không dùng ở MVP (ẩn trên HUD).
  - §7 bảng kiến trúc: Vite + React SPA (bỏ Next.js, ghi lý do: game client-only, static hosting + CDN, CSP chặt không cần nonce); bridge tự viết (game phát event → store → React, React không điều khiển game loop), loại R3F; Drizzle + PostgreSQL, PGlite cho dev/test; cấu trúc `apps/web`, `apps/server`, `packages/{voxel,quest,schema}`.
  - §14: giữ số task, thêm cột/ghi chú stable ID (hoặc trỏ tới bảng ID trong roadmap).
  - §15: chuyển Q3–Q8 sang "Đã chốt" (#3–#8) kèm hệ quả; thêm #16 framework web, #17 ORM/DB, #18 bridge. Bảng "Còn cần bạn chốt" chỉ còn mục thật sự mở (nếu không còn thì ghi "Không còn").
- `docs/` (đọc từng file trước khi sửa, trỏ về Master Plan thay vì chép):
  - `project-overview-pdr.md`: bỏ "chờ chốt" ở non-goals và Subject/Skill; thêm tóm tắt luồng phụ huynh → hồ sơ trẻ → nhân vật (§9, §11).
  - `system-architecture.md`: "Kiến trúc đích" ghi stack đã chốt; sổ quyết định thêm Vite, Drizzle+PGlite, bridge, `packages/quest`; ranh giới hiện tại vẫn đúng với repo (chưa có web/server).
  - `project-roadmap.md`: task #1 xong; bảng stable ID ↔ task #; gate kế tiếp trỏ plan này.
  - `code-standards.md`: thêm chuẩn cho backend (test IDOR/chống gian lận bắt buộc, migration SQL được review), React (không state khung hình trong React).
  - `codebase-summary.md`, `design-guidelines.md`: chỉ sửa câu coi POC là sản phẩm; đường dẫn `apps/poc-voxel` giữ tới phase 7.
  - `docs/README.md`: cập nhật mô tả nếu đổi phạm vi file.
- `.claude/rules/` (mỗi rule có `paths:`; rule mới áp dụng cho đường dẫn chưa tồn tại là bình thường):
  - Mới `server-and-child-safety.md` (paths `apps/server/**`, `packages/schema/**`): server tính mọi thưởng/mở khóa; mọi endpoint kiểm quyền theo hồ sơ + test IDOR; không thu tên thật/email/trường của trẻ; không log dữ liệu trẻ; đổi cách thu/chia sẻ dữ liệu trẻ phải hỏi người; migration chỉ qua drizzle-kit.
  - Mới `web-ui.md` (paths `apps/web/src/ui/**`, `apps/web/src/game-bridge/**`): bám luồng mock (ghi `M?.?`), design token, React không giữ state theo khung hình, không script bên thứ ba.
  - Mới `quest-content.md` (paths `content/**`, `packages/quest/**`): quest bằng dữ liệu có schema, 8 pha + 7 câu, 3 lớp hỗ trợ, không import `three`.
  - Sửa `voxel-runtime.md`: nêu cả `apps/poc-voxel/**` (tạm) và `apps/web/src/game/**` (đích).
- `CLAUDE.md`: mô tả giai đoạn Foundation; gate và cổng (server dev dùng cổng cố định mới — xem phase 2); giữ ngắn.
- `README.md`: bỏ "Repo đang ở giai đoạn POC", mô tả giai đoạn hiện tại và lệnh chạy hiện có.

## Implementation Steps
1. Sửa Master Plan theo danh sách trên; grep lại "Next.js", "Còn mở", "chờ", "đề xuất" để không sót.
2. Sửa từng file `docs/`; mỗi khẳng định về hiện trạng phải kiểm bằng `ls`/`grep` trên repo.
3. Tạo 3 rule mới, sửa `voxel-runtime.md`.
4. Sửa `CLAUDE.md`, `README.md`.
5. Kiểm link tương đối trong `docs/`, `CLAUDE.md`, README trỏ đúng file tồn tại.

## Success Criteria
- [x] `grep -n "Next.js" docs CLAUDE.md README.md .claude` chỉ còn trong sổ quyết định (phương án bị loại)
- [x] Master Plan §15 không còn Q3–Q8 trong "Còn cần bạn chốt"
- [x] 4 rule trong `.claude/rules/` có front matter `paths:` hợp lệ
- [x] Link tương đối không gãy; 4 gate vẫn xanh (không đổi code)

## Risk Assessment
- Docs khẳng định hành vi chưa có. Xử lý: tách rõ "hiện có" và "đích" như `system-architecture.md` đang làm.
- Master Plan là file người sở hữu viết: chỉ ghi quyết định đã được duyệt (brainstorm report), không tự thêm quyết định mới.
