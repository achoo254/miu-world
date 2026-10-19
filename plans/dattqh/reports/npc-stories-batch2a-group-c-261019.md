# Chuyện riêng của nhân vật, đợt 2a, nhóm C (19/10/2026)

Plan: `plans/dattqh/261019-1057-npc-stories-batch-2a/plan.md`, pha 3 (Thư viện, Lâu đài, Núi tuyết, Đảo bí ẩn). Tier: L. Khuôn giữ đúng đợt 1 (`plans/dattqh/reports/npc-stories-batch1-261005.md`), nhóm A và nhóm B (`plans/dattqh/reports/npc-stories-batch2a-group-a-261019.md`, `…-group-b-261019.md`). Không đổi code, server hay schema.

## Kết quả

| Map | Mạch mới | Nhân vật | Chương | Vùng (chapter) | Vật mới |
| --- | --- | --- | --- | --- | --- |
| Thư viện | `koala-nghin-manh` «Nghìn mảnh thư viện» | Koala Ghép Tranh | 4 | 1 (Phòng đọc, vườn đọc sách) | 24 |
| Thư viện | `meo-hop-nhac-tang-ban` «Hộp nhạc tặng bạn đọc» | Mèo Hộp Nhạc | 3 | 2 (Sân lễ hội lá vàng) | 16 |
| Lâu đài | `te-tuong-nghin-van-co` «Một nghìn ván cờ không ai thua» | Tể Tướng Cờ Vua | 5 | 2 (Đại sảnh ôn tập) | 26 |
| Lâu đài | `cao-mui-ten-mang-thu` «Mũi tên mang thư của Cáo» | Cáo Cung Thủ | 3 | 3 (bãi trước cổng thành; mở chương ở Khu luyện tập) | 18 |
| Núi tuyết | `canh-cut-xoay-ba-vong` «Ba vòng giữa hồ băng» | Cánh Cụt Trượt Băng | 4 | 3 (Hồ băng) | 22 |
| Núi tuyết | `cao-tuyet-tuong-bay-mau` «Bảy màu trong khối băng» | Cáo Tuyết Điêu Khắc | 3 | 1 (Làng núi tuyết) | 18 |
| Đảo bí ẩn | `khi-mua-dua-lon` «Mùa dừa lớn của Khỉ Hái Dừa» | Khỉ Hái Dừa | 4 | 2 (Rừng nhiệt đới) | 24 |
| Đảo bí ẩn | `cua-dem-nhip-song` «Đếm nhịp sóng cùng Cua» | Cua Lướt Sóng | 3 | 1 (Bến tàu và bãi biển) | 16 |
| **Tổng** | **8 mạch** | 8 nhân vật chưa có mạch | **29 chương** (232 bước) | | **164** |

Số mạch mỗi map sau pha: Thư viện 4, Lâu đài 4, Núi tuyết 4, Đảo bí ẩn 4. Cả mười hai map nay đều có 4 mạch (48 mạch, 170 chương `yarn-*`).

Người kể chuyện chọn trong số nhân vật luôn có trong thế giới (người giao minigame, không gắn chương). Hai người dẫn đường Gấu Trúc Tròn (Thư viện) và Hươu Cao (Lâu đài) chỉ đứng ở chương 1–2 nên không được chọn (bài học của nhóm B với Bà Gấu Nâu).

### Khuôn mỗi chương (đã kiểm bằng `content:check` và một script kiểm riêng lúc soạn)

