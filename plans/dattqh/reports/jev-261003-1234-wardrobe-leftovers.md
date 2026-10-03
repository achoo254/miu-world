# Jev: các điểm còn lại sau đợt phụ kiện, quần áo, xe (03/10/2026 12:3x)

Mô hình `jev-1.13.0`. Người sở hữu: "gửi model jev quyết định cho". Theo quy ước, lựa chọn của Jev được dùng cả khi escalate.

| Câu | Lựa chọn | Xác suất | Quyết |
| --- | --- | --- | --- |
| Đuôi chọc qua đồ đeo lưng | **hide-tail**: ẩn đuôi khi đeo đồ ở lưng | hide-tail 0,77 · tuck-tail 0,19 · leave 0,04 | auto (0,66) |
| Mũi xe lấn vào tường | **stop-earlier**: khi lái, dò trước bằng chiều dài xe, dừng sớm hơn; thân va chạm giữ nguyên | stop-earlier 0,97 · leave 0,03 · bigger-body 0,00 | auto (0,96) |
| Đồ cầm tay dài lướt sát má khi đi | **holding-pose**: khi cầm đồ, giữ cánh tay ở tư thế cầm của rig, không vung | holding-pose 0,73 · shorten 0,25 · leave 0,02 | auto (0,60) |
| Ba kiểu váy loe để chân lọt khi chạy | **leave** | leave 0,56 · shorten-skirts 0,44 | escalate (0,13) — dùng lựa chọn của Jev |
| Sáu NPC đặt tay đứng ở thềm cửa | **leave** | leave 0,74 · move-off 0,26 | escalate (0,49) — dùng lựa chọn của Jev |
| Lệnh vẽ ảnh treo khi chạy dài | **fix-root**: sửa tận gốc để chạy hết một lượt | fix-root 0,88 · batches 0,12 | auto (0,77) |
