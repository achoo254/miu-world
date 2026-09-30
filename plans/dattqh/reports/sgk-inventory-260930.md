# Kiểm kê SGK lớp 2 tập 1 (phase 1) — 2026-09-30

Cả hai sách đã kiểm kê xong và đặt `status: "complete"`; `content:check` chạy chế độ chặt (thiếu bài, hở trang, lệch số mục từng trang, mục `readConfidence: "low"` đều là lỗi) và xanh.

| Sách | Bài | Mục | Bài đọc in nguyên văn | Mục có biểu thức tính lại bằng code | Mục trả lời tự do |
| --- | --- | --- | --- | --- | --- |
| Toán 2 tập 1 (`toan2-t1`) | 36 / 7 chủ đề | 1.033 | 0 | 646 | 26 |
| Tiếng Việt 2 tập 1 (`tv2-t1`) | 34 (32 bài + 2 ôn tập) / 4 chủ điểm, 18 tuần | 735 | 43 (kèm tác giả, ô Từ ngữ) | 0 | 324 |

## Theo chủ đề, chủ điểm
- Toán: chủ đề 1 — 6 bài, 160 mục; 2 — 8 bài, 316; 3 — 4 bài, 87; 4 — 6 bài, 197; 5 — 4 bài, 56; 6 — 4 bài, 72; 7 — 4 bài, 145.
- Tiếng Việt: chủ điểm 1 — 8 bài, 155 mục; 2 — 9 bài (gồm ôn giữa kì), 218; 3 — 8 bài, 168; 4 — 9 bài (gồm ôn cuối kì), 194.

## Theo loại bài
- Toán: tính 432, điền số 147, nối 87, bài toán có lời văn 71, chọn đáp án 69, so sánh 62, xem đồng hồ 32, đo lường thực hành 29, xem lịch 27, đếm 24, nhận diện hình 22, vẽ hình 11, sắp xếp 10, trò chơi 10.
- Tiếng Việt: đọc hiểu 139, điền chữ 106, kể chuyện theo tranh 75, đặt câu 67, tìm từ 55, nối 45, khởi động 41, viết chữ 36, đọc thành tiếng 31, nói về bản thân 30, viết đoạn 22, dấu câu 22, chọn đáp án 20, nghe – viết 19, xếp từ 15, sắp xếp 8, trò chơi 4.

## Cách đọc và cách chốt
- Mỗi trang đọc hai lượt độc lập: lượt 1 ghi dữ liệu; lượt 2 ghi ghi chú riêng trước khi mở lượt 1 (`.data/sgk/pass2/<gói>.json`), rồi so từng trang; chỗ lệch đọc lượt 3 để chốt. Số mục từng trang của lượt 2 ghi vào `pageItems`, checker so với dữ liệu.
- Nhật ký lệch (`.data/sgk/pass2/*.log.md`, gitignored) theo gói: Toán 1a 33 dòng, 1b 27, 1c 46; Tiếng Việt 1d 14, 1e 32, 1f 21, 1g 30. Loại lệch hay gặp: cách tách mục (mỗi ô/tranh một mục), dấu chấm lửng "..." và "…", dấu cách trước dấu câu, lời người đọc tự thêm vào câu lệnh (đã chuyển hết sang `media`), vài đáp án tự giải.
- Đáp án tính được (Toán) do checker tính lại từ `expression`; độ dài đoạn thẳng cần đo bằng thước được đo trên ảnh theo tỉ lệ ≈ 59,1 px/cm (căn từ thước in trang 108 và đoạn mẫu 5 cm trang 99), mọi số đo khớp số cm tròn.
- Chữ mờ do font in mất dấu râu ("ươn/ương", "iu/ưu") được chốt bằng các từ in sẵn trong cùng bài; tên sách "Ông Cản Ngũ" (Tiếng Việt tr. 22) chốt bằng ảnh phóng 7×.

## Trang không có bài tập
- Toán: trang 10, 26, 57, 59, 62, 83, 89, 102, 112 (trang Khám phá chỉ có tranh và phép tính mẫu).
- Tiếng Việt: các trang mở chủ điểm 9, 39, 78, 108 (tranh, không thuộc bài nào).

## Chỗ sách in có vẻ lệch (giữ nguyên như in, cần giáo viên biết)
- Tiếng Việt Bài 10 (tr. 47): câu mẫu "7 giờ 30 phút" nhưng đồng hồ tranh 1 chỉ 7 giờ.
- Tiếng Việt Bài 28 (tr. 120): câu lệnh nghe – viết ghi "Đến bữa cơm", bài đọc in "Đến bữa ăn".
- Tiếng Việt ôn cuối kì (tr. 139): bài 7 ghi "tranh ở mục 5" nhưng tranh thuộc bài 6.
- Tiếng Việt tr. 140: đáp án sách là "Miền núi", "Triền núi" cũng hợp vần "iên" — quest phải cho chọn, không cho gõ.
- Toán tr. 133: ngoặc kép mở thẳng, ngoặc đóng cong trong cùng một câu.

## Cần giáo viên duyệt
- 350 mục trả lời tự do (kể, nói, viết) không có đáp án đóng; quest dùng bước nói hoặc phiếu viết cho các mục này.
- Các đáp án người đọc tự giải khi sách không in (gọi tên đồ vật trong tranh, đoán chữ, thứ tự tranh) — ghi trong nhật ký lượt 2 của từng gói.
