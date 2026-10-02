# Map Lâu đài — làm lại theo mock chi tiết (02/10/2026)

Bản giao việc: `plans/dattqh/261002-0802-detail-mocks-per-map/phase-04-map-rework-brief.md`. Mock: `designs/lau-dai/d-01 … d-13`. Ảnh đối chiếu: `assets/generated/review/lau-dai/mock__lau-dai__*.png`; góc chụp: `content/world/mock-views/lau-dai.json`. Khung hình chơi thật trong các phòng đã chụp (play-shots) để kiểm tra từ camera bám bé.

## Từng khung

| Khung | Mức | Ghi chú |
| --- | --- | --- |
| d-01 toàn cảnh | gần | Thấy rõ lâu đài có nhiều tháp tròn mái nhọn đỏ cắm cờ, mái đỏ đại sảnh, đài phun tượng mèo, bồn hoa. Lâu đài rộng 280 × 230 khối (giữ ZONES) nên một khung không ôm hết cả cầu, hào và thác như mock; camera đặt `reach: 400`. |
| d-02 cổng | gần | Hai tháp cổng mái đỏ, tường có lỗ châu mai và đèn trong tường, cờ đỏ huy hiệu vàng, cổng vòm mở cửa gỗ, cầu đá có đèn lồng trên lan can. Lính gác đứng hai bên bậc trước cổng (`visits`). Còn thiếu: cánh cửa gỗ đóng như mock. |
| d-03 sân | gần | Đài phun có tượng mèo trắng quay ra cổng, bồn hoa viền hàng rào lá, đèn, cột cờ dọc lối, mặt tiền đại sảnh mái đỏ có cửa sổ hoa hồng, hai tháp. Sân lát gạch/đá, không còn cỏ. |
| d-04 khu luyện tập | gần | Nền đất có mảng cỏ, rào gỗ, hai hàng bia bắn, hình nộm rơm, giá vũ khí, cột cờ, chòi gác gỗ, lâu đài phía sau. Lính tập là cư dân (6 người). |
| d-05 cầu và hào | gần | Hào nước có bờ kè đá, cầu đá hai vòm có trụ giữa với tháp nhỏ, cờ, đèn, đoạn cầu gỗ ở đầu cổng. Vòm cầu thấp hơn mock (mặt nước 11, mặt cầu 16–19). |
| d-06 đại sảnh | đạt | Tường đá màu kem, trần dầm gỗ, sàn lát ô, thảm đỏ viền vàng từ cửa thẳng lên bục 4 bậc, ngai đỏ vàng, phông đỏ vương miện vàng phát sáng, hai hàng cột đá có đuốc phát sáng, cửa sổ vòm cao rèm đỏ, cờ đỏ dày dọc hai tường, đèn chùm nến phát sáng, 4 lính gác đứng cố định hai bên thảm. Tâm khu "Đại sảnh ôn tập" (440, 225) nằm giữa sàn sảnh; 19/19 mục quest chương 2 đặt trong khu đều nằm trong sảnh (6 mục còn lại là nhân vật đi theo nhiều chương, ở khu khác như trước). |
| d-07 thư viện | đạt | Kệ sách cao hai tầng quanh tường, bàn đọc có sách mở, chồng sách, nến, quả địa cầu lớn, hai đèn chùm, cửa sổ vòm rèm đỏ, thảm. |
| d-08 phòng ăn | đạt | Hai dãy bàn dài khăn đỏ viền vàng, nến, đĩa, món ăn, ghế gỗ hai bên (prop mới `ld-chair`), đèn chùm, cờ hai tường, cửa sổ rèm đỏ, đuốc; người hầu đi giữa hai bàn (`visits`). |
| d-09 phòng nghỉ | gần | Giường gỗ chăn đỏ hai bên, rương cuối giường, tủ sách, thảm, cửa sổ rèm đỏ, cờ, đuốc, đèn chùm. Tường kem; còn thiếu tranh treo và kệ cây như mock. |
| d-10 tháp canh | gần | Tháp tròn trên đồi thông phía đông, sàn gỗ, cửa sổ lớn ba phía nhìn về lâu đài, bàn bản đồ, kính viễn vọng, thùng, rương, giá vũ khí, đuốc, lính canh. Ngoài cửa sổ là rừng thông và tường thành, chưa thấy dãy núi như mock. |
| d-11 hầm ngục | gần | Hành lang 7 khối, cao 7, phòng giam song sắt hai bên, đuốc phát sáng, đèn trên dầm, thùng và hòm dọc hành lang, rơm trong phòng giam. Ảnh tĩnh tối hơn mock (không có ánh đuốc chiếu ra). |
| d-12 vườn hoàng gia | gần | Lối lát giao nhau ở đài phun ba tầng, vòm hoa hồng (prop `ld-rose-arch`), luống hoa trong hàng rào lá kèm khối hoa hồng/đỏ, cây hoa anh đào, bụi tỉa, đình mái đỏ, đèn, ghế. Kém dày hoa hơn mock. |
| d-13 về đêm | gần | Cùng góc d-01, `mood: dusk`; khối đèn, cửa sổ đèn và đèn lồng phát sáng. Không có chu kỳ ngày đêm (đúng quyết định). |

