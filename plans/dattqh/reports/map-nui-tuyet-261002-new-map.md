# Map Núi tuyết (`nui-tuyet`) — dựng mới theo mock chi tiết

Ngày 02/10/2026 · Plan `plans/dattqh/261002-1619-nui-tuyet-dao-bi-an-maps/` (pha 2) · Mock `designs/nui-tuyet/d-01 … d-15`, `b-11`, `c-14`.

## Kết quả

`pnpm world:nui-tuyet` sinh map 800 × 48 × 800 trên nền `grass-snow` (lối `cobble-grey`), cổng mặc định về Trung tâm cạnh chỗ xuất hiện, năm khu bài học, đủ sáu landmark của hợp đồng quest chào mừng ở khu 1, cáp treo nối cả năm khu, hồ băng (`ice`, nửa bắc là nước mở có tảng băng trôi), hang băng có tường `crystal` phát sáng, bốn công trình đi vào được có bày đồ theo khung nội thất (cửa hàng đồ ấm, nhà nghỉ, trạm nhiệm vụ, một nhà dân). Đã chụp và so 17 khung qua 5 vòng sửa–chụp–so; bộ ảnh đầy đủ của map (không `PREVIEW_ONLY`) đã chụp lại ở cuối.

Tệp: `tools/world/generate-nui-tuyet-map.ts`, `tools/world/structures/nui-tuyet-buildings.ts` (nhà gỗ mái tuyết, tháp đồng hồ, cổng làng, tường đá, ga cáp treo, đài quan sát, cầu cạn nhiều vòm, cầu gỗ trên giàn), `tools/world/structures/nui-tuyet-nature.ts` (thông phủ tuyết, thác băng/thác chảy, tảng băng trôi, sảnh hang băng), `content/world/box-props/nui-tuyet.json` (31 prop hộp), `content/world/mock-views/nui-tuyet.json` (17 góc), 33 dòng mới trong `content/world/models.json` (31 prop hộp + `animal-penguin`, `animal-polar`), một dòng `MAPS` và import trong `tools/world/zone-maps.test.ts`; ảnh sinh ra ở `assets/generated/world/nui-tuyet/`, `assets/generated/box-props/ntu-*`, `assets/generated/review/nui-tuyet/`, manifest qua lệnh (luôn qua khóa).

Tiền tố prop hộp là `ntu-` chứ không phải `nt-` như brief ghi: `nt-` đã thuộc Nông trại (`nt-fire`, `nt-hanging-lantern`, `nt-quest-board`…), dùng chung dễ trùng id và khó đọc.

## Từng khung

