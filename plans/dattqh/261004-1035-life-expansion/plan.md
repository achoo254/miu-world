# Mở rộng Đời sống: Đồ sưu tầm 12 Map, Sổ sưu tập, Chăm sóc Thú cưng & Bếp nấu ăn

Trạng thái: Đang thi công · Nhánh: `main` · Ngày: 04/10/2026
Tham chiếu: Master Plan v3 §5 (phần thưởng, kinh tế, tương tác) và plan `261003-1602-coins-items-skills-uses/plan.md` (Pha 2, 3, 4).

## Mục tiêu
Biến thế giới Miu World thành một không gian sống động, ấm áp, nơi bé không chỉ làm bài tập SGK và chơi minigame mà còn được tận hưởng những hoạt động đời sống bổ ích:
1. **Sưu tầm khám phá**: 120 món đồ sưu tầm đặc trưng khắp 12 vùng đất, lưu giữ trong Sổ sưu tập (Collection Book).
2. **Gắn bó bạn bè động vật**: Chăm sóc, cho ăn, tắm rửa, âu yếm và chơi đùa cùng thú cưng với các biểu cảm 3D sống động.
3. **Nấu ăn sáng tạo**: Chế biến nông sản thu hoạch thành các món ăn ngon tại Bếp Nhà của bé.

## Các Pha Triển Khai

| Pha | Nội dung chi tiết | Hiện trạng |
| --- | --- | --- |
| **L1** | **Đồ sưu tầm 12 Map & Sổ sưu tập (Collectibles & Collection Book)**:<br>- 120 món sưu tầm đặc trưng (10 món × 12 map) với hình Fluent Emoji 3D.<br>- Schema Zod & Danh mục `content/collectibles.json`.<br>- Tỉ lệ rơi ngẫu nhiên khi hoàn thành nhiệm vụ / minigame theo map.<br>- Giao diện Sổ sưu tập (Collection Book) 12 trang map, tiến độ x/10, rương thưởng hoàn thành bộ. | Xong 04/10/2026 (chờ người duyệt; report `plans/dattqh/reports/collection-261004.md`, ảnh `screenshots/`) |
| **L2** | **Chăm sóc Thú cưng tương tác (Interactive Pet Care)**:<br>- Bảng chăm sóc thú cưng trực tiếp hoặc qua tương tác trong game.<br>- 3 chỉ số thân thiện: Vui vẻ (Happiness), No bụng (Fullness), Sạch sẽ (Cleanliness).<br>- Hành động: Cho ăn (thức ăn từ ba lô/nông sản), Vuốt ve (thả tim), Tắm rửa (bọt xà phòng), Chơi đùa (thú cưng nhảy múa `dance`).<br>- Hoạt ảnh Three.js và âm thanh/hiệu ứng đồng bộ. | Xong 04/10/2026 (API `/api/character/pet/care`, modal UI PetCarePanel, Three.js reaction, unit test 7/7 server + 3/3 web) |
| **L3** | **Bếp gia đình & Nấu ăn (Home Cooking)**:<br>- Bếp tại Nhà của bé (`nha-cua-be`) mở giao diện Bếp nấu ăn.<br>- 10+ công thức nấu ăn ngon lành kết hợp nông sản (Lúa mì, Trứng, Sữa, Táo, Cà rốt, Mật ong...).<br>- Chế biến món ăn cho thú cưng hoặc trưng bày trên bàn ăn gia đình. | Xong 04/10/2026 (`content/recipes.json`, API `/api/cooking`, modal UI CookingPanel, tương tác bếp nấu, unit test 3/3 server + 2/2 web) |

## Nguyên tắc An toàn & Trải nghiệm
- Không áp lực: Các chỉ số thú cưng không bao giờ giảm về mức tiêu cực khiến trẻ lo lắng; chỉ số cao đem lại niềm vui và sự may mắn.
- Mọi dữ liệu vật phẩm, thưởng và tiến độ đều do server tính toán và bảo vệ toàn vẹn.
- Kiểm thử toàn diện: `content:check`, `pnpm typecheck`, `pnpm test`, `pnpm lint`.
