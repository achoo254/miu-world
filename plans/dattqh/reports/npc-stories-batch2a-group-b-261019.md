# Chuyện riêng của nhân vật, đợt 2a, nhóm B (19/10/2026)

Plan: `plans/dattqh/261019-1057-npc-stories-batch-2a/plan.md`, pha 2 (Làng ven sông, Xóm mái ấm, Chợ phiên, Nông trại). Tier: L. Khuôn giữ đúng đợt 1 (`plans/dattqh/reports/npc-stories-batch1-261005.md`) và nhóm A (`plans/dattqh/reports/npc-stories-batch2a-group-a-261019.md`). Không đổi code, server hay schema.

## Kết quả

| Map | Mạch mới | Nhân vật | Chương | Vùng (chapter) | Vật mới |
| --- | --- | --- | --- | --- | --- |
| Làng ven sông | `den-sen-ngan-ha` «Dòng sông thành dải ngân hà» | Cô Đèn Lồng Sen | 4 | 1 (Đầu làng) | 25 |
| Làng ven sông | `meo-sen-dem-vit` «Ngăn nắp như Mèo Đầm Sen» | Mèo Đầm Sen | 3 | 4 (Đầm sen) | 18 |
| Xóm mái ấm | `ong-bay-giai-co` «Giải cờ gánh đầu tiên của xóm» | Ông Bảy Cờ Gánh | 4 | 1 (vườn hoa, ngõ nhà Mẩy) | 25 |
| Xóm mái ấm | `meo-tra-da-quan-moi-mien` «Quán trà mọi miền» | Mèo Trà Đá | 3 | 2 (Ngõ nhỏ ánh trăng; mở chương ở Giếng xóm) | 19 |
| Chợ phiên | `thu-ngan-tram-chuyen-cuoi` «Một trăm chuyện cười về con số» | Bác Thu Ngân Vui Vẻ | 5 | 2 (dãy cân đong, bến kênh) | 30 |
| Chợ phiên | `banh-mi-xe-dau-tien` «Chiếc xe bánh mì đầu tiên» | Cô bánh mì Hạnh | 3 | 1 (gian hàng đồ ăn) | 18 |
| Nông trại | `heo-dan-dong-ca` «Dàn đồng ca nông trại» | Heo Kho Hàng | 4 | 1 | 24 |
| **Tổng** | **7 mạch** | 7 nhân vật chưa có mạch | **26 chương** (208 bước) | | **159** |

Số mạch mỗi map sau pha: Làng ven sông 4, Xóm mái ấm 4, Chợ phiên 4, Nông trại 4.

### Khuôn mỗi chương (đã kiểm bằng `content:check` và kiểm riêng lúc soạn)