| Khung | Mức | Còn thiếu |
| --- | --- | --- |
| d-01 toàn cảnh | gần | Hồ, vách đá có năm thác (hai thác chảy xanh, ba thác băng), lâu đài mái đỏ trên dãy núi, rừng thông tuyết, làng phía nam. Mặt hồ nhìn xa nhạt màu (nước và băng gần nhau), lâu đài nhỏ vì ở xa; mock dày nhà quanh hồ hơn. |
| d-02 làng | gần | Phố lát đá, nhà gỗ hai tầng mái tuyết cửa sổ vàng, tháp đồng hồ có cờ, đèn, cờ xanh bông tuyết, cây thông treo đèn, người áo ấm. Mock nhà sát phố hơn, đèn lồng to hơn. |
| d-03 cổng vào | đạt | Cổng đá–gỗ mái tuyết, bông tuyết giữa xà, hai cờ xanh, đèn lồng, tường đá phủ tuyết, lính gác hai bên, làng sau cổng. |
| d-04 khu trượt tuyết | gần | Dốc trắng lên đỉnh, cột và cabin cáp treo đỏ, cờ slalom đỏ, nhà nghỉ gỗ mái tuyết bên phải. Thiếu hàng rào đỏ và người trượt trong khung (người trượt đứng ở chân dốc). |
| d-05 cáp treo | gần | Cabin đỏ to cạnh camera, dây cáp liền, cabin nối tiếp xuống vực, ga trên đỉnh. Lâu đài không nằm trong khung (khác hướng tuyến). |
| d-06 đỉnh núi, đài quan sát | gần | Mỏm đá có bậc, lan can gỗ, cờ bông tuyết, đài quan sát mái vòm trắng sườn đen, kính thiên văn ló ra khe. Núi xa bên trái thấp hơn mock. |
| d-07 hồ băng | gần | Đứng trên băng nhìn vách đá có trụ, thác băng và thác chảy, nước mở có tảng băng, thông trên đỉnh vách. Mock có vết nứt trên băng, vách lởm chởm hơn. |
| d-08 thác băng | gần | Hai màn thác băng lớn trên vách đá xám xanh, đáy vực băng. Cầu gỗ của khung nằm ngoài góc (cầu ở phía đông vực). |
| d-09 hang động băng | gần | Vòm băng xanh có nhũ, tường đá xanh có vân pha lê phát sáng, cụm pha lê, đèn cột, cầu gỗ qua khe vực. Khe vực khó thấy từ góc này; mock tối và xanh đậm hơn. |
| d-10 trạm thám hiểm | gần | Hai nhà gỗ mái tuyết, chảo ăng-ten trên giàn trên mái, cờ đỏ bông tuyết, thùng, xe trượt, bàn bản đồ. Mock nhà hai tầng có hiên, hàng hóa dày hơn. |
| d-11 nhà dân | gần | Lò sưởi đá có lửa, bệ lò có sách và đồng hồ, cửa sổ kính hai bên rèm đỏ, ghế bành đỏ, thảm, bàn ăn có súp và bánh, bà nấu súp, mèo. |
| d-12 cửa hàng đồ ấm | đạt | Giá áo khoác lông, kệ mũ len và áo len, quầy có đồ gấp và ủng, cô bán hàng, đèn lồng, thảm. |
| d-13 nhà nghỉ | gần | Thảm đỏ từ cửa tới quầy lễ tân, cờ xanh hình giường, đèn chùm, ghế bành trước lò sưởi, chậu cây, thùng gỗ. Phòng rộng và sáng hơn mock. |
| d-14 trạm nhiệm vụ | đạt | Bảng gỗ ba tấm bản đồ, khiên xanh bông tuyết, đèn lồng hai bên, bàn bản đồ, thùng, chậu cây, bác kiểm lâm. |
| d-15 hoàng hôn | gần | Mỏm đá tuyết nhìn xuống thung lũng thông, núi tuyết xa, trời chiều (`mood: dusk`). Không có biển mây (không làm mây). |
| b-11 núi toàn cảnh | gần | Vực có thác băng, cầu gỗ trên giàn, thông, hồ phía sau (bản tuyết của khung mùa hè). |
| c-14 núi cận cảnh | gần | Cầu gỗ qua vực, vách đá, thông. |

## Khu (`ZONES`)

| Chương | id | Tên | Tâm (x, z) | Nửa cỡ (hx × hz) |
| --- | --- | --- | --- | --- |
| 1 | `lang-nui-tuyet` | Làng núi tuyết | 400, 610 | 56 × 42 |
| 2 | `khu-truot-tuyet` | Khu trượt tuyết | 170, 482 | 52 × 38 |
| 3 | `ho-bang` | Hồ băng | 400, 420 | 60 × 36 (gồm phần băng phía nam hồ, quest đứng được trên băng) |
| 4 | `hang-bang-tram-tham-hiem` | Hang băng và trạm thám hiểm | 650, 524 | 54 × 40 |
| 5 | `dinh-nui` | Đỉnh núi và đài quan sát | 180, 196 | 48 × 32 |

Mọi khu ở mức `ground` 16. Khu 5 là cao nguyên phẳng: đài quan sát đứng trên mỏm đá cao 4 khối có bậc, phía bắc–tây đất hạ 12 khối thành thung lũng nhìn ra núi; đi bộ tới bằng lối quanh đầu tây hồ và cầu gỗ qua vực (x 308), hoặc cáp treo.

## Landmark bắt buộc (khu 1)

| id | Tên | Vị trí (x, y, z) | Cách cổng | Gần nhất |
| --- | --- | --- | --- | --- |
| `cong-vao` | Cổng vào núi tuyết | 400.5, 17, 646.5 | — | 13,0 |
| `quang-truong-lang` | Quảng trường làng tuyết | 400.5, 17, 633.5 | 13,0 | 13,0 |
| `tram-nhiem-vu` | Trạm nhiệm vụ | 386.5, 17, 624.5 | 26,1 | 16,6 |
| `truoc-cua-hang-do-am` | Trước cửa hàng đồ ấm | 414.5, 17, 624.5 | 26,1 | 16,6 |
| `nguoi-tuyet` | Bãi người tuyết | 425.5, 17, 641.5 | 25,5 | 20,2 |
| `doc-truot-nho` | Dốc trượt nhỏ đầu làng | 377.5, 17, 641.5 | 23,5 | 19,2 |

