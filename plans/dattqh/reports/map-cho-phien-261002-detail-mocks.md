# Chợ phiên theo mock chi tiết — báo cáo (02/10/2026)

Bản giao việc: `plans/dattqh/261002-0802-detail-mocks-per-map/phase-04-map-rework-brief.md`. Năm vòng chụp, so sánh, sửa. Lưới nền giữ nguyên, quest giữ nguyên, `ZONES` không đổi (vị trí, kích thước, `floor`).

## Đối chiếu từng khung (ảnh `assets/generated/review/cho-phien/mock__cho-phien__*.png`)

| Khung | Mức | Đã có / còn thiếu |
| --- | --- | --- |
| d-01 Chợ toàn cảnh | gần | Quảng trường tròn lát `cobble` viền xám, đài phun có tượng mèo trắng, 12 sạp mái sọc đỏ/xanh/cam/xanh lá quanh, đống hàng, cột cờ đuôi nheo, nhà lồng chợ có tháp đồng hồ phía sau. Còn thiếu: dãy nhà nhiều màu sát mép quảng trường như mock (phía sau là một tòa dài), người. |
| d-02 Cổng chợ | gần | Cổng gỗ chân đá, biển "Chợ" chữ điểm ảnh có củ cà rốt và lá, bốn đèn lồng (hai trên tay đỡ), tường đá thấp, hàng rào, bảng phấn quả táo, sân lát đá trước cổng, dây cờ chạy vào lối chợ. Còn thiếu: cây xanh hai bên (sau cổng là mái nhà phố). |
| d-03 Gian rau củ | gần | Mái sọc xanh lá, thùng cà rốt, cải, cà chua, cà tím, chanh, khoai, dây tỏi, hành, ớt treo, bảng phấn cà rốt, đèn lồng hai cột. Còn thiếu: người bán trong ảnh (xem mục người), đồ chưa dày bằng mock. |
| d-04 Gian đồ ăn | gần | Mái sọc đỏ, băng rôn xanh có hình nồi, khay bánh mì, bánh bao, xiên nướng, bánh nướng, kệ bánh, ghế đẩu, thùng gỗ. |
| d-05 Gian tạp hóa | gần | Mái sọc xanh dương, hũ, chai, hộp trên quầy và kệ, bao gạo/đậu/ngô, chổi, cây cảnh, bảng phấn chai. |
| d-06 Gian quần áo | gần | Mái sọc cam, áo treo hồng/xanh/vàng, mũ cói, mũ hồng, mũ xanh, quần áo gấp, rương, gương đứng bên sạp (góc chụp chưa lọt gương). |
| d-07 Gian hải sản | gần | Năm sạp mái sọc xanh, khay cá trên đá, cá phơi treo, giỏ cua, quầy hở lưng nhìn ra kênh, hàng rào bờ nước, cầu tàu. Còn thiếu: hải đăng (đã dựng trên cù lao trong bến) không lọt khung vì cây che. |
| d-08 Khu bán thú nuôi | gần | Chuồng rào có bò, thỏ, gà con, mèo, chó, lợn, rơm, máng ăn, chuồng thỏ mái đỏ; hai sạp mái sọc phía sau quay quầy vào chuồng; ao vịt bên cạnh. |
| d-09 Lối đi trong chợ | đạt | Lối đi lát đá từ cổng tới quảng trường, bốn sạp mỗi bên, đèn hai bên, dây cờ chéo từ nhà phố này sang nhà phố kia, tháp đồng hồ cuối lối. |
| d-10 Chợ buổi tối | đạt | Cùng lối, chụp `mood: dusk`, đèn lồng sáng. |
| c-08 Chợ (cận cảnh) | gần | Phố hai dãy sạp đối diện, đèn, cột cờ, dây cờ. |

Người và vật không hiện trong mọi ảnh preview: game chỉ dựng tối đa 12 người/vật gần bé (bé đứng ở spawn khi chụp), không phải do map. Trong `entities.json` mỗi sạp có người bán đứng sau quầy.

## Thay đổi chính

