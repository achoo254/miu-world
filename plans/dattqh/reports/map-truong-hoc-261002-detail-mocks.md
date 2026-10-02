# Map Trường học — làm lại theo mock chi tiết (c-*, d-*) — 02/10/2026

Map `truong-hoc` (hub). Generator `tools/world/generate-school-map.ts`, công trình `tools/world/structures/school.ts`, tệp mới `tools/world/structures/truong-hoc-plaza.ts`, prop hộp `content/world/box-props/truong-hoc.json` (40 prop `th-*`), góc chụp `content/world/mock-views/truong-hoc.json` (20 khung).

## Đối chiếu từng khung

| Khung | Đánh giá | Còn thiếu |
| --- | --- | --- |
| c-01 toàn cảnh khu trường | gần | Trường mái đỏ có tháp đồng hồ ở giữa, phố có cây và đèn, xe buýt, quảng trường phía sau. Mock có núi đá nhiều thác ngay sau trường và sông hai bên; map giữ núi/vách thác ở xa (tây bắc, đông bắc) như bố cục cũ. |
| c-02 cổng trường | gần | Trụ đá có mũ và đèn lồng, cổng sắt, đèn lồng, cây hoa hồng hai bên, nhà chính ở cuối. Sân trước sâu 47 khối nên nhà nhỏ hơn mock; tường rào chỉ còn 3 khối (để bé không trèo ra), nhìn vẫn nặng. |
| c-03 sân trường | gần | Đài phun có tượng mèo trắng bằng khối, sân lát đá, bồn cây hoa, đèn, ghế, cây quanh sân. Tượng mèo thô hơn mock. |
| c-04 khu thể thao | đạt | Sân bóng rổ đỏ vạch trắng, hàng rào gỗ, nhà thể thao tường vàng mái vòm xanh, biển "NHÀ THỂ THAO", trẻ chơi bóng rổ. |
| c-05 vườn khoa học | gần | Nhà kính, luống gỗ có rào, cây trồng. Lối đá giữa luống chưa có (khu là zone bài học, giữ cỏ). |
| c-06 khu vui chơi | gần | Nhà chơi gỗ mái đỏ có cầu trượt, xích đu, rào gỗ, nền cát, trẻ chơi. Cầu trượt dùng model emoji sẵn có nên khác màu mock. |
| c-13 đường chính | đạt | Đường nhựa có vạch, vỉa hè lát gạch, đèn lồng và hàng cây hai bên, nhà hai bên quay ra đường, ô tô, xe buýt thứ hai phía trước. |
| c-15 phòng học | đạt | Bảng xanh khung gỗ, bàn ghế gỗ xếp hàng, tủ sách đầy sách, tranh treo tường, đèn trần, cây. Không có học sinh trong lớp (người sống chỉ đặt được ngoài trời). |
| c-16 thư viện trường | đạt | Phòng mới ở tầng trệt: tủ sách gỗ đầy sách ba vách, hai bàn đọc gỗ có ghế, quả địa cầu, sách mở, cây. |
| c-17 hành lang | gần | Hành lang kín rộng 3 khối dọc mặt trước (thay hiên mở): vách kính cửa sổ, trụ trắng, cửa lớp, đèn trần, chậu cây, bảng tin. Ảnh preview mờ prop dọc trục nhìn; khung chơi thật thấy đủ. |
| c-18 cầu thang | chưa | Có cửa sổ cao hai tầng, bảng tin, chậu cây; nhưng cầu thang chỉ 4 bậc trong phòng 4 khối (tầng cao 4) nên ảnh preview chủ yếu thấy trần. Muốn giống mock cần cầu thang rộng/giếng thang cao — đụng kích thước nhà đã duyệt. |
| c-19 phòng chức năng | gần | Phòng mới ở tầng 2: bảng xanh dán tranh, đàn piano, ghế đàn, guitar, giá vẽ, bàn ghế gỗ, bảng màu, tranh tường. |
| d-01 toàn cảnh trung tâm | gần | Quảng trường lát đá tròn, đài phun lớn hai tầng có tượng mèo, 7 cổng vòm phát sáng có biển tên hai bên, cờ đỏ hình mèo, đèn, bồn cây, cửa hàng, bảng nhiệm vụ, sân khấu, lâu đài phía sau, khinh khí cầu. Ít người hơn mock (game hiện tối đa 24 người/vật). |
| d-02 cửa hàng | gần | Quầy gỗ hai mái che sọc đỏ/xanh, biển "CỬA HÀNG" có túi vàng, kệ hàng, thùng hàng, hai người bán đứng sau quầy. Mock là cảnh trong nhà ấm hơn. |
| d-03 khu giao dịch | gần | Hai sạp mái sọc, thùng hàng, người đổi đồ; lâu đài phía sau. |
| d-04 bảng nhiệm vụ | đạt | Bảng gỗ có giấy ghim, chữ "NHIỆM VỤ", dấu "!" vàng phát sáng, đèn lồng, thùng gỗ. (Ba ô menu trong mock là UI, không dựng.) |
| d-05 khu chờ tổ đội | gần | Chòi gỗ mái xanh có đèn, ghế, bàn, trẻ đứng chờ. Không có nhãn "Team1". |
| d-06 cổng dịch chuyển | đạt | Cổng vòm đá có rêu, đèn tường, tấm sáng màu riêng từng map, biển tên chữ Việt có dấu. |
| d-07 cầu trung tâm | đạt | Cầu đá vòm qua kênh, biển chỉ đường hai cột (LÀNG VEN SÔNG / XÓM MÁI ẤM / RUỘNG LÚA; BẾN TÀU / HẢI ĐĂNG / KHU RỪNG), cờ, đèn, đài phun và lâu đài ở cuối trục. |
| d-08 khu sự kiện | gần | Sân khấu ván, màn hình hồng có mèo, dây cờ, cây hoa hồng, đèn, cờ đỏ. Ít sạp và đèn lồng treo hơn mock. |