## Thay đổi chính

- Generator `tools/world/generate-lau-dai-map.ts` viết lại: hào nước thấp 5 khối có bờ kè đá; tường thành có lỗ châu mai, chân tường đá, đèn trong tường, cờ treo; 10 tháp tròn mái nhọn đỏ có cờ; nhà cổng có cổng vòm, cửa mở, song sắt, đèn, cờ; cầu đá hai vòm có trụ, tháp, đèn, đầu cầu gỗ; cổng tây có cầu đá nhỏ.
- Đại sảnh dời ra giữa khu chương 2 (x 406–474, z 196–266), hai cánh thư viện và phòng ăn bên cạnh, giữa các cánh có giếng sáng để mọi phòng có cửa sổ vòm cao; tháp chính phía sau. Đại sảnh bày cho buổi ôn tập cuối kỳ: bục ngai là sân khấu, 7 gian ôn tập ở hai lối bên, bục huy hiệu, giá ghim tranh, giàn hoa giấy, góc bánh, kho thú bông, bục múa rối. Mỗi chỗ quest chương 2 có landmark cùng tên trên sàn sảnh.
- Phòng nghỉ, tháp canh trên đồi (có lối từ đường rừng), hầm ngục, khu luyện tập, vườn hoàng gia, sân đài phun tượng mèo trước sảnh, chợ trong thành, chuồng bò kéo xe (không có ngựa), nhà người hầu.
- Nền trong tường thành lát `cobble`/`paver`; cỏ chỉ còn trong bồn hoa và vườn hoàng gia. Nhà ngoài thành bỏ lưới, theo đường (`streetHouses`) và viền lối (`laneVerge`); ruộng lúa và cánh đồng lúa mì có cối xay gió.
- Tệp mới `tools/world/structures/lau-dai-castle.ts`: phòng đá có trần dầm, cửa vòm, cửa sổ vòm, lỗ châu mai, mái đầu hồi theo chiều sâu, song sắt.
- Prop hộp mới `content/world/box-props/lau-dai.json` (19, tiền tố `ld-`): ngai, đèn chùm, chân nến, đuốc tường, bàn dài, bàn đọc, ghế dài, ghế gỗ, nến bàn, đĩa, kệ sách, giường, bàn bản đồ, kính viễn vọng, bia bắn, hình nộm, giá vũ khí, vòm hoa hồng, cột cờ. Mỗi prop có một dòng chiều cao trong `content/world/models.json`.
- Người và vật: lính gác cổng và lính trong sảnh dùng `visits` để đứng đúng chỗ; người hầu đi giữa bàn ăn; điểm xe buýt chương 2 đặt trước cửa sảnh.

## Số liệu

- Prop: 10.218 (dưới 20.000). Cư dân: 67 người, 46 con vật. Landmark: 105. Mục tương tác: 73.

## Kiểm tra

- `pnpm vitest run tools/world/zone-maps.test.ts -t "lau-dai map"`: 4/4 đạt (gồm khớp output đã sinh, đứng trên đất, sống động, đi tới được mọi mục quest).
- `pnpm vitest run tools/world/mock-views.test.ts tools/world/model-catalog.test.ts tools/assets/build-box-props.test.ts`: 12/12 đạt.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi. `eslint` hai tệp của map: 0 lỗi, 0 cảnh báo.
- Đã chụp lại đủ bộ ảnh map (`pnpm assets:preview lau-dai`).
- Chưa chạy cả bộ test, E2E, `perf` (đúng phạm vi).

## Đề xuất cho bộ dựng chung

- `placeTower` cho tham số độ dốc mái: với thế giới cao 48 khối, tháp bán kính 5–6 không đủ chỗ cho mái nhọn cao 2,2 lần chiều rộng.
- Một helper phòng đá (`castleRoom`, `archway`, `archWindow`) dùng được cho thư viện, trường học, chợ. Nếu thấy hợp thì chuyển từ `structures/lau-dai-castle.ts` sang `structures/` chung.
- Bộ chụp tĩnh: đổ bóng mặt trời bao ±24 khối quanh điểm nhìn nên hành lang kín (hầm ngục) tối hơn phòng rộng. Một nguồn sáng ấm quanh khối `lantern` sẽ giúp các khung nội thất giống mock hơn.

## Câu hỏi còn mở

- Mock d-01 nhỏ gọn hơn lâu đài trong game (khu bài học rộng). Thu nhỏ thì phải đổi ZONES, việc này ngoài phạm vi.
