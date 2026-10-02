# Map Thư viện theo mock chi tiết (02/10/2026)

Map: `thu-vien`. Mock: `designs/thu-vien/d-01…d-14`, `designs/truong-hoc/c-16-thu-vien.png`. Bản giao việc: `plans/dattqh/261002-0802-detail-mocks-per-map/phase-04-map-rework-brief.md`. Giữ nguyên `ZONES` và mọi quest; chưa commit (phiên chính commit).

## Từng khung (ảnh trong game: `assets/generated/review/thu-vien/mock__*.png`; vòng 2 theo phản hồi của người sở hữu)

| Khung | Mức | Đã có / còn thiếu |
| --- | --- | --- |
| d-01 Toàn cảnh | gần | Đã có tòa đá mái đỏ, đồng hồ ở đầu hồi, băng rôn, quảng trường đài phun, bồn hoa, hai hồ có cầu đá ba vòm. Vòng 2 thêm **tháp đồng hồ đứng riêng** sau lưng thư viện và đặt `reach: 400`. Phía sau chủ yếu là lùm cây; phố nhà ở xa hơn nên trong khung còn mờ. |
| d-02 Cổng | gần | Cửa vòm có vòng đá, hai cánh gỗ mở, đèn lồng, băng rôn sách, chậu cây. Biển "Thư viện" nằm ngoài khung. |
| d-03 Sảnh chính | đạt | Sàn gỗ, thảm đỏ viền kem, quả địa cầu lớn **trên bục tròn** giữa vòng kệ thấp, đèn chùm phát sáng, vòm kem, ban công hai bên có lan can gỗ, **lan can gỗ dọc cầu thang lớn**, cờ xanh hình sách treo trên cột đá. |
| d-04 Khu đọc sách | đạt | Tường lót gỗ; kệ gỗ cao chạm trần đặt giữa các cửa sổ vòm sáng; 16 bàn gỗ sẫm có đèn xanh phát sáng; ghế, sách mở. |
| d-05 Kệ sách | đạt | Bốn kệ theo môn liền nhau, biển màu riêng (không chữ), thang trượt, đèn tường, tường gỗ. |
| d-06 Góc đọc thiếu nhi | gần | Cây lớn xuyên trần có đèn treo, thảm ô màu, bàn tròn gỗ, đệm ngồi nhiều màu, gối, kệ thấp, tường gỗ. Cửa sổ nhỏ hơn mock. |
| d-07 Khu máy tính | đạt | Hai dãy bàn dài, màn hình xanh phát sáng, ghế, cửa sổ vòm, tường gỗ. |
| d-08 Phòng học nhóm | đạt | **Tường gỗ** (ván và cột sẫm), vách kính khung gỗ, bảng trắng có biểu đồ và giấy ghi chú, bàn dài, ghế, sách mở. |
| d-09 Tầng 2 ban công | gần | Ban công có lan can gỗ, nhìn xuống quả địa cầu và thảm đỏ; cờ xanh trên cột; kệ cao chạm trần phía sau. |
| d-10 Khu sách quý | gần | **Phòng gỗ sẫm**: tường, trần, vách đều gỗ tối, cửa sổ bịt lại. Có đèn vàng trên trần và trên tường, tủ kính có sách cổ, bản đồ, quả địa cầu nhỏ, kệ cao kín tường, thảm đỏ. Vẫn sáng hơn mock một chút. |
| d-11 Góc đọc riêng | gần | Ghế cửa sổ đệm đỏ có gối, bàn tròn gỗ, sách, đèn đọc, đệm, chậu cây, kệ cao, tường gỗ. |
| d-12 Kho sách | đạt | Lối hẹp (2 khối) giữa hai dãy giá sắt cao gần chạm trần, chất thùng sách, đèn trên trần. |
| d-13 Vườn đọc sách | gần | Giàn gỗ có dây leo rủ xuống, bàn gỗ, ghế băng, sách, đèn, chậu cây. |
| d-14 Thư viện về đêm | gần | Trời chiều tối, cửa sổ và đèn lồng sáng. Cầu đá ba vòm có viền vòm sáng màu, nhìn ngang qua mặt hồ; thư viện và tháp đồng hồ phía sau. Mặt nước chưa phản chiếu ánh đèn như mock. |
| c-16 Thư viện (trường) | gần | Phòng đọc: bàn ghế gỗ, kệ sách, cây. Mock là phòng tường kem sáng; map dùng tường gỗ như mock Thư viện. |

