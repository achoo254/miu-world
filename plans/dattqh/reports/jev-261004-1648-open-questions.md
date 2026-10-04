# Jev: câu hỏi mở của các plan hoàn thiện Master Plan (04/10/2026 16:48)

Mô hình `jev-1.13.0`. Đầu vào và đầu ra: `jev-261004-1648-open-questions-input.json`, `jev-261004-1648-open-questions-output.json`. Người sở hữu đã tự quyết hai việc trước đó: không chống cheat, bỏ qua báo cáo vi phạm; và (04/10/2026) không làm giới hạn giờ chơi của phụ huynh. Theo quy ước, lựa chọn của Jev được dùng, trừ hai câu hòa nêu bên dưới.

| Câu | Lựa chọn | Xác suất | Quyết |
| --- | --- | --- | --- |
| Làm bản luyện thi trước kỳ thi 10/10/2026 | **build_now**: làm lát cắt nhỏ ngay, xếp trước các plan khác | build_now 0,95 · defer 0,05 | auto (0,91) |
| Tên sự kiện công khai | **generic_name**: "Thử thách Olympic Toán", không dùng nhãn TIMO trong game | generic 1,00 | escalate (rủi ro cao, 1,00) — dùng lựa chọn của Jev |
| Nguồn nội dung English | **self_written_by_framework**: tự viết theo khung chương trình, đối chiếu chủ đề với sách ở trường, không chép chữ | 1,00 | auto (1,00) |
| Chuỗi ngày | **no_streak**: không làm | no_streak 0,85 · gentle 0,15 | auto (0,71) |
| Đồ giới hạn mở lại | **reopen_commemorative**: có, bản kỷ niệm | 1,00 | auto (1,00) |
| Giọng đọc English | **browser_voices**: giữ giọng trình duyệt | 0,74 · recorded 0,26 | escalate (0,48) — dùng lựa chọn của Jev |
| Trùm có giới hạn giờ | **no_time_limit** | 0,99 | auto (0,98) |
| Bạn máy tự ghép trong co-op | **only_if_parent_enabled**: chỉ khi phụ huynh bật | 0,52 · always 0,48 | escalate (0,04): gần hòa; lựa chọn của Jev trùng phương án an toàn nên dùng |
| Thưởng/XP/Xu: giữ server hay thêm mã cheat vui | Jev nghiêng `separate_fun_cheats` nhưng **hòa 0,50 / 0,50** | 0,50 · 0,50 | escalate (0,01): **không dùng**, giữ server tính thưởng; không dựng thêm mã cheat vì không có tín hiệu và ngoài phạm vi đã yêu cầu. Người sở hữu muốn mã cheat thì nói, sẽ lập plan riêng |

Hệ quả: `live-world-events` Pha 0 làm ngay; tên "Thử thách Olympic Toán" (cấm "TIMO" trong chữ hiển thị cho bé); `system-screens-v1` bỏ pha chuỗi ngày; `english-subject-content` tự soạn; `boss-skill-check-new-mechanics` không đồng hồ; `coop-quests` bạn máy chỉ khi phụ huynh bật; `parent-area-friends` không giới hạn giờ chơi.