- Quest `category: "story"`, `review: "teacher-pending"`, id `yarn-<mạch>-<số>`, mở bằng lời của chính nhân vật, đứng ở chỗ của người giao minigame (luôn có trong thế giới).
- Đủ 8 pha, 7 câu hỏi thiết kế; 4–7 nơi mỗi chương, không quá 2 bước liền ở một nơi (hầu hết chỉ 1); mỗi chương 3–4 cơ chế ngoài trắc nghiệm (tìm vật theo lời tả, tìm quanh, sắp xếp, chọn nhiều, logic câu đố/quy luật/mê cung, minigame, quyết định).
- Mỗi bước học có ba lớp Hướng dẫn · Gợi ý · Đáp án kèm giải thích, 3 lời khen và 3 lời gỡ sai, đủ tiếng Anh; chữ hiển thị dùng `{name}`; không câu nào trùng nội dung đã có, kể cả các câu mới của nhóm A.
- Nội dung học bám chương trình lớp 2, viết mới (không trích chữ SGK): trừ từ số tròn trăm, cộng và trừ có nhớ trong phạm vi 100, cộng ba số, tìm số bị trừ, hơn kém, so sánh và xếp thứ tự số, số tròn chục và tia số, chục và đơn vị; xem đồng hồ (giờ, giờ rưỡi, buổi trong ngày), xem lịch (thứ và ngày trong tuần); ki-lô-gam và cân đĩa, lít, xăng-ti-mét; tiền Việt Nam (tờ 1 000, 2 000, 5 000, 10 000 đồng, tiền thối); thứ tự bảng chữ cái; từ chỉ hoạt động, từ chỉ đặc điểm; câu kể Ai làm gì?, dấu chấm hỏi; đọc hiểu, kể theo trình tự. Lời bài hát của Heo, thư cờ, công thức trà, nhật ký nước vối đều viết mới.
- Đáp án đã kiểm lại bằng tay, mê cung kiểm bằng script (đúng một dãy bước tới đích).
- Thư sau mỗi chương; mỗi mạch có thư từ nhân vật map khác: Mèo Gắp Thú (Chợ phiên) và Thỏ Ngắm Sao (Thư viện) cho Cô Đèn Lồng Sen; Tể Tướng Cờ Vua (Lâu đài) cho Mèo Đầm Sen; Cún Đốm Dọn Nhà (Nhà của bé) cho Ông Bảy; Nai Đom Đóm (Khu rừng bí mật) cho Mèo Trà Đá; Chó Cảnh Sát Còi (Trung tâm) cho Bác Thu Ngân; Bà Năm Kể Chuyện (Xóm mái ấm) cho Cô Hạnh; Cô Nặn Tò He (Chợ phiên) cho Heo. Người viết thư map khác chọn theo quan hệ đã có trong `content/npcs`. Số tim mời tăng dần 0, 1, 2, 3(, 4).
- Nỗi sợ chỉ kể ở chương mời từ 3 tim: gió lớn tắt đèn (Cô Đèn Lồng Sen, chương 4), ngồi một mình dưới giàn mướp (Ông Bảy, chương 4), thối nhầm tiền (Bác Thu Ngân, chương 4), góc tối nhà kho (Heo, chương 4). Bí mật chỉ kể ở chương 4 tim: đồng xu nước vối của Bác Thu Ngân (chương 5). Các mạch 3 chương không lộ nỗi sợ hay bí mật; bí mật của Heo (không hát được) và của Ông Bảy (chưa thắng Bà Năm) không xuất hiện.

## Vật mới trên map

159 target mới, mỗi cái một look riêng chép từ model đã có trong manifest (pack Kenney, prop emoji đã sinh), cùng chiều cao với look có sẵn của model đó, không thêm art. Khai trong `content/world/targets.json` + `content/world/looks.json`, generator tự đặt theo `places` của quest.

| Map | Interactable trước → sau |
| --- | --- |
| `lang-ven-song` | 127 → 170 |
| `xom-mai-am` | 140 → 184 |
| `cho-phien` | 159 → 207 |
| `nong-trai` | 119 → 143 |

Vùng khối (`regions/*.bin`, `horizon.bin`) không đổi; chỉ `entities.json` của bốn map, manifest và lưới đi bộ (`content/world/walk/*.json`) đổi.

## Sinh lại map và audit (từng map một, theo thứ tự map → `assets:manifest` → `world:walk` → audit)

| Map | `scenery-audit` | `room-audit` | `reach-audit` | `world:quest-targets` | `world:walk` |
| --- | --- | --- | --- | --- | --- |
| lang-ven-song | 0 cây trên đường, 0 vật chắn lối, 0 nơi lạc đường, 0 nơi bị cắt khỏi mạng | 165 không gian có mái, 0 thiếu chuẩn | mọi target tới được, chỗ xuất hiện trống | sạch | 670.947 chỗ đứng, 208 nơi |
| xom-mai-am | 0 / 0 / 0 / 0 | 177, 0 thiếu chuẩn | sạch | sạch | 671.398 chỗ đứng, 256 nơi |
| cho-phien | 0 / 0 / 0 / 0 | 350, 0 thiếu chuẩn | sạch | sạch | 709.202 chỗ đứng, 243 nơi |
| nong-trai | 0 / 0 / 0 / 0 | 93, 0 thiếu chuẩn | sạch | sạch | 662.489 chỗ đứng, 182 nơi |

Sự cố đã sửa (dời vật hoặc đổi nơi, không đổi `traversal`):