## Thay đổi chính

- **Tòa thư viện** (`tools/world/structures/thu-vien-library.ts`, tệp mới): khối chính 73 × 35, khối giữa nhô ra phía trước, sàn cao một khối (ground nâng bằng `shape`). Bên ngoài có tường kem, cột đá, hai tầng cửa sổ cao có vòm sáng (`lantern`), băng rôn, đèn tường, mái đỏ dạng hông, cửa sổ mái, đầu hồi có đồng hồ. Bên trong, tầng 1 có sảnh, khu đọc, góc thiếu nhi, kệ theo môn và các lối giữa kệ, khu máy tính, phòng nhóm. Tầng 2 lên bằng cầu thang lớn, gồm ban công, phòng sách quý, góc đọc riêng và kho sách. Các mốc bài học cũ vẫn giữ id: `ban-thu-thu`, `ban-doc`, `ke-sach-phong-doc`, `loi-giua-cac-ke-sach`, `goc-doc-co-goi`, `bac-cau-thang-gac-sach`, `gac-sach`, `quay-tra-sach`.
- **Vườn quanh tòa nhà** (`generate-thu-vien-map.ts`): thềm trước có bờ đá, chậu cây và biển; quảng trường lát `paver` quanh đài phun nhiều tầng, hai đài phun hai bên; bồn hoa viền hàng rào lá (bên trong có khối hoa hồng, cam, vàng); hai hồ bờ đá có sen và cầu đá vòm; lối đi có đèn lồng (`STREET_LANTERN`); vài lùm cây bao quanh khu vườn. Phía sau có thềm và bậc ra vườn, giàn hoa đọc sách, tảng đá phẳng, cây sim tím, suối và bãi cát (vẫn là chỗ của bài 16). Phía đông có vườn đài phun. Nền là `grass-library`.
- **Phố**: bỏ lưới nhà kín các khu, thay bằng `streetHouses` hai bên mọi phố và đại lộ, mép đường dùng `laneVerge`. Đại lộ lát `paver`, bỏ nhựa đường và vạch kẻ. Đèn `light-curved` đổi thành `STREET_LANTERN` (gồm cả sân lễ hội). Sân lễ hội và tháp đồng hồ giữ nguyên.
- **Spawn** dời từ (205, 432) sang (186, 430) để chừa đất cho bồn hoa phía bắc quảng trường.
- **Người** (44): cô thủ thư, chú xếp sách, bạn đọc, các bạn nhỏ ở góc thiếu nhi, bạn tra máy tính, nhóm học bài, bạn đọc dưới giàn hoa, bác làm vườn và cô tưới hoa, chú quét lối, phụ huynh dẫn con đi đọc sách, cùng người dự hội và người giữ tháp như cũ. **Vật** (35): mèo thư viện, cún, gà, bò.
- **Prop hộp** (`content/world/box-props/thu-vien.json`, 24 mẫu `tv-*`, 405 lượt đặt sau vòng 2): quả địa cầu, đèn chùm, băng rôn sách, đèn tường, đèn đọc xanh, biển thư viện, kệ theo bốn môn, kệ cao chạm trần, kệ thấp hai mặt, thang, tủ kính, bảng trắng, máy tính, bàn dài, bàn đọc, bàn tròn, ghế gỗ, lan can, đệm ngồi, ghế cửa sổ, giá kho. Prop thay đồ gỗ của pack (đồ pack lên hình gần như màu trắng).
- **`content/world/models.json`**: thêm 24 dòng `tv-*` và 3 dòng pack nội thất (`cardboardBoxClosed`, `pillowBlue`, `plantSmall1`). `tv-chandelier` khai cao 4.2 (phóng 1,5 lần so với khối dựng).
- **Góc chụp**: `content/world/mock-views/thu-vien.json`, 15 khung; d-14 dùng `"mood": "dusk"`.

