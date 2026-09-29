# Miu World — Master Development Plan v3 (3D voxel + Multiplayer)

Sep 29, 2026 · @Dat

## 1. Tóm tắt và thay đổi so với plan cũ

Plan v3 chốt: game 3D chạy trên web bằng Three.js, phong cách voxel kiểu Minecraft, luồng và bố cục theo 3 ảnh mock hiện tại (mock voxel cập nhật sau), làm single-player vertical slice trước, rồi thêm multiplayer trên nền server-authoritative.

| Hạng mục | Plan cũ | Plan v3 |
| --- | --- | --- |
| Nguồn chuẩn | 3 file HTML đặc tả bằng chữ | 3 ảnh mock hiện tại (7 + 9 + 11 panel), chỉ làm tham chiếu luồng và bố cục; mock voxel cập nhật sau |
| Phong cách hình ảnh | Chưa thống nhất (còn dòng 2D lẫn 3D) | Voxel 3D kiểu Minecraft (đã chốt) |
| Nhân vật | Chỉ Miu (mèo) | Chọn 1 trong 4 loài: Mèo, Thỏ, Cáo, Gấu. MVP chỉ làm Mèo |
| Tiền tệ hiển thị | XP, Coins | XP, Xu, Kim cương, chuỗi ngày (streak) |
| Multiplayer | Không có | Giai đoạn riêng sau MVP |
| Nguồn asset | Chưa rõ | Asset miễn phí có license (CC0, MIT, OFL) cộng với asset sinh bằng code; không tự vẽ, không dùng AI trả phí, không cần voxel artist |
| Bảo mật, an toàn trẻ em | Chưa có | Zero Trust và child safety xuyên suốt |
| Hệ kỹ năng | Lẫn Math, Reading, Vietnamese, Logic | Chuẩn hóa Subject → Skill (mục 5) |

**Đã chốt** (chi tiết ở mục 15):

1. Phong cách voxel 3D kiểu Minecraft; mock hiện tại chỉ là tham chiếu luồng, mock voxel cập nhật sau.
2. Asset lấy từ pack CC0 (Kenney, KayKit), icon Fluent Emoji (MIT), font OFL, phần còn lại sinh bằng code (mục 10).
3. Không đặt, phá block ở thế giới chính và khu chung.
4. Bản đồ thiết kế sẵn theo khu vực; generator theo seed chỉ là công cụ dựng map.
5. Tách Subject và Skill; Skill XP là phần thưởng MVP.
6. Không dùng Kim cương ở MVP.
7. MVP chỉ có loài Mèo.
8. Multiplayer mở từ Bậc 1 (thấy nhau), sau MVP.
9. Stack web: Vite + React SPA, bridge tự viết nối Three.js với React, Express + Drizzle + PostgreSQL (mục 7).

## 2. Nguồn chuẩn và art direction

Phong cách hình ảnh đã chốt là voxel 3D kiểu Minecraft; 3 ảnh mock hiện tại chỉ còn là tham chiếu cho luồng màn hình, bố cục và gameplay, còn mock voxel sẽ được cập nhật trong quá trình làm.

| Ảnh mock hiện tại | Nội dung | Số panel |
| --- | --- | --- |
| M1. Homepage và Character Creator | Trang chủ, chọn loài nhân vật, tùy chỉnh trang phục, chọn khu vực, quest, sự kiện TIMO, hồ sơ và bộ sưu tập | 7 |
| M2. Quest screens | Chọn quest trên bản đồ, mở đầu câu chuyện, đọc hiểu, Toán (kéo thả, sắp xếp, trắc nghiệm), lựa chọn, hỗ trợ học tập, hoàn thành | 9 |
| M3. Gameplay Core | Tổng quan đảo, điều khiển nhân vật, NPC, vật thể, ba lô, mini game, skill check, boss, hoàn thành | 11 |

**Quy tắc làm việc khi mock còn thay đổi:**

- Luồng màn hình, thông tin hiển thị và cơ chế chơi trong mock là nguồn chuẩn; hình dạng và màu sắc của nhân vật, môi trường trong mock thì không.
- Khi có mock voxel mới cho một màn hình, mock mới ghi đè mock cũ của màn hình đó; nếu hai bên mâu thuẫn, hỏi lại trước khi làm.
- UI tách lớp giao diện khỏi logic, dùng design tokens và bộ component chung, để đổi diện mạo mà không viết lại chức năng.
- Không làm khớp từng pixel với mock hiện tại; làm đúng luồng và chức năng trước.
- Mỗi màn hình ghi rõ đang bám mock nào, phiên bản nào.

**Art direction voxel (đề xuất, chờ mock mới xác nhận):**

- Thế giới, nhân vật, NPC, vật phẩm dựng từ khối vuông; màu tươi, ánh sáng mềm, hợp trẻ em.
- Thế giới là bản đồ thiết kế sẵn theo khu vực, không sinh ngẫu nhiên vô hạn.
- Camera third-person; Home Base và World Map dùng chung một cảnh đảo nổi.
- HUD giữ cấu trúc của M3.2: avatar và thanh XP, nhiệm vụ, bản đồ, ba lô, menu, joystick, nút Tương tác và Chạy.

**Điểm cần lưu ý:**

| Vấn đề | Chi tiết | Hướng xử lý |
| --- | --- | --- |
| Mock hiện tại là 3D mượt | Nhân vật, cây, đá trong mock không phải khối vuông | Chỉ dùng làm tham chiếu luồng; không dựng asset theo hình dạng trong mock |
| Nhận diện và bản quyền | Voxel kiểu Minecraft là phong cách; tên, texture, nhân vật và asset của Minecraft thuộc chủ sở hữu | Không dùng tên, texture hay asset của Minecraft; dùng pack CC0 (Kenney, KayKit) và asset sinh bằng code; nhờ pháp chế xem nếu cần |
| Hai bộ màu | Plan cũ có hai bộ token (hồng xanh, tím indigo) | Tạm lấy hồng làm màu chính; chốt token khi có mock voxel |

## 3. Tầm nhìn và nguyên tắc thiết kế

Miu World là game phiêu lưu nơi kiến thức là công cụ để tiến lên, không phải LMS có thêm avatar.

```
Thế giới → Khám phá → Tương tác → Quest → Kỹ năng học → Thử thách → Phần thưởng → Nhân vật phát triển → Mở khóa thế giới → Khám phá tiếp
```

| Nguyên tắc | Ý nghĩa | Bằng chứng trong mock |
| --- | --- | --- |
| Story và World trước Content | Câu chuyện và khám phá đứng trước câu hỏi | M2.2 mở đầu bằng NPC Cú mèo giao việc |
| Không biến mọi thứ thành quiz | Quiz chỉ là một mechanic | M2.4 kéo thả, M2.5 sắp xếp, M2.7 lựa chọn, M3.10 boss |
| Nhân vật là trung tâm | Có level, skill, túi đồ, trang phục | M1.7 hồ sơ Miu, M3.5 ba lô |
| Kiến thức có giá trị gameplay | Skill mở cổng, đánh boss | M3.9 Cổng Tri Thức, M3.10 Boss |
| Phần thưởng có tác động | Vật phẩm dùng lại ở quest sau | M3.5 Lá thần, Chìa khóa; M2.9 Hạt giống kỳ diệu |
| Tiến bộ mở thế giới | Level và skill mở khu vực | M1.1 Đảo bí ẩn cần Lv.15, Núi tuyết sắp mở |
| Không bị kẹt vì trả lời sai | Hướng dẫn, gợi ý, đáp án | M2.8 |

