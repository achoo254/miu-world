# Jev: danh sách chép vở và deploy (03/10/2026 08:2x)

Mô hình `jev-1.13.0`. Người sở hữu: "câu hỏi gửi model jev quyết định". Bối cảnh: thẻ "Chép vào vở" sau mỗi câu đúng và màn chép vở cuối bài vừa làm; danh sách cuối bài đang lưu trong trình duyệt nên thiếu khi đổi máy; server đã có các bước bé hoàn thành và đáp án chuẩn từng bước. Đang chờ deploy: sửa đi tàu mất nền, nhạc to hơn, bé nhỏ lại và nhảy đôi, sách và trang trên bản đồ, màn nhiệm vụ cuộn gọn trên iPad, thẻ chép vở; mọi kiểm tra tự động đạt, chưa ai chơi thử trên iPad thật.

| Câu | Stakes | Lựa chọn | Xác suất | Quyết |
| --- | --- | --- | --- | --- |
| Làm danh sách chép vở cuối bài đủ trên mọi máy | medium | **server-from-progress**: server dựng danh sách từ câu hỏi và đáp án chuẩn của các bước bé đã xong, gửi kèm khi xong bài; không lưu thêm gì về bé | server-from-progress 0,99 · server-store-answers 0,01 · keep-on-device 0,00 | auto (0,98) |
| Deploy các thay đổi đang chờ lên production ngay | medium | **hold-for-playtest**: chờ người sở hữu chơi thử bản mới trên iPad thật rồi mới deploy | hold-for-playtest 0,95 · deploy-now 0,05 | auto (0,89) |

Áp dụng: đáp án trong vở lấy từ câu đáp án người soạn bài viết cho lớp hỗ trợ "Đáp án" (`support.answer.text`, đúng nguyên văn SGK); server gửi dòng chép vở trong phản hồi của mỗi câu đúng và đủ các dòng khi xong bài. Production giữ bản `2c4400b` cho tới khi người sở hữu chơi thử.
