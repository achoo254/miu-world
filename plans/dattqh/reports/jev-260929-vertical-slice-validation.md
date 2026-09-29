# Quyết định Jev: validation plan vertical slice MVP

Ngày: 2026-09-29. Model: `jev-1.13.0` (Choice, `tools/decisions/jev-decide.py`). Plan: `plans/dattqh/260929-2141-vertical-slice-mvp/`. Theo chỉ đạo người sở hữu, dùng lựa chọn của Jev kể cả khi script trả `escalate`. Câu dữ liệu trẻ (stakes high) yêu cầu phương án thu ít dữ liệu nhất, không vượt Master Plan §9. Token lấy từ `TYPESAFE_TOKEN_FILE`, không in ra.

State đưa cho Jev: sản phẩm và nền đã có (Foundation), phạm vi slice, các điều khoản Master Plan liên quan (§1 chuỗi ngày, §4 Home là cảnh 3D, §5 hỗ trợ học và slot đồ, §6 lựa chọn hành động là V1, §9 dữ liệu trẻ, §12 iPad Gen 10), ràng buộc tablet, đối tượng trẻ nhỏ.

## Kết quả

| # | Câu hỏi | Stakes | Jev chọn | Xác suất các phương án | Confidence | Script | Cờ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `home_scene` | medium | react_screen_with_prerendered_island_image | ảnh render sẵn 0.79, 3D thật 0.19, 2D thuần 0.02 | 0.69 | escalate | DƯỚI NGƯỠNG (0.8); người sở hữu có thể đảo |
| 2 | `support_answer_penalty` | medium | xp_minus_10_percent | trừ 10% XP 0.72, chỉ sao 0.23, không phạt 0.05 | 0.58 | escalate | DƯỚI NGƯỠNG (0.8); người sở hữu có thể đảo |
| 3 | `streak_in_mvp` | low | defer_v1 | 1.00 / 0.00 | 1.00 | auto | Trên ngưỡng |
| 4 | `outfit_slots_mvp` | medium | hat_backpack_plus_color_variants | 0.98 / 0.02 | 0.96 | auto | Trên ngưỡng |
| 5 | `decision_step` | low | narrative_only | 0.95 / 0.05 | 0.90 | auto | Trên ngưỡng |
| 6 | `offline_behavior` | low | block_with_retry | 0.99 / 0.01 | 0.99 | auto | Trên ngưỡng |
| 7 | `stars_rule` | low | three_stars_minus_support_and_mistakes | 0.94 / 0.06 | 0.89 | auto | Trên ngưỡng |
| 8 | `challenge_answer_attempt_logging` | high | count_only | 1.00 / 0.00 | 1.00 | escalate | Câu high luôn chuyển người theo chính sách script; Jev chọn phương án thu ít nhất, không vượt §9 |
| 9 | `character_personality_field` (câu thêm) | high | cosmetic_not_stored | 0.91 / 0.09 | 0.81 | escalate | Câu high; theo phương án thu ít nhất |
| 10 | `ipad_review_access` (câu thêm) | low | lan_password_login | 0.73 / 0.27 | 0.47 | escalate | DƯỚI NGƯỠNG (0.6); người sở hữu có thể đảo |

Hai câu thêm (#9, #10) do reviewer đặt từ Red Team: #9 vì `personality` là trường mới trên nhân vật của trẻ (rule `server-and-child-safety.md`: đổi trường dữ liệu trẻ phải hỏi người); #10 vì Google OAuth chỉ nhận https hoặc `http://localhost` nên IP LAN không hoàn tất luồng Google.

## Chốt vào plan (chỉ thị cụ thể)
1. Home là màn React, nền ảnh đảo render sẵn bằng script mới `tools/assets/render-home-island.ts`, hotspot theo `content/world/regions.json`; không dựng cảnh 3D thứ hai. Lệch Master Plan §4 và task #11: ghi vào §15 ở phase 10. (Phase 5, 10)
2. Xem lớp Đáp án làm XP quest giảm 10% (làm tròn xuống) khi hoàn thành; Xu, Skill XP, vật phẩm giữ nguyên; UI dùng lời khích lệ, hiển thị số XP thực nhận từ server. (Phase 3, 8, 9)
3. Không có chuỗi ngày ở MVP. (Phase 5, 9)
4. Chỉ hai slot Mũ và Balo, thêm món và biến thể màu (ít nhất một món mở bằng hoàn thành `forest-ch1`); Áo, Giày, Cánh là ô khóa "Sắp có". (Phase 4)
5. Decision chỉ kể chuyện. (Phase 2)
6. Mất mạng: giữ UI, banner, khóa nút gửi, tự thử lại khi có mạng; không tính cục bộ, không xếp hàng. (Phase 1, 7)
7. Sao: 3 sao, trừ 1 khi xem đáp án, trừ thêm 1 khi tổng số lần sai của quest ≥ 5, tối thiểu 1; server tính và lưu `stars`, `xp_awarded`. (Phase 3, 9)
8. Chỉ bộ đếm theo hồ sơ, quest, step (`wrong_count`, `guide_views`, `hint_views`, `answer_views`), không nội dung trả lời, không dấu thời gian từng sự kiện, FK cascade khi xóa hồ sơ; consent chuyển `draft-3` (vẫn cần pháp chế duyệt). (Phase 3)
9. Tính cách là nhãn cố định "Nhà thám hiểm", không cột DB, không trường trong API. (Phase 4)
10. Người duyệt mở trên iPad qua LAN với `PASSWORD_LOGIN=1` (chỉ dev/test, bị từ chối ở production), dữ liệu giả, không dùng tunnel; nếu người sở hữu muốn thử Google trên iPad thì phải cấp hostname https cố định đã đăng ký làm redirect URI (việc của người). (Phase 10)

## Tương tác giữa các quyết định
- XP quest ch1 là 100 và ngưỡng Lv.2 là 100 XP (`content/progression/level-curve.json`): xem đáp án làm XP còn 90 nên không lên level. E2E vòng chính không xem đáp án (Level Up Lv.1→2); một test riêng kiểm nhánh xem đáp án (90 XP, sao 2). (Phase 9, 10)
- Quyết định #2 và #7 cùng dùng bộ đếm ở #8; không cần thêm dữ liệu nào ngoài `step_attempts`.

## Cần người xem lại (nếu muốn đổi)
#1 (Home không phải cảnh 3D), #2 (giảm XP), #10 (LAN thay vì tunnel). Đều dưới ngưỡng tự quyết nhưng dễ đảo và chưa có người dùng thật.
