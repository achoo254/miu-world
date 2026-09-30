# Jev: làm màn chơi phù hợp và phong phú hơn (30/09/2026)

Người sở hữu chưa nghiệm thu 6 quest mẫu và yêu cầu "dùng skill UI/UX và nhờ Jev quyết điều chỉnh cho phù hợp, phong phú hơn". Skill `ak-ui-ux-pro-max` gợi ý cho app học tập trẻ em: phong cách claymorphism (khối mềm, viền dày, bóng đôi, bo 16–24 px), Baloo 2, phản hồi thành công/lỗi rõ ràng, tránh màu nhạt năng lượng thấp.

Gọi `tools/decisions/jev-decide.py` (model jev-1.13.0), đầu vào `plans/dattqh/260930-1645-scene-ui-richness/jev-input.json`. Mọi câu đều tự quyết (không escalate):

| Câu | Chọn | Tin cậy | Xác suất |
|---|---|---|---|
| Cỡ chữ bài đọc / đề | larger (bài ~22 px, đề ~20 px, nhãn ≥ 20 px) | 0,83 | larger 0,89 · largest_with_follow 0,10 · keep 0,01 |
| Khi đúng | burst (sao lấp lánh, NPC nhún, tiếng xác nhận, rồi câu NPC) | 1,00 | burst 1,00 |
| Khi sai | gentle (lắc nhẹ ô sai, tiếng êm, NPC động viên, không X đỏ) | 0,99 | gentle 1,00 |
| Màn hoàn thành | sequence (sao hiện lần lượt, XP/xu đếm lên, NPC và Miu ăn mừng, ẩn thưởng 0) | 0,74 | sequence 0,83 · sequence_and_world 0,16 |
| Tiến độ | trail (hàng lá/đá: xong, đang làm, còn lại) | 0,96 | trail 0,97 · chip 0,03 |
| Năng lượng bảng | clay (vừa nội dung, khối mềm dày, màu sáng, ô ≥ 64 px, nền hoạ tiết theo cơ chế) | 1,00 | clay 1,00 |
| Nút hỗ trợ | progressive (Hướng dẫn luôn có, Gợi ý sau lần sai đầu, Đáp án sau 2 lần sai) | 1,00 | progressive 1,00 |
| NPC | reactive (nhún khi nói, nghiêng khi nghĩ, nhảy khi đúng, nghiêng người động viên khi sai) | 1,00 | reactive 1,00 |
| Âm thanh | core (chạm, đặt ô, đúng, sai êm, chuông hoàn thành; nhiều biến thể; theo công tắc) | 1,00 | core 1,00 |

Plan triển khai: `plans/dattqh/260930-1645-scene-ui-richness/plan.md`.
