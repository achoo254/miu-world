# Plan: nội dung học tự viết thay văn bản SGK

**Ngày:** 25/10/2026 · **Plan:** [`261025-0029-original-learning-content`](../261025-0029-original-learning-content/plan.md)

## Chuyện gì xảy ra

Người sở hữu hỏi có nên gỡ hẳn nội dung lớp 2 để Miu thành game thuần, tránh các quy định về trẻ em. Kết luận: không gỡ, vì store xét mức thu hút trẻ theo hình ảnh chứ không theo bài học, và quy định game online ở Việt Nam áp cho mọi game có người chơi tương tác. Rủi ro pháp lý cụ thể nhất là văn bản SGK chép nguyên văn trong repo công khai (khoảng 1 MB kiểm kê cộng 70 quest, gồm bài đọc của tác giả còn bảo hộ), lại bị máy bắt buộc giữ đúng từng chữ (D8).

## Quyết định

- Người sở hữu chọn đi xa hơn đề xuất: bỏ hẳn khái niệm sách và lớp, tổ chức theo Môn → Chủ đề → Mục tiêu để sau này thêm lớp 3 tới 12. Thay D1, D8, D13 của plan tập một.
- Bài đọc: dân gian cộng tự viết. Lịch sử git giữ nguyên. Duyệt: mẫu trước rồi máy kiểm.
- Kỹ thuật: mục tiêu theo Chương trình GDPT 2018 (văn bản quy phạm, trích được); giữ id quest và id bước để không phải migration tiến độ; vân tay băm n-gram của SGK sinh trước khi xóa kiểm kê để CI chặn chép lại; `/bai/` chuyển 301 sang trang chủ đề.

## Điều cần nhớ

- Kiểm chống chép là cơ chế co dần (danh sách quest chưa viết lại chỉ được ngắn đi), nên deploy được theo đợt.
- Clip YouTube đã đăng có thể còn tên bài hoặc chữ "lớp 2"; gỡ hay giữ phải hỏi người sở hữu.
- Font HP001 của phiếu viết chưa rõ giấy phép.
