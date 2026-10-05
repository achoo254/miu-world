# Song ngữ, NPC có chuyện riêng, bạn máy (bot)

Trạng thái: S1 (song ngữ giao diện), S3 (đọc to), B1 (bạn máy) xong; S2, N1–N3 (chuyện riêng NPC), B0, B2, B3 chưa làm (rà lại 05/10/2026) · Tier tổng: XL × 3 · Ngày: 03/10/2026
Thiết kế chi tiết: Master Plan §8b (cư dân và bot), §8c (song ngữ).

Người sở hữu (03/10/2026): "thêm song ngữ hiển thị tiếng anh và tiếng việt. bao gồm cài đặt và audio, speak. các nội dung nói chuyện của npc … ít … cá nhân hóa theo tính cách npc, npc có câu chuyện riêng trong mỗi map … liên kết với nhau, biết nhau ở map khác. … khoảng 100 npc … bot auto … lập tổ đội, chat … chơi giống 90% người thật."

## Pha

| Pha | Tier | Nội dung | Phụ thuộc |
| --- | --- | --- | --- |
| S1 | L | Khung song ngữ: `t()`, locales vi/en, Cài đặt ngôn ngữ (Việt / English / Song ngữ) lưu theo hồ sơ, dịch toàn bộ UI, kiểm khóa bằng content:check | không |
| S2 | L | Dịch lời NPC, tên vật phẩm, nhiệm vụ phụ, minigame (howTo), cửa hàng; dòng Anh kèm dưới tiếng Việt; SGK giữ nguyên chữ Việt | S1 |
| S3 | M | Âm thanh và nói: đọc to vi-VN / en-US (Web Speech), bài nói gợi ý song ngữ, cài đặt giọng/tốc độ | S1 |
| N1 | L | Hồ sơ nhân vật `content/npcs/*.json` cho NPC chính mỗi map (tính cách, giọng, nỗi sợ, ước mơ, bí mật, thói quen) + đồ thị quan hệ trong và giữa các map | không |
| N2 | XL | Mạch chuyện riêng: ≥ 6 mạch × 3–5 chương mỗi map (có cảnh, địa điểm, đồ vật, thưởng nhỏ); mức thân thiết theo hồ sơ bé (bộ đếm trên server); lời thoại theo tính cách, nhắc NPC ở map khác; thư và quà giữa NPC | N1 |
| N3 | L | Viết lời thoại sâu cho NPC thường (≥ 12 câu theo tính cách + theo thời điểm/thời tiết/mối quan hệ), kiểm chống lặp | N1 |
| B0 | M | Chốt đo "giống người": bộ số đo (quỹ đạo, nhịp thao tác, chuỗi hành động), bộ dữ liệu so sánh từ người thử nội bộ có đồng ý; quyết định pháp lý về dữ liệu | multiplayer bậc 1 |
| B1 | XL | `bot-runner`: 100 người chơi ảo chạy qua cùng API, cây hành vi + tính cách + lịch sinh hoạt, đi lại và làm nhiệm vụ/minigame ở mọi map | B0, multiplayer bậc 1 |
| B2 | L | Tổ đội 2–4, nhiệm vụ chung, chat câu có sẵn và emote, báo cáo/chặn, công tắc tắt khẩn cấp, nhãn "bạn máy" | B1 |
| B3 | L | Tự training: tự chơi so điểm, tinh chỉnh tham số theo số đo; đạt ≥ 90% không tách được bot khỏi người ở bộ phân loại + đánh giá mù | B1 |

## Quyết định (Jev, 03/10/2026, `plans/dattqh/reports/jev-261003-2345-bots.md`)
- Bot luôn có nhãn "bạn máy", chơi giống người, phụ huynh tắt được.
- Học bằng tự chơi và số liệu tổng hợp ẩn danh; quỹ đạo thô của trẻ chỉ khi chính sách riêng tư có mục đích đó và phụ huynh đồng ý riêng.
- Luật sư cần xác nhận trước khi mở bot cho người dùng thật (NĐ 13/2023, Luật Trẻ em, NĐ 147/2024).

## Lưu ý quan trọng cho người sở hữu
- **Bot phải gắn nhãn "bạn máy":** không giả làm người thật với trẻ em (an toàn, tín nhiệm, pháp lý); vẫn chơi giống người để bé thấy sinh động.
- **Dữ liệu học:** không lấy quỹ đạo thô, chat của trẻ để huấn luyện nếu chưa có đồng ý của phụ huynh và pháp lý duyệt; ban đầu dùng tự chơi và số liệu tổng hợp.
- **Điều kiện:** bot cần multiplayer bậc 1 (thấy nhau) và hệ báo cáo/chặn chạy trước; hiện multiplayer chưa có, nên B1–B3 sau đó.
- Song ngữ (S1–S3) và NPC có chuyện (N1–N3) làm được ngay, không phụ thuộc multiplayer.
