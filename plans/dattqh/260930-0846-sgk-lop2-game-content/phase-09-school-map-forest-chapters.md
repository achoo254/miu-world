---
phase: 9
title: "Bản đồ Trường học + chương rừng 2–19"
status: completed
priority: P2
effort: "L"
dependencies: [4, 5]
---

# Phase 9: Bản đồ Trường học + chương rừng 2–19 (D4)

## Goal
Mọi `target` của quest TV và Toán có vật thể/NPC trên bản đồ: Khu rừng bí mật thêm interactable theo chương, khu vực mới Trường học với 7 khu theo chủ đề; chỉ entity của chương đang chơi mới tương tác được.

## Điều kiện bắt đầu
VS phase 5 (regions.json, màn khu vực/chương theo D6), VS phase 6 (entities v2, interactables, kiểm target trong `content:check`), VS phase 7 (quest controller) đã merge; phase 4, 5 có danh sách target.

## Requirements
- Trường học: `tools/world/generate-school-map.ts` (xác định theo seed như `generate-forest-map.ts`, dùng lại `tools/world/structures/*`): sân trường + 7 khu (lớp học/góc học tập) tương ứng 7 chủ đề, đi lại tự do (không cổng giữa khu — Jev `school_zone_gates`); ghi `assets/generated/world/truong-hoc/` (chunk + `entities.json` v2) rồi `pnpm assets:manifest`. Block/model trong pack đã có (Kenney, Cube Pets); NPC là con vật Cube Pets. Ngân sách Master Plan §12 giữ (draw call ≤ 150, vùng đầu ≤ 8 MB nén).
- Khu rừng chương 2–19: `tools/world/chapters/forest-chapters.ts` sinh interactable theo chương (manh mối, trang sách, NPC nhân vật bài đọc) trên cùng map rừng ở các vùng khác nhau.
- Entity theo chương: thêm `chapter?: number` vào interactable của `packages/voxel/src/world-entities.ts` (v2 của VS 6); runtime (`apps/web/src/game/entities/**`, `game-store.ts`) chỉ hiện VÀ chỉ cho tương tác entity không có `chapter` hoặc thuộc chương đang chơi (`set-world-state`).
- `content/world/regions.json` thêm `truong-hoc`; màn khu vực (VS 5) hiện chương theo D6. Trường học mở khi phase 10 đổi `truong-hoc` sang `open` trong `regions.json`; quest Toán không khóa nhau (D12).
- Game nạp map theo region (thay `const MAP_ID = 'forest-ch1'` ở `apps/web/src/game/game.ts` bằng tham số từ route/region).
- `content:check` kiểm target mọi quest TV/Toán (kể cả draft ở bước này) có trong entities của region tương ứng: `questTargetIssues` nhận tập entity theo region.

## Files
- Create: `tools/world/generate-school-map.ts` (+ test hash xác định), `tools/world/chapters/*.ts` (+ test), `assets/generated/world/truong-hoc/**` (sinh)
- Modify: `packages/voxel/src/world-entities.ts` (`chapter`), `apps/web/src/game/entities/**`, `apps/web/src/game-bridge/game-store.ts` (lọc chương), `apps/web/src/game/game.ts` (map theo region), `content/world/regions.json`, `packages/quest/src/quest-catalog.ts` (entity theo region), `tools/content/check-content.ts` (kiểm target theo region), `package.json` (`world:school`), `tools/assets/generated.json` (qua quy trình asset), `docs/codebase-summary.md`

## Steps
1. Test trước: generator xác định (hash hai lần); entities v2 hợp lệ với `chapter`; mọi target của `tv2-*`/`toan2-*` có trong entities đúng region; entity chương khác không phát `interaction-prompt`; E2E `spawnAt` một target mỗi khu → prompt đúng nhãn.
2. Hiện thực; `pnpm world:school`, `pnpm assets:manifest`, `pnpm assets:check`.
3. Hiệu năng: ghi draw call/tam giác từ stats overlay trong E2E; project `perf` chỉ chạy khi người sở hữu yêu cầu (~30 phút, ghi đè perf.json).

## Verification
- `pnpm assets:check`; `pnpm content:check`; `pnpm vitest run tools/world packages`; web build; E2E `play` + spec mới

## Risk
- Map rừng nặng khi thêm 18 chương: chỉ hiện entity chương đang chơi; đo draw call.

## Đã làm trước (nghiệm thu dẫn đường, 2026-09-30)
- `chapter?: number` cho interactable và prop trong `packages/voxel/src/world-entities.ts`, hàm `entitiesForChapter`; `game.ts` chỉ dựng entity không gắn chương hoặc thuộc chương của quest đang chơi (chương lấy từ `play-screen.tsx`). Còn lại cho phase này: lọc tương tác ở `game-store.ts` nếu cần, map Trường học, chương rừng 3–19.
- Tạm đặt target của `tv2-t01-b01` (Sâu Xanh, bảng gỗ lớp Hai ở cổng rừng) và `tv2-t01-b02` (Voi Bảo, cây lịch lá, ba tờ lịch, bảng chữ cái, hốc cây ở phía bắc suối) lên map rừng, gắn `chapter: 2`, chỉ ở chỗ đất trống nên `chunks.bin` không đổi (`chapter2Preview` trong `tools/world/generate-forest-map.ts`). Khi dựng chương rừng thật thì dời vào `tools/world/chapters/`.
- Khung bản đồ Trường học (`tools/world/generate-school-map.ts`, `pnpm world:school` → `assets/generated/world/truong-hoc/`): cổng trường, Sân trường (cột cờ, sân bóng) và 6 khu còn lại theo chủ đề, lối đá nối không cổng chắn; Sư Tử Vàng và Khỉ Lanh của chủ đề 1 gắn `chapter: 1`. Game nạp map theo region (`mapForRegion`). Bản chơi thử `toan2-cd1-b01` đi bộ được. Còn lại: nhân vật và vật của chủ đề 2–7, `content:check` kiểm target theo region, chương rừng 3–19.
