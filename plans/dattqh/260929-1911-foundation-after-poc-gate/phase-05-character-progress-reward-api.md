---
phase: 5
title: "API nhân vật, tiến độ, thưởng"
status: completed
priority: P1
effort: "M"
dependencies: [4]
---

# Phase 5: API nhân vật, tiến độ, thưởng (FOUNDATION-04, task #8 + phần server của #19)

## Overview
Server là nguồn sự thật cho nhân vật, tiến độ quest và thưởng (§8, §9). Logic tiến trình bước + tính thưởng + level nằm trong `packages/quest` (TS thuần) để web dùng lại khi dự đoán hiển thị. Quest runtime đầy đủ (trigger, interaction, challenge) là SLICE, không thuộc phase này.

## Requirements
- `packages/quest` (`@miu/quest`, không import `three`):
  - `completeStep(def, progress, stepId)` → `{ progress, reward | null }` hoặc lỗi `unknown-step` / `out-of-order` / `already-completed`; bước theo thứ tự tuyến tính của `def.steps`; thưởng chỉ khi hoàn thành bước cuối, lấy từ `def.reward`.
  - `levelFromXp(xp, curve)`; curve trong `content/progression/level-curve.json`.
- API (mọi route qua `requireActiveChild`):
  - `GET /api/character`, `PUT /api/character` (tên từ danh sách, `equipped` chỉ gồm accessory id có trong `content/accessories/`; loài cố định `cat` ở MVP)
  - `GET /api/progress` (quest progress + tổng XP, level, Xu, Skill XP, vật phẩm)
  - `POST /api/quests/:questId/steps/:stepId/complete` — body rỗng; server tìm quest trong catalog nội dung, kiểm mở khóa (`unlock` của quest trước), gọi `completeStep`, ghi `quest_progress` + `reward_ledger` + bảng tổng hợp trong một transaction; idempotent (lặp lại trả kết quả cũ, không cộng thêm)
  - `GET /api/inventory`
- Catalog quest: nạp từ `content/quests/*.json`, validate bằng `QuestDefinition` lúc khởi động; phase này chưa có quest thật — test dùng fixture trong `apps/server/test/fixtures/`.
- Kim cương không có trong DTO (Q6).

## Implementation Steps
1. Test trước `packages/quest`: thứ tự bước, lặp bước, bước lạ, thưởng chỉ ở bước cuối, level curve biên.
2. Test trước API (chống gian lận): body chứa `xp`/`reward` bị bỏ qua; gọi lặp không cộng thưởng; nhảy bước → 409; quest chưa mở khóa → 409; hồ sơ khác phụ huynh → 404; không có hồ sơ active → 401; hai request đồng thời cùng bước chỉ ghi 1 ledger (ràng buộc unique + transaction).
3. Viết `packages/quest`, service + route, loader catalog.
4. Cập nhật `system-architecture.md` (ranh giới server/quest) nếu khác phase 1.

## Success Criteria
- [x] Toàn bộ test chống gian lận + IDOR pass trên PGlite và Postgres CI
- [x] Tổng trong bảng tổng hợp luôn bằng tổng ledger (test kiểm sau chuỗi thao tác ngẫu nhiên có seed)
- [x] `packages/quest` không import `three`/DOM (lint rule `no-restricted-imports`)

## Risk Assessment
- Race khi 2 tab cùng hoàn thành bước. Xử lý: unique (child_id, source) + `ON CONFLICT DO NOTHING` trong transaction.
- Thiết kế bước tuyến tính quá hẹp cho SLICE (bước song song, lựa chọn). Xử lý: chấp nhận; mở rộng `completeStep` ở task #15 với test giữ nguyên hành vi tuyến tính.
