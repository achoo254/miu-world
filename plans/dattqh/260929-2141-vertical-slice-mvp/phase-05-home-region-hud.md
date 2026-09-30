---
phase: 5
title: "Home Base, chọn khu vực, danh sách quest, HUD"
status: pending
priority: P1
effort: "M"
dependencies: [1, 3]
---

# Phase 5: Home Base, chọn khu vực, danh sách quest, HUD (SLICE-02, task #11)

## Goal
Trang chủ và điều hướng vào khu vực, cùng HUD gameplay theo cấu trúc M3.2 (Master Plan §2, §4, §6).

## Requirements
- Home (M1.1): avatar + tên + Lv + thanh XP, Xu (ẩn Kim cương — §15 #6), nút Nhiệm vụ, Bản đồ, Ba lô, Cài đặt; "Nhiệm vụ hôm nay" lấy quest đang làm từ server; không có chuỗi ngày (streak) ở MVP.
<!-- Updated: Validation - Jev home_scene=react_screen_with_prerendered_island_image (0.79/0.69, dưới ngưỡng 0.8, người sở hữu có thể đảo); streak_in_mvp=defer_v1 (1.0). Lệch Master Plan §4/#11 "Home Base và World Map là một cảnh 3D": ghi vào §15 ở phase 10. Red Team: nền ảnh phải do generator sinh xác định và được ship trong build -->
- Cảnh đảo: Home là màn React; nền là ảnh đảo render sẵn từ map voxel bằng script mới `tools/assets/render-home-island.ts` (dùng lại trang `preview.html`, khung cố định, khai báo trong `tools/assets/generated.json`, script `assets:home` trong `package.json`, output `assets/generated/home/island.png`, xác định giữa hai lần chạy, được `vite-repo-assets.ts` ship); vùng nhấn (hotspot) đặt theo tọa độ trong `content/world/regions.json`; nút "Bản đồ" mở màn chọn khu vực (thay M3.1 dạng cảnh 3D ở MVP). Không dựng cảnh 3D thứ hai, GPU chỉ dành cho `/play`. Khu vực trên đảo: Nhà của Miu, Khu rừng bí mật (mở), Trường học/Thư viện/Lâu đài (khóa, "V1"), Núi tuyết (Sắp mở), Đảo bí ẩn (Cần Lv.15) — dữ liệu `content/world/regions.json` có schema.
- Chi tiết khu vực + danh sách chương (M1.4/M2.1): Khu rừng bí mật – chương 1 mở, chương 2 khóa tới khi xong ch1; tiến độ "Hoàn thành x/12" từ server; nút "Khám phá ngay" → `/play?region=forest&quest=forest-ch1`.
- HUD `/play` (M3.2): avatar + Lv + XP, tracker "Nhiệm vụ hiện tại" (từ bridge + server), nút Nhiệm vụ/Bản đồ/Ba lô/Menu (Menu → Pause), joystick + nút Tương tác + Chạy (Tương tác mới: game phát `interaction` khi bấm; ẩn khi không có mục tiêu gần). Nút Nhảy giữ.
- HUD cập nhật số chỉ từ response server (không tính ở client).

<!-- Updated: plan SGK lớp 2 (plans/dattqh/260930-0846-sgk-lop2-game-content, D6, Jev chapter_grouping) - một chương có thể gom nhiều quest (Tiếng Việt 2 quest/tuần, Toán 4–7 quest/chủ đề) -->
- Hợp đồng chương (cho nội dung SGK sau này): màn khu vực liệt kê chương; mỗi chương mở ra danh sách quest của chương theo thứ tự mở khóa (lấy từ `GET /api/quests?region=`: nhóm theo `chapter`); không giả định một quest mỗi chương. `forest-ch1`/`forest-ch2` hiện tại là trường hợp một quest/chương.

## Files
- Create: `apps/web/src/ui/home/*.tsx`, `apps/web/src/ui/region/*.tsx`, `apps/web/src/ui/hud/*.tsx` (+ test), `content/world/regions.json`, `apps/web/e2e/home.spec.ts`
- Modify: `apps/web/src/ui/app-shell.tsx`, `apps/web/src/ui/play/play-screen.tsx`, `apps/web/src/game/game.ts` (nút Tương tác → event; phase 6 phụ thuộc phase 5 nên không sửa `game.ts`/`play-screen.tsx` đồng thời), `packages/schema/src/content.ts` (RegionCatalog), `tools/assets/generated.json`, `package.json` (script `assets:home`), `apps/web/vite-repo-assets.ts` (ship ảnh đảo); Create: `tools/assets/render-home-island.ts` (+ test hash xác định)

## Steps
1. Test trước: Home hiển thị số từ `/api/progress` (stub fetch); region khóa không vào được; HUD không re-render theo khung hình (đếm render khi di chuyển = 0).
2. Region catalog + content:check.
3. UI Home/Region/HUD bằng kit phase 1.
4. E2E: Home → Khu rừng → ch1 → `/play` với HUD; ch2 khóa.

## Verification
- `pnpm vitest run --project web`; E2E `play` + `home` xanh; ảnh review UI chụp lại

## Risk
- Ảnh đảo có thể trông khác cảnh chơi khi palette đổi: sinh lại bằng `pnpm assets:home` mỗi khi đổi palette/map (kiểm hash xác định).
- Nếu người sở hữu đảo quyết định sang cảnh 3D thật: dùng chung renderer với `/play` và tắt khi rời trang (không làm trong plan này).