- Quest `category: "story"`, `review: "teacher-pending"`, id `yarn-<mạch>-<số>`, mở bằng lời của chính nhân vật, đứng ở chỗ người giao minigame.
- Đủ 8 pha, 7 câu hỏi thiết kế; mỗi chương 4–5 nơi ngoài chỗ người kể, mỗi mạch không có hai chương cùng thứ tự loại bước; mỗi chương 3–4 cơ chế ngoài trắc nghiệm (tìm vật theo lời tả, tìm quanh, sắp xếp, chọn nhiều, logic quy luật/mê cung/câu đố, câu đố số, minigame, quyết định). Mê cung kiểm bằng tay hoặc bằng script: đúng một đường.
- Mỗi bước học có ba lớp Hướng dẫn · Gợi ý · Đáp án kèm giải thích, 3 lời khen và 3 lời gỡ sai, đủ tiếng Anh; chữ hiển thị dùng `{name}`; không câu nào trùng nội dung đã có, kể cả các câu của nhóm A, B và giữa tám mạch mới (tên nơi dài từ 16 ký tự cũng tính là câu, nên vài mốc dài được thay bằng tên ngắn tự đặt).
- Nội dung học bám chương trình lớp 2, viết mới (không trích chữ SGK): cộng, trừ có nhớ trong phạm vi 100, cộng ba số, hơn kém, so sánh và xếp thứ tự số, quy luật dãy số, tia số; xăng-ti-mét và đề-xi-mét, ki-lô-gam, lít; xem đồng hồ (giờ, giờ rưỡi, 15 giờ = 3 giờ chiều); hình phẳng (tứ giác, tam giác, hình tròn); thứ tự bảng chữ cái, từ chỉ hoạt động, từ chỉ đặc điểm, câu nêu đặc điểm, dấu chấm hỏi, chính tả s/x và ch/tr, đọc hiểu.
- Thư sau mỗi chương; mỗi mạch có thư từ nhân vật map khác, chọn theo quan hệ đã có trong `content/npcs`: Nai Leo Vách (Núi tuyết) cho Koala, Khỉ Chuyền Cành (Khu rừng) cho Mèo Hộp Nhạc, Mèo Đầm Sen (Làng ven sông) cho Tể Tướng, Bác Quăng Lưới Biển (Đảo bí ẩn) cho Cáo Cung Thủ, Bác Nông Dân Thành (Nông trại) cho Cánh Cụt, Mèo Xếp Khối (Trung tâm) cho Cáo Tuyết, Thỏ Măng Non (Trường học) cho Khỉ Hái Dừa, Gấu Bắc Cực Câu Cá (Núi tuyết) cho Cua. Số tim mời tăng dần 0, 1, 2, 3(, 4). Quà trong thư chỉ dùng vật phẩm đã có.
- Nỗi sợ chỉ kể ở chương mời 3 tim: Koala sợ thiếu mảnh cuối (chương 4; mảnh thiếu hóa ra vì lá bài của Mèo trượt vào khay), Cánh Cụt sợ nước sâu (chương 4), Khỉ sợ ong rừng (chương 4), Tể Tướng sợ những gì không theo luật (chương 4, nhắc lại ở chương 5). Bí mật chỉ kể ở chương 4 tim: Tể Tướng chưa từng thắng Bác Thợ Khóa Thành (chương 5). Các mạch 3 chương không lộ nỗi sợ hay bí mật; bí mật của Koala (giữ một mảnh), Cánh Cụt (ngã ở hội tuyết, tập đêm), Khỉ (chưa đọc trôi chảy), Cua (hộp thư dưới gốc dừa) không xuất hiện (đã soát bằng từ khóa).

## Vật mới trên map

164 target mới, mỗi cái một look riêng chép model và chiều cao từ look đã có (pack Kenney, prop emoji đã sinh), có cái thêm `tint`, không thêm art. Khai trong `content/world/targets.json` + `content/world/looks.json`, generator tự đặt theo `places` của quest.

| Map | Interactable trước → sau |
| --- | --- |
| `thu-vien` | 125 → 165 |
| `lau-dai` | 138 → 182 |
| `nui-tuyet` | 84 → 124 |
| `dao-bi-an` | 74 → 114 |

Vùng khối (`regions/*.bin`, `horizon.bin`) không đổi; chỉ `entities.json` của bốn map, manifest và lưới đi bộ (`content/world/walk/*.json`) đổi.

## Sinh lại map và audit (từng map một, theo thứ tự map → `assets:manifest` → `world:walk` → audit)

| Map | `scenery-audit` | `room-audit` | `reach-audit` | `world:quest-targets` | `world:walk` |
| --- | --- | --- | --- | --- | --- |
| thu-vien | 0 cây trên đường, 0 vật chắn lối, 0 nơi lạc đường, 0 nơi bị cắt khỏi mạng | 545 không gian có mái, 0 thiếu chuẩn | mọi target tới được, chỗ xuất hiện trống | sạch | 745.735 chỗ đứng, 251 nơi |
| lau-dai | 0 / 0 / 0 / 0 | 366, 0 thiếu chuẩn | sạch | sạch | 711.445 chỗ đứng, 297 nơi |
| nui-tuyet | 0 / 0 / 0 / 0 | 67, 0 thiếu chuẩn | sạch | sạch | 659.144 chỗ đứng, 189 nơi |
| dao-bi-an | 0 / 0 / 0 / 0 | 13, 0 thiếu chuẩn | sạch | sạch | 642.902 chỗ đứng, 169 nơi |

Không có cảnh báo «aim 10» nào của chương mới; cảnh báo còn lại của `toan2-cd6-b30` (Thư viện, «phòng lịch trên tháp» cách 7 khối) là của bài học có sẵn, như đợt 1.