Số liệu (sau vòng 2): 10.809 prop (trước khi làm lại 10.729), trong đó 405 prop `tv-*`; 68 mục quest; 79 ambient (44 người, 35 vật; game hiện tối đa 24 người và vật gần bé). Chương 1: 5 mục trong nhà, đúng bằng số chỗ trong nhà.

### Vòng 2 (phản hồi của người sở hữu: nội thất bám sát mock hơn)

- **Lớp lót gỗ trong tường**: vỏ đá dời ra ngoài một khối. Mép cũ của mặt bằng thành lớp lót ván gỗ có cột sẫm; kính và vòm sáng của cửa sổ đi xuyên qua lớp này. Dọc lưng sảnh lót đá kem, phòng sách quý lót gỗ tối. Sàn gỗ ở mọi phòng, kể cả sảnh.
- **Kệ cao chạm trần** `tv-shelf-tall` (4,9 khối) đặt giữa các cửa sổ, ở các dãy kệ, ban công và phòng sách quý. Giá kho cao 4,8 khối, lối kho hẹp còn 2 khối.
- **Sảnh**: quả địa cầu đặt trên bục tròn (ruột đỏ, viền gỗ), lan can gỗ hai bên cầu thang lớn, cờ sách treo trên cột. Viền thảm đổi từ `wheat` (khối đi xuyên được) sang `sand`; viền thảm phòng sách quý và màu vàng của thảm thiếu nhi cũng đổi theo.
- **Ngoài trời** (tệp mới `tools/world/structures/thu-vien-garden.ts`):
  - `placeArchedBridge`: cầu ba vòm có viền vòm màu sáng, mặt cầu lát, lan can đá, đèn ở hai đầu và giữa cầu. Thay cho `placeArchBridge` ở hai hồ.
  - `placeClockTower`: tháp đồng hồ vuông đứng riêng ở (318, 528), mặt đồng hồ hướng bắc và tây, mái nhọn đỏ.
- **Người làm việc đúng chỗ**: thủ thư, người xếp sách, bạn đọc, các bạn nhỏ, bạn tra máy tính và nhóm học bài đều có `visits` (bàn thủ thư, quầy trả sách, kệ; các bàn đọc; góc thiếu nhi; bàn máy tính; phòng nhóm).
- **Mốc trùng tên chỗ trong quest** (bộ xếp mới dùng `placeNamed`): thêm "Bãi cỏ dại quanh tảng đá" và "Suối nhỏ sau tảng đá" (chương 1), cùng 11 mốc cho chương 3 quanh tháp đồng hồ (ví dụ "Gác chuông trên tháp", "Hộp thư trên tháp", "Phòng lịch trên tháp"). Giờ mọi chỗ quest của ba chương đều có mốc cùng tên.
- **Kiểm chứng bằng khung hình chơi thật** (`play-shots.mts`, 8 khung: sảnh, khu đọc, góc thiếu nhi, khu máy tính, phòng nhóm, ban công, sách quý, kho): sàn và tường gỗ ấm, kệ sách nhiều màu; tường và trần mờ đi đúng cách quanh bé.
- `tv-shelf-plain` bỏ (thay bằng kệ cao), thêm `tv-shelf-tall`. Catalog vẫn là 24 mẫu `tv-*`.

