# Xu, đồ thưởng và điểm kỹ năng có chỗ dùng

Trạng thái: pha 1–4 xong (cửa hàng, đồ sưu tầm, thú cưng, bếp); pha 5 mới có phần lõi (Kỹ năng lên cấp, Skill Check ở server), còn màn cây kỹ năng và Cổng tri thức; pha 6 (Hành trình, Thành tích) chưa làm (rà lại 05/10/2026) · Tier tổng: XL · Nhánh: `main` · Ngày: 03/10/2026

Người sở hữu (03/10/2026): "hiện tại xp dùng lên cấp để chọn thêm đồ mặc còn xu với đồ thưởng chưa có dụng j, lên plan để có thể sử dụng"; "điểm kỹ năng nữa".

## Hiện trạng

- 75 quest đều thưởng XP, Xu và điểm kỹ năng (Skill XP); chơi hết một lượt được khoảng 1.177 Xu. Từ đợt minigame, mọi lần chơi lại đều được thưởng lại (không giới hạn), nên Xu sẽ tăng nhanh.
- Đồ thưởng: chỉ có 1 món (`la-than`, đồ cốt truyện). Server đã có `inventory_items`, `reward_ledger`, `skill_progress` (21 kỹ năng, ngưỡng cấp ở `content/progression/skill-curve.json`).
- XP → cấp → mở đồ mặc (đã chạy). Xu, đồ thưởng, điểm kỹ năng chưa dùng vào đâu.
- Mock sẵn có: `designs/Journey-Achievements-Shop.png` (Hành trình, Thành tích, Cửa hàng: danh mục Nổi bật / Trang phục / Phụ kiện / Nhà cửa / Tiêu hao / Gói đặc biệt, chi tiết món có giá Xu), `designs/trung-tam/d-02-cua-hang.png` (cửa hàng ở Trung tâm), `d-03-giao-dich.png` (khu giao dịch), `d-05-khu-cho-to-doi.png`.

## Thiết kế

### Xu: tiêu ở Cửa hàng và trong nhà
1. **Cửa hàng ở Trung tâm** theo mock (quầy có NPC bán hàng, mở màn Cửa hàng; mở thêm từ nút trên HUD/Home). Danh mục:
   - Trang phục và phụ kiện **chỉ có ở cửa hàng** (bộ mới, màu hiếm), vẫn tôn trọng khóa cấp nếu món có cấp.
   - **Nhà cửa**: nội thất và ngoại thất cho tùy biến nhà (ô 11–12 của mock nhà): kiểu cơ bản miễn phí, kiểu đẹp mua bằng Xu.
   - **Tiêu hao**: đồ dùng một lần trong minigame (thêm mạng, chậm thời gian, nam châm hút sao) và đồ ăn/đồ chơi cho thú cưng.
   - **Gói đặc biệt** theo mùa/sự kiện.
   - Giá 50–500 Xu, thang giá theo độ hiếm; mua lại món tiêu hao được, món mặc mua một lần.
2. **Thú cưng**: cho ăn, cho chơi bằng đồ mua → thú vui hơn (thanh vui vẻ), làm trò mới (nhảy, xoay, ngồi), không bao giờ "chết" hay buồn phạt.
3. Server là nguồn sự thật: `POST /api/shop/buy` kiểm số dư trong `reward_ledger`, trừ Xu, thêm vào `inventory_items` trong một transaction, có mã lượt mua để gửi trùng không trừ hai lần; test IDOR, gian lận (giá client gửi bị bỏ qua), đồng thời.

### Đồ thưởng: sưu tầm, nấu, đổi, trưng bày
1. **Bộ sưu tập theo map**: mỗi quest và minigame rơi 1–3 món sưu tầm hợp bối cảnh (lá, hoa, vỏ sò, đá quý, cá, tem sách, huy hiệu lâu đài, bông tuyết, nông sản…), khoảng 10–15 món mỗi map (~150 món, hình từ Fluent Emoji). Sổ sưu tập chia bộ; đủ một bộ được phần thưởng riêng (trang phục/nội thất độc quyền, danh hiệu).
2. **Nấu và làm đồ ở nhà**: nông sản, trứng, sữa từ vườn/chuồng nhà của bé và minigame nông trại → bếp nhà bé nấu thành bánh, nước ép (cho thú cưng ăn, bày lên bàn) hoặc xưởng nhỏ ghép thành đồ trang trí.
3. **Khu giao dịch ở Trung tâm** (mock d-03): đổi món thừa với NPC theo bảng đổi (5 món thường → 1 món hiếm, hoặc bán lấy Xu). Chưa đổi giữa người chơi (chơi online chưa có; khi có cần kiểm duyệt và phụ huynh bật).
4. **Trưng bày trong nhà**: kệ/tủ kính bày món sưu tầm và cúp thành tích.

### Điểm kỹ năng: cây kỹ năng, cổng tri thức, thành tích
1. **Cây kỹ năng** (màn Hồ sơ): 21 kỹ năng gom theo môn (Tiếng Việt, Toán, Logic), mỗi cấp kỹ năng thắp một lá/huy hiệu; lên cấp kỹ năng nhận quà (Xu, đồ mặc theo chủ đề: "Kính đọc sách" cho Đọc hiểu Lv.3, "Mũ nhà toán học" cho Phép cộng Lv.5).
2. **Cổng tri thức** (Master Plan M3.9): rương báu, phòng bí mật, đường tắt trên map mở khi đủ cấp kỹ năng (ví dụ phòng bí mật Thư viện cần Đọc hiểu Lv.3); thiếu thì dẫn tới quest luyện đúng kỹ năng đó.
3. **Thử thách trùm vui** (Master Plan M3.10, làm sau): trận đố vui cuối map dùng kỹ năng của map.
4. **Phụ huynh**: khu phụ huynh thấy kỹ năng nào mạnh/yếu, gợi ý bài nên chơi.

### Hành trình và Thành tích (mock)
- **Hành trình**: tiến độ từng khu, dòng thời gian (nhiệm vụ, nhận đồ, lên cấp, minigame).
- **Thành tích**: ~60 thành tích (khám phá, học tập, minigame, sưu tầm, sự kiện), mỗi cái thưởng XP/Xu/món độc quyền, nhận ở màn "Chúc mừng".

## Pha

| Pha | Tier | Nội dung |
| --- | --- | --- |
| 1 | L | Ví Xu + Cửa hàng (server mua bán, màn Cửa hàng theo mock, quầy ở Trung tâm), hàng bán: đồ mặc riêng, tiêu hao minigame, nội thất nhà |
| 2 | L | Đồ sưu tầm theo map (~150 món), rơi từ quest/minigame, Sổ sưu tập, thưởng đủ bộ, kệ trưng bày trong nhà |
| 3 | M | Thú cưng: cho ăn, chơi, thanh vui vẻ, trò mới |
| 4 | M | Bếp và xưởng ở nhà bé, khu giao dịch NPC ở Trung tâm |
| 5 | L | Cây kỹ năng + quà mỗi cấp kỹ năng, Cổng tri thức trên các map |
| 6 | M | Hành trình + Thành tích theo mock |

Phụ thuộc: chạy sau khung minigame (dùng chung luồng thưởng ở server) và tùy biến nhà (Nhà cửa trong cửa hàng). Mỗi pha có migration riêng, nối tiếp nhau.

## Câu hỏi cho người sở hữu
- Đã duyệt thiết kế và thứ tự pha; pha 1 (Cửa hàng) bắt đầu khi khung minigame xong.
