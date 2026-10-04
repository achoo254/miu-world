# Việc còn lại sau phiên 03/10/2026 (để phiên sau làm tiếp, đỡ tốn quota)

Cập nhật: 03/10/2026 21:00. Quy tắc: trả lời bằng tiếng Việt; deploy production cần người sở hữu đồng ý mỗi lần; repo công khai (không đưa thời khóa biểu thật, token, IP vào git).

## Đã xong và đã commit (chưa deploy từ `7905342`, trừ mục đã ghi)
Thời khóa biểu mặc định (tệp riêng iCloud, `deploy.sh timetable` rồi `release`), xe cỡ thật, nhà của bé như mock + tùy biến + bản đồ nhỏ, mặt đất phẳng 11 map + sửa hướng ghế, 141 đồ vật 3D, cổng dịch chuyển không lòi cửa gỗ, màn nhiệm vụ trên điện thoại (hỗ trợ đóng được), thẻ nhiệm vụ thu gọn, khung minigame + 3 game mẫu + thưởng mỗi lượt chơi lại, nốt nhạc, cửa hàng (xu mua đồ mặc, kiểu nhà, đồ hỗ trợ minigame; quầy ở Trung tâm).

## Đang dở (chưa commit trong working tree)
1. **Minigame 125 game, 5 lô G1–G5** (`plans/dattqh/reports/minigame-research-261003.md` §3). G1 (25) và G2 (25) xong, chưa commit. G3, G4, G5: agent đang làm, có thể dở; file ở `apps/web/src/ui/minigame/games/<id>/` và `content/minigames/<id>.json`. Việc: chạy tiếp lô còn thiếu (đọc báo cáo `minigames-g?-261003.md`), sửa lỗi typecheck còn lại, `pnpm content:check`, commit từng lô (lấy cả `sprites.ts`, `tools/assets/sources.json`, hình mới trong `assets/packs/fluent-emoji/**/minigame/` + manifest từng phần).
2. **Đặt NPC giao nhiệm vụ phụ minigame khắp 12 map** (≥ 100 nhiệm vụ phụ `content/quests/side-*.json`, mỗi game ít nhất một nơi, đa dạng NPC, thêm NPC sinh hoạt vì map rộng ít NPC) + sinh lại map + 3 audit. Chưa bắt đầu; làm sau khi game xong. Luật: nhiệm vụ phụ `category: side`, không chiếm thanh bài học (xem `docs/minigames.md`).

## Việc nối tiếp theo plan `261003-1602-coins-items-skills-uses/plan.md`
Pha 2 đồ sưu tầm theo map (~150 món), pha 3 chăm thú cưng, pha 4 bếp nhà + khu giao dịch, pha 5 cây kỹ năng + cổng tri thức, pha 6 Hành trình/Thành tích. Pha 1 (cửa hàng) xong.

## Trước khi deploy
- Chạy đủ: `pnpm assets:check`, `content:check`, `test`, `typecheck`, `lint`, `pnpm --filter @miu/web build`, `security:dist`, `pnpm --filter @miu/web e2e:ci` (1 worker, ≤ 480 s). Sửa các test đỏ đã biết: `home-screens.test.tsx` mong "Thời khóa biểu" nhưng `regions.json` ghi "Lịch học"; E2E Home (thẻ vùng không đè nhau) cần chạy lại.
- Đo hiệu năng iPad (đồ 3D tăng ~24% tam giác).
- Bản đồ nhỏ: kiểm không đè nút HUD (`hud-layout.spec.ts`); thẻ nhiệm vụ thu gọn thêm vào spec nếu cần.
- Deploy: đã có migration 0006 (home_decor), 0007 (shop); `tools/deploy/production/deploy.sh timetable` rồi `release`; lời đồng ý v2 làm phụ huynh phải đồng ý lại.
- Cập nhật `docs/project-roadmap.md`, `docs/README.md` (liên kết `docs/minigames.md`), `CLAUDE.md` nếu thêm lệnh.

## Việc người sở hữu cần xem
Mục tiêu minigame chưa thử với trẻ thật; hình con lân dùng emoji rồng; cổng/NPC nội dung nhà là bản nháp; xe không tự lái khi bấm tự đi: chưa tái hiện được (cần biết map và hiện tượng).


## Cập nhật 04/10/2026 (sau deploy `2e27f26c`)
Đã lên production: 308 minigame (128 có nhân vật mời; 180 game mới nằm trong `tools/content/pending-side-quest-games.json`, chưa có nhân vật nên bé chưa chơi tới), song ngữ Việt/Anh + đọc to (S1, S3), rương thưởng khu vực 4 bậc, hoạt cảnh đi phương tiện, bản đồ tự do chạm để đi, thẻ nhiệm vụ thu gọn.

Việc làm tiếp (quota tuần hết đến 07/10):
1. **Đặt nhân vật mời cho 180 game mới** (agent như lần trước: bảng `tools/content/side-quests/<vùng>.json` + `build-side-quests.ts`, rồi xóa id khỏi pending-games, dựng lại 12 map, ba audit). Đây là việc lớn nhất để bé thấy 300 game.
2. Song ngữ: S2 (dịch lời NPC, tên nhiệm vụ/vật phẩm/minigame), màn phụ huynh, lưu ngôn ngữ theo hồ sơ (cần migration).
3. NPC có chuyện riêng (N1–N3), bot (B0–B3, cần multiplayer bậc 1), pha 2–6 của kế hoạch xu/đồ sưu tầm/kỹ năng.
4. Nhỏ: ảnh nhân vật mới trong hộp thoại, danh hiệu ở màn Hồ sơ, tiến độ "Quà trò chơi" ở thẻ kết thúc minigame, bến xe cỡ thật và dời bến đò ra sông (dựng lại map), đo hiệu năng iPad (draw call 164 khi xe buýt qua phố trường), dọn CSS bản đồ cũ trong `game.css`.
