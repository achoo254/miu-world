# Thiết kế mẫu: Trường học

Mock của người sở hữu (01/10/2026) cho map `truong-hoc` (vùng Toán), chuẩn tạo hình khi dựng map bằng `tools/world/generate-school-map.ts`. Ảnh ở `designs/truong-hoc/`: ba bản gốc và từng khung đã cắt. Plan thực hiện: `plans/dattqh/261001-1511-school-campus-mock/`.

Chữ trong ảnh, biển hiệu và đồ vật là gợi ý tạo hình, không phải asset: map chỉ dùng block, pack có license và prop dựng từ Fluent Emoji (xem `.claude/rules/assets-pipeline.md`).

## Toàn khu (`mock-toan-khu-truong-hoc.png`)

| Khung | File | Nội dung cần có |
| --- | --- | --- |
| 1 | `khu-01-toan-canh.png` | Toàn cảnh: đường phố phía trước có vạch qua đường và xe buýt vàng; hàng rào trụ đá + song sắt quanh khuôn viên; cổng giữa; sân lối vào; tòa nhà chính mái đỏ có tháp đồng hồ ở giữa phía sau; nhà đa năng mái vòm xanh + sân bóng rổ đỏ bên trái; sân chơi, vườn có luống gỗ bên phải; cây xanh, cây hoa hồng; sông và nhà dân quanh. |
| 2 | `khu-02-cong-truong.png` | Cổng trường nhìn từ ngoài: hai trụ đá vuông, cánh cổng sắt đen mở, đèn đường hai bên, vạch qua đường, tòa nhà chính thấy qua cổng. |
| 3 | `khu-03-san-truong-loi-vao.png` | Sân trường, lối vào chính: đường lát đá thẳng tới bậc thềm tòa nhà chính, hai bên bồn hoa viền gỗ, đèn sân, cây. |
| 4 | `khu-04-nha-da-nang-san-bong-ro.png` | Nhà đa năng mái vòm xanh, tường đá sáng, cửa kính; sân bóng rổ nền đỏ vạch trắng, hai cột rổ. |
| 5 | `khu-05-san-choi.png` | Sân chơi: xích đu khung tím, cầu trượt xanh có mái cam, ghế băng, nền lát. |
| 6 | `khu-06-vuon-khoa-hoc.png` | Vườn khoa học: nhà kính khung kính, luống rau và hoa trong khay gỗ, đèn vườn. |
| 7 | `khu-07-duong-truoc-truong.png` | Đường chính trước trường: hàng rào trụ đá, xe buýt vàng đỗ, vạch kẻ đường, đèn. |
| 8 | `khu-08-goc-nhin-phia-sau.png` | Góc nhìn phía sau: tòa nhà chính giữa nhiều cây và nhà dân. |

## Dãy lớp học (`mock-day-lop-hoc.png`)

| Khung | File | Nội dung cần có |
| --- | --- | --- |
| 1 | `lop-01-mat-truoc.png` | Mặt trước: hai tầng, tường vàng nhạt, cột đá trắng, lan can gỗ tầng hai, mái ngói đỏ; khối giữa nhô lên thành tháp có mặt đồng hồ trên đầu hồi; lối vào chính có bậc thềm; bồn hoa hai bên. |
| 2 | `lop-02-goc-nhin-cheo.png` | Góc chéo trước phải: mái hai dốc, hành lang cột chạy dọc mặt trước. |
| 3 | `lop-03-mat-sau-hanh-lang.png` | Mặt sau: hành lang cột hai tầng, đầu hồi đỏ. |
| 4 | `lop-04-trong-lop-nhin-bang.png` | Trong lớp, nhìn về bảng: bảng xanh, bàn giáo viên, dãy bàn ghế gỗ, tủ sách, cửa sổ hai bên, đèn trần. |
| 5 | `lop-05-trong-lop-goc-cheo.png` | Trong lớp, góc chéo: cửa sổ lớn, tranh trên tường, tủ sách góc. |
| 6 | `lop-06-hanh-lang-trong.png` | Hành lang trong: sàn gỗ, cột trắng một bên, cửa lớp bên kia. |
| 7 | `lop-07-cau-thang-tang-2.png` | Cầu thang gỗ lên tầng 2, cửa sổ đầu cầu thang, chậu cây. |

## Tòa nhà chính (`mock-toa-nha-chinh.png`)

| Khung | File | Nội dung cần có |
| --- | --- | --- |
| 1 | `nha-01-mat-truoc.png` | Mặt trước, lối vào chính (như lớp học khung 1). |
| 2 | `nha-02-cheo-truoc-phai.png` | Góc chéo trước phải. |
| 3 | `nha-03-cheo-truoc-trai.png` | Góc chéo trước trái: đầu hồi đỏ, cột trắng. |
| 4 | `nha-04-mat-sau.png` | Mặt sau, hành lang lớp học. |
| 5 | `nha-05-ben-phai-loi-hong.png` | Bên phải, lối đi bên hông. |

## Gán vào map (quyết định của Jev)

Map 192×192, cao 48 (Jev quyết lại theo ý người sở hữu). Bảy khu chủ đề Toán là các khu của mock: 1 sân trường lối vào, 2 vườn khoa học (nhà kính, luống rau), 3 căng tin, 4 xưởng đồ chơi cạnh sân chơi, 5 sân vẽ mĩ thuật, 6 tháp đồng hồ (sân sau tòa nhà chính), 7 nhà đa năng và sân bóng rổ. Nội thất: một lớp học đủ đồ mỗi tầng, hành lang trong và cầu thang; các phòng khác đóng cửa.
