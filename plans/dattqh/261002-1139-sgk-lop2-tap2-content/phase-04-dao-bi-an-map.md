---
phase: 4
title: "Map Đảo bí ẩn"
status: pending
priority: P1
effort: "L"
dependencies: [2]
---

# Phase 4: Map Đảo bí ẩn

## Goal
Map mới `dao-bi-an` 800 × 800 dựng theo tấm mock `designs/dao-bi-an/d-01 … d-14` (Jev E2), có khu bài học cho các bài tập 2 đã chốt ở phase 2.

## Khuôn
Làm như các map trong plan `plans/dattqh/261002-0802-detail-mocks-per-map/`: bản giao việc `phase-04-map-rework-brief.md` (bộ dựng chung, nền riêng, prop hộp riêng, góc chụp từng khung, khóa chụp, vòng sửa–chụp–so). Generator mới bằng `tools/world/zone-map.ts` (`tools/world/generate-dao-bi-an-map.ts`, lệnh `pnpm world:dao-bi-an`).

## Requirements
- Nền: khối cỏ riêng (thêm `grass-island` xanh nhiệt đới vào `content/blocks.json` + palette, atlas còn 1 chỗ), cát `sand`, nước biển; lối `trail`/`planks`.
- Cảnh theo mock: quần đảo trên biển xanh, bến tàu có thuyền buồm (`SAILING_SHIP`), bãi biển có rương kho báu, rừng nhiệt đới có cầu treo, thác có tàn tích phát sáng, khu di tích, hang (lối vào + bên trong pha lê phát sáng), đền thờ, khu thử thách, núi lửa (xa), hang hải tặc, rừng đêm (`mood: dusk`), kho báu (phòng đi vào được).
- Khu bài học (`ZONES`) theo phase 2; landmark trùng tên chỗ quest.
- Đời sống: ngư dân, thủy thủ, nhà thám hiểm, trẻ em; cua, cá, vẹt (pack có sẵn).
- Đăng ký vùng: `content/world/regions.json` đổi `dao-bi-an` từ `soon` thành `open` với `map`, `guide`, `book`; cổng ở quảng trường trung tâm (map Trường học) sang đảo; `ZONE_MAPS` trong `tools/assets/render-preview.ts`; review page `WORLD_MAPS`.
- Vùng đất ngoài: theme mới hoặc `river` (biển) — quyết trong phase, ghi lý do.

## Validation
- Test map như `tools/world/zone-maps.test.ts` (khớp output, quest đứng trên đất, đời sống, đi tới mọi mục quest); `mock-views.test.ts`; ảnh preview + ảnh đối chiếu từng khung; E2E `maps` đi qua cổng sang đảo.
