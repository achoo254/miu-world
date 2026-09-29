---
phase: 4
title: "Character Creator + trang phục voxel"
status: pending
priority: P1
effort: "L"
dependencies: [1]
---

# Phase 4: Character Creator + trang phục voxel (SLICE-01, task #10, #9 mở rộng)

## Goal
Bé chọn Mèo, đặt tên, đổi trang phục và thấy ngay trên nhân vật voxel 3D, xem 4 hoạt ảnh, rồi vào thế giới (Master Plan §16 tiêu chí 1; mock M1.2, M1.3).

## Requirements
- Luồng: hồ sơ mới (chưa tạo nhân vật) → `/create` bắt buộc trước Home; hồ sơ đã tạo vào được `/create` để sửa từ Home/Hồ sơ.
<!-- Updated: Validation - Jev outfit_slots_mvp=hat_backpack_plus_color_variants (0.98/0.96): MVP giữ 2 slot Mũ và Balo, thêm món và biến thể màu; Áo, Giày, Cánh hiện ô khóa "Sắp có" (V1). Jev character_personality_field=cosmetic_not_stored (0.91/0.81, high nên script chuyển người; theo phương án thu ít dữ liệu nhất): Tính cách chỉ là nhãn hiển thị, KHÔNG lưu cột nào. Lệch nhẹ Master Plan §5 (liệt kê Áo, Giày, Cánh), vẫn đạt §16 tiêu chí 1 -->
- Bước 1 chọn loài (M1.2): Mèo mở; Thỏ, Cáo, Gấu hiện khóa "Sắp có" (V1). Bước 2–4 (M1.3): Trang phục theo nhóm Mũ, Balo (mở) và Áo, Giày, Cánh (ô khóa "Sắp có", không có dữ liệu); đồ khóa hiện ổ khóa kèm điều kiện (level/quest); Tên (chọn từ `content/names/character-names.json`); Tính cách hiển thị nhãn cố định "Nhà thám hiểm" (không dropdown lưu, không cột DB, không trường trong API); Xem trước với 4 nút Vẫy tay, Nhảy, Ngáp, Vui mừng.
<!-- Updated: Red Team - phase 4 và 6 chạy song song; sửa game.ts ở phase 4 sẽ đụng phase 6 -->
- Preview 3D: renderer riêng nhẹ trong `apps/web/src/game/preview/character-preview.ts` (cảnh nhỏ, 1 nhân vật, xoay bằng kéo), KHÔNG sửa `game.ts` (phase 6 sở hữu) — không import React vào runtime; đổi đồ cập nhật qua lệnh bridge `set-outfit` đã khai báo ở phase 1 (không remount); preview dispose khi rời `/create`.
- Asset trang phục mới bằng JSON voxel (`content/accessories/`): thêm ≥ 2 mũ và ≥ 1 balo mới cùng biến thể màu cho mũ phù thủy và balo hiện có (ví dụ `hat-witch-blue`, `backpack-green`); mỗi món 1 draw call, ≤ ngân sách tam giác (validator hiện có). Dùng slot hiện có (`hat`, `back`); KHÔNG thêm slot mới (`ACCESSORY_SLOTS` giữ nguyên). Hệ số `accessoryScale` (`head`, `torso`) của `miu-cat` đã đủ cho hai slot này.
- Điều kiện mở khóa đồ ở `content/accessories/*.json` (`unlock: { level?: n, quest?: id }`; ít nhất một món mở bằng hoàn thành `forest-ch1` để có lý do quay lại); server `PUT /api/character` từ chối đồ chưa mở (tính từ tổng XP/level và `quest_progress` của hồ sơ; hiện chỉ kiểm catalog — nợ đã ghi) + test chống gian lận (đồ khóa, đồ lạ, 2 món cùng slot, đồ đã mặc bị khóa lại vẫn đọc được nhưng không đổi được).
- Không đổi schema DB và không thêm trường vào `CharacterDto` ở phase này (không migration).
- Ảnh review sinh bằng `render-preview.ts` cho từng món.

## Files
- Create: `apps/web/src/ui/creator/*.tsx` (+ test), `apps/web/src/game/preview/character-preview.ts`, `content/accessories/*.json` (mới), `apps/web/e2e/creator.spec.ts`
- Modify: `packages/voxel/src/accessory-schema.ts` (thêm `unlock`), `apps/server/src/character/character-routes.ts`, `tools/assets/render-preview.ts`, `apps/web/src/ui/app-shell.tsx`
- Không chạm: `game.ts`, `game-store.ts` (kiểu đã khai báo ở phase 1), `apps/server/src/db/schema.ts`, `playwright.config.ts` (project `creator` khai báo sẵn ở phase 1)

## Steps
1. Test trước: server từ chối đồ khóa/đồ lạ/2 món cùng slot/tên ngoài danh sách; mở khóa đúng khi đạt level/quest; UI chọn đồ gọi API và bridge; preview đổi đồ không tạo canvas thứ 2 và giải phóng khi rời trang.
2. Accessory JSON + validator + preview ảnh.
3. Preview runtime + UI creator.
4. E2E: tạo nhân vật → đổi mũ → thấy `stats.outfit` đổi → vào `/play` mặc đúng đồ.

## Verification
- `pnpm vitest run`; `pnpm assets:check`; E2E `creator` project mới xanh

## Risk
- Mũ/balo mới lệch khi anim: dùng `accessoryScale` theo node và test ảnh ở 4 anim (xem `miu-cat-outfit-*` hiện có).
- Master Plan §5 liệt kê Áo, Giày, Cánh; MVP chỉ Mũ + Balo (quyết định validation). Ghi lệch này vào Master Plan §15 ở phase 10.
