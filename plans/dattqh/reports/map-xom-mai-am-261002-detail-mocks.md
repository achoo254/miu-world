# Xóm Mái Ấm theo các khung nhà của tấm Làng (02/10/2026)

Map `xom-mai-am`, generator `tools/world/generate-xom-mai-am-map.ts`. Khung: `designs/lang-ven-song/d-03, d-04, d-05, d-07, d-13, d-14` (Jev: Xóm Mái Ấm lấy các khung nhà). `ZONES` giữ nguyên, 75 mục quest vẫn đặt được.

## Đối chiếu từng khung (ảnh `assets/generated/review/xom-mai-am/mock__*.png`)

| Khung | Mức | Còn thiếu |
| --- | --- | --- |
| d-03 Nhà dân | gần | Có tường đá kem, mái ngói đỏ, cửa sổ mái, đèn hai bên cửa, bậu hoa, hàng rào trắng, lối đá, biển gỗ, đèn cột. Nhà to và thấp hơn mock (17 × 13 để phòng trong đủ rộng), vườn trước thưa hơn, không có dây leo. |
| d-04 Khu nông trại | gần | Chuồng đỏ có viền trắng, cửa chữ X, cửa sổ gác, mái gambrel; chuồng thả bò bò đen trắng, cừu, chuồng gà, máng, rơm. Thiếu nông dân đội nón ở góc chụp; mái chuồng là bậc khối chứ không phải ngói lợp. |
| d-05 Giếng nước | gần | Thành giếng đá hai hàng, cột gỗ, trục quay, xô treo, mái gỗ, sân lát tròn, thùng, chậu hoa, hàng rào. Mái đọc như tấm gỗ dày hơn mái ngói gỗ của mock. |
| d-07 Vườn và ruộng | gần | Luống đất cày, bí ngô, bắp cải, cà rốt, ngô non, rào gỗ, ruộng lúa mì vàng cao hai khối, cối xay gió phía xa. Lúa mì ở góc chụp chỉ là dải xa; người làm vườn không lọt khung. |
| d-13 Nội thất nhà dân | đạt | Phòng 13 × 9 vào được: tường ốp ván, cột, xà, sàn ván, bàn ăn có đồ ăn, ghế dài, tủ bát, bếp lò sắt có lửa, giường chăn caro, thảm, rèm, tranh gia đình, giá lọ, đèn treo và đèn tường; mẹ đứng bếp, mèo trên thảm. |
| d-14 Chuồng nuôi thú | đạt | Bên trong chuồng: lối đá giữa, ô chuồng rào gỗ, bò và cừu, máng rơm, rơm sàn, kiện rơm, xô, can sữa, đèn treo. |

## Thay đổi chính

- Nhà dân kiểu d-03 cho cả xóm (`homestead`): nhà chi tiết (`cottagePalette().finish`), phần lớn tường đá kem mái ngói đỏ, lác đác mái xanh hoặc cam; vườn trước có lối đá, hoa, bụi, rào trắng, đèn cột, biển gỗ; sân bên có giếng hoặc đống rơm, luống rau, cây ăn quả.
- Nhà Mẩy (khu bài 1, bài học về gia đình) đi vào được, bày theo d-13 (`placeFamilyHome`). Landmark `trong-nha-may` đặt giữa phòng, trên sàn.
- Giếng xóm có mái theo d-05 (`placeRoofedWell`), đặt trên sân lát dưới cây cổ thụ.
- Nông trại phía đông, giữa hai cánh đồng: chuồng đỏ đi vào được theo d-04/d-14 (`placeRedBarn`), hai bãi thả hai bên lối vào, vườn rau có rào và ruộng lúa mì chạy xuống gò cối xay gió (d-07).
- Lối `trail`, viền lối bằng `laneVerge` (đèn lồng, hoa, bụi) thay cho đèn đường hiện đại; đèn ngõ trăng đổi sang `STREET_LANTERN`.
- Landmark đặt tên trùng chỗ quest (bộ xếp quest đặt mục quanh landmark cùng tên): đổi tên 15 landmark (id giữ nguyên) và thêm 13 (luống cải, vách tổ ong, khóm cúc, ghế mây, bụi tre đầu ngõ, võng nhà Mẩy, võng dưới hiên, ghế mây đầu hiên, ngõ nhỏ ánh trăng, bãi đá và mỏm đá trước hang, mâm cỗ, cánh cửa gỗ của chòi, hàng rào nhà bên). Không quest nào gửi bé vào trong nhà.
- Tệp mới: `tools/world/structures/xom-mai-am-home.ts`, `content/world/box-props/xom-mai-am.json` (23 prop `xma-*`: rào trắng, rào gỗ, bò, cừu, bắp cải, bí ngô, bàn ăn, ghế dài, giường, bếp lò, thảm, tủ bát, đèn treo, rèm, giá lọ, kiện rơm, rơm sàn, máng, can sữa, xô treo giếng, chậu hoa, biển cổng, chuồng gà), `content/world/mock-views/xom-mai-am.json`; 23 dòng mới trong `content/world/models.json`.

