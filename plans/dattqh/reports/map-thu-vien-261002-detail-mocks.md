# Map Thư viện theo mock chi tiết (02/10/2026)

Map: `thu-vien`. Mock: `designs/thu-vien/d-01…d-14`, `designs/truong-hoc/c-16-thu-vien.png`. Bản giao việc: `plans/dattqh/261002-0802-detail-mocks-per-map/phase-04-map-rework-brief.md`. Giữ nguyên `ZONES` và mọi quest; chưa commit (phiên chính commit).

## Từng khung (ảnh trong game: `assets/generated/review/thu-vien/mock__*.png`)

| Khung | Mức | Còn thiếu |
| --- | --- | --- |
| d-01 Toàn cảnh | gần | Đã có: tòa đá mái đỏ, khối giữa cao có đồng hồ ở đầu hồi, băng rôn xanh, quảng trường đài phun nhiều tầng, đài phun hai bên, bồn hoa viền hàng rào lá, hai hồ bờ đá có cầu đá vòm, đèn lồng, cây xanh và cây hoa hồng. Chưa có: phố nhà phía sau trong khung (ảnh preview chỉ nạp 140 khối quanh mốc), tháp đồng hồ riêng như mock (tháp của chương 3 ở xa). |
| d-02 Cổng | gần | Có cửa vòm 7 khối có vòng đá, hai cánh gỗ mở, đèn lồng treo tường, băng rôn sách, chậu cây; biển "Thư viện" đặt cạnh cửa nhưng nằm ngoài khung. Vòm cửa đơn giản hơn mock. |
| d-03 Sảnh chính | đạt | Sảnh hai tầng vòm kem, thảm đỏ viền vàng, quả địa cầu lớn trong vòng kệ thấp, đèn chùm, ban công hai bên có lan can, băng rôn, cầu thang lớn. |
| d-04 Khu đọc sách | gần | 16 bàn gỗ sẫm, ghế, đèn xanh, sách mở, kệ cao dọc tường. Kệ che cửa sổ phía trong. |
| d-05 Kệ sách | đạt | Bốn kệ theo môn đứng liền nhau, biển gỗ trên đầu có ô màu riêng (không chữ), thang gỗ, đèn tường. |
| d-06 Góc đọc thiếu nhi | gần | Cây xuyên trần có đèn treo, thảm ô màu, bàn tròn gỗ, đệm ngồi màu, gối, kệ thấp. Chưa có cửa sổ lớn nhìn ra ngoài. |
| d-07 Khu máy tính | đạt | Hai dãy bàn dài, màn hình trắng màn xanh, bàn phím, ghế, cửa sổ phía sau. |
| d-08 Phòng học nhóm | gần | Vách kính khung gỗ, bảng trắng có biểu đồ và giấy ghi chú, bàn dài, ghế, sách mở. Tường phòng là đá kem, mock là gỗ. |
| d-09 Tầng 2 ban công | gần | Hành lang tầng 2 có lan can nhìn xuống sảnh, quả địa cầu bên dưới, kệ sau lưng. Ít đèn và kệ hơn mock. |
| d-10 Khu sách quý | gần | Tủ kính trên bệ gỗ có sách cổ mở, thảm đỏ viền vàng, bản đồ, quả địa cầu nhỏ, kệ kín tường, đèn tường. Phòng sáng hơn mock. |
| d-11 Góc đọc riêng | gần | Ghế cửa sổ đệm đỏ có gối, bàn tròn gỗ, sách, đèn đọc, chậu cây, kệ. |
| d-12 Kho sách | đạt | Lối dài giữa giá sắt chất thùng sách, đèn trên trần, thùng các-tông. |
| d-13 Vườn đọc sách | gần | Giàn gỗ phủ dây leo xanh và hồng, bàn gỗ, ghế băng, sách, đèn, chậu cây, nền đá lát. Dây leo thưa hơn mock. |
| d-14 Thư viện về đêm | gần | Trời chiều tối (`mood: dusk`), cửa sổ sáng, đèn lồng, hồ và cầu đá phía trước. Từ góc này cầu trông như khối đá, chưa rõ vòm. |
| c-16 Thư viện (trường) | gần | Phòng đọc: bàn ghế gỗ, kệ sách, cây. |

## Thay đổi chính