Sự cố đã sửa:

- `content:check` từ chối hai chỗ kể chuyện nhắc tên vùng khác: chương 3 của Cua ghi «Núi tuyết» (đổi thành «núi băng phương bắc», tiếng Anh «the northern ice mountain»), và nơi «Thư viện lâu đài» của Tể Tướng chương 1 chứa tên vùng «Thư viện» (đổi thành «Phòng sách lâu đài»). Vì đổi tên nơi làm vật dời chỗ, Lâu đài được sinh lại lần hai theo đủ thứ tự; audit vẫn sạch.
- Generator đọc mọi quest nên không sinh map được khi còn chương đang soạn dở; các map chỉ sinh lại sau khi cả tám mạch xong.

## Kiểm tra

- `pnpm assets:check` OK (16 pack, 4.789 file).
- `pnpm content:check` OK (2.151 file).
- Test liên quan (`pnpm vitest run <file> --maxWorkers=1`, chạy nối tiếp):
  - `packages/schema/src/content.test.ts`, `packages/schema/src/npc.test.ts`, `apps/server/src/npc/npc-catalog.test.ts`, `apps/server/src/content/content-catalog.test.ts`, `tools/content/check-content.test.ts`, `tools/content/content-variety.test.ts`, `tools/content/quest-spread.test.ts`, `tools/world/walk-export.test.ts`, `tools/world/quest-target-audit.test.ts`, `tools/world/model-catalog.test.ts`, `tools/world/side-givers.test.ts`: 11 file, 126 test pass.
  - `tools/world/zone-maps.test.ts -t "thu-vien|lau-dai|nui-tuyet|dao-bi-an"`: 20 pass (30 bỏ qua vì là map khác); đây là test generator của bốn map.
  - `apps/server/src/npc/npc-routes.test.ts`, `apps/server/src/multiplayer/bot-brain/quest-plan.test.ts`, `apps/web/src/ui/region/region-board.test.ts`, và các test bot đọc lưới đi bộ hay quest của các map này: `apps/server/src/multiplayer/bot-meet.test.ts`, `apps/server/src/multiplayer/multiplayer.test.ts` (lưới Lâu đài), `apps/server/src/coop/bot-party-quest.test.ts`, `apps/server/src/multiplayer/hub-bot-party.test.ts`, `apps/server/src/multiplayer/bot-flow.test.ts`, `apps/web/src/game/hud/side-givers.test.ts`: 9 file, 56 test pass.
- `pnpm typecheck` OK. `pnpm lint` 0 cảnh báo.
- Không chạy ở local (theo luật `CLAUDE.md`): `pnpm test` đầy đủ, build web, E2E. Phần này chạy trên CI sau khi push (pha 4 của plan); commit của pha này chưa push.

## Ghi chú cho người duyệt

- Không thêm dependency, không đổi server; thưởng do server tính như cũ.
- Nội dung học là bản nháp AI (`review: teacher-pending`).
- Chỉ người kể chuyện nói trong quest. Nhân vật cùng map hoặc map khác (Hươu Cao, Bác Thợ Khóa Thành, Người Tuyết Đếm Bậc, Thuyền Trưởng Vẹt Biển, Khỉ Hái Dừa…) chỉ được nhắc tên trong lời kể hay chỉ viết thư; vài nhân vật chỉ có tên (Sơn Dương thi bắn, bác Cả, cô Út, ông Lưới ở làng chài). Không ai được đặt thêm lên map.
- Cáo Cung Thủ mở chương ở Khu luyện tập (gần Đại sảnh); vật của chuyện nằm ở bãi trước cổng thành, cách khoảng 200 khối, reach-audit xác nhận tới được (giống Mèo Trà Đá ở nhóm B).
- Vài nơi dùng tên tự đặt thay cho tên mốc dài (luật không lặp câu tính cả tên nơi), nên vật ở đó đứng trong vùng chương chứ không sát mốc.
- Vài chương dài 19–21 KB (nhiều chữ đọc và lời tả hai thứ tiếng), hơi dài hơn mức 14–17 KB của đợt trước.
- Cột trạng thái pha 3 trong `plan.md` sửa tay giống nhóm A, B (plan để các pha trong bảng, không có file pha riêng).

## Câu hỏi còn mở

- Người dẫn đường Gấu Trúc Tròn (Thư viện) và Hươu Cao (Lâu đài), như Bà Gấu Nâu ở nhóm B, chưa thể có mạch chuyện vì chỉ đứng ở vài chương. Đợt 2b cần quyết định cho họ giao một minigame hoặc nới luật «người kể chuyện luôn có trong thế giới».