- Xóm mái ấm: `content:check` từ chối Bà Gấu Nâu làm người kể chuyện. Bà là người dẫn đường của map, đứng trong các bài học chương 1–2 nên bị gắn chương, không «luôn có trong thế giới» như người giao minigame. Muốn giữ bà thì phải thêm bà vào bảng minigame của map, tức là thêm quest phụ mới, vượt phạm vi pha này. Vì vậy mạch của bà được thay bằng mạch của Mèo Trà Đá, người giao minigame chưa có mạch. Bà Gấu Nâu để lại cho đợt sau, khi có quyết định về người dẫn đường.
- Chợ phiên: nơi «Tháp đồng hồ» của chương 1 chuyện Cô Hạnh chỉ cách các nơi khác 7 khối (cảnh báo «aim 10»), vì tháp đứng sát Nhà lồng chợ. Đổi nơi thành «Cột giờ lò bánh» (không gắn mốc); sinh lại map thì cảnh báo hết.
- Cảnh báo còn lại của `tv2-t14-b25` (Xóm mái ấm, «vách tổ ong» cách 7 khối) là của bài học có sẵn, như đợt 1 và nhóm A.

## Kiểm tra

- `pnpm assets:check` OK (16 pack, 4.789 file).
- `pnpm content:check` OK (2.122 file).
- Test liên quan (`pnpm vitest run <file>`, chạy nối tiếp, mỗi lần một bộ):
  - `packages/schema/src/content.test.ts`, `packages/schema/src/npc.test.ts`, `apps/server/src/npc/npc-catalog.test.ts`, `apps/server/src/content/content-catalog.test.ts`, `tools/content/check-content.test.ts`, `tools/content/content-variety.test.ts`, `tools/content/quest-spread.test.ts`, `tools/world/walk-export.test.ts`, `tools/world/quest-target-audit.test.ts`, `tools/world/model-catalog.test.ts`, `tools/world/side-givers.test.ts`: 11 file, 126 test pass.
  - `tools/world/zone-maps.test.ts -t "lang-ven-song|xom-mai-am|cho-phien|nong-trai"`: 20 pass (30 bỏ qua vì là map khác). Bốn map này không có file test generator riêng; `zone-maps.test.ts` là test generator của chúng.
  - `apps/server/src/npc/npc-routes.test.ts`, `apps/server/src/multiplayer/bot-brain/quest-plan.test.ts`, `apps/web/src/ui/region/region-board.test.ts`: 3 file, 21 test pass.
- `pnpm typecheck` OK. `pnpm lint` 0 cảnh báo.
- Không chạy ở local (theo luật `CLAUDE.md`): `pnpm test` đầy đủ, build web, E2E. Phần này chạy trên CI sau khi push (pha 4 của plan); commit của pha này chưa push.

## Ghi chú cho người duyệt

- Không thêm dependency, không đổi server; thưởng do server tính như cũ.
- Nội dung học là bản nháp AI (`review: teacher-pending`).
- Chỉ người kể chuyện nói trong quest. Nhân vật cùng map (Voi Bốc Hàng, Cô Nặn Tò He, Bà Năm, Anh Thợ Sửa Mái…) có được nhắc tên trong lời kể, và có vài nhân vật chỉ có tên (vịt, khán giả, khách, bạn nhỏ). Họ không được đặt thêm lên map và không làm thay đổi giới hạn số quest mỗi nhân vật. Bạn cờ của Mèo Đầm Sen trong quest được gọi là «Bạn cờ phương xa»; tên Tể Tướng Cờ Vua chỉ có trong thư.
- Nhân vật map khác chỉ xuất hiện trong hộp thư, không có trong lời thoại quest (luật «mỗi nhân vật sống ở một map»).
- Mèo Trà Đá mở các chương ở Giếng xóm. Vật của chuyện nằm ở vùng 2 (Ngõ nhỏ ánh trăng), cách giếng khoảng 180 khối theo đường chim bay; reach-audit xác nhận mọi vật đều tới được.
- Cột trạng thái pha 2 trong `plan.md` sửa tay giống nhóm A, vì plan để các pha trong bảng chứ không có file pha riêng mà `ak plan` quản lý.

## Câu hỏi còn mở

- Bà Gấu Nâu (người dẫn đường Xóm mái ấm) có nên có mạch chuyện ở đợt 2b không? Muốn vậy thì phải cho bà giao một minigame (thêm quest phụ) hoặc nới luật «người kể chuyện luôn có trong thế giới» cho người dẫn đường.