Kết quả đặt quest (chương 1, 14 mục): **mọi mục có chỗ trong nhà đều nằm trong tòa thư viện**. Có 5 mục trong nhà: kệ sách phòng đọc, bậc cầu thang gác sách, và ba mục ở lối giữa các kệ sách. Gấu Trúc (nhân vật lặp lại) cũng đứng trong sảnh. 9 mục còn lại là chỗ ngoài trời của bài 16, mỗi mục nằm cách mốc cùng tên trong vòng 10 khối: tảng đá phẳng, bãi cỏ dại, suối, gốc sim tím, bãi cát, bậc thềm. Gấu Mẹ là nhân vật lặp lại nên được xếp ở vùng nhân vật chung.

## Kiểm tra

- `pnpm vitest run tools/world/zone-maps.test.ts -t "thu-vien map"`: 4 đạt, 20 bỏ qua (map khác), 0 trượt. Trong đó có "matches the committed output" sau khi sinh lại và "can be walked from the spawn to every quest target".
- `pnpm vitest run tools/world/mock-views.test.ts tools/world/model-catalog.test.ts tools/assets/build-box-props.test.ts`: 12/12 đạt (vòng 2).
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi. `pnpm exec eslint` trên `generate-thu-vien-map.ts`, `structures/thu-vien-library.ts`, `structures/thu-vien-garden.ts` (`--max-warnings=0`): 0 lỗi, 0 cảnh báo.
- Vòng 2: chụp lại đủ 31 ảnh; sau khi bỏ một hòn đá che khung thì chụp lại riêng d-01 và d-14. Một lần chụp hỏng vì `scenery.ts` tạm mất `laneVerge` (lỗi của phiên chính, đã khôi phục); đã sinh và chụp lại.
- Đã chạy `assets:box-props` và `assets:manifest` (có khóa). Ảnh map đã chụp đủ: `pnpm assets:preview thu-vien`, 31 ảnh. Ảnh của các mốc không còn nằm trong 14 mốc đầu đã bị render-preview xóa, thay bằng ảnh các mốc ngoài trời.
- Có một lần test lỗi vì `nt-wheat-patch` (của agent Nông trại) có trong `models.json` mà chưa có trong manifest. Chạy lại box-props và manifest dưới khóa thì hết.
- Không chạy cả bộ test, E2E hay `perf` (theo bản giao việc).

## Đề xuất cho bộ dựng chung

1. ~~Đặt mục quest theo tên chỗ~~: phiên chính đã làm (`placeNamed`), map này đã thêm mốc cho mọi chỗ.
2. **Bộ đồ gỗ hộp dùng chung**: bàn, ghế, bàn dài, kệ thấp, kệ cao có sách đang mang tiền tố `tv-`. Nên chuyển vào `content/world/box-props.json` với id trung tính, vì đồ pack Kenney lên hình gần như trắng ở mọi map có nội thất (trường, nhà bé).
3. **Cầu nhiều vòm**: `placeArchedBridge` (`structures/thu-vien-garden.ts`, ba vòm có viền sáng) có thể chuyển vào `landmarks.ts` cho Làng Ven Sông và Lâu đài.
4. **Tòa nhà nhiều tầng**: phần tường có cột, ô cửa và chừa ô cho băng rôn trong `thu-vien-library.ts` có thể tách thành `placeGrandFacade` cho lâu đài hoặc trường nếu cần.

## Câu hỏi còn mở

- `apps/web/src/review/review-main.ts` (tệp chung) vẫn để `mocks: []` cho Thư viện. Phiên chính cần liệt kê 15 khung để trang review đặt ảnh mock cạnh ảnh trong game.
- d-01 đã dùng `reach: 400`, nhưng sau thư viện là vườn đọc sách và lùm cây; phố nhà gần nhất cách khoảng 120 khối nên trong khung còn nhỏ. Muốn có phố san sát như mock thì phải dời một dãy nhà vào sát vườn. Đây là việc đổi bố cục, cần người sở hữu quyết.