## 4. Thế giới: đảo nổi và các khu vực

Thế giới là một đảo nổi gồm 6 khu vực, mở dần theo level và kỹ năng; Home Base và World Map là cùng một cảnh 3D.

| Khu vực (theo mock) | Nội dung | Mở khóa | Giai đoạn |
| --- | --- | --- | --- |
| Nhà của Miu | Trang trí, bộ sưu tập, ba lô, điểm xuất phát | Mặc định | MVP |
| Khu rừng bí mật | Tiếng Việt, đọc hiểu; 12 chương; rương thưởng; NPC Vẹt (thay Cú mèo trong mock), Hải ly (thay Sóc) | Mặc định | MVP |
| Trường học | Toán, Tiếng Anh | Level hoặc skill | V1 |
| Thư viện | Đọc sách, manh mối | Reading skill | V1 |
| Lâu đài | Thử thách nâng cao, sự kiện đặc biệt, boss | Level và skill | V1 |
| Núi tuyết | Chưa mở (Sắp mở) | Chưa xác định | Sau V1 |
| Đảo bí ẩn | Cần Lv.15 | Level 15 | Sau V1 |
| Khu sự kiện (cổng TIMO) | Sự kiện có thời hạn, hiện đếm ngược "Còn 12 ngày" | Lịch sự kiện | Live World |

**Mỗi khu vực bắt buộc có:** NPC, quest, tương tác, bộ sưu tập hoặc điều kiện mở khóa. Khu vực chỉ để trang trí thì không đạt.

MVP chỉ dựng **một khu vực nhỏ** (Khu rừng bí mật, chương 1) cộng với Home Base, đúng nguyên tắc vertical slice.

Mỗi khu vực là một bản đồ voxel thiết kế sẵn (mục 10 và 11), không sinh ngẫu nhiên vô hạn; đảo nổi trong mock sẽ được dựng bằng block.

## 5. Hệ thống gameplay

Toàn bộ hệ thống xoay quanh một vòng lặp: quest tạo tình huống, kỹ năng học là công cụ, phần thưởng làm nhân vật mạnh lên và mở khu vực mới.

### Nhân vật và tùy biến

| Thành phần | Theo mock | Ghi chú triển khai |
| --- | --- | --- |
| Chọn loài | Mèo, Thỏ, Cáo, Gấu, mỗi loài có tính cách gợi ý (M1.2) | MVP chỉ làm Mèo; ba loài còn lại là V1 vì mỗi loài cần mô hình voxel và bộ trang phục riêng |
| Các bước tạo | Thông tin, Ngoại hình, Trang phục, Phụ kiện, Hiệu ứng đặc biệt, Xem trước (M1.3) | Preview 3D ở giữa, đổi đồ thấy ngay |
| Nhóm đồ | Áo, Mũ, Giày, Balo, Cánh; một số ô khóa | Đồ khóa mở theo level, quest, sự kiện |
| Hoạt ảnh xem thử | Vẫy tay, Nhảy, Ngáp, Vui mừng | 4 hoạt ảnh bắt buộc (xoay các khối tay, chân, đầu, đuôi) |
| Tính cách | Nhà thám hiểm (dropdown) | Chỉ phục vụ danh tính và câu chuyện ở MVP |

### Kỹ năng: chuẩn hóa Subject → Skill

