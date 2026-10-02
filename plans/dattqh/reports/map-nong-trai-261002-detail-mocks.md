# Map Nông trại theo mock chi tiết (02/10/2026)

Pha 4 của plan `plans/dattqh/261002-0802-detail-mocks-per-map/`. Map `nong-trai`, generator `tools/world/generate-nong-trai-map.ts` (viết lại). Giữ nguyên `ZONES` (khu bài học x 300–500, z 352–508) và điểm spawn; 46 mục tiêu quest vẫn đặt được, đi tới được.

## Đối chiếu từng khung (ảnh `assets/generated/review/nong-trai/mock__*.png`)

| Khung | Mức | Ghi chú |
| --- | --- | --- |
| d-01 Toàn cảnh | gần | Chuồng đỏ ở giữa, sân lát, sạp, ao, ruộng; núi và sông chỉ còn là đồi mờ vì sương mù (xem câu hỏi mở 1). Cối xay ngoài khung. |
| d-02 Cổng nông trại | đạt | Cổng gỗ chân đá, biển mèo trên xà, đèn treo ở cột, biển "NÔNG TRẠI", lối lát dẫn thẳng vào chuồng đỏ. Thiếu hoa leo trên xà. |
| d-03 Khu trồng trọt | gần | Luống bí ngô cam có lá, rào gỗ, lúa mì vàng phía sau, bù nhìn, hướng dương bên lối. Lúa mì thấp hơn mock. |
| d-04 Khu chăn nuôi | gần | Chuồng đỏ mái xám kiểu gambrel, viền trắng, cửa chữ X; chuồng cừu nhỏ có cừu, bò trước chuồng. Thiếu chuồng phụ bên trái. |
| d-05 Nhà kính | gần | Đi vào được: khung gỗ, mái kính có kèo, sàn lát, kệ chậu dâu to và chậu hoa, đèn treo. Kính đục hơn mock. |
| d-06 Vườn cây ăn quả | gần | Lối đất giữa hai hàng cây táo tán tròn, táo đỏ to, thùng táo, thang. Thác không lọt khung (sương mù). |
| d-07 Ao cá | gần | Ao bờ đá, cầu câu gỗ có cọc, sàn gỗ bờ xa, chòi câu mái xanh, người câu cá cầm cần. |
| d-08 Nhà kho chế biến | gần | Đi vào được: trần ván có xà, lò gạch miệng vòm cháy sáng, kệ hũ mật phát sáng, bàn bánh, bao bột, thùng, đèn treo. |
| d-09 Chợ nông sản | gần | Ba sạp mái sọc (đỏ-trắng, xanh-kem, xanh-trắng), biển hình cà rốt/táo/bắp cải, bí, táo, bắp cải trên quầy, người bán đứng sau quầy. |
| d-10 Bảng nhiệm vụ | đạt | Bảng gỗ sáu tờ giấy, đĩa vàng "!" phát sáng, nhà mái đỏ có đèn tường, tủ hũ bên cạnh. Người không đội nón. |
| d-11 Khu nghỉ | đạt | Cây lớn tán thấp, mười đèn lồng treo, bàn gỗ, dù kem, sân lát, hoa; trẻ em ngồi chơi. |
| d-12 Nhà ở nông trại | gần | Nhà tường kem mái đỏ hai khối, mái hiên cửa, hộp hoa, ống khói, hòm thư đỏ, biển búa. Chưa có gác mái và mái hiên cửa sổ như mock. |
| d-13 Cối xay và lò nướng | gần | Cối xay gỗ có cánh, lò bánh gạch mái đỏ có lửa, bàn bánh mì, bao bột, sân lát, lúa mì vàng bên cạnh. |
| d-14 Khu mở rộng | gần | Cầu đá vòm qua sông, núi xanh có đỉnh, thác đổ từ vách. Thiếu cụm nhà sát thác như mock. |
| c-09 Nông trại (cận cảnh) | đạt | Chuồng đỏ cuối lối, lúa mì vàng hai bên có rào, bò và cừu trước bên trái, luống rau bên phải, cối xay và silo. |

## Thay đổi chính

