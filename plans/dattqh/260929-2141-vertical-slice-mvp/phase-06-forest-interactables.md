---
phase: 6
title: "Khu rừng ch1: vật thể tương tác, di chuyển, camera"
status: completed
priority: P1
effort: "L"
dependencies: [2, 5]
---
<!-- Updated: Red Team - phase 5 và 6 cùng sửa game.ts, game-store.ts, play-screen.tsx; xếp 6 sau 5 để không đụng file. Vẫn chạy song song với phase 4 (không chung file) -->


# Phase 6: Khu rừng ch1 — vật thể tương tác, di chuyển, camera (SLICE-03, 04, 07; task #12, #13, #16)

## Goal
Bản đồ Khu rừng chương 1 có đủ entity mà quest ch1 tham chiếu, tương tác được bằng nút Tương tác/phím E/chạm; di chuyển và camera đạt tiêu chí §16.

## Requirements
<!-- Updated: Red Team - `worldEntitiesSchema` là `version: z.literal(1)` với `npcs`/`props`/`landmarks`; props không có id, `chest` và `gate` hiện là props trang trí (entities.json:158,168); thêm `interactables[]` phải nâng version và chuyển các prop này; `content/world/` không có entities -->
- Entity mới trong `tools/world/generate-forest-map.ts` → `assets/generated/world/forest-ch1/entities.json`: nâng `worldEntitiesSchema` lên `version: 2` với `interactables[]` (id, kind `object|npc|riddle|chest|gate`, model, position, radius, label); Vẹt (`parrot-guide`) và Hải ly (`animal-beaver`, có trong pack Cube Pets) chuyển thành interactable `npc`, `chest.glb` và `gate.glb` hiện là prop thành interactable `chest`/`gate` có id; runtime và test hiện có đọc được version 2 (test schema nêu rõ). Thêm: chiếc hộp (`box.glb`), cây nấm (`mushroom_red.glb`), bụi cây (`plant_bush.glb`), lá thư, cây cổ thụ có bảng đố (canvas texture số "8 + 5 = ?" — §10 vẽ lúc chạy). Map vẫn sinh xác định theo seed; generator không đổi cấu trúc chunk.
<!-- Updated: Red Team - pack Survival/Nature Kit không có model lá thư (grep letter|paper|book|scroll = 0) -->
- Lá thư: không có model trong pack đã tải; dùng phụ kiện voxel sinh bằng code từ JSON (như mũ/balo, `content/props/letter.json` hoặc tương đương, 1 draw call) hoặc bảng biển báo có icon Fluent Emoji `envelope`; không thêm pack ngoài allowlist.
- Bật kiểm chéo "target của quest tồn tại trong entities" trong `content:check` cho `forest-ch1` (hàm kiểm đã có từ phase 2); CI đỏ nếu quest tham chiếu target không có.
- Runtime: hệ tương tác chung thay cho nhãn NPC riêng — mục tiêu gần nhất trong bán kính → event `interaction-prompt {targetId, label, kind}`; bấm Tương tác → `interaction {targetId}`. Trạng thái vật thể (đã tìm, rương mở, cổng mở) nhận từ React qua lệnh bridge `set-world-state` (dữ liệu từ server), hiệu ứng nhỏ (lấp lánh/ẩn) không theo khung hình trong React.
- Camera không xuyên khối (đã có CameraRig; thêm test E2E đứng sát vách/cây), va chạm đúng, joystick + bàn phím (đã có).
- Ngân sách §12: draw call/tam giác ghi lại sau khi thêm entity (perf E2E).
- `content:check` kiểm target của quest tồn tại trong entities.

## Files
- Modify: `tools/world/generate-forest-map.ts`, `packages/voxel/src/world-entities.ts` (+ test schema v2), `tools/content/check-content.ts` (bật kiểm entity), `apps/web/vite-repo-assets.ts` (ship model mới nếu cần), `apps/web/src/game/entities/*`, `apps/web/src/game/game.ts`, `apps/web/src/game-bridge/game-store.ts`, `apps/web/src/ui/play/play-screen.tsx`, `tools/assets/sources.json` (nếu cần model mới từ pack đã có)
- Create: `apps/web/src/game/entities/interactables.ts`, `apps/web/src/game/entities/riddle-board.ts` (+ test thuần nếu tách logic)

## Steps
1. Test trước: entities schema; generator xác định (hash chạy lại); store prompt/interaction theo target; E2E spawnAt từng target → prompt đúng nhãn; camera sát vách không vào trong khối.
2. Generator + entities; render-preview ảnh map mới.
3. Runtime tương tác + riddle board + trạng thái thế giới.
4. `pnpm assets:manifest`, E2E `play`.

## Verification
- `pnpm world:forest` 2 lần cùng hash; `pnpm assets:check`; E2E `play` (≥ 3 vật thể + 2 NPC có prompt)

## Tiến độ (2026-09-30)
Làm trước phase 5 (chỉ còn một phiên cook plan nên không còn đụng `game.ts`/`game-store.ts` với phiên khác; phase 5 sẽ dựa trên runtime này).
- Xong (`3f101d0`, `chore(assets)` sau đó): `worldEntitiesSchema` version 2 (`interactables[]`, id kebab-case duy nhất, model/scale đi cùng nhau, `shape: letter`, `board`), generator đặt 9 target của quest ch1 theo đúng mạch truyện (Vẹt + 3 manh mối gần điểm xuất phát; Hải ly bên bờ suối; 4 đá kê qua suối; cây cổ thụ có bảng "8 + 5 = ?"; rương; cổng đá chương 2), sinh xác định (test so với file đã commit). Runtime `game/entities/interactables.ts` thay `npc.ts`: prompt theo target gần nhất, `set-world-state` (ẩn, rương mở bằng clip `open`, cổng hạ xuống), manh mối nhún nhẹ tới khi tìm thấy; `riddle-board.ts` một draw call. `content:check` kiểm target của quest `active` có trên map. E2E `play`: prompt + tương tác cho cả 9 target, camera sát cây cổ thụ không vào trong khối.
- Ngân sách draw call (desktop `high`): thêm entity làm tăng lên 157 > 150; đã giảm còn 146 bằng cách manh mối nhỏ không đổ bóng và model nhiều phần chỉ phần lớn nhất đổ bóng.
- Nút Tương tác trên HUD: xong ở phase 5 (`58bf2a4`); mũi tên chỉ hướng: phase 7. Trạng thái "đã tìm" hiện bằng cách dừng nhún (không có hạt lấp lánh riêng, tránh thêm draw call); `hidden` ẩn vật thể.

## Risk
- Model vật thể thiếu trong pack đã tải: ưu tiên pack đã có (Survival/Nature/Food/Castle), sau đó ghép block; không thêm pack ngoài allowlist.
