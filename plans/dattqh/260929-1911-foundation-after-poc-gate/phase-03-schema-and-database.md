---
phase: 3
title: "Schema + database"
status: pending
priority: P1
effort: "M"
dependencies: [2]
---

# Phase 3: Schema + database (FOUNDATION-03)

## Overview
Data model Master Plan §11 ở mức Foundation cần: tài khoản, hồ sơ trẻ, đồng ý, nhân vật, tiến độ quest, sổ thưởng, túi đồ, kỹ năng. Drizzle trên Postgres; PGlite cho dev/test (máy dev không có Docker/psql), Postgres thật trong CI.

## Requirements
- `apps/server/src/db/schema.ts` (Drizzle `pg-core`):
  - `parents` (id uuid, email unique lower-case, password_hash, pin_hash, pin_failed_count, created_at)
  - `sessions` (id = sha256 của token, parent_id, active_child_id nullable, created_at, last_seen_at, expires_at)
  - `consents` (id, parent_id, policy_version, accepted_at)
  - `child_profiles` (id, parent_id FK, display_name, created_at) — chỉ tên hiển thị chọn từ danh sách; không tuổi, lớp, năm sinh. Mọi bảng con (characters, quest_progress, reward_ledger, inventory_items, skill_progress) FK `ON DELETE CASCADE` để xóa hồ sơ là xóa hẳn dữ liệu
<!-- Updated: Validation Session 1 - chỉ tên hiển thị; xóa cứng cascade; PIN phụ huynh -->
  - `characters` (child_id PK/FK, species `cat`, name, equipped jsonb)
  - `quest_progress` (child_id, quest_id, completed_steps text[], completed_at nullable; PK child_id+quest_id)
  - `reward_ledger` (id, child_id, source `quest-step:<quest>/<step>` unique theo child, xp, coins, skill_xp jsonb, items jsonb, created_at) — append-only, là nguồn tính tổng
  - `inventory_items` (child_id, item_id, qty) và `skill_progress` (child_id, skill_id, xp) — bảng tổng hợp cập nhật cùng transaction với ledger
- Migration: `drizzle-kit generate` → SQL trong `apps/server/drizzle/`, commit, review như code; không `push` lên DB thật.
- `apps/server/src/db/client.ts`: `DATABASE_URL` (postgres) → `drizzle-orm/node-postgres`; không có → PGlite file `.data/pglite` (dev) hoặc in-memory (test). Chạy migration lúc khởi động dev/test.
- `packages/schema`: Zod cho id, email, mật khẩu (độ dài 10–128), DTO public (không bao giờ có `password_hash`), schema nội dung `QuestDefinition` (id, region, steps[{id}], reward{xp,coin,skillXp,items}, unlock[]) theo §11, `SkillCatalog`.
- `content/learning/skills.json`: Subject (Toán, Tiếng Việt, English) → Skill (id kebab-case), validate bằng `SkillCatalog` trong test.
- CI: job integration dùng `services: postgres:17`, `DATABASE_URL` trỏ vào đó, chạy cùng bộ test DB.

## Implementation Steps
1. Test trước: migration chạy sạch trên PGlite in-memory; ràng buộc unique email, unique (child, source) ở ledger; xóa parent hoặc hồ sơ trẻ xóa sạch mọi dòng con (cascade); Zod DTO loại `password_hash`.
2. Viết schema Drizzle, sinh migration, client factory, helper test `createTestDb()`.
3. Viết Zod trong `packages/schema`, `skills.json` + test validate.
4. CI job Postgres.

## Success Criteria
- [ ] Test DB pass trên PGlite (local) và Postgres 17 (CI) với cùng file test
- [ ] Migration SQL có trong repo, `drizzle-kit check` sạch
- [ ] `.data/` bị ignore; không có dữ liệu thật trong fixture

## Risk Assessment
- Khác biệt PGlite/Postgres (extension, `gen_random_uuid`). Xử lý: sinh uuid ở ứng dụng (`crypto.randomUUID`), không dùng extension.
- Thêm trường dữ liệu trẻ sau này (ví dụ lớp học để chỉnh nội dung) là đổi cách thu thập dữ liệu trẻ → phải hỏi người sở hữu trước, không tự thêm.