- **Tòa thư viện** (`tools/world/structures/thu-vien-library.ts`, tệp mới): khối chính 73 × 35, khối giữa nhô ra phía trước, sàn cao một khối (ground nâng bằng `shape`). Bên ngoài có tường kem, cột đá, hai tầng cửa sổ cao có vòm sáng (`lantern`), băng rôn, đèn tường, mái đỏ dạng hông, cửa sổ mái, đầu hồi có đồng hồ. Bên trong, tầng 1 có sảnh, khu đọc, góc thiếu nhi, kệ theo môn và các lối giữa kệ, khu máy tính, phòng nhóm. Tầng 2 lên bằng cầu thang lớn, gồm ban công, phòng sách quý, góc đọc riêng và kho sách. Các mốc bài học cũ vẫn giữ id: `ban-thu-thu`, `ban-doc`, `ke-sach-phong-doc`, `loi-giua-cac-ke-sach`, `goc-doc-co-goi`, `bac-cau-thang-gac-sach`, `gac-sach`, `quay-tra-sach`.
- **Vườn quanh tòa nhà** (`generate-thu-vien-map.ts`): thềm trước có bờ đá, chậu cây và biển; quảng trường lát `paver` quanh đài phun nhiều tầng, hai đài phun hai bên; bồn hoa viền hàng rào lá (bên trong có khối hoa hồng, cam, vàng); hai hồ bờ đá có sen và cầu đá vòm; lối đi có đèn lồng (`STREET_LANTERN`); vài lùm cây bao quanh khu vườn. Phía sau có thềm và bậc ra vườn, giàn hoa đọc sách, tảng đá phẳng, cây sim tím, suối và bãi cát (vẫn là chỗ của bài 16). Phía đông có vườn đài phun. Nền là `grass-library`.
- **Phố**: bỏ lưới nhà kín các khu, thay bằng `streetHouses` hai bên mọi phố và đại lộ, mép đường dùng `laneVerge`. Đại lộ lát `paver`, bỏ nhựa đường và vạch kẻ. Đèn `light-curved` đổi thành `STREET_LANTERN` (gồm cả sân lễ hội). Sân lễ hội và tháp đồng hồ giữ nguyên.
- **Spawn** dời từ (205, 432) sang (186, 430) để chừa đất cho bồn hoa phía bắc quảng trường.
- **Người** (44): cô thủ thư, chú xếp sách, bạn đọc, các bạn nhỏ ở góc thiếu nhi, bạn tra máy tính, nhóm học bài, bạn đọc dưới giàn hoa, bác làm vườn và cô tưới hoa, chú quét lối, phụ huynh dẫn con đi đọc sách, cùng người dự hội và người giữ tháp như cũ. **Vật** (35): mèo thư viện, cún, gà, bò.
- **Prop hộp** (`content/world/box-props/thu-vien.json`, 24 mẫu `tv-*`, 388 lượt đặt): quả địa cầu, đèn chùm, băng rôn sách, đèn tường, đèn đọc xanh, biển thư viện, kệ theo bốn môn, kệ thường, kệ thấp hai mặt, thang, tủ kính, bảng trắng, máy tính, bàn dài, bàn đọc, bàn tròn, ghế gỗ, lan can, đệm ngồi, ghế cửa sổ, giá kho. Prop thay đồ gỗ của pack (đồ pack lên hình gần như màu trắng).
- **`content/world/models.json`**: thêm 24 dòng `tv-*` và 3 dòng pack nội thất (`cardboardBoxClosed`, `pillowBlue`, `plantSmall1`). `tv-chandelier` khai cao 4.2 (phóng 1,5 lần so với khối dựng).
- **Góc chụp**: `content/world/mock-views/thu-vien.json`, 15 khung; d-14 dùng `"mood": "dusk"`.

Số liệu: 10.780 prop (trước 10.729), 68 mục quest, 79 ambient (44 người, 35 vật). Chương 1 có 14 mục quest, 1 mục nằm trong tòa nhà.

## Kiểm tra

- `pnpm vitest run tools/world/zone-maps.test.ts -t "thu-vien map"`: 4 đạt, 20 bỏ qua (map khác), 0 trượt. Trong đó có "matches the committed output" sau khi sinh lại và "can be walked from the spawn to every quest target".
- `pnpm vitest run tools/world/mock-views.test.ts tools/world/model-catalog.test.ts tools/assets/build-box-props.test.ts`: 9/9 đạt.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi. `pnpm exec eslint tools/world/generate-thu-vien-map.ts tools/world/structures/thu-vien-library.ts --max-warnings=0`: 0 lỗi, 0 cảnh báo.
- Đã chạy `assets:box-props` và `assets:manifest` (có khóa). Ảnh map đã chụp đủ: `pnpm assets:preview thu-vien`, 31 ảnh. Ảnh của các mốc không còn nằm trong 14 mốc đầu đã bị render-preview xóa, thay bằng ảnh các mốc ngoài trời.
- Có một lần test lỗi vì `nt-wheat-patch` (của agent Nông trại) có trong `models.json` mà chưa có trong manifest. Chạy lại box-props và manifest dưới khóa thì hết.
- Không chạy cả bộ test, E2E hay `perf` (theo bản giao việc).

## Đề xuất cho bộ dựng chung

1. **Đặt mục quest theo tên chỗ**: các `places` của quest (ví dụ "kệ sách phòng đọc", "bàn thủ thư", "góc đọc có gối") đã trùng tên mốc trên map. Nếu `place-quest-targets.ts` ưu tiên ô gần mốc cùng tên, bài học sẽ diễn ra đúng phòng. Hiện ô được quét từ tây sang nên chỉ 1/14 mục chương 1 rơi vào trong thư viện.
2. **Bộ đồ gỗ hộp dùng chung**: bàn, ghế, bàn dài, kệ thấp, kệ cao có sách đang mang tiền tố `tv-`. Nên chuyển vào `content/world/box-props.json` với id trung tính, vì đồ pack Kenney lên hình gần như trắng ở mọi map có nội thất (trường, nhà bé).
3. **`placeArchBridge`**: thêm viền vòm khác màu và cột đèn trên lan can, để vòm còn đọc được khi nhìn chéo hay lúc chiều tối.
4. **Tòa nhà nhiều tầng**: phần tường có cột, ô cửa và chừa ô cho băng rôn trong `thu-vien-library.ts` có thể tách thành `placeGrandFacade` cho lâu đài hoặc trường nếu cần.

## Câu hỏi còn mở

- `apps/web/src/review/review-main.ts` (tệp chung) vẫn để `mocks: []` cho Thư viện. Phiên chính cần liệt kê 15 khung để trang review đặt ảnh mock cạnh ảnh trong game.
- Ảnh preview chỉ nạp 140 khối quanh mốc, nên d-01 không thể hiện phố sau thư viện như mock. Có cần một góc toàn cảnh riêng với `view` lớn hơn không?
