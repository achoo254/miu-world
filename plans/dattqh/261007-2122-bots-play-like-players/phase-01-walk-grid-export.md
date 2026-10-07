# Pha 1 — Gỡ route sinh sẵn, xuất lưới chỗ đứng

**Tier:** L · **Chặn bởi:** — · **Trạng thái:** XONG (`ec72eb33`, `84c85308`) · **Theo quyết định:** sensing = `walk_grid_in_content`, route_data_8376ca24 = `revert_keep_grid_loader`

## Mục tiêu

Mỗi map chơi được có lưới chỗ đứng gọn trong `content/world/walk/`. Lưới là "giác quan" của thế giới: ô nào đứng được, cao bao nhiêu, phía trên trống mấy khối, nền gì, có mép không. Thêm danh sách nơi chốn (vị trí của NPC, đồ vật, landmark, cổng, bến xe, spawn) để bạn máy nhận ra khi tới gần. Không có tuyến hay cạnh nào. Luật bước giữa hai ô là một hàm dùng chung cho bé tự đi và bạn máy.

## Gỡ phần của `8376ca24` (giữ `loadMapGrid`)

- Xóa `content/world/bot-routes/` (12 file), `tools/world/bot-routes.ts`, `tools/world/bot-routes.test.ts`, `packages/schema/src/bot-routes.ts`. Trước khi xóa schema, grep `bot-routes` toàn repo để chắc không còn ai import (pha 2 cũ không có commit).
- `package.json`: thay script `world:bot-routes` bằng `"world:walk": "tsx tools/world/walk-export.ts"`.
- `tools/content/check-content.ts:83-84`: đổi đúng một dòng, `'world/bot-routes/'` thành `'world/walk/'`, và comment bên trên cho khớp. Đây là dòng duy nhất được phép sửa trong file này.
- Giữ `loadMapGrid` và `MapGrid` trong `tools/world/reach-audit.ts` như đã commit.

## Luật bước dùng chung

- `packages/voxel/src/traversal.ts`: thêm `export const MAX_CLIMB = 2`, `MAX_DROP = 3` và hàm thuần
  `canStep(fromFeet, fromClear, toFeet, toClear): boolean`. Nội dung đúng như điều kiện đang có ở `apps/web/src/game/nav/route-search.ts:268-271`: lên ≤ 2 và cần `fromClear ≥ rise + 2`; xuống ≤ 3 và cần `toClear ≥ 2 - rise`.
- `route-search.ts`: thay hằng ở `:17-18` và ba dòng điều kiện bằng `canStep` (cùng hành vi; `route-search.test.ts` phải xanh nguyên). Các file này không thuộc danh sách cấm, nhưng là đường chạy của tính năng tự đi của bé: không đổi chi phí, không đổi kết quả.

## Định dạng (`packages/voxel/src/walk-cells.ts`, thuần TS, không nén; nén và giải nén bằng `node:zlib` ở tool và server)

- `content/world/walk/<map>.json` (đọc bằng Zod ở server):
  `{ version: 1, map, size: [sx, sz], height, levels: 3, sources: string, places: Array<{ id, kind: 'npc'|'object'|'gate'|'landmark'|'spawn'|'chapter'|'stop'|'arrival', at: [x,y,z], ride?: [x,y,z] }> }`.
  `id` là id interactable hay landmark; `spawn`/`chapter-<n>`/`arrival-<id>` cho các điểm còn lại. `places` lấy cả lớp sự kiện, như `reach-audit`.
- `content/world/walk/<map>.bin` = `deflateRaw` của:
  - tầng 0 dày đặc: `feet: Uint8Array(sx*sz)` (0 = không đứng được) và `meta: Uint8Array(sx*sz)`. `meta` gồm 3 bit `clear` (trần 7, như `CLEAR_CAP`), 2 bit `ground` (đường, đất, nước như `Ground` ở `walk-grid.ts:13`), 1 bit `edge`;
  - tầng 1–2 thưa: số lượng, rồi các bộ `(column: Uint32, feet: Uint8, meta: Uint8)` sắp tăng dần.
- API: `encodeWalkCells(grid) → Uint8Array`, `decodeWalkCells(bytes, size) → WalkCells` với `spotsAt(x, z) → {feet, clear, ground, edge}[]` (≤ 3 phần tử) và `standAt(x, y, z)`.

## Tool `tools/world/walk-export.ts`

1. `loadMapGrid(map)`; với mỗi region của lõi, `walkRegion` (`apps/web/src/game/nav/walk-grid.ts:67`; tool import từ `apps/web/src` như `interaction-coverage.ts` đã làm) với prop ghi đè bằng `PROP_STEP_ID`/`PROP_BLOCKING_ID`, như `route-service.ts:51-58`.
2. Ghép thành lưới toàn lõi; tính `edge` như `buildWalkGrid` (`route-search.ts:64`); giữ 3 tầng thấp nhất mỗi cột và đếm số chỗ đứng bị bỏ ở tầng 4 (in ra).
3. Mã hóa, `deflateRawSync(level 9)`, ghi `.bin` và `.json` (JSON thụt lề cố định, `places` sắp theo `id`).
4. `sources` = sha256 nối của: sha256 trong `assets/manifest.json` cho `generated/world/<map>/entities.json` và mọi `regions/*.bin`; sha256 của `content/blocks.json`, `content/world/models.json`, file lớp sự kiện của map; và `version` của định dạng.
5. CLI `pnpm world:walk [map…]`; không truyền tham số thì chạy mọi map trong `content/world/regions.json`. In dung lượng mỗi map.

