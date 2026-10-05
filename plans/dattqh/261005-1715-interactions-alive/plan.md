---
title: "Mọi tương tác đều có hoạt cảnh, đúng chỗ và đồ vật phản hồi"
description: "Sửa hàng loạt tương tác với đồ vật và bối cảnh: không đơ, không đứng im, ngồi/nằm đúng chỗ, đồ vật đổi trạng thái, cửa nhà đúng chỗ, xích đu đung đưa."
status: completed
priority: P1
tier: L
branch: main
tags: [web, game, content, world]
created: 2026-10-05
---

# Mọi tương tác đều có hoạt cảnh, đúng chỗ và đồ vật phản hồi

**Trạng thái:** pha 1–5 xong phần tự động (05/10/2026), chờ người duyệt và deploy (migration `0015` bảng `home_objects`); report `plans/dattqh/reports/interactions-alive-261005.md` · **Tier:** L · **Nhánh:** `main`
**Nguồn:** người sở hữu (05/10/2026): "không muốn bất kỳ hành động tương tác nào mà nhân vật bị đơ hoặc không có hoạt cảnh"; cửa chính sai chỗ, tivi/đèn không đổi, ngồi lọt vào ghế, xích đu phải ngồi và đung đưa. Chẩn đoán và quyết định của Jev: `reports/debug-261005-1700-home-door-objects-seat.md`.

## Hiện trạng đo được (05/10/2026)

- 65 kiểu tương tác đồ vật (`apps/web/src/game/interact/object-interaction-registry.ts`). Bộ quản lý (`object-interaction-manager.ts`, đoạn trả `action`) chỉ ánh xạ `lay, eat, drink, fish, pet, wave, water, sweep, cheer` sang động tác (`entities/player-character.ts`). **32 kiểu** dùng `wash` (15), `cook` (6), `study` (4), `stretch` (7) không có động tác: nhân vật đứng im suốt thời gian tương tác.
- **12 kiểu `sit` và 2 `lay`**: nhân vật bị đặt đúng gốc của vật (cao độ sàn), lọt vào ghế, giường; `tv-watch` đưa bé vào trong tivi; `swing-play` không ngồi lên ván, không đung đưa. Trường `offset` khai báo nhưng không dùng; `content/world/models.json` không có chiều cao mặt ngồi.
- **Cả 65 kiểu**: đồ vật không đổi gì (không có khái niệm trạng thái).
- Nhà của bé: lối vào là vòm mở, cánh cửa gập ra tường ngoài; cửa tủ gầm cầu thang (`ncb-under-stair-door.glb`) cao bằng cửa đi, nhìn như cửa chính gắn vào cầu thang.
- Đường khác đã có động tác: vuốt ve con vật, chào dân làng (`wave`), thú cưng (`pet`); NPC mở hộp thoại (game tạm dừng); xe/tàu có hành trình.

## Kết quả mong muốn

1. Mọi tương tác có hoạt cảnh đúng nghĩa (rửa tay thì chà tay, nấu thì khuấy, đọc thì cúi đọc, mở tủ thì với tay kéo, ôm gấu thì ôm…), không kiểu nào đứng im.
2. Ngồi, nằm, đu: hông trên mặt ghế/giường/ván, quay ra phía trước; xem tivi thì ngồi/đứng trước tivi; xích đu ngồi trên ván và đung đưa cùng ván (tắt được khi "giảm chuyển động"); thoát ra đúng chỗ đứng, không kẹt trong khối.
3. Đồ vật phản hồi theo dữ liệu: đèn sáng/tắt, tivi và máy tính có màn hình động, tủ/cửa/nắp mở, vòi nước chảy, bếp bốc hơi, quạt quay…; trong nhà riêng lưu ở server (lần sau còn nguyên), ở map chung chỉ trong lượt chơi và chỉ người đó thấy (Jev 0.87).
4. Cửa đôi thật trong vòm lối vào nhà, tự mở khi bé tới gần hoặc chạm; cửa tủ gầm cầu thang nửa chiều cao.
5. Không có tương tác nào làm nhân vật đơ: luôn thoát được (bấm lại, bước đi, hết thời gian), không khóa điều khiển hay camera.

## Không làm

- Không thêm engine vật lý, không thêm dependency; động tác dựng bằng code như các động tác hiện có.
- Không vượt ngân sách cảnh (≤ ~150 draw call, 30 FPS iPad Gen 10): ánh sáng dùng vật liệu phát sáng và tối đa 1–2 đèn thật gần bé; hiệu ứng tắt được ở `quality=low`.

## Pha