Khinh khí cầu: có (prop tĩnh trên trời). Khí cầu khác (khinh khí cầu mái, cổng Núi tuyết/Đảo bí ẩn) không dựng — không có map đó.

## Thay đổi chính

- **Quảng trường trung tâm** sau trường, trên trục giữa (tâm 400, 520, bán kính 34): đi qua cổng sau mới của tường trường, qua cầu đá giữa kênh (và hai cầu bên), cả vùng sau trường lát gạch/đá. Bảy cổng (`travel`) chuyển từ các quận về quảng trường: bốn cổng phía tây quay sang đông, ba cổng phía đông quay sang tây (model cổng của zone-map nằm trong vòm, tấm sáng che nó). Id cổng giữ nguyên `cong-<map>`.
- Xe buýt: thêm tuyến phố → quảng trường và quảng trường → cổng trường; các tuyến tới 7 quận giữ (đích là bến của quận vì cổng không còn ở đó).
- Thư viện quận dời từ z 580 → 600; lâu đài phố có tháp tròn mái nhọn xanh, tháp giữa, cờ (nền cho d-01).
- Trường: lát `paver` mọi chỗ trừ vườn (zone cỏ) và sân chơi cát; không mọc cây ngẫu nhiên trong trường, chỉ cây trồng có chủ đích; tường rào hàng dưới đá, hai hàng trên song sắt (`iron`) xen kính; cổng trước/sau trụ đá có mũ và đèn lồng; tượng mèo trên đài phun sân trường; nhà chơi gỗ; hàng rào sân chơi, sân bóng rổ, luống vườn; nhà thể thao tường vàng có biển.
- Nhà chính (`school.ts`): tùy chọn `corridor` (hiên trước thành hành lang kính rộng 3, mái vươn ra, đồng hồ nâng lên) và `extraRooms` (mở cửa và trả về phòng để bày đồ); cửa sổ cao ở giếng thang; khung gỗ quanh bảng; `placeCampusWall` thêm cổng sau và `railing`. Các tùy chọn mặc định giữ hành vi cũ.
- Phố chính: vỉa hè lát rộng, đèn `STREET_LANTERN` hai bên, cây xen đèn, `streetHouses` hai bên ngoài trường (thay nhà suburban), lề đường `laneVerge` cho các đại lộ; bỏ `lampRow`/`light-curved`.
- Landmark trong phòng ở giữa phòng, trên sàn (`lop-hoc`, `thu-vien-truong`, `phong-chuc-nang`, `cau-thang`, `hanh-lang`) và landmark trùng tên chỗ quest nêu (`Lớp 2A`, `Cửa lớp 2A`, `Bàn cô giáo`, `Đầu hành lang`, `Chân cầu thang`, `Bồn nhài ngoài hành lang`, `Ghế đá sân trường`, `Bốt bảo vệ`, `Quanh cầu trượt`, `Góc trò chơi`, `Hàng rào gỗ`, `Cửa sổ phòng mĩ thuật`, `Vách căng tin`).
- Người mới: phụ huynh ở cổng, trẻ chơi bóng rổ (cầm bóng), bạn trồng cây, người bán sau quầy cửa hàng và sạp (`visits`), người đổi đồ, trẻ xem bảng nhiệm vụ, chờ tổ đội, xem biểu diễn, dạo quảng trường, chú thổi kèn sân khấu, cô quét quảng trường, chú gác cổng, mèo quảng trường.
- Chữ trên biển: font điểm ảnh 5 dòng có dấu tiếng Việt, sinh bằng script (không lưu trong repo, kết quả là JSON prop hộp); chữ đọc đúng chiều từ mặt trước (−z).

