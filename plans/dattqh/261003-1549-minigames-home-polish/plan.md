# Minigame nhiệm vụ phụ, nhà của bé đẹp như mock, thêm NPC và nhiệm vụ

Trạng thái: đang làm · Tier tổng: XL · Nhánh: `main` · Ngày: 03/10/2026

Người sở hữu (03/10/2026): "phần chưa làm như mock yêu cầu làm luôn. phải đẹp như mock, cầu thang lên tầng2 quá xấu. lịch khóa biểu và lịch mặc đồng phục thêm sẵn lịch như trong ảnh … làm mặc định cho tất cả tài khoản. map khá rộng nhưng rất ít npc và nhiệm vụ. … bổ sung các nhiệm vụ phụ đúng chất minigame thay vì học bài cho bé đỡ chán. các dạng mini game bao gồm rất nhiều loại khác nhau phủ hết các map. các minigame yêu cầu phải được chơi được. ít nhất có 100 dạng khác nhau. ví dụ runner, hứng trứng, bóng đá, vv... tốt nhất hãy research lấy nội dung trên mạng trước".

## Đã xong trong phiên chính

- Thời khóa biểu mặc định cho mọi tài khoản: tệp riêng ngoài git (`TIMETABLE_DEFAULT_FILE`, nguồn iCloud, `deploy.sh timetable`), commit `dcf81f2`. Repo công khai nên nội dung thật (trường, cô giáo, số điện thoại) không vào git.

## Pha

| Pha | Tier | Nội dung | Ai | File sở hữu |
| --- | --- | --- | --- | --- |
| R | M | Research ≥ 120 dạng minigame cho trẻ 7–8 tuổi trên iPad cảm ứng (luật, điều khiển, thắng/thua, 30–90 s, nguồn), gom theo họ cơ chế, gợi ý map hợp bối cảnh | agent researcher | `plans/dattqh/reports/minigame-research-261003.md` |
| F | L | Khung minigame: màn chơi phủ lên cảnh 3D tạm dừng (canvas 2D, chạm/vuốt/giữ), vòng đời đếm ngược → chơi → kết quả, điểm/mục tiêu/sao, âm thanh, hình từ Fluent Emoji/Kenney/ảnh sẵn có; logic thuần tách khỏi vẽ để test bằng bot; cơ chế quest mới `minigame` (server nhận điểm, chấm theo mục tiêu, thưởng như quest, chơi lại không thêm XP); 3 game mẫu (runner, hứng trứng, sút bóng); trang dev `?minigame=<id>` | agent F | `apps/web/src/ui/minigame/**`, `packages/schema` (cơ chế quest), `packages/quest`, chấm điểm ở server |
| G1–G5 | L × 5 | Mỗi agent ~20 game khác cơ chế theo danh sách research, mỗi game có bot test thắng được và thua được | 5 agent | `apps/web/src/ui/minigame/games/<id>/**` của lô mình |
| H | XL | Nhà của bé đẹp như mock: cầu thang gỗ đẹp có tay vịn, chiếu nghỉ; nội thất dày như mock (đèn lồng vàng ấm, rèm, tranh, cây, thảm, kệ, bếp đầy đủ); ngoài trời nhiều hoa, đèn, dây leo, bồn hoa, hộp thư mèo, cờ. Tùy biến nội thất (ô 11: giường, bàn, ghế, tủ, trang trí, thảm, cửa sổ, đèn) và ngoại thất (ô 12: kiểu nhà, hàng rào, cổng, đèn, sân vườn, lối đi, biển tên, trang trí) lưu theo hồ sơ trên server; bản đồ nhỏ (ô 14) có vị trí nhà và các khu | agent H | `tools/world/**nha-cua-be**`, bảng tùy biến + migration, màn tùy biến, HUD bản đồ nhỏ |
| P | XL | Đặt NPC giao nhiệm vụ phụ minigame khắp 12 map theo bối cảnh (≥ 100 nhiệm vụ phụ, mỗi game ít nhất một nơi), thêm NPC sinh hoạt cho map rộng, sinh lại map, audit | agent P (sau H và G) | `content/quests/side-*.json`, `content/world/targets.json`, generator các map |
| D | M | Gom: gate đủ, E2E (chạy mẫu minigame), trang review, docs, deploy khi người sở hữu cho | phiên chính | |

## Tiêu chí xong

- ≥ 100 dạng minigame khác cơ chế, mỗi dạng chơi được bằng chạm trên iPad và điện thoại; bot test thắng và thua cho từng game; E2E chơi mẫu vài game qua UI.
- Mỗi map có nhiều NPC giao nhiệm vụ phụ minigame hợp bối cảnh; nhiệm vụ phụ không khóa bài học.
- Nhà của bé so với mock: cầu thang, nội thất, ngoài trời; tùy biến nội/ngoại thất lưu theo hồ sơ; bản đồ nhỏ.
- Gate đủ 5 lệnh, build, `security:dist`, `e2e:ci` ≤ 480 s.
