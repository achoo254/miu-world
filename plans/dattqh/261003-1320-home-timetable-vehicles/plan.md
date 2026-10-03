# Nhà của bé, thời khóa biểu và lịch đồng phục, xe cỡ thật

Trạng thái: đang làm · Tier tổng: XL · Nhánh: `main` · Ngày: 03/10/2026 · Quyết định: `plans/dattqh/reports/jev-261003-1310-home-vehicles.md`

Người sở hữu (03/10/2026): "thêm màn nhà của bé nữa. trong nhà phải thiết kế như mock. phải có bảng thời khóa biểu và lịch mặc đồng phục có nội dung này [ảnh]. vì mỗi bé khác sau này có lịch khác nhau nên cho phép sửa nhé"; "kích thước của xe trong game cũng đang quá nhỏ và ko chi tiết".

## Mock nhà của bé (ảnh người sở hữu gửi trong phiên, 14 ô; làm ô 1–10 và 13)

1. Bên ngoài: nhà hai tầng kiểu nhà gỗ đá ấm áp, mái ngói đỏ dốc có ống khói và cửa sổ mái, tường đá/gỗ sáng, cửa gỗ hai cánh có vòm, đèn lồng hai bên cửa, dây leo và hoa trên tường; hàng rào gỗ quanh sân, bồn hoa, hộp thư hình mèo, cờ treo biểu tượng mèo; lối lát đá từ cổng tới cửa; ao/suối nhỏ với cầu tàu gỗ bên cạnh; xa xa núi, thác, cối xay gió.
2. Bên trong (cắt ngang): tầng 1 phòng khách, bếp, bàn ăn; tầng 2 sàn gác gỗ có lan can, phòng ngủ; cầu thang gỗ ở bên; đèn lồng vàng ấm khắp nơi; cửa sổ rèm hồng.
3. Phòng ngủ (tầng 2): giường chăn hồng chấm bi, gối thỏ, đèn ngủ, thảm hình mèo, ghế bành, tủ quần áo, cửa sổ rèm hồng, bàn trang điểm nhỏ.
4. Bàn học và kệ sách (tầng 2): bàn gỗ có đèn bàn, quả địa cầu, chồng sách; kệ sách cao kín tường; tranh vẽ ghim trên tường; chậu cây. **Bảng thời khóa biểu treo trên tường trên bàn học.**
5. Phòng khách (tầng 1): sofa kem gối hồng, bàn trà gỗ, tivi trên tủ gỗ, thảm, cây cảnh, tranh treo, đèn lồng.
6. Bếp và khu ăn (tầng 1): tủ lạnh có nam châm, bếp, tủ bát kệ đĩa, bàn ăn gỗ bốn ghế với bánh và trái cây, đèn treo.
7. Nhà kho (tầng 1): kệ gỗ, thùng gỗ, bao tải, dụng cụ làm vườn (xẻng, cào) treo tường, đèn lồng.
8. Sân vườn trước nhà: lối lát đá giữa hai luống hoa, cổng gỗ có mái, hộp thư, bù nhìn, ghế gỗ.
9. Vườn trồng (cạnh nhà): luống rau (cà rốt, bắp cải), hoa hướng dương, rào gỗ, bình tưới, nhà kho nhỏ.
10. Khu chăn nuôi (sau nhà): chuồng gà gỗ có mái, gà mái, bò sữa, máng ăn, đống rơm, hàng rào.
13. Biển tên gỗ trước nhà "Nhà của {name}" có hình mặt mèo (chưa có chơi online: chỉ biển tên).

Để đợt sau (Jev): tùy biến nội thất (11), ngoại thất (12), bản đồ nhỏ (14).

## Thời khóa biểu và lịch đồng phục

Mẫu trong ảnh: tiêu đề (trường, lớp, năm học, ngày áp dụng, GVCN và điện thoại), bảng Buổi × Tiết × Thứ Hai–Thứ Sáu (sáng 4 tiết, "NGHỈ TRƯA", chiều 3 tiết), dòng quy định đồng phục theo thứ. **Không đưa nội dung thật của ảnh (tên trường, lớp, tên và số điện thoại cô giáo, các tiết) vào repo** — repo công khai. Mỗi hồ sơ bé lưu thời khóa biểu của mình trên server, sửa trong game; repo chỉ có mẫu trống. Người sở hữu tự nhập một lần.

## Pha

| Pha | Tier | Nội dung | Ai | File sở hữu |
| --- | --- | --- | --- | --- |
| A | L | Dựng lại 51 xe cỡ thật, chi tiết gấp ~3 lần, ảnh render | agent A | `content/accessories/vehicle-*.json`, `apps/web/src/game/player/vehicle-ride*.ts`, `assets/generated/accessories/vehicle-*.png` |
| B | XL | Map `nha-cua-be`: nhà, các phòng, sân, vườn, chuồng theo mock; cổng ở Trung tâm; nút "Về nhà" ở Home; mục tiêu `nha-thoi-khoa-bieu` (tường trên bàn học) và `nha-lich-dong-phuc` (cạnh tủ quần áo phòng ngủ) | agent B | `tools/world/**` (map mới, Trung tâm), `content/world/**`, `assets/generated/world/**`, `apps/web/src/game/**` (trừ file xe), Home UI |
| C | L | Thời khóa biểu và lịch đồng phục: schema, bảng DB + migration, API theo hồ sơ bé, màn xem (hôm nay mặc gì) và sửa, mở khi chạm hai mục tiêu trên | agent C | `apps/server/**`, `packages/schema/src/timetable.ts`, `apps/web/src/ui/timetable/**`, `apps/web/src/ui/play/**`, `api-client.ts` |
| D | M | Gom: gate đủ, E2E, ảnh review, docs, commit, deploy (khi người sở hữu cho) | phiên chính | |

Hợp đồng B ↔ C: chạm mục tiêu id `nha-thoi-khoa-bieu` hoặc `nha-lich-dong-phuc` trên map `nha-cua-be` phát sự kiện `interaction` sẵn có; màn chơi (C) mở bảng tương ứng.

## Tiêu chí xong

- Map nhà qua `scenery-audit`, `room-audit`, `reach-audit`; trong nhà ≥ 70% sàn trống, cầu thang lên tầng 2 đi được; ảnh so với mock.
- Thời khóa biểu: mẫu trống khi chưa nhập; sửa ô, tiêu đề, đồng phục từng thứ; lưu server theo hồ sơ, xóa theo hồ sơ; cột hôm nay nổi bật; "Hôm nay mặc: …"; vừa iPad ngang/dọc và điện thoại.
- Xe: bé ngồi/đứng vừa trong xe cỡ thật, đúng hướng, dừng trước tường; ảnh xem từng xe.
- Gate đủ 5 lệnh, build, `security:dist`, `e2e:ci` ≤ 480 s.