## Số liệu

- Prop: 8.486 (trước 6.092; ngân sách ~20.000), trong đó 210 prop `th-*`. Người 107, vật 38. Interactable 116 (7 cổng, 18 bến xe, phần còn lại mục quest).
- Prop hộp mới: 40 (`th-portal-*` ×7, `th-sign-*` ×10, bảng nhiệm vụ, 2 cột biển chỉ đường, cờ, bồn cây, màn sân khấu, dây cờ, khinh khí cầu, thùng/kệ hàng, bóng rổ, 3 tranh, bảng tranh, giá vẽ, piano + ghế, guitar, bảng tin, tủ sách, bàn, ghế, bàn đọc). 40 dòng mới trong `content/world/models.json`.

## Kiểm tra

- `pnpm vitest run tools/world/generate-school-map.test.ts`: 5/5 đạt (gồm committed output, 7 cổng, đi bộ tới mọi mục quest/cổng, vào lớp tầng 1 và tầng 2).
- `pnpm vitest run tools/world/zone-maps.test.ts -t "truong-hoc"`: không có test nào khớp (24 skipped) — hub được test ở tệp riêng.
- `pnpm vitest run tools/world/mock-views.test.ts tools/world/model-catalog.test.ts tools/assets/build-box-props.test.ts`: 12/12 đạt.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi. `pnpm exec eslint` ba tệp đã sửa `--max-warnings=0`: 0 lỗi, 0 cảnh báo.
- Khung chơi thật (`play-shots.mts`): lớp học nhìn thấy bảng, dãy bàn ghế gỗ, tủ sách; giếng thang thấy thư viện và phòng chức năng qua tường mờ.
- Đã sinh lại map, `assets:box-props`, `assets:manifest`; chụp đủ `pnpm assets:preview truong-hoc` và `school` (SCHOOL_VIEWS vẫn chạy).
- Không chạy cả bộ test, E2E, perf.

## Rủi ro cần phiên chính xem

- E2E `maps.spec.ts` (`spawnAt=cong-cho-phien` rồi E) và `school.spec.ts` (ngân sách 150 draw call ở cổng trường) chưa chạy; ở cổng trường có thêm nhiều model mới (đèn, cây, tranh, bàn ghế gỗ) — nên chạy `e2e:ci`.
- Người sống không đặt được trong nhà (`placeVillageLife` coi ô có sàn nhà là không trống), nên lớp học/thư viện không có học sinh như mock; và mục quest chỉ đặt trong ô zone ngoài trời, nên landmark tên phòng chỉ kéo mục quest về sân gần phòng đó.

## Đề xuất cho bộ dựng chung

- `placeStall`/`placeShop` nhận khung xoay (`facingWriter`) tốt; nên có hàm chung `framePoint` (điểm lẻ trong khung xoay) trong `world-writer.ts` — hiện viết riêng trong generator.
- Một helper chữ điểm ảnh tiếng Việt cho prop hộp (biển tên, bảng chỉ đường) dùng chung cho mọi map, thay vì mỗi map tự sinh JSON.
- `keepOutExcept` (giữ cây khỏi một vùng trừ các zone, gộp thành ít hình chữ nhật) có ích cho mọi khu xây kín.
- `placeVillageLife` cho phép người ở trong nhà (đứng trên sàn công trình) để lớp học, thư viện có người.

## Câu hỏi còn mở

- c-18: có nới giếng thang (rộng hơn, mở sàn trên) dù thay đổi mặt bằng nhà chính đã duyệt không?