## Số liệu

- Prop: 17.266 (trước 14.754; dưới mức 20.000). Region: 49.
- Người: 50, vật: 50 (bò, gà, lợn, chó, mèo). Có ông, bà, bố mẹ, trẻ em, mẹ nấu bếp (đi giữa bếp, bàn, tủ trong nhà), cô và bà cho gà ăn, bác vắt sữa (trong chuồng), người làm vườn, người gặt lúa mì, người múc nước giếng.
- Mục quest: 75.

## Kiểm tra

- `pnpm vitest run tools/world/zone-maps.test.ts -t "xom-mai-am map"`: 4 đạt, 0 trượt (map đã sinh lại).
- `pnpm vitest run tools/world/mock-views.test.ts tools/world/model-catalog.test.ts tools/assets/build-box-props.test.ts`: 12 đạt, 0 trượt.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi. `eslint` hai tệp TS đã sửa/tạo, `--max-warnings=0`: sạch.
- Ảnh: bản chụp đủ (22 ảnh) bằng `pnpm assets:preview xom-mai-am`; có năm vòng chụp và sửa theo khung mock.
- Không chạy cả bộ test, không chạy E2E, không chạy `perf`.

## Đề xuất cho bộ dựng chung

- `placeHouse` có tùy chọn cửa sổ mái và ốp ván trong nhà (`lineInside` ở tệp của map), để phòng trong nhà mọi map có cùng vẻ gỗ ấm.
- Một khối "gỗ trắng" làm viền chuồng và rào: `snow` có vân tuyết xanh xám, nên tạm dùng `birch-log`.
- Khối ngói gỗ cho mái giếng và mái chuồng; `log` và `planks` đọc như tấm gỗ phẳng.
- Thú pack (`animal-cow`) đặt làm prop tĩnh không hiện trong ảnh, nên trong chuồng dùng bò hộp `xma-cow`. Nếu muốn thú tĩnh, cần renderer vẽ được model có clip.

## Câu hỏi còn mở

- Có muốn nhà Mẩy nhỏ lại giống tỉ lệ d-03 (khi đó phòng trong sẽ chật với camera bám bé) không? Hiện ưu tiên phòng rộng như người sở hữu yêu cầu.

Status: DONE_WITH_CONCERNS
Summary: Đã làm lại Xóm Mái Ấm theo sáu khung nhà: xóm nhà đá kem mái ngói đỏ có vườn rào trắng, nhà Mẩy và chuồng đỏ đi vào được, giếng có mái, vườn rau và ruộng lúa mì. Các test của map, tsc và eslint đều sạch.
Concerns/Blockers: d-03, d-04, d-05 và d-07 mới ở mức gần (tỉ lệ nhà, mái bậc khối, người không lọt khung). Lúc 11:15 `scenery.ts` bị ghi đè; phiên chính đã khôi phục.