- Bố cục: bỏ lưới đường thẳng; lối nông trại cong, ruộng nhiều cỡ (lúa mì, ngô, bí ngô, hướng dương, rau, vườn quả, đồng cỏ), ba trang trại (chuồng đỏ, nhà, silo, cối xay), xóm nhà dọc lối. Sông chạy ngang phía nam sát nông trại, đổ vào hồ phía đông, hai cầu đá vòm; sau sông là vách núi đá có đỉnh xanh và hai thác cao (tới y 40, rộng 5).
- Khu bài học: cổng, khu trồng trọt, cối xay + lò bánh, nhà ở + bảng nhiệm vụ, sân lát + chợ, chuồng đỏ (cửa rộng, ngăn chuồng, bò bên trong), chuồng cừu, chuồng gà, chuồng lợn, nhà kho chế biến và nhà kính (đi vào được), khu nghỉ dưới cây lớn, ao cá có cầu câu và chòi, vườn táo.
- Nền: `grass-farm` chỉnh từ `#c2bd4e` (ô liu vàng, lúa mì chìm) sang `#a9c63c` (xanh cỏ đậm hơi vàng); lối `trail`, sân lát `cobble`. Đã chạy lại `pnpm assets:atlas`.
- Khối dựng riêng: `tools/world/structures/nong-trai-farm.ts` (chuồng đỏ gambrel, nhà kính, nhà kho có lò, lò bánh, cổng nông trại, silo, cây ăn quả có chỗ treo quả, cây bóng mát tán thấp, thác cao).
- Prop hộp mới (`content/world/box-props/nong-trai.json`, 28 cái, tiền tố `nt-`, mỗi cái một dòng trong `content/world/models.json`): bù nhìn, hướng dương, cừu, bảng nhiệm vụ "!", biển mèo, biển "NÔNG TRẠI" (chữ điểm ảnh, đọc đúng chiều từ cả hai mặt), thùng táo, thang, dù, bàn picnic, hòm thư, biển búa, đèn treo, bàn bánh mì, bao bột, kệ hũ, lửa, chậu dâu, chậu hoa, kiện cỏ khô, bình sữa, ba biển sạp, quả táo, quả cam, bí ngô có lá, khóm lúa mì 2 × 2.
- Góc chụp: `content/world/mock-views/nong-trai.json` (15 khung).

## Số liệu

- Prop: 15.995 (dưới ngân sách 20.000). Người: 45, vật sống động: 65 (bò 26, gà 20, lợn 11, chó 5, mèo 3); thêm prop tĩnh 77 bò, 110 cừu.
- 49 vùng (không đổi), 47 interactable.

## Kiểm tra

- `pnpm vitest run tools/world/zone-maps.test.ts -t "nong-trai map"`: 4 đạt / 0 trượt (khớp output đã sinh, 800 × 800 và mọi mục tiêu đứng trên đất, có đời sống, đi tới được mọi mục tiêu từ spawn).
- `pnpm vitest run tools/world/mock-views.test.ts tools/world/model-catalog.test.ts tools/assets/build-box-props.test.ts`: 9 đạt / 0 trượt.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi. `eslint` hai tệp TS đã sửa, `--max-warnings=0`: sạch.
- Ảnh: chụp đủ bộ `pnpm assets:preview nong-trai` (31 ảnh: 2 toàn map, 14 cận cảnh mốc, 15 khung mock). Đã sinh lại `assets:box-props`, `assets:atlas`, `assets:manifest` (dưới khóa chung).
- Không chạy cả bộ test, E2E, `perf` (theo bản giao việc).
- Lưu ý: giữa chừng test và generator từng đỏ vì `models.json` có dòng `cp-*`, `kr-*` của agent khác chưa có trong manifest; chạy lại `assets:box-props` + `assets:manifest` là hết. Phiên chính nên chạy lại hai lệnh này trước gate.

## Đề xuất cho bộ dựng chung

1. Sương mù ảnh review và trong game (`game.ts`: `Fog(viewDistance*0.75, viewDistance)`, cao = 110 khối) che núi, thác ở xa: khung toàn cảnh của mock không thể có cả nông trại lẫn núi. Đề xuất cho góc chụp `mock-views` một trường tùy chọn tầm nhìn/sương xa hơn, hoặc cho horizon vẽ bóng núi không bị sương nuốt.
2. Mặt bên của khối `wheat` nhìn như cỏ xanh khi đứng ngang tầm; ruộng lúa mì xem gần phải dùng prop khóm lúa mì. Đề xuất đổi texture `wheat-side` sang thân lúa vàng (khi đó mọi map hưởng, bớt prop).
3. `placeWaterfall` chỉ cao bằng vách địa hình (tối đa 20 khối trên mặt đất do giới hạn `sy - 16`); `placeTallFall` của map này (khối đá riêng tới y 40) có thể đưa vào `landmarks.ts`.
4. `crowd()` không cho vai `fisher`/`gardener` (cần chỗ `bank`, `row-*`): người câu cá đang dùng vai `ferryman` cầm cần. Đề xuất `crowd` nhận chỗ đặt tên.
5. Người trong đời sống không đội được nón: "nông dân đội nón" của mock chưa làm được.

## Câu hỏi mở

1. Có chấp nhận khung d-01 thiếu núi (do sương mù 110 khối) hay mở rộng tầm nhìn cho ảnh review (việc của phiên chính)?
