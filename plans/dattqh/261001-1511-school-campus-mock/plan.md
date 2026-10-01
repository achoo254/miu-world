# Trường học theo mock: khuôn viên, tòa nhà chính, lớp học

**Trạng thái:** đang làm · **Tier:** XL · **Nhánh:** `main` · Quyết định bởi Jev (`jev-input.json`, `jev-output.json`)

## Kết quả mong muốn

Map `truong-hoc` trông như ba mock của người sở hữu (`designs/truong-hoc/`, mô tả ở `docs/design-truong-hoc.md`): đường phố có xe buýt và vạch qua đường trước cổng trường có trụ và đèn, hàng rào; sân trường lối vào có bồn hoa và cột cờ; tòa nhà chính hai tầng có tháp đồng hồ và hành lang cột trước, sau; một lớp học mỗi tầng có bảng, bàn ghế, tủ sách, đèn, hành lang trong và cầu thang lên tầng 2; nhà đa năng mái vòm xanh với sân bóng rổ; sân chơi xích đu, cầu trượt; vườn khoa học có nhà kính và luống rau; sông và nhà dân quanh khuôn viên. 36 bài Toán vẫn chơi được, mỗi chủ đề ở khu của nó.

## Quyết định (Jev, 01/10/2026)

| Câu | Chọn | Tin cậy |
| --- | --- | --- |
| Cỡ map | ~~Giữ 96×96~~ → người sở hữu thấy map nhỏ, Jev quyết lại (`jev-input-map-size.json`): **192×192** (gấp 4 diện tích) | 0.93 |
| Chiều cao map | 48 khối (đủ cho tháp đồng hồ, cây, đồi) | 0.97 |
| Map nào to ra | Cả Trường học và Khu rừng bí mật ngay đợt này (Jev 0.6, `escalate`, theo ủy quyền vẫn áp dụng) | 0.6 |
| Nội thất | Một lớp học đủ đồ mỗi tầng, hành lang trong, cầu thang; phòng khác đóng cửa | 0.96 |
| Khu chủ đề | Gán vào khu của mock: 1 sân trường lối vào, 2 vườn khoa học, 3 căng tin, 4 xưởng đồ chơi cạnh sân chơi, 5 sân vẽ mĩ thuật, 6 tháp đồng hồ (sân sau tòa nhà chính), 7 nhà đa năng + sân bóng rổ | 0.91 |

Ràng buộc: ≤ 150 draw call, ≤ 150k tam giác; asset chỉ từ pack có license hoặc generator (không tự vẽ); block mới là dữ liệu từ Kenney Voxel Pack (kính, vải xanh, đá xám, lá nhuộm hồng); prop thiếu dựng từ Fluent Emoji (xe buýt, cầu trượt, mặt đồng hồ, sách).

## Phase

1. [x] Cắt 3 mock thành 20 khung + giữ bản gốc ở `designs/truong-hoc/`; mô tả từng khung ở `docs/design-truong-hoc.md`. (S)
2. [x] Block mới (kính, mái xanh, mặt đường, lá hồng) và prop emoji mới (xe buýt, cầu trượt, mặt đồng hồ, sách, xích đu…). (M)
3. [x] `tools/world/structures/school.ts`: tòa nhà chính (tháp đồng hồ, hành lang cột trước và sau, bậc thềm, hai tầng, lớp học mẫu mỗi tầng, hành lang trong, cầu thang), nhà đa năng mái vòm, nhà kính, cổng + hàng rào + đèn, đường phố. Có test. (L)
3b. [x] Kích thước map 192×48×192 cho cả hai map; sửa mọi chỗ trong runtime, review, E2E còn giả định 96. (M)
4. [x] Bố cục mới trong `generate-school-map.ts`: khu chủ đề theo bảng trên, lối đi nối các khu qua tòa nhà chính, prop, NPC chương 1; placer đặt lại mục tiêu quest. (L)
4b. [x] Khu rừng 192×192: giữ nguyên chương 1 làm lõi, thêm vùng mới cho các chương 2–19 (34 bài Tiếng Việt), đời sống rừng trải khắp. (L)
5. [ ] Ảnh nền vùng, ảnh review chụp theo góc của từng khung mock; gate + build + E2E trong ngân sách thời gian; deploy staging. (M)

## Nghiệm thu

- [x] `content:check` xanh: mọi mục tiêu của 36 bài Toán đứng trong khu chủ đề của nó và hiện đúng chương.
- [x] Đi được: cổng → sân → qua tòa nhà chính → sân sau, vườn, nhà đa năng, sân vẽ; vào lớp học tầng 1, lên cầu thang tới lớp học tầng 2 (test generator kiểm lối đi và bậc).
- [ ] Draw call ≤ 150 ở các mẫu E2E của Trường học.
- [x] Ảnh review đặt cạnh khung mock tương ứng trên trang review.
- [ ] Gate 5 lệnh + web build + `e2e:ci` xanh trong ngân sách 480 s; staging chạy bản mới.

## Kết quả (01/10/2026)

- Hai map 192 × 48 × 192. Trường học: đường phố có vạch qua đường và xe buýt, tường rào và cổng có đèn, sân có bồn hoa, cột cờ, sân bóng; tòa nhà chính hai tầng (tháp đồng hồ, hành lang cột trước và sau, sảnh xuyên qua), một lớp học đủ đồ mỗi tầng (bảng, bàn, ghế, tủ sách, quả địa cầu, đèn), cầu thang; nhà đa năng mái vòm xanh, sân bóng rổ, sân chơi, nhà kính và luống rau, sân vẽ, căng tin; nhà dân, sông. Khu rừng: chương 1 giữ nguyên ở góc, thêm 6 bãi cỏ, mỗi bãi một gia đình thú (61 cư dân và thú, trước 19).
- Block mới: kính, mái xanh, mặt đường, lá hồng, bảng. Prop emoji mới: xe buýt, cầu trượt, mặt đồng hồ, chậu cây, sách, quả địa cầu, bàn tính, gấu bông.
- Placer nhanh hơn ~20 lần (tra ô theo bảng băm), cần cho map lớn.
- Test generator đi bộ từ cổng tới 7 khu, vào lớp tầng 1 và lên cầu thang tới lớp tầng 2.
- Trang review: mục "Trường học theo mock", mỗi khung mock cạnh cùng góc nhìn trong game (17 cặp).
