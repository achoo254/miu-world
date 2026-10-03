# Jev: nhà của bé, xe to hơn, lúc deploy (03/10/2026 13:10)

Mô hình `jev-1.13.0`. Người sở hữu: "thêm màn nhà của bé nữa. trong nhà phải thiết kế như mock. phải có bảng thời khóa biểu và lịch mặc đồng phục… cho phép sửa"; "kích thước của xe trong game cũng đang quá nhỏ và ko chi tiết". Theo quy ước, lựa chọn của Jev được dùng cả khi escalate.

| Câu | Lựa chọn | Xác suất | Quyết |
| --- | --- | --- | --- |
| Phạm vi mock nhà | **rooms-and-schedule**: panel 1–10 và 13 (nhà, các phòng, sân, vườn, chuồng, biển tên) cùng thời khóa biểu và lịch đồng phục; tùy biến nội/ngoại thất (11, 12) và bản đồ nhỏ (14) để đợt sau | rooms-and-schedule 0,80 · all-panels 0,15 · rooms-schedule-customise 0,05 | escalate (0,70) |
| Đường vào nhà | **own-map-portal-and-home**: map riêng "Nhà của bé", cổng ở Trung tâm và nút "Về nhà" ở Home, tới cổng trước | own-map 0,73 · home-screen-only 0,19 · plot-in-trung-tam 0,08 | escalate (0,60) |
| Dữ liệu thời khóa biểu | **profile-editable-empty**: lưu theo hồ sơ từng bé trên server, sửa trong game; repo chỉ có mẫu trống (repo công khai, ảnh có tên trường, tên và số điện thoại cô giáo) | profile-editable-empty 0,81 · seed-owner-prod 0,19 · repo-default 0,00 | escalate (0,71) |
| Cỡ xe | **life-size-redetail-all**: dựng lại cả 51 xe cỡ thật, chi tiết gấp khoảng ba lần | life-size 0,75 · scale-and-redetail-some 0,24 · scale-only 0,01 | escalate (0,62) |
| Lúc deploy | **deploy-now**: kiểm đủ rồi deploy đợt đã commit; nhà và xe đợt sau | deploy-now 0,89 · wait 0,11 | escalate (0,77) |

Xe tự lái khi bấm tự đi: không tái hiện được trên bản hiện tại (ba xe, hai map, cả hai thứ tự bấm); test `autowalk.spec.ts` nay giữ trường hợp lái xe.
