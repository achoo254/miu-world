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
1. **[XONG] Đặt nhân vật mời cho 180 game mới**:
   - Đã gán trọn vẹn 180 minigame mới vào 60 NPC giver mới (mỗi map đúng 5 giver mới, mỗi giver 3 game = 15 game/map khắp 12 map).
   - Đã cấu hình tint màu riêng cho từng giver để tự động sinh look độc nhất, tuân thủ nghiêm ngặt giới hạn LOOK_CAP (<= 6) và content-variety (0 câu trùng lặp >= 16 ký tự).
   - Đã biên dịch toàn bộ 305 nhiệm vụ phụ (+ 3 nhiệm vụ phụ viết tay = 308 nhiệm vụ phụ) qua `build-side-quests.ts`, cập nhật `targets.json`, `looks.json`, và làm trống `pending-side-quest-games.json`.
   - Đã tái tạo toàn bộ 12 bản đồ voxel (`world:forest`, `world:school`, `world:lang-ven-song`, `world:xom-mai-am`, `world:cho-phien`, `world:nong-trai`, `world:thu-vien`, `world:lau-dai`, `world:trung-tam`, `world:nui-tuyet`, `world:dao-bi-an`, `world:nha-cua-be`).
   - Đã vượt qua 100% các kiểm tra chất lượng: `content:check` (1704 files OK), `content:spread` (0/74 quests break spread rules), `build-side-quests.test.ts` (23/23 tests pass), `reach-audit` (12/12 map reachable), `room-audit` (12/12 map OK), `scenery-audit` (12/12 map OK), và `pnpm typecheck` (OK).
2. Song ngữ: S2 (dịch lời NPC, tên nhiệm vụ/vật phẩm/minigame), màn phụ huynh, lưu ngôn ngữ theo hồ sơ (cần migration).
3. **[XONG] Hệ thống Bạn máy (Companion Bots) & Multiplayer Bậc 1 (B0–B3)**:
   - Tuân thủ nghiêm ngặt Master Plan §8 & §8b và báo cáo Jev (`plans/dattqh/reports/jev-261003-2345-bots.md`):
     - Mọi bạn máy luôn có nhãn rõ ràng `🤖 [Bạn máy]` trên đầu (`isBot: true`), không giả vờ làm người thật.
     - Phụ huynh có quyền bật/tắt hiển thị Bạn máy trong Cài đặt (`CompanionBotSetting`, lưu `miu.bots.enabled`).
     - Tương tác hoàn toàn an toàn: chỉ dùng lời thoại định sẵn (`SAFE_CANNED_CHATS`) và biểu cảm chọn lọc (`SAFE_EMOTES`).
     - Hành vi tự nhiên như trẻ lớp 2: tuần tra theo lộ trình, dừng lại ngắm cảnh, vẫy tay chào khi bé đến gần.
   - Triển khai đầy đủ trên 3 tầng:
     - `@miu/schema/multiplayer`: Protocol WebSocket (`welcome`, `spawn`, `move`, `emote`, `chat`, `despawn`).
     - `apps/server/src/multiplayer`: `MultiplayerHub` quản lý room theo `mapId` và `BotRunner` điều phối bot cho 5 map chính (`trung-tam`, `truong-hoc`, `lang-ven-song`, `cho-phien`, `khu-rung-bi-mat`).
     - `apps/web/src/game/multiplayer`: `RemotePlayerManager` (tải model 3D, lerp vị trí mượt mà, bóng chat/emote), `MultiplayerClient` (kết nối WS qua Vite proxy `/api/ws`), và `MultiplayerNametag` (canvas sprite).
   - Kiểm thử & chất lượng: 100% typecheck, ESLint, unit tests server/schema/web pass (455 test files, 5931 tests).
4. **Việc nhỏ hoàn thiện**:
   - [XONG] Dọn CSS bản đồ cũ trong `game.css` (loại bỏ các class `.minimap-sheet`, `.minimap-legend`, v.v. đã được thay bằng `map-sheet.css`).
   - [XONG] Ảnh nhân vật mới trong hộp thoại: bổ sung 19 icon Fluent Emoji 3D (gấu, chó, mèo, thỏ, cáo, khỉ, chim, dơi, người tuyết, rô bốt, nông dân, hải cẩu, cánh cụt, cua, bò, lợn, gà, v.v.) và mở rộng logic `NpcPortrait` theo target prefix & regex tên.
   - [XONG] Danh hiệu ở màn Hồ sơ: hiển thị panel "Danh hiệu" (`profile-titles`) cùng các huy hiệu danh hiệu đạt được từ rương khu vực.
   - [XONG] Tiến độ "Quà trò chơi" ở thẻ kết thúc minigame: hiển thị thanh/mốc tiến độ bậc minigame khu vực (`reward.tier.minigames`) khi hoàn thành minigame.
   - Còn lại: bến xe cỡ thật và dời bến đò ra sông (dựng lại map), đo hiệu năng iPad (draw call 164 khi xe buýt qua phố trường).


