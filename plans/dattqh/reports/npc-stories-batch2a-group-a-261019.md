# Chuyện riêng của nhân vật, đợt 2a, nhóm A (19/10/2026)

Plan: `plans/dattqh/261019-1057-npc-stories-batch-2a/plan.md`, pha 1 (Nhà của bé, Trung tâm, Khu rừng bí mật, Trường học). Tier: L. Khuôn giữ đúng đợt 1 (`plans/dattqh/reports/npc-stories-batch1-261005.md`). Không đổi code, server hay schema.

## Kết quả

| Map | Mạch mới | Nhân vật | Chương | Vùng (chapter) | Vật mới |
| --- | --- | --- | --- | --- | --- |
| Nhà của bé | `meo-bep-mam-com` «Mâm cơm đủ mọi miền» | Mèo Bếp Trưởng | 4 | 1 | 25 |
| Nhà của bé | `cun-dom-ro-bot` «Ngày rô bốt được nghỉ phép» | Cún Đốm Dọn Nhà | 3 | 1 | 18 |
| Trung tâm | `cho-coi-nga-tu` «Một ngày không kẹt xe» | Chó Cảnh Sát Còi | 5 | 1 (chương 4 ở vùng 4, sân trước cổng thành) | 31 |
| Khu rừng bí mật | `khi-day-leo-nhac` «Sợi dây leo tới tiếng nhạc» | Khỉ Chuyền Cành | 4 | 2 (bãi rừng của Khỉ) | 24 |
| Khu rừng bí mật | `nai-nghin-dom-dom` «Một nghìn đốm sáng» | Nai Đom Đóm | 3 | 4 (bãi rừng của Nai) | 19 |
| Trường học | `ho-coi-giao-huu` «Trận giao hữu đầu tiên» | Hổ Còi Vàng | 3 | 1 (sân trường, cạnh sân bóng) | 19 |
| Trường học | `tho-doi-nghi-thuc` «Ba, hai, một… đội nghi thức!» | Thỏ Măng Non | 3 | 2 | 18 |
| **Tổng** | **7 mạch** | 7 nhân vật chưa có mạch | **25 chương** (185 bước) | | **154** |

Số mạch mỗi map sau pha: Nhà của bé 4, Trung tâm 4, Khu rừng bí mật 4, Trường học 4.

### Khuôn mỗi chương (đã kiểm bằng `content:check` và kiểm riêng lúc soạn)

- Quest `category: "story"`, `review: "teacher-pending"`, id `yarn-<mạch>-<số>`, mở bằng lời của chính nhân vật (đứng ở chỗ của người giao minigame, luôn có trong thế giới).
- Đủ 8 pha, 7 câu hỏi thiết kế; 4–6 nơi mỗi chương (không quá 2 bước liền ở một nơi); mỗi chương 3–4 cơ chế ngoài trắc nghiệm (tìm vật theo lời tả, tìm quanh, câu đố số, sắp xếp, chọn nhiều, logic, minigame, quyết định).
- Mỗi bước học có ba lớp Hướng dẫn · Gợi ý · Đáp án kèm giải thích và 3 lời khen, 3 lời gỡ sai, đủ tiếng Anh; mọi chữ hiển thị dùng `{name}`; không câu nào trùng nội dung đã có (kiểm cả câu dài từ 16 ký tự).
- Nội dung học bám chương trình lớp 2, viết mới (không trích chữ SGK): cộng, trừ có nhớ trong phạm vi 100, so sánh số, chục và đơn vị, số tròn trăm và 1000, xem đồng hồ (giờ rưỡi), xem lịch (các ngày trong tuần), đề-xi-mét, ki-lô-gam, mét; từ chỉ hoạt động, từ chỉ đặc điểm, câu giới thiệu (Ai là gì?), câu nêu đặc điểm (Ai thế nào?), đọc hiểu, kể theo trình tự. Câu ca dao «Chuồn chuồn bay thấp thì mưa…» (Khỉ, chương 2) là câu dân gian, không phải trích SGK.
- Thư sau mỗi chương; mỗi mạch có thư từ nhân vật map khác: Chú Lái Đò Ba (Làng Ven Sông), Ông Bảy Cờ Gánh (Xóm Mái Ấm), Bác Thu Ngân Vui Vẻ (Chợ phiên), Mèo Hộp Nhạc (Thư viện), Mèo Trà Đá (Xóm Mái Ấm), Bé Chăn Gà Con (Nông trại), Khỉ Hái Dừa (Đảo bí ẩn). Tim mời chương tăng dần 0, 1, 2, 3(, 4).
- Nỗi sợ của nhân vật chỉ được kể ở chương mời từ 3 tim (Mèo chương 4, Chó chương 4, Khỉ chương 4); bí mật chỉ kể ở chương 4 tim (Chó chương 5). Các mạch khác không lộ bí mật.

## Vật mới trên map

154 target mới, mỗi cái một look riêng chép từ model đã có trong manifest (pack Kenney, prop emoji đã sinh), không thêm art. Khai trong `content/world/targets.json` + `content/world/looks.json`, generator tự đặt theo `places` của quest.

