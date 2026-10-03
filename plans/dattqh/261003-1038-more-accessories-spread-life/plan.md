# Thêm phụ kiện theo cấp, rải NPC sinh hoạt hợp lý trên map

Trạng thái: xong, đã lên production (03/10/2026, commit aaaa131) · Tier tổng: L · Nhánh: `main` · Ngày: 03/10/2026

Người sở hữu (03/10/2026): "bổ sung thêm nhiều phụ kiện vật phẩm hơn cho bé. yêu cầu phải đủ level theo bạn thấy hợp lý nhé. mỗi loại thêm khoảng 50 cái"; "mỗi map hiện tại rất lớn nhưng lượng npc sinh hoạt đang tập trung vào 1 chỗ nhiều quá… npc hiển thị ngẫu nhiên trên khu vực với bối cảnh hợp lý như ngoài đời thật". Deploy sau khi xong (người sở hữu đã cho deploy).

## Phụ kiện

Hiện có 157 món ở 7 khe (`hat`, `glasses`, `scarf`, `back`, `wings`, `shoes`, `hand`; `packages/voxel/src/accessory-schema.ts`), mở khóa theo `unlock.level` do server kiểm, mỗi khe ≥ 20 món mở từ cấp 1. Thêm khoảng 50 món mỗi khe, mức cấp (thang cấp 1–15, `content/progression/level-curve.json`):

| Cấp | Món mới mỗi khe |
| --- | --- |
| 1 (mở sẵn) | 10 |
| 2–5 | 4 mỗi cấp |
| 6–10 | 3 mỗi cấp |
| 11–15 | 2 mỗi cấp |

Món cấp cao đặc biệt hơn (vàng, đá quý, phát sáng, hình con vật lớn). Mỗi món mới: một mẫu gốc hoặc biến thể màu (`variantOf`); tối thiểu 12 mẫu gốc mới mỗi khe để không lặp nhàm.

## NPC sinh hoạt

Số đo trước (ô 100 × 100 khối có NPC / 64; ô đông nhất): Khu rừng 26 (29), Trường học 23 (31), Trung tâm 16 (28), Làng Ven Sông 17 (24), Xóm Mái Ấm 25 (31), Chợ phiên 9 (119), Nông trại 16 (47), Thư viện 12 (33), Lâu đài 22 (24), Núi tuyết 19 (18), Đảo bí ẩn 44 (19).

## Pha

| Pha | Tier | Nội dung | Ai |
| --- | --- | --- | --- |
| 1 | M × 4 | Phụ kiện theo khe: (mũ, kính), (khăn, giày), (đồ đeo lưng, cánh), (đồ cầm tay) | agent mỗi nhóm khe |
| 2 | L | Bộ rải NPC dùng chung cho mọi map + công cụ đo `life-audit`, sinh lại 11 map | agent |
| 3 | L | Quần áo bé tự chọn (khe `clothes`, một bộ phủ thân, tay, chân), ~50 bộ theo cấp | agent |
| 4 | L | Xe để lái (khe `vehicle`, nút Lái xe/Xuống xe, nhanh hơn, xe dưới chân bé), ~50 xe theo cấp | agent |
| 5 | S | Vẽ hình, manifest, kiểm tra, E2E, deploy | chính |

Người sở hữu thêm (03/10/2026): "thêm cả quần áo, phương tiện lái, đồ vật cầm tay. lưu ý thiết kế hướng của đồ vật khi gắn lên người phải chuẩn": mọi món mới được chụp khi bé đeo/mặc/lái (`assets:preview accessories`) và chỉnh hướng trước khi xong. Khe `clothes`, `vehicle` thêm vào `ACCESSORY_SLOTS`; số món mở sẵn tối thiểu theo từng khe (`MIN_OPEN_ITEMS`).

Người sở hữu thêm (03/10/2026 11:13): "bé chưa có hành động ngồi, khi lái xe yêu cầu phải thay đổi tư thế ngồi hoặc đứng tùy phương tiện". Mỗi xe khai tư thế: `drive` (ô tô, xe đua, xe buýt, máy cày: ngồi, tay cầm vô lăng), `sit` (mây, thảm bay), `stand` (ván trượt, xe trượt, ván bay); dùng hai đoạn `sit`, `drive` có sẵn trong model nhân vật (rig Kenney).
