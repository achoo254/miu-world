# Jev: các mục cần quyết trên trang review (01/10/2026)

Người sở hữu (01/10/2026): "các mục cần quyết định trong review hãy gửi thông tin cho model quyết định". Tiêu chí duy nhất họ đặt: Miu World code 100% bằng AI, **game phải thật sinh động, trẻ chơi không thấy chán**.

Gửi Jev hai nhóm mục còn chờ người: 5 mục "Quyết định" của trang review MVP (`apps/web/review.html`), và 6 câu "Cần anh/chị quyết" cùng các ghi chú "Cần người duyệt xem" của trang nghiệm thu quest mẫu SGK (`plans/dattqh/260930-0846-sgk-lop2-game-content/nghiem-thu/`). Với mỗi mục MVP có thêm một câu "nếu chỉnh thì chỉnh hướng nào" để chỉ cần một lần gọi.

Gọi `tools/decisions/jev-decide.py` (jev-1.13.0). Đầu vào và đầu ra nằm ở `plans/dattqh/261001-0941-review-decisions-jev/jev-{input,output}.json`. Theo ủy quyền, lựa chọn của Jev được dùng kể cả khi script báo `escalate`.

## Trang review MVP

| Mục | Jev chọn | Tin cậy | Xác suất |
|---|---|---|---|
| Vòng chơi chương 1 | Chỉnh | 0,69 | chỉnh 0,79 · giữ 0,20 |
| → hướng chỉnh | Sự kiện bất ngờ trong rừng (thỏ cuỗm manh mối phải đuổi, mưa rồi cầu vồng, đom đóm lúc chiều) | 0,91 | 0,93 · đồ ẩn để sưu tầm 0,06 |
| Tạo nhân vật | Chỉnh | 0,94 | chỉnh 0,96 |
| → hướng chỉnh | Thú cưng đi theo nhân vật | 0,33 | thú cưng 0,49 · điệu nhảy 0,27 · thêm trang phục 0,22 |
| Home | Chỉnh (giữ ảnh đảo render sẵn) | 0,75 | chỉnh 0,83 · giữ 0,14 · cảnh 3D 0,03 |
| → hướng chỉnh | Sự sống trên đảo: thác chảy, chim và bướm bay ngang, nhân vật của bé vẫy tay | 0,68 | 0,78 · quà bất ngờ mỗi ngày 0,17 |
| Thử thách | Chỉnh (giữ ba lớp hỗ trợ) | 0,92 | chỉnh 0,95 |
| → hướng chỉnh | Đồ vật phản ứng khi chơi (táo nảy vào giỏ, đá lắc lư, hũ kẹo cười khúc khích) | 0,06 | 0,37 · khung câu chuyện 0,37 · đổi số/cảnh khi chơi lại 0,26 |
| Màn thưởng | Chỉnh (giữ 90 XP sau Đáp án) | 0,78 | chỉnh 0,86 · giữ 0,13 |
| → hướng chỉnh | Cả thế giới ăn mừng trong cảnh 3D (dân làng, muôn thú reo, pháo giấy, Vẹt hát) | 0,89 | 0,92 |

## Nghiệm thu quest mẫu SGK

| Câu | Jev chọn | Tin cậy | Xác suất |
|---|---|---|---|
| Nghiệm thu 6 mẫu | **Chấp nhận kèm chỉnh sửa** (mở viết hàng loạt) | 0,34 | 0,56 · chấp nhận nguyên 0,38 · làm lại 0,05 |
| Câu chuyện, giọng thoại | Vui nhộn, hài hước hơn | 0,27 | 0,51 · giữ 0,47 |
| Độ dài | Giữ một quest mỗi bài (15–21 bước) | 0,86 | 0,93 |
| Phương án sai do AI đặt | Giữ | 0,48 | 0,74 |
| Đáp án AI tự chọn (sách không in) | Giữ và đánh dấu cho giáo viên duyệt | 0,27 | 0,52 · giữ 0,47 |
| Bước ôn thêm | Giữ | 0,65 | 0,83 |
| Điều chỉnh trình bày | Giữ | 0,99 | 0,99 |
| Dẫn đường | Đủ rõ | 0,42 | 0,71 |
| Phiếu viết | Giữ | 0,89 | 0,93 |

Câu "Giao diện mới đã đúng hướng chưa" của trang nghiệm thu không gửi riêng: giao diện cơ chế đã làm lại theo mock trong đợt 30/09 và đi theo các hướng chỉnh ở trên.

## Áp dụng

Plan thực hiện: `plans/dattqh/261001-0941-review-decisions-jev/plan.md`. Plan SGK (`plans/dattqh/260930-0846-sgk-lop2-game-content/plan.md`) ghi D10 đã qua.