| Map | Interactable trước → sau |
| --- | --- |
| `nha-cua-be` | 57 → 100 |
| `trung-tam` | 102 → 133 |
| `forest-ch1` (Khu rừng bí mật) | 144 → 187 |
| `truong-hoc` | 179 → 216 |

Vùng khối (`regions/*.bin`, `horizon.bin`) không đổi; chỉ `entities.json` của bốn map và lưới đi bộ (`content/world/walk/*.json`) đổi.

## Sinh lại map và audit (từng map một)

| Map | `scenery-audit` | `room-audit` | `reach-audit` | `world:quest-targets` | `world:walk` |
| --- | --- | --- | --- | --- | --- |
| nha-cua-be | 0 cây trên đường, 0 vật chắn lối, 0 nơi lạc đường | 3 không gian có mái, 0 thiếu chuẩn | mọi target tới được, chỗ xuất hiện trống | sạch | 26.734 chỗ đứng, 119 nơi |
| trung-tam | 0 / 0 / 0 / 0 | 287, 0 thiếu chuẩn | sạch | sạch | 694.363 chỗ đứng, 170 nơi |
| forest-ch1 | 0 / 0 / 0 / 0 | 8, 0 thiếu chuẩn | sạch | sạch | 640.745 chỗ đứng, 221 nơi |
| truong-hoc | 0 / 0 / 0 / 0 | 252, 0 thiếu chuẩn | sạch | sạch | 687.793 chỗ đứng, 287 nơi |

Sự cố đã sửa bằng cách dời vật, không đổi `traversal`:

- Trường học: nơi «Cổng trường» của Hổ chương 1 chỉ cách các nơi khác 7 khối (cảnh báo «aim 10»). Đổi nơi thành «Lối vào trường» (không gắn mốc), cảnh báo hết. Cảnh báo còn lại của `tv2-t05-b09` là của bài học có sẵn, như đợt 1.
- Khu rừng: test generator báo `folk-pupil-2` (bạn nhỏ đi cùng Nai) đứng cách target `st-doi-tai-to-do-lac-gio-qua` 4,2 khối (cần ≥ 5), vì cụm vật chương 1 của Nai chiếm chỗ cũ của Nai nên Nai và bạn đi cùng dời đi. Thêm một vật riêng cho bước quyết định («Thảm cỏ nằm đếm đom đóm») để cụm vật đổi chỗ; Nai về gần chỗ cũ, test xanh.
- Thứ tự đúng là sinh map → `pnpm assets:manifest` → `pnpm world:walk` (lưới đi bộ băm theo sha trong manifest); lần đầu chạy walk trước manifest nên test độ tươi đỏ, chạy lại walk sau manifest thì xanh.

## Kiểm tra

- `pnpm assets:check` OK (16 pack, 4.789 file).
- `pnpm content:check` OK (2.096 file).
- Test liên quan (`pnpm vitest run <file>`, chạy nối tiếp, 1 bộ mỗi lần):
  - `packages/schema/src/content.test.ts`, `packages/schema/src/npc.test.ts`, `apps/server/src/npc/npc-catalog.test.ts`, `apps/server/src/content/content-catalog.test.ts`, `tools/content/check-content.test.ts`, `tools/content/content-variety.test.ts`, `tools/content/quest-spread.test.ts`, `tools/world/walk-export.test.ts`, `tools/world/quest-target-audit.test.ts`, `tools/world/model-catalog.test.ts`, `tools/world/side-givers.test.ts`, `tools/world/home-decor-map.test.ts`: 12 file, 160 test pass.
  - `apps/server/src/npc/npc-routes.test.ts`, `apps/server/src/multiplayer/bot-brain/quest-plan.test.ts`, `apps/web/src/ui/region/region-board.test.ts`: 3 file, 21 test pass.
  - `tools/world/generate-school-map.test.ts`: 5 pass. `tools/world/generate-forest-map.test.ts`: 4 pass. `tools/world/zone-maps.test.ts -t "nha-cua-be|trung-tam"`: 10 pass (40 bỏ qua vì là map khác).
- `pnpm typecheck` OK. `pnpm lint` 0 cảnh báo.
- Không chạy ở local (theo luật `CLAUDE.md`): `pnpm test` đầy đủ, build web, E2E. Phần này chạy trên CI sau khi push (pha 4 của plan); commit của pha này chưa push.

## Ghi chú cho người duyệt

- Không thêm dependency, không đổi server; thưởng do server tính như cũ.
- Nội dung học là bản nháp AI (`review: teacher-pending`).
- Trong lời chọn và đáp án có nhắc tên vài nhân vật cùng map (Bác Lái Xe Hải, Mèo Xếp Khối, Hươu Bông Rắm…) và nhân vật chỉ có tên (Gà Con, Mèo Mướp, Hươu Con); họ không được đặt thêm lên map, không đổi giới hạn số quest mỗi nhân vật.
- Thư của Bác Thu Ngân Vui Vẻ (Chợ phiên) và các nhân vật map khác chỉ nằm trong hộp thư, không xuất hiện trong lời thoại quest (luật «mỗi nhân vật sống ở một map»).

## Câu hỏi còn mở

Không có.