Tất cả ngoài trời, trên nền khu (chân đứng y 17 = mặt đất 16), cách nhau ≥ 13 khối, cách cổng ≤ 26,1 khối, quanh mỗi cái có nền đá lát hoặc tuyết trống. Quest chào mừng phiên chính đã thêm (`gau-bang-tuyet`, `nt-*`) đặt được quanh các mốc này khi sinh map. Landmark khác (phòng trong nhà, khu xa) đặt tự do: `trong-cua-hang`, `trong-tram-nhiem-vu`, `trong-nha-dan`, `trong-nha-nghi`, `hang-bang`, `dai-quan-sat`, `mom-da`, `cau-vom`, `cau-go-qua-vuc`, `lau-dai-tuyet`…

## Số liệu

- Prop: 1.772 (dưới ngưỡng 20.000; khối dùng cho hình lớn: núi, vách, thông, nhà).
- Interactable: 29 = 1 cổng về Trung tâm + 20 cáp treo (mỗi ga ở năm khu có cabin tới bốn khu kia; xe "Cáp treo", nhãn "Lên cáp treo", model `ntu-cable-cabin`) + 8 mục quest chào mừng.
- Đời sống: 124 = 68 người (lính gác cổng, dân làng áo ấm, người xúc tuyết, người vác củi, trẻ em nặn người tuyết và trượt dốc, thầy dạy trượt tuyết và học trò cầm gậy trượt, người câu cá trên băng, trẻ trượt băng, cô bán đồ ấm, lễ tân nhà nghỉ, bác kiểm lâm, nhà thám hiểm, nhà khoa học, nhà thiên văn, người trực mỗi ga) + 56 vật (20 chim cánh cụt, 11 chó, 6 thỏ, 6 nai, 5 cáo, 4 gấu trắng, 4 mèo).
- Map: 49 vùng, 1,97 MB vùng nén.

## Vùng đất ngoài

Theme `castle`: trong các theme có sẵn đây là theme nhiều đồi nhất và cao nhất (`hillHeight` 18, `hillBias` 0,14) và lộ đá sớm nhất (`rockAbove` 7), ít hồ, hợp với núi tuyết bao quanh; nền đất ngoài theo `soil` của map (`grass-snow`).

## Kiểm tra

- `pnpm vitest run tools/world/zone-maps.test.ts -t "nui-tuyet map"`: 4 đạt (khớp output đã ghi, 800 × 800 và mọi mục quest đứng trên đất, sinh động, đi bộ tới mọi mục).
- `pnpm vitest run tools/world/mock-views.test.ts tools/world/model-catalog.test.ts tools/assets/build-box-props.test.ts`: 3 tệp, 15 test đạt.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi.
- `pnpm exec eslint <4 tệp của map> --max-warnings=0`: 0 lỗi, 0 cảnh báo.
- `pnpm assets:check`: OK (16 pack, 3.232 tệp) sau `assets:box-props` và `assets:manifest` qua khóa.
- Bộ ảnh đầy đủ `pnpm assets:preview nui-tuyet` (qua khóa): 33 ảnh trong `assets/generated/review/nui-tuyet/` (17 ảnh `mock__` + ảnh landmark).
- Không chạy cả bộ test, E2E hay `perf`; `content:check` để phiên chính chạy.

## Đề xuất cho bộ dựng chung và phiên chính

1. Web: thêm routine cho chim cánh cụt và gấu trắng. Hiện chim cánh cụt dùng `chick` (kêu "Chíp chíp"), gấu trắng dùng `fox` (ngủ gật, lời chào trung tính nhưng lời làm trò nói "Cáo…"); cáo, nai, thỏ dùng routine của chúng và generator đổi tên chỗ làm thành `den`/`lookout`, `graze-b`, `bush-b`.
2. Web: lời thoại theo mùa/map (người bán, người quét đang nói về rau, lá vàng); thêm vai "người trượt tuyết".
3. Khối: một khối lá thông xanh đậm không đặc (hiện lá thông dùng `board`, đặc, đi không xuyên được; `leaves` quá nhạt cho thông tuyết) và một khối đá tối màu cho vách (hiện trộn `cobble-grey`, `brick-grey`, `iron`).
4. `zone-map.ts`: độ cao địa hình bị chặn ở 32 (`sy - 16`); vách và núi cao hơn phải dựng bằng khối trong `build`.

## Câu hỏi mở

- Tiền tố `ntu-` thay `nt-` (lý do ở trên) — giữ hay đổi tên?