## Test `tools/world/walk-export.test.ts` (không chạy lại tool)

- Mỗi map trong `regions.json` có cả hai file; `.json` parse được; `.bin` giải nén ra đúng kích thước.
- `sources` khớp manifest hiện tại. Lệch thì báo `run pnpm world:walk <map>`.
- Dung lượng: mỗi `.bin` ≤ 300 KB, tổng thư mục ≤ 4 MB.
- Đối chiếu: spawn và mọi target của quest `active` trên map có một chỗ đứng trong bán kính 3 (`SPOT_REACH`); kiểm thêm một mẫu 200 cột ngẫu nhiên (seed cố định) xem `feet` có đúng là ô đứng được theo luật `walkable.ts` không. Phần đối chiếu đọc region của một map (`truong-hoc`) bằng `loadMapGrid`; quá 30 s thì khai `test.setTimeout` kèm lý do. Không sửa `vitest.config.ts`.
- `packages/voxel/src/walk-cells.test.ts`: mã hóa rồi giải mã ra đúng như cũ; tầng thưa; `canStep` cho đủ ca lên 1, lên 2 đủ trần, lên 2 thiếu trần, xuống 3, xuống 4.

## Rủi ro

- **Vượt dung lượng:** nếu tầng 0 sau nén > 300 KB thì mã hóa `feet` theo hiệu với cột bên trái (địa hình mượt nén tốt hơn). Đo trước khi chọn.
- **Đổi `route-search.ts` làm hỏng tự đi:** chỉ thay hằng và điều kiện bằng hàm có cùng nghĩa; test route hiện có là chốt.
- **Nhị phân trong `content/`:** dòng `ASSET_TOOL_FILES` báo cho `content:check` đây là file do tool ghi; release tự gửi theo `content/`.

## Kiểm tra

`pnpm vitest run tools/world/walk-export.test.ts packages/voxel/src/walk-cells.test.ts apps/web/src/game/nav/route-search.test.ts`, `pnpm exec tsx tools/world/reach-audit.ts truong-hoc` (kết quả như trước), `pnpm typecheck`, `pnpm lint`, `pnpm content:check`, `pnpm assets:check`, `pnpm --filter @miu/web build`.

## Rollback

Revert commit pha 1; nếu cần route cũ thì `8376ca24` vẫn còn trong lịch sử.

## Trạng thái (07/10/2026)

- [x] Gỡ `content/world/bot-routes/` (12 file), `tools/world/bot-routes{,.test}.ts`, `packages/schema/src/bot-routes.ts`; không còn ai import (grep sạch). `loadMapGrid` giữ nguyên.
- [x] `package.json`: `world:bot-routes` → `world:walk`; `check-content.ts`: đúng dòng `'world/bot-routes/'` → `'world/walk/'` (cùng comment bên trên).
- [x] `canStep`, `MAX_CLIMB`, `MAX_DROP` trong `packages/voxel/src/traversal.ts`; `route-search.ts` dùng `canStep` (commit riêng `ec72eb33`). Test của `canStep` nằm ở `packages/voxel/src/traversal.test.ts` thay vì `walk-cells.test.ts`, để đi cùng commit đó.
- [x] `packages/voxel/src/walk-cells.ts` (+test): codec, `walkInfoSchema` (Zod) cho `.json`, `spotsAt`, `standAt` (trả chỗ đứng hay `undefined`).
- [x] Định dạng lệch spec một chỗ: ở tầng 1–2, cột lưu thành **khoảng cách tới cột trước (varint LEB128)** thay vì `u32`, các mảng `feet`/`meta` để riêng. Lý do đo được: với `u32`, `thu-vien.bin` 325,5 KB (vượt 300 KB); với khoảng cách, 50,0 KB. Tầng 0 giữ nguyên (mã hóa `feet` theo hiệu với cột trái làm file to hơn, nên không dùng).
- [x] `tools/world/walk-export.ts` (+test), sinh 12 map: tổng 704 KB (`.bin` lớn nhất `nui-tuyet` 162 KB), mỗi map 0,2–2,0 s, cả lượt 19 s, RSS tối đa 373 MB. Chạy lại cho cùng byte.
- [x] Kiểm tra: vitest 6 file / 56 test xanh (gồm `route-search.test.ts`, `route-walker.test.ts`); đối chiếu thêm 71.289 cột `truong-hoc` với luật `walkable.ts`: 0 lệch; `reach-audit truong-hoc` như trước; `pnpm typecheck`, eslint các file đã sửa, `pnpm assets:check`, `pnpm content:check`, `vite build` sạch.