| Pha | Tier | Nội dung | File sở hữu |
| --- | --- | --- | --- |
| 1 | M | Động tác cho mọi tư thế: thêm `wash` (chà tay), `cook` (khuấy), `study` (cúi đọc/viết), `stretch` (vươn tay), và các động tác mới cần cho đúng nghĩa (`open` với tay kéo, `tap` chạm, `hug` ôm, `dance`, `swing`, `sleep`, `watch`); rà 65 kiểu, gán lại tư thế đúng nghĩa; ánh xạ tư thế → động tác thành bảng dữ liệu một chỗ | `apps/web/src/game/entities/player-character.ts`, `apps/web/src/game/interact/**` |
| 2 | M | Chỗ ngồi/nằm/đu: `seat` (chiều cao mặt ngồi, mặt nằm, hướng ra) cho mọi model ngồi/nằm được trong `content/world/models.json` và trang trí nhà; đặt hông lên mặt, quay ra trước; tivi và vật tương tự dùng chỗ trước vật; xích đu: ván + dây + bé đung đưa (tách nút trong model `swing-set` nếu cần); thoát về chỗ đứng trống (dùng `usableSpot`) | `apps/web/src/game/interact/**`, `content/world/models.json`, generator `swing-set` |
| 3 | L | Hiệu ứng đồ vật theo dữ liệu: trường `effect` cho mỗi kiểu (`glow`, `screen`, `light`, `open`, `water`, `steam`, `spin`, `sway`…), trạng thái bật/tắt; nhà riêng lưu ở server cùng trang trí nhà (migration qua `db:generate`), map chung chỉ trong lượt chơi | `apps/web/src/game/interact/**` (module hiệu ứng riêng), `apps/server/src/home/**`, `packages/schema` |
| 4 | S | Cửa nhà: cửa đôi trong vòm, tự mở khi tới gần/chạm, đóng sau; cửa tủ gầm cầu thang nửa chiều cao; sinh lại `nha-cua-be`, 3 audit, `assets:manifest` | `tools/world/generate-nha-cua-be-map.ts`, `tools/world/structures/nha-cua-be-house.ts`, model cửa |
| 5 | M | Kiểm tra máy: unit test danh mục (mọi kiểu có động tác, có hiệu ứng, kiểu ngồi/nằm có `seat` cho mọi model khớp, có đường thoát); script phủ theo map (vật nào khớp kiểu nào, vật trông tương tác được mà không có kiểu); E2E "đi một vòng tương tác" ở nhà của bé lấy mẫu mỗi tư thế và mỗi hiệu ứng: động tác khác đứng yên, đồ vật đổi trạng thái, thoát ra không kẹt | `apps/web/src/game/interact/*.test.ts`, `tools/world/**`, `apps/web/e2e/interactions.spec.ts` |

## Tiêu chí xong

- 0 kiểu tương tác đứng im (test danh mục), 0 kiểu ngồi/nằm thiếu `seat`, 0 kiểu thiếu hiệu ứng (hoặc ghi rõ vì sao vật đó không đổi).
- E2E vòng tương tác qua; draw call trong ngân sách ở `quality=high` trên CI.
- Gate: `pnpm assets:check` → `content:check` → `test` → `typecheck` → `lint`, build web, `security:dist`; E2E `setup` + project tương tác + smoke.

## Phụ thuộc

- Chờ plan `261004-1617-parent-area-friends` (nhà riêng, trang trí nhà) commit: cùng đụng nhà của bé và lưu ở server.

## Kết quả (05/10/2026)

| Pha | Kết quả |
| --- | --- |
| 1 Động tác | Xong: 23 tư thế, mỗi tư thế một động tác (`player-actions.ts`), bảng `interaction-poses.ts`; 73 kiểu (65 cũ gán lại, 8 mới); khớp model theo từ nguyên vẹn |
| 2 Chỗ ngồi, nằm, đu | Xong: `seats`/`lie`/`front`/`screen` trong `models.json`; thân trên mặt ghế/nệm/ván, controller ở chỗ trống, "Đứng dậy"; xích đu con lắc, tắt khi giảm chuyển động |
| 3 Hiệu ứng | Xong: `effect`/`noEffect` mỗi kiểu; hào quang, màn hình, bản lề, quay, đu, nước, hơi, hình bay; một đèn thật (không ở `low`); nhà riêng lưu server (`/api/home-objects`, migration `0015`) |
| 4 Cửa nhà | Xong: cửa đôi trong vòm tự mở/đóng, tủ gầm cầu thang nửa chiều cao; sinh lại map, 3 audit sạch, `assets:manifest` |
| 5 Kiểm tra máy | Xong: test danh mục, `pnpm world:interactions`, E2E project `interactions` (một ca `@smoke`) |

Thêm giữa đợt (người sở hữu, 05/10/2026): bỏ công tắc tắt online, game luôn online (migration `0016`), giữ công tắc bạn máy.