Mock đang trộn hai tầng (hồ sơ dùng Toán, Tiếng Việt, English; boss và skill check dùng Đọc hiểu, Toán, Logic). Đã chốt tách rõ (mục 15 #5):

| Tầng | Ví dụ | Dùng ở đâu |
| --- | --- | --- |
| Subject (môn) | Toán, Tiếng Việt, English | Khu vực trên bản đồ, hồ sơ |
| Skill (kỹ năng) | Đọc hiểu, Phép cộng, So sánh số, Ghép câu, Logic | Skill Check, boss, tiến bộ nhân vật |

Level của Subject là tổng hợp từ các Skill bên dưới. Skill XP là một loại phần thưởng của MVP (danh mục trong `content/learning/skills.json`).

### Quest

Một quest theo 8 pha: Hook, Explore, Learn, Challenge, Decision, Finale, Reward, Unlock. Quest bị coi là chưa đạt nếu chỉ có "đọc, trả lời, đúng sai, tiếp tục". Mọi quest phải trả lời 7 câu: đóng vai ai, ở đâu, mục tiêu gì, chơi gì, dùng kiến thức nào, nhận gì, mở khóa gì.

### Cơ chế tương tác (có trong mock)

| Cơ chế | Mock | Ví dụ |
| --- | --- | --- |
| Tìm và chạm vật | M1.5 | Chạm Chiếc hộp, Lá thư, Cây nấm, Bụi cây |
| Kéo thả | M2.4 | Kéo số quả táo để đủ 10 |
| Sắp xếp | M2.5, M3.6 | Xếp đá 27, 15, 9, 34 theo thứ tự |
| Ghép câu | M3.7 | Xếp thẻ từ thành "Chim đang hót trên cành cây." |
| Trắc nghiệm có hỗ trợ | M2.3, M2.6 | Đọc hiểu, bài toán kẹo |
| Lựa chọn hành động | M2.7, M3.8 | Tìm gỗ, Đi vòng, Nhờ bạn giúp |
| Đố vật thể | M3.4 | Cây cổ thụ hiện 8 + 5 = ? |
| Skill Check | M3.9 | Cổng cần Đọc hiểu Lv.2, Toán Lv.2; thiếu thì dẫn đến khu luyện tập |
| Boss | M3.10 | Quái vật rừng 500 HP; mỗi kỹ năng trừ 80 HP |

### Hỗ trợ học tập

Mọi thử thách dùng chung ba lớp hỗ trợ (M2.8): **Hướng dẫn** (Cách làm, Ví dụ mẫu, Mẹo nhỏ), **Gợi ý**, **Đáp án kèm giải thích**. Xem đáp án không khóa tiến trình; có thể giảm XP nhẹ.

### Phần thưởng và kinh tế

| Loại | Nguồn (theo mock) | Công dụng |
| --- | --- | --- |
| XP | Hoàn thành quest (+100 XP) | Level nhân vật |
| Xu | Hoàn thành quest (+20 Xu) | Mua đồ, trang trí (chưa có cửa hàng trong mock, xem NEW SCREEN) |
| Kim cương | Hiển thị ở thanh trên (12) | Không dùng ở MVP (mục 15 #6): ẩn ô Kim cương trên HUD, không có trong API |
| Skill XP | "Kỹ năng đọc +1" | Mở Skill Check, đánh boss |
| Vật phẩm | Lá thần, Chìa khóa, Pha lê, Hạt giống kỳ diệu | Dùng ở quest sau |
| Huy hiệu, sinh vật, địa điểm | Bộ sưu tập (M1.7) | Thu thập, mở khóa đồ đặc biệt |

Lưu ý: **mọi giá trị thưởng do server tính**, client chỉ hiển thị (xem mục 9).

### Xây dựng

Phong cách voxel khiến người chơi mong đợi đặt và phá block. Đã chốt (mục 15 #3): **không** cho phá hay đặt block ở thế giới chính và khu chung; nếu có thì chỉ ở Home Base cá nhân với bộ block cố định, làm sau MVP.

## 6. Screen map đối chiếu với mock

Có 24 nhóm màn hình đã có mock (hoặc mock một phần) và 26 màn hình là NEW SCREEN; các màn hình NEW cần thiết kế theo đúng visual language của 3 mock trước khi làm.

Ký hiệu mock: M1, M2, M3 là ba ảnh, số sau dấu chấm là số panel.

Mock hiện tại là bản art mượt và sẽ được thay bằng mock voxel; bảng dưới đối chiếu theo luồng màn hình và sẽ cập nhật khi có mock mới.

### Màn hình đã có mock

| Nhóm | Màn hình | Mock | Trạng thái | Giai đoạn |
| --- | --- | --- | --- | --- |
| Core | Trang chủ (Home Base) | M1.1 | Có mock | MVP |
| Core | Bản đồ thế giới 3D | M3.1 | Có mock | MVP |
| Core | Chọn khu vực, chi tiết khu vực, danh sách quest | M1.4, M2.1 | Có mock | MVP |
| Core | Gameplay 3D: HUD, joystick, nút Tương tác, Chạy | M3.2 | Có mock | MVP |
| Core | Chọn loài nhân vật | M1.2 | Có mock | MVP |
| Core | Tùy chỉnh trang phục, xem trước, đặt tên | M1.3 | Có mock | MVP |
| Core | Hồ sơ Miu, Kỹ năng, Bộ sưu tập | M1.7 | Mock một phần (thiếu Hành trình, Túi đồ, Thành tích) | MVP |
| Core | Ba lô | M3.5 | Có mock | MVP |
| Gameplay | Mở đầu quest, câu chuyện | M2.2 | Có mock | MVP |
| Gameplay | Hội thoại NPC | M3.3 | Có mock | MVP |
| Gameplay | Khám phá, chạm vật thể | M1.5 | Có mock | MVP |
| Gameplay | Đố vật thể (8 + 5 = ?) | M3.4 | Có mock | MVP |
| Gameplay | Đọc hiểu | M2.3 | Có mock | V1 |
| Gameplay | Toán: kéo thả | M2.4 | Có mock | MVP |
| Gameplay | Toán: sắp xếp | M2.5, M3.6 | Có mock | MVP |
| Gameplay | Toán: trắc nghiệm có hỗ trợ | M2.6 | Có mock | MVP |
| Gameplay | Tiếng Việt: ghép câu | M3.7 | Có mock | V1 |
| Gameplay | Lựa chọn hành động | M2.7, M3.8 | Có mock | V1 |
| Gameplay | Skill Check, Cổng Tri Thức | M3.9 | Có mock | V1 |
| Gameplay | Boss Challenge | M3.10 | Có mock | V1 |
| Tiến bộ | Hoàn thành quest, phần thưởng | M2.9, M3.11 | Có mock | MVP |
| Hỗ trợ | Hướng dẫn, Gợi ý, Đáp án | M2.8 | Có mock | MVP |
| Live | Banner sự kiện trên Home | M1.1 | Có mock | Live World |
| Live | Chi tiết sự kiện TIMO | M1.6 | Có mock | Live World |

### NEW SCREEN: chưa có mock

| Nhóm | Màn hình | Vì sao cần | Giai đoạn |
| --- | --- | --- | --- |
| Core | Hành trình (Journey), Thành tích | Có trong menu M1.7 nhưng không có nội dung | V1 |
| Core | Cửa hàng | Xu cần nơi tiêu | V1 |
| Gameplay | English Challenge, Logic puzzle, Tìm đồ vật | Có trong spec, không có mock | V1 |
| Tiến bộ | Level Up, Skill Up, Mở khóa khu vực | Khoảnh khắc thưởng quan trọng | MVP (Level Up, Mở khóa), V1 |
| Hỗ trợ | Pause, Cài đặt, Hộp thư | Có biểu tượng trong mock nhưng không có màn | MVP (Pause), V1 |
| Live | Event Quest, Event Reward | Hoàn thiện luồng sự kiện | Live World |
| Tài khoản | Đăng nhập, chọn hồ sơ trẻ, cổng phụ huynh, đồng ý của phụ huynh, khu vực phụ huynh | Bắt buộc với sản phẩm trẻ em (mục 9) | MVP |
| Hệ thống | Đang tải khu vực, mất mạng | Streaming asset, mạng yếu | MVP |
| Multiplayer | Town Hub online, danh sách bạn, phê duyệt bạn của phụ huynh, báo cáo và chặn, phòng chờ co-op | Mục 8 | MP |

## 7. Kiến trúc kỹ thuật

Kiến trúc tách ba lớp: runtime Three.js và giao diện React chạy ở client, server là nguồn sự thật cho mọi tiến độ và thưởng, CDN phát asset.

&#91;embedded content: kiến trúc client, server, CDN · 3 lớp\]

Client chỉ hiển thị và gửi hành động; API tính thưởng, tiến bộ và mở khóa; game server realtime chỉ thêm ở giai đoạn multiplayer.

| Lớp | Lựa chọn | Ghi chú |
| --- | --- | --- |
| Ứng dụng | Vite + React SPA, TypeScript, React Router (đã chốt, mục 15 #16) | Bỏ Next.js: game chạy hoàn toàn ở client, phát bằng static hosting + CDN, CSP chặt không cần nonce; nếu cần SEO cho trang public thì làm site tĩnh riêng |
| Runtime 3D | Three.js, WebGL2 là đường chính, WebGPU tùy chọn | Three.js không phải game engine đầy đủ; các hệ thống game là module riêng |
| Thế giới voxel | Chunk, greedy meshing chạy trong Web Worker, một texture atlas, culling theo chunk | Đã kiểm chứng ở POC; `packages/voxel` là TS thuần, không phụ thuộc quest và Three.js (mục 10, 11) |
| Va chạm | Kiểm tra theo lưới block (AABB, tự viết); Rapier chỉ khi cần vật thể động | Nếu dùng Rapier (WASM) thì CSP cần `wasm-unsafe-eval` |
| Tích hợp React và Three.js | Bridge tự viết (đã chốt, mục 15 #18): game phát event → store → React | React không điều khiển game loop, không nhận dữ liệu theo khung hình; không dùng React Three Fiber |
| Backend | Node.js, Express, TypeScript | API theo miền, dữ liệu do quest quyết định |
| Realtime | Colyseus hoặc `ws` | Giai đoạn multiplayer |
| Dữ liệu | PostgreSQL qua Drizzle ORM (đã chốt, mục 15 #17); PGlite cho dev và test; Redis, object storage khi cần | Migration SQL sinh bằng drizzle-kit, commit và review như code; CI chạy test trên PostgreSQL thật |
| Triển khai | Client qua static hosting và CDN; server tự host gần người dùng Việt Nam |  |

**Cấu trúc repo:**

```
apps/web/          Vite + React: src/game (runtime Three.js), src/game-bridge (store), src/ui (React)
apps/server/       Express + Drizzle: auth, hồ sơ trẻ, nhân vật, quest, thưởng
packages/voxel/    TS thuần: chunk, mesher, va chạm, phụ kiện (không import three)
packages/quest/    TS thuần: tiến trình quest, tính thưởng, level; dùng chung web và server
packages/schema/   Zod: DTO API và schema nội dung
content/ assets/ tools/
```

Luồng dữ liệu: game phát event → `packages/quest` dự đoán ở client để hiển thị → API server tính lại, ghi cơ sở dữ liệu, trả kết quả chuẩn → store → React.

## 8. Multiplayer online

Multiplayer làm sau MVP, mở theo 3 bậc tăng dần rủi ro, và server phải là nguồn sự thật từ ngày đầu để không phải viết lại.

Mock hiện chỉ có gameplay một người; toàn bộ màn hình multiplayer là NEW SCREEN (mục 6).

| Bậc | Chế độ | Nội dung | Điều kiện để mở |
| --- | --- | --- | --- |
| 1 | Thấy nhau ở khu chung | Vài người cùng xuất hiện ở Town Hub hoặc Nhà; chỉ dùng emote và câu nói có sẵn | Có báo cáo và chặn, phụ huynh bật được tính năng |
| 2 | Co-op quest | 2 đến 4 bạn cùng giải một puzzle hoặc đánh một boss (dùng lại cơ chế M3.10) | Có kiểm duyệt và quy trình xử lý báo cáo |
| 3 | Sự kiện trực tiếp | Sự kiện TIMO có thời hạn (M1.6), có thể có bảng xếp hạng theo nhóm | Đã chạy ổn bậc 1 và 2, đã load test |

**Khuyến nghị:** chưa có đội kiểm duyệt thì dừng ở bậc 1, chỉ cho thấy nhau, không cho tương tác tự do.

**Với voxel:** người chơi sẽ mong muốn xây dựng chung. Nếu sau này cho đặt và phá block ở khu chung thì phải đồng bộ thay đổi block qua server, giới hạn số block mỗi người, và kiểm duyệt nội dung xây dựng (hình vẽ, chữ, ký hiệu). Plan mặc định không cho phép.

### Kiến trúc multiplayer

| Thành phần | Đề xuất | Lý do |
| --- | --- | --- |
| Game server | Node.js + TypeScript, dùng Colyseus hoặc `ws` tự viết | Cùng stack với backend hiện tại |
| Giao thức | WebSocket qua server, không dùng P2P hoặc WebRTC trực tiếp | P2P lộ IP của trẻ, khó kiểm soát |
| Phân vùng | Mỗi khu vực là một room, giới hạn số người mỗi room | Giảm băng thông, dễ mở rộng |
| Đồng bộ vị trí | Tick 10 đến 20 lần mỗi giây, dự đoán phía client cho bản thân, nội suy cho người khác | Mạng di động không ổn định |
| Trạng thái quest và tiến độ học | Theo từng hồ sơ, lưu ở server, không chia sẻ | Tiến độ học là của từng bé |
| Trạng thái chia sẻ | Chỉ vị trí, emote, trang phục đang mặc trong room | Giới hạn dữ liệu lộ ra |
| Mở rộng | Redis pub/sub, nhiều instance, sticky session | Khi số người dùng tăng |
| Hạ tầng | Tự host gần người dùng Việt Nam | Độ trễ thấp |

**Việc bắt buộc làm ngay từ MVP, dù chưa có multiplayer:** API của quest, thưởng, tiến bộ chạy ở server; client chỉ gửi hành động và nhận kết quả. Khi đó thêm multiplayer chỉ là thêm lớp realtime.

## 9. An toàn trẻ em và Zero Trust

Đây là mục bị thiếu hoàn toàn ở plan cũ; với sản phẩm cho trẻ em và có multiplayer, nó phải được thiết kế trước khi viết code liên quan.

Về pháp lý: cần nhờ pháp chế xác nhận yêu cầu hiện hành theo Nghị định 13/2023/NĐ-CP và luật bảo vệ dữ liệu cá nhân mới (đồng ý của cha mẹ với dữ liệu trẻ em). Tài liệu này không thay thế tư vấn pháp lý.

| Rủi ro | Yêu cầu | Áp dụng khi |
| --- | --- | --- |
| Dữ liệu cá nhân của trẻ | Phụ huynh là chủ tài khoản, trẻ là hồ sơ con; không thu thập tên thật, email, trường của trẻ; đồng ý của phụ huynh trước khi tạo hồ sơ | MVP |
| Gian lận XP, xu, vật phẩm | Server tính và xác thực mọi thưởng, kết quả thử thách, mở khóa; client không được tin | MVP |
| Truy cập trái quyền (IDOR) | Mọi API kiểm tra quyền theo hồ sơ; test tự động cho từng endpoint | MVP |
| Tên nhân vật | Lọc từ ngữ, chọn từ danh sách hoặc tự sinh, không hiển thị tên thật | MVP |
| Kho asset và CDN | Signed URL, CSP chặt (Rapier WASM cần `wasm-unsafe-eval`), không nhúng script hay analytics bên thứ ba, dùng SRI | MVP |
| Asset 3D từ bên ngoài | Chỉ nhận license CC0, MIT, OFL; manifest ghi nguồn, URL, license, hash; CI chặn file thiếu license; quét file, không chạy script đi kèm; lưu bản tải trong repo, không hotlink | MVP |
| Chuỗi cung ứng mã nguồn | Khóa phiên bản, `npm audit` và SAST trong CI, AI tự review dependency mới, liệt kê trong trang review để con người duyệt cuối | MVP |
| Tiếp xúc người lạ | Không chat tự do; chỉ emote và câu có sẵn; kết bạn bằng mã, phụ huynh phê duyệt | MP |
| Bắt nạt, quấy rối | Chặn và báo cáo trong game, hàng đợi kiểm duyệt, nhật ký hành vi, phụ huynh tắt được multiplayer | MP |
| Kết nối giả mạo, tấn công | Token ngắn hạn theo phiên và hồ sơ, kiểm tra quyền ở mỗi message, rate limit, giới hạn kích thước message, WAF, tách server game khỏi API nghiệp vụ | MP |
| Chống hack trong game | Server kiểm tra tốc độ di chuyển, va chạm, cooldown | MP |

**Nếu sau này cho đặt và phá block:** server kiểm tra và ghi mọi thay đổi block, giới hạn số block và tốc độ đặt, kiểm duyệt nội dung xây dựng ở khu chung (hình vẽ, chữ, ký hiệu), phụ huynh tắt được tính năng; chưa có kiểm duyệt thì không cho xây ở khu vực có người chơi khác.

**Quy trình khi dùng Claude Code:** không đưa secret hoặc dữ liệu thật vào prompt; chạy trong sandbox; AI tự review và chạy test bảo mật cho mọi thay đổi về đăng nhập, phân quyền, thưởng và dữ liệu trẻ em, rồi đưa báo cáo vào trang review để con người duyệt cuối; thay đổi làm đổi cách thu thập hay chia sẻ dữ liệu trẻ em là quyết định quan trọng, luôn hỏi con người trước.

## 10. Asset pipeline voxel

Toàn bộ asset lấy từ nguồn miễn phí có license rõ ràng hoặc sinh bằng code; không ai tự vẽ, không dùng AI trả phí, nên Claude Code làm được trọn pipeline, con người chỉ duyệt cảm quan. Phân tích chi tiết: `plans/dattqh/reports/brainstorm-260929-1533-free-asset-sourcing.md`.

**License chấp nhận:** CC0 cho model, texture, âm thanh; MIT cho icon (Fluent Emoji); OFL cho font. Không nhận CC-BY, CC-BY-SA, NC.

### Asset MVP cần có

| Nhóm | Asset | Nguồn | Ai làm |
| --- | --- | --- | --- |
| Nhân vật | Miu (Mèo): khung xương và hoạt ảnh (đứng yên, đi, chạy, nhặt, tương tác, emote) lấy từ Kenney Blocky Characters, gắn đầu mèo tách từ Kenney Cube Pets; thân tô màu bằng code. 4 hoạt ảnh xem thử (vẫy tay, nhảy, ngáp, vui mừng) dùng lại hoặc tổ hợp từ 27 hoạt ảnh có sẵn | CC0; đã kiểm chứng ở POC (1 draw call, 568 tris, 31 anim). Kết quả duyệt POC: giữ kiến trúc kitbash, chỉnh visual chibi dễ thương (tỷ lệ đầu/mặt/thân, silhouette) | CC |
| Trang phục | Mũ, áo, giày, balo, cánh: phụ kiện khối mô tả bằng JSON (khối và màu), gắn vào node `head`, `torso`; mẫu mới bằng cách đổi màu | Sinh bằng code; đã kiểm chứng ở POC. Kết quả duyệt POC: giữ cơ chế JSON, chỉnh tỷ lệ và palette | CC |
| NPC | Vẹt (`animal-parrot`, thay Cú mèo), Hải ly (`animal-beaver`, thay Sóc) | Kenney Cube Pets, CC0 | CC |
| Môi trường | Block (cỏ, đất, đá, gỗ, lá, cát) từ Kenney Voxel Pack gộp atlas; cây, nhà dựng bằng block trong dữ liệu bản đồ; đạo cụ (rương, đèn, hàng rào, cầu, nấm, táo) từ KayKit Block Bits, Forest Nature và các kit của Kenney; nước, thác, bầu trời bằng shader | CC0 và code; đã kiểm chứng ở POC (greedy meshing trong Web Worker, 1 atlas). Kết quả duyệt POC: giữ chunk/meshing, chỉnh palette và texture block đồng nhất visual Miu World | CC |
| Cổng, viên đá số, thẻ chữ | Cổng từ Kenney Castle Kit cộng shader; số và chữ vẽ lúc chạy bằng canvas texture | CC0 và code | CC |
| Boss | Quái vật rừng: Quaternius Cute Animated Monsters hoặc ghép block, chốt ở V1 | CC0 | CC |
| Icon | Vật phẩm, tiền tệ, HUD, huy hiệu | Microsoft Fluent Emoji 3D, MIT | CC |
| UI | Khung, nút, banner bằng CSS và design tokens; ảnh đại diện, thumbnail cửa hàng và khu vực render từ model 3D bằng script | Code | CC, designer duyệt |
| Font, âm thanh, VFX | Baloo 2 và Nunito (có tiếng Việt, tự host); âm thanh Kenney; Kenney Particle Pack; "Nghe lại" dùng Web Speech API | OFL, CC0 | CC |

Chọn Mèo cho MVP; Thỏ (`animal-bunny`), Cáo (`animal-fox`), Gấu (`animal-polar` hoặc `animal-panda`) dùng lại cách ghép đầu, để V1.

### Quy trình

1. Nguồn: tải pack về (GLB, PNG), lưu bản gốc trong repo bằng git thường với ngân sách dung lượng (thư mục asset gốc ≤ 150 MB, mỗi file ≤ 20 MB; vượt thì chuyển Git LFS), không hotlink.
2. Ghi manifest cho từng file: pack, URL, phiên bản, license, hash; cập nhật `assets/LICENSES.md` và màn Credits.
3. Chuyển đổi bằng script: tách hoặc ghép mesh (đầu Cube Pets vào rig Blocky Characters), đổi về bảng màu chung, dữ liệu chunk cho bản đồ.
4. Gộp texture vào một atlas; nén texture (KTX2).
5. Kiểm tra tự động: license nằm trong danh sách cho phép, kích thước, số khối, số vật liệu, bảng màu, tên bộ phận và hoạt ảnh; lỗi thì không vào thư viện.
6. Đưa lên CDN, khai báo trong manifest theo khu vực.

**Quy tắc:** dùng lại asset có sẵn, chỉnh bằng script, chỉ sinh bằng code khi không có nguồn phù hợp; **không dùng tên, texture hay asset của Minecraft**; không tự vẽ và không dùng AI trả phí.

### Phong cách hiển thị

Dùng một atlas và một vật liệu cho toàn bộ khối, ánh sáng đơn giản (có thể bake ambient occlusion vào đỉnh), bảng màu tươi hợp trẻ em. Chốt ở POC vì lựa chọn này ảnh hưởng hiệu năng.

## 11. Data model và content authoring

Quest và nội dung được mô tả bằng dữ liệu, kiểm tra bằng schema, và không phụ thuộc vào Three.js; nhờ đó thêm quest không cần sửa code.

| Miền | Quan hệ | Ghi chú |
| --- | --- | --- |
| Tài khoản | Phụ huynh → Hồ sơ trẻ → Nhân vật | Mọi dữ liệu game gắn với hồ sơ, không gắn với phụ huynh |
| Thế giới | World → Region → Location; mỗi Region là một bản đồ voxel chia thành chunk | Region có điều kiện mở khóa; vật thể tương tác (NPC, rương, cổng) là entity, không phải block |
| Nhân vật | Nhân vật → Kỹ năng, Trang bị, Túi đồ, Bộ sưu tập | Loài (Mèo, Thỏ, Cáo, Gấu) là thuộc tính |
| Quest | Quest → Step → Interaction → Challenge | Mỗi Step có trigger và điều kiện |
| Học tập | Subject → Skill → Learning Activity → Skill XP | Tách Subject và Skill như mục 5 |
| Thưởng | XP, Xu, Skill XP, Vật phẩm, Huy hiệu, Mở khóa (Kim cương không dùng ở MVP) | Server tính và ghi |
| Live | Event → Quest → Challenge → Reward | Có lịch bắt đầu, kết thúc |

**Ví dụ một Step (rút gọn):**

```json
{
  "id": "forest-ch1-step2",
  "region": "khu-rung-bi-mat",
  "npc": "vet",
  "interaction": { "type": "search", "targets": ["chiec-hop", "la-thu", "cay-nam", "bui-cay"] },
  "learning": { "skill": "doc-hieu", "activity": "find-clue" },
  "support": ["guide", "hint", "answer"],
  "reward": { "xp": 100, "coin": 20, "skillXp": { "doc-hieu": 1 } },
  "unlock": ["forest-ch2"]
}
```

**Vai trò:** developer xây runtime, cơ chế, trigger; đội nội dung viết quest, câu chuyện, thử thách bằng dữ liệu; công cụ soạn quest nội bộ kiểm tra schema trước khi xuất bản.

## 12. Hiệu năng mobile

Với voxel, số bề mặt sinh ra từ block là rủi ro hiệu năng số một, nên phải đo ngay ở POC trước khi làm tiếp: POC đo tự động bằng giả lập CPU chậm cộng các máy thật lúc duyệt; đo đủ các máy thật ở cuối mục này là điều kiện nghiệm thu MVP.

Các con số dưới đây là **giả định khởi điểm** để POC kiểm chứng:

| Chỉ số | Mục tiêu khởi điểm | Cách kiểm soát |
| --- | --- | --- |
| Khung hình | Từ 30 FPS ổn định trên máy chuẩn iPad Gen 10 | Ba mức chất lượng tự chọn theo thiết bị |
| Draw call | Không quá khoảng 150 mỗi cảnh | Một atlas và một vật liệu, gộp block thành mesh theo chunk |
| Tam giác | Không quá khoảng 150.000 mỗi cảnh | Greedy meshing, bỏ mặt bị che, giới hạn tầm nhìn |
| Dung lượng tải khu vực đầu | Không quá khoảng 8 MB đã nén | Dữ liệu chunk nén, texture KTX2 |

**Ghi nhận sau đợt duyệt POC (2026-09-29):**
- Kết quả giả lập (CPU throttle 4× và 6×): đạt 60 FPS mượt mà, tối đa 91 draw calls (ngân sách ≤150), tối đa 25.1k tam giác (ngân sách ≤150k), tải khu vực đầu 1.82 MB thô / 0.43 MB gzip (ngân sách ≤8 MB).
- **Quyết định duyệt:** Giả lập CPU chưa phản ánh đúng GPU, nhiệt độ và hao pin trên thiết bị di động thật. Nhóm quyết định chưa kết luận hiệu năng mobile ở bước giả lập; yêu cầu đo đủ trên 2 máy Android tầm trung + 1 iPhone đời cũ ở cả 3 mức chất lượng (Low/Mid/High, theo dõi FPS, nhiệt độ và pin 15 phút) trước khi chốt Gate hiệu năng cho các phase tiếp theo.
- **Cập nhật 2026-09-29 (người sở hữu):** máy chuẩn đo hiệu năng từ nay là **iPad Gen 10**, thay cho bộ 2 Android tầm trung + 1 iPhone đời cũ. Số đo trên PC (164.8 FPS, 128 draw call, 33.4k tam giác, 1.48 MB) chỉ phản ánh desktop, không dùng để kết luận mobile. Máy yếu hơn iPad Gen 10 được hỗ trợ bằng mức chất lượng `low`, không phải điều kiện gate.

**Chiến lược:**

- WebGL2 là đường chính; WebGPU chỉ là tùy chọn vì mobile chưa đồng đều.
- Dựng mesh chunk trong Web Worker; không dựng lại mesh trong lúc chạy khung hình.
- Culling theo chunk và theo tầm nhìn; giới hạn tầm nhìn bằng sương mù.
- Chỉ tải chunk và khu vực cần; tải trước khu vực kế tiếp ở nền.
- Các màn mini game (M2.4 đến M2.6) dùng cảnh cận đơn giản, không dựng cả thế giới.
- Tạm dừng render khi mở giao diện toàn màn hình như Ba lô, Hồ sơ.
- Có màn hình tải khu vực và chế độ dự phòng khi mạng chậm hoặc mất mạng.
- Giải phóng bộ nhớ GPU khi rời khu vực, tránh treo máy sau vài lần chuyển cảnh.
- Kiểm tra trên máy chuẩn iPad Gen 10 ở 3 mức Low/Mid/High; đo FPS, nhiệt độ, tốc độ hao pin sau 15 phút chơi.

## 13. MVP vertical slice và lộ trình

MVP chứng minh một vòng lặp trọn vẹn trong một khu vực nhỏ, không dựng cả thế giới.

```
Mở game → Home → Tạo nhân vật → Vào Khu rừng bí mật → Di chuyển → Khám phá → Gặp NPC → Nhận quest → Tương tác → Thử thách Toán → Thưởng → XP và kỹ năng → Mở khóa chương tiếp
```

&#91;embedded content: lộ trình 6 phase · 4 gate\]

Phase sau chỉ bắt đầu khi gate của phase trước đạt; chưa có ngày cụ thể vì cần kết quả POC trước. Mock voxel được cập nhật song song và không chặn các phase.

## 14. Backlog P0: 24 việc đầu tiên

Thứ tự dưới đây đặt POC 3D và bảo mật trước gameplay; mỗi việc có kiểm thử tự động. **CC** là Claude Code làm chính, **Người** là việc con người phải làm hoặc duyệt ở lần duyệt cuối (mục 17). Plan và roadmap dùng mã ổn định (FOUNDATION-xx, ENGINE-01, VISUAL-xx, SLICE-xx, DEVICE-01); bảng đối chiếu mã ↔ số task ở `docs/project-roadmap.md`.

1. Ghi nhận quyết định đã chốt (voxel, mock cập nhật sau) và chốt các quyết định còn mở ở mục 15. **Người**
2. Sửa plan, viết `CLAUDE.md`, dựng cấu trúc repo. **CC + Người**
3. Monorepo: Vite + React, Express TypeScript, package schema dùng chung, CI (lint, test, `pnpm audit`, SAST). **CC**
4. Design tokens tạm theo mock hiện tại, tách lớp giao diện để đổi khi có mock voxel. **CC, designer duyệt**
5. Tìm nguồn asset: tải pack CC0 (Kenney, KayKit), Fluent Emoji, font; manifest, `assets/LICENSES.md`, kiểm tra license trong CI. **CC, Người duyệt license**
6. POC voxel: một bản đồ nhỏ, chunk meshing trong Web Worker, nhân vật ghép (rig Blocky Characters và đầu mèo Cube Pets), third-person, camera, va chạm theo lưới block, đo tự động bằng giả lập CPU chậm và một máy Android thật lúc duyệt. **CC, Người duyệt một lần cuối**
7. Tài khoản phụ huynh, hồ sơ trẻ, cổng phụ huynh, đồng ý của phụ huynh. **CC, duyệt bảo mật**
8. Data model và API nhân vật. **CC**
9. Nhân vật Miu ghép từ pack CC0 cùng hoạt ảnh; trang phục MVP là phụ kiện khối sinh bằng code. **CC, Người duyệt cảm quan**
10. Character Creator (M1.2, M1.3, cập nhật theo mock voxel). **CC**
11. Home Base và World Map dạng một cảnh voxel cùng HUD (M1.1, M3.1). **CC**
12. Bản đồ voxel Khu rừng bí mật: dựng map bằng block từ dữ liệu, entity (NPC Vẹt và Hải ly, rương, cổng) từ pack CC0. **CC, Người duyệt cảm quan**
13. Di chuyển, camera, va chạm, vùng tương tác (M3.2). **CC**
14. NPC và giao diện hội thoại (M3.3). **CC**
15. Quest schema, validator, runtime. **CC**
16. Tương tác khám phá và đố vật thể (M1.5, M3.4). **CC**
17. Ba thử thách Toán: kéo thả, sắp xếp, trắc nghiệm (M2.4 đến M2.6). **CC**
18. Hỗ trợ học tập: hướng dẫn, gợi ý, đáp án (M2.8). **CC**
19. Thưởng, XP, skill, mở khóa ở server; màn hoàn thành và Level Up (M2.9). **CC, duyệt bảo mật**
20. Ba lô và bộ sưu tập (M3.5, M1.7). **CC**
21. Script asset pipeline: ghép mesh, đổi bảng màu, atlas, render thumbnail và ảnh đại diện, kiểm tra license và ngân sách. **CC**
22. Test bảo mật: IDOR, chống gian lận, CSP. **CC viết, Người review**
23. Cập nhật mock voxel cho các màn hình MVP theo từng đợt, dựng từ asset đã có trong manifest, song song với các task trên. **CC dựng, Designer duyệt**
24. Vertical slice end-to-end, chơi thử với trẻ (cần phụ huynh đồng ý). **Người**

## 15. Rủi ro và quyết định cần chốt

Mọi quyết định của đợt POC và Foundation đã chốt (2026-09-29).

### Đã chốt

| # | Quyết định | Nội dung | Hệ quả |
| --- | --- | --- | --- |
| 1 | Phong cách hình ảnh | Voxel 3D kiểu Minecraft | Mock hiện tại (3D mượt) chỉ còn tham chiếu luồng; asset dễ làm hơn nhưng cần chunk meshing và tối ưu bề mặt |
| 2 | Mock | Cập nhật trong quá trình làm | UI tách lớp, dùng design tokens; mock mới ghi đè mock cũ của từng màn hình |
| 3 | Đặt và phá block | Không ở thế giới chính và khu chung; nếu có thì chỉ ở Home Base cá nhân, sau MVP | Không cần đồng bộ block hay kiểm duyệt nội dung xây dựng ở MVP |
| 4 | Cách tạo bản đồ | Thiết kế sẵn theo khu vực | Generator theo seed chỉ là công cụ dựng map, không sinh map lúc chơi |
| 5 | Subject và Skill | Tách hai tầng (mục 5) | Phần thưởng MVP phải có Skill XP; danh mục Subject → Skill là dữ liệu có schema |
| 6 | Kim cương | Không dùng ở MVP | Ẩn ô Kim cương trên HUD, không có trong API; muốn dùng lại phải hỏi pháp chế nếu liên quan tiền thật |
| 7 | Số loài ở MVP | Chỉ Mèo | Thỏ, Cáo, Gấu làm ở V1 |
| 8 | Bậc multiplayer đầu tiên | Bậc 1 (thấy nhau), sau MVP | Bậc 1 theo mục 8: emote, câu có sẵn, báo cáo và chặn, phụ huynh bật |
| 9 | Nguồn asset | CC0 (Kenney, KayKit), MIT (Fluent Emoji), OFL (font) và asset sinh bằng code; không tự vẽ, không AI trả phí | Không cần voxel artist; hình ảnh kém chi tiết hơn mock (mock là ảnh render AI) |
| 10 | Nhân vật người chơi | Ghép rig và hoạt ảnh Blocky Characters với đầu mèo Cube Pets | POC không đạt thì dựng khối bằng code |
| 11 | NPC | Vẹt thay Cú mèo, Hải ly thay Sóc | Sửa lời thoại và câu chuyện quest theo loài mới |
| 12 | Visual nhân vật Miu (sau POC) | Chỉnh visual theo hướng chibi voxel dễ thương, ưu tiên đầu/mặt/tỷ lệ cơ thể và silhouette | Giữ kiến trúc kitbash hiện tại (1 draw call, skinned mesh), tinh chỉnh tỷ lệ và model ở task tiếp theo |
| 13 | Phụ kiện nhân vật (sau POC) | Chỉnh tỷ lệ và palette | Giữ cơ chế sinh bằng JSON (gắn node head/torso), chỉnh bảng màu và kích thước cân đối với chibi |
| 14 | Bản đồ & Texture block (sau POC) | Chỉnh palette và texture block đồng nhất visual Miu World | Giữ nguyên kiến trúc chunk / greedy meshing Web Worker / generator theo seed |
| 15 | Đánh giá hiệu năng mobile (sau POC; cập nhật 2026-09-29) | Chưa kết luận từ giả lập; máy chuẩn là iPad Gen 10, đo ở Low/Mid/High | Chốt Gate hiệu năng khi có dữ liệu iPad Gen 10 (FPS, nhiệt độ, pin); máy yếu hơn dùng mức `low`, không chặn gate |
| 16 | Framework web | Vite + React SPA, React Router (thay Next.js) | Game client-only, static hosting + CDN, CSP chặt không cần nonce; SEO trang public làm site tĩnh riêng nếu cần |
| 17 | ORM và cơ sở dữ liệu | Drizzle + PostgreSQL; PGlite cho dev và test | Máy dev không cần Docker; CI chạy test trên PostgreSQL thật để bắt khác biệt |
| 20 | Duyệt đợt Foundation (2026-09-29, Jev quyết theo ủy quyền của người sở hữu) | Miu chibi chọn biến thể A (đầu 1.0×, thân 0.85×, tay chân 0.8×, mặt bằng khối); bảng màu block pastel ấm, chỉnh một vòng làm dịu xanh cỏ và lá; giữ cơ chế co phụ kiện theo nhân vật; giữ luồng tài khoản; chơi trong app web sửa sương mù xa | Chọn A dưới ngưỡng tự quyết (người sở hữu có thể đảo); FPS iPad Gen 10 chưa đo, chuyển DEVICE-01 trước nghiệm thu MVP |
| 19 | Đăng nhập phụ huynh | Google OAuth (Gmail), chỉ nhận email đã xác minh + mã tài khoản; PIN phụ huynh đặt ở lần đăng nhập đầu | Không lưu mật khẩu; văn bản đồng ý cập nhật (bản nháp draft-2, chờ pháp chế); ứng dụng Google cần xác minh trước khi mở người dùng thật |
| 18 | Nối React và Three.js | Bridge tự viết (event → store → `useSyncExternalStore`), không dùng React Three Fiber | Runtime không phụ thuộc React; React không nhận dữ liệu theo khung hình |

### Còn cần bạn chốt

Không còn.

### Rủi ro dự án

| Rủi ro | Mức | Giảm thiểu |
| --- | --- | --- |
| Phạm vi quá lớn (open world, 3D, multiplayer) | Cao | Vertical slice một khu vực; multiplayer sau MVP |
| Hiệu năng trên thiết bị di động (nhiều bề mặt voxel) | Cao | POC đo bằng giả lập; đo trên máy chuẩn iPad Gen 10 trước nghiệm thu MVP; máy yếu hơn dùng mức `low`; greedy meshing trong worker, ba mức chất lượng |
| Asset nhiều nguồn lệch phong cách, kém chi tiết so với mock | Trung bình | Bảng màu chung, flat shading, UI thống nhất bằng tokens; stakeholder xác nhận chất lượng ở POC |
| Ghép nhân vật từ hai pack không đạt | Trung bình | Kiểm chứng ở task #6; dựng khối bằng code |
| Pack nguồn đổi phiên bản hoặc URL | Thấp | Lưu bản tải và hash trong repo, không hotlink |
| Mock đổi giữa chừng làm phải sửa UI | Trung bình | Tách lớp UI, design tokens, bộ component chung; đổi theo từng màn hình |
| Nhầm lẫn với Minecraft (bản quyền, nhận diện) | Trung bình | Không dùng tên, texture, asset của Minecraft; chỉ dùng pack CC0 đã kiểm và asset sinh bằng code; nhờ pháp chế xem |
| Game biến thành bài kiểm tra | Trung bình | Mỗi quest phải qua 7 câu hỏi và có cơ chế ngoài trắc nghiệm |
| Hard-code nội dung | Trung bình | Quest bằng dữ liệu, có schema và validator |
| Rủi ro an toàn trẻ em | Cao | Mục 9, duyệt bảo mật, chưa mở tương tác nếu chưa có kiểm duyệt |
| Claude Code đi lệch kiến trúc qua nhiều phiên | Trung bình | `CLAUDE.md`, task nhỏ, acceptance test, AI tự review, con người duyệt cuối trên trang review |

## 16. Tiêu chí nghiệm thu MVP

MVP đạt khi một bé chơi trọn một quest trong Khu rừng bí mật và thấy việc học làm nhân vật mạnh lên, trên điện thoại thật.

- [ ] Chọn Mèo, đặt tên, đổi trang phục và thấy thay đổi ngay trên nhân vật voxel, rồi vào thế giới
- [ ] Di chuyển tự do bằng joystick và bàn phím, va chạm đúng, camera không xuyên khối
- [ ] Tương tác được với NPC và ít nhất 3 vật thể
- [ ] Quest có câu chuyện và vòng lặp đầy đủ, dùng ít nhất 2 cơ chế khác trắc nghiệm
- [ ] Một kiến thức học được dùng để giải một vấn đề trong game (ví dụ đố 8 + 5 = ? trên cây cổ thụ)
- [ ] Hướng dẫn, gợi ý, đáp án hoạt động và không khóa tiến trình
- [ ] XP, xu, skill, mở khóa do server tính; sửa dữ liệu ở client không đổi được kết quả
- [ ] Hoàn thành quest mở khóa chương hoặc khu vực tiếp theo
- [ ] Test IDOR và CSP đạt; không có script hay analytics bên thứ ba
- [ ] Đạt mục tiêu khung hình đã chốt sau POC trên máy chuẩn iPad Gen 10
- [ ] Giao diện đúng luồng và chức năng theo mock voxel mới nhất của các màn hình MVP
- [ ] Một bé chơi thử hoàn thành một quest (có phụ huynh đồng ý)
- [ ] Thêm quest mới chỉ bằng dữ liệu, không sửa code

## 17. Phân vai Claude Code và quy trình

Dự án vận hành theo mô hình AI làm 100%: Claude Code tự lên plan, code, test, review và tích hợp; con người chỉ **duyệt cuối** trên giao diện (trang review và bản chơi thử) và chốt các quyết định quan trọng. Chỉ những việc máy không làm thay được (nội dung giáo dục, chơi thử với trẻ, kiểm duyệt cộng đồng, đo máy thật trước nghiệm thu MVP) mới cần người.

| Việc | Claude Code | Con người (duyệt cuối) |
| --- | --- | --- |
| Backend, API, schema, CI | Làm và tự review (agent review, test bảo mật tự động) | Xem báo cáo bảo mật phần đăng nhập, phân quyền, thưởng ở lần duyệt cuối |
| React UI theo mock | Làm, so với mock bằng ảnh chụp tự động | Duyệt trên giao diện |
| Runtime Three.js, chunk voxel, camera, va chạm, tương tác | Làm, đo bằng test tự động | Chơi thử bản review, nhận xét cảm giác điều khiển |
| Quest runtime, thưởng, mở khóa | Làm, test chống gian lận tự động | Xem báo cáo ở lần duyệt cuối |
| Script asset pipeline | Làm, tự đặt ngân sách theo mục 12 | Chốt ngân sách chính thức ở gate POC |
| Nhân vật, trang phục, môi trường, boss | Làm chính (tải pack CC0, ghép, sinh phụ kiện bằng code, kiểm license) | Duyệt cảm quan và bảng license trên trang review |
| Nội dung học, câu hỏi | Soạn nháp | Giáo viên duyệt (việc chỉ người làm được) |
| Đo hiệu năng | Đo tự động bằng giả lập | Mở trên iPad Gen 10 lúc duyệt; đo đủ 3 mức chất lượng trên iPad Gen 10 trước nghiệm thu MVP |
| Kiểm duyệt, xử lý báo cáo | Không | Đội vận hành |
| Chơi thử với trẻ | Không | Bắt buộc |

**Quy tắc làm việc:**

- Mỗi task có acceptance test viết trước; AI tự review (agent review, lint, typecheck, test, quét bảo mật) và chỉ báo xong khi mọi kiểm tra đều xanh.
- Quyết định thường ngày do AI tự quyết (có thể nhờ TypeSafe Jev theo ngưỡng rủi ro); quyết định quan trọng (chi phí, an toàn trẻ em, phạm vi sản phẩm, pháp lý, việc tốn công con người) gom lại hỏi một lần.
- Mỗi đợt giao hàng kết thúc bằng một trang review: ảnh, bản chơi thử, số liệu hiệu năng, báo cáo bảo mật, dependency mới, bảng license. Con người duyệt tại đây, không duyệt từng PR.
- `CLAUDE.md` ghi kiến trúc, quy ước, quy tắc reuse asset, danh sách việc đã xong.
- Quest và nội dung không phụ thuộc trực tiếp vào cảnh Three.js.
- Không đưa secret hay dữ liệu thật vào prompt; chạy trong sandbox.