- `tools/world/generate-cho-phien-map.ts` viết lại bố cục:
  - Chợ rau hoa (chương 1): cổng chợ ở đầu lối từ spawn → lối 4 sạp mỗi bên giữa hai dãy nhà phố → quảng trường tròn (bán kính 23) đài phun tượng mèo, vòng 8 sạp + 4 sạp chéo, đèn, 12 cột cờ → nhà lồng chợ hai tầng có tháp đồng hồ (đồng hồ hai mặt), đi vào được: kệ hũ, chai, hộp dọc ba tường, hai quầy có cân, bao gạo/đậu/ngô, đèn tường. Phố tây: sạp rau củ đối diện sạp đồ ăn; phố đông: tạp hóa đối diện quần áo; hai dãy sạp hoa; khu thú nuôi cạnh ao vịt; vườn cây to, ghế, bồn hoa ở các góc (còn trống cho quest). Nền chợ: đá lát ở quảng trường, lối, phố, sân; cỏ `grass-market` ở chỗ còn lại.
  - Phố chợ giữa hai khu: nhà phố hai tầng mái sọc che cửa, đèn, dây cờ chéo.
  - Dãy hàng cân đong (chương 2): quảng trường nhỏ có cân lớn (đòn gỗ, đĩa vàng treo xích), bàn cân quanh, sạp hoa quả, gạo, bánh, nước, tạp hóa dọc hai phố cắt nhau, đèn, cột cờ, xe đẩy, cây.
  - Bến dưới chương 2: sạp hải sản, hàng rào bờ, cầu tàu, hải đăng trên cù lao. Giữ kênh, cầu rồng (dời sang đường x = 320), cống, bãi sỏi, lán, chậu rửa rau. Ngoại ô: phố phía bắc nhà phố, xóm, ruộng rau, viền lối (`laneVerge`), rào tre.
  - Đời sống: 54 người bán (mỗi sạp một người, tên không lặp theo từng hàng), người mua, trẻ em, người khuân vác, lái đò, quét chợ, thú.
- Tệp mới `tools/world/structures/cho-phien-market.ts`: `marketStall` (11 loại hàng, mỗi loại bày đúng đồ trên quầy, kệ, trước quầy, treo dưới mái, đèn lồng, bảng phấn; quầy hở lưng cho sạp cá), `shophouse` (nhà phố hai tầng mái sọc che cửa), `bunting` (dây cờ võng giữa hai điểm), `streetLamp`, `framePoint`/`originFor`.
- Tệp mới `content/world/box-props/cho-phien.json`: 62 prop hộp `cp-*` (mái sọc 4 màu cho sạp và cho cửa hàng, đèn lồng treo, 8 bảng phấn, 8 thùng nông sản, dây tỏi/hành/ớt, hũ/chai/hộp, bao gạo/đậu/ngô, chổi, mũ, áo, quần áo gấp, gương, khay cá, cá treo, giỏ cua, khay bánh, ghế đẩu, rơm, máng, xô hoa, bồn hoa, xe đẩy, dây cờ, cột cờ, đồng hồ tháp, biển "Chợ", băng rôn đồ ăn).
- `content/world/models.json`: 62 dòng `cp-*` + 9 đồ ăn của Kenney Food Kit (bread, broccoli, croissant, cupcake, grapes, honey, orange, pie, watermelon) — pack đã có trong manifest, không thêm dependency.
- `content/world/mock-views/cho-phien.json`: 11 góc (d-10 `mood: dusk`).
- Sinh lại map, box props, manifest, ảnh review của map.

## Số liệu

- Prop: 16.844 (ngân sách ~20.000), trong đó 1.938 prop hộp `cp-*`; quest target: 101 (+ cổng về trường); ambient: 153 (116 người, 37 con vật).

## Kiểm tra

- `pnpm vitest run tools/world/zone-maps.test.ts -t "cho-phien map"`: 4 đạt / 0 trượt (gồm "matches the committed output", đứng trên đất, sống động, đi tới mọi quest).
- `pnpm vitest run tools/world/mock-views.test.ts tools/world/model-catalog.test.ts tools/assets/build-box-props.test.ts`: 9 đạt / 0 trượt.
- `pnpm exec tsc --noEmit -p tsconfig.json`: 0 lỗi. `eslint` hai tệp TS đã sửa `--max-warnings=0`: 0 lỗi, 0 cảnh báo.
- Không chạy cả bộ test, E2E, perf (theo bản giao việc).

## Đề xuất cho bộ dựng chung

- Dây cờ đuôi nheo (`bunting`) và cột cờ: nhiều map có lễ hội/quảng trường; có thể đưa `bunting` lên `scenery.ts`.
- `framePoint` (điểm lẻ trong khung xoay) nên nằm cạnh `frameCell` ở `world-writer.ts`.
- Yaw tính từ `Math.round(...)` có thể ra `-0`, làm "matches the committed output" đỏ dù tệp giống hệt; nên chuẩn hóa yaw trong `addPropAt`.
- Preview: cho phép chụp hiện người/vật quanh camera (hiện chỉ 12 người gần bé), để khung mock có người như ảnh mẫu.
- Chữ trên prop hộp nhìn từ phía −z bị ngược nếu dựng theo +x: ghi chú trong hướng dẫn prop hộp.

## Câu hỏi còn mở

- Ngoại ô (xóm theo hàng, ruộng ô vuông) vẫn theo lưới cũ; chưa làm lại vì ngoài khung mock. Có cần làm tự nhiên hơn ở đợt sau không?
