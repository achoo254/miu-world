# Lô G1: 25 minigame

Ngày 03/10/2026 · Plan `261003-1549-minigames-home-polish` · Danh mục và luật chơi ở [`minigame-research-261003.md`](minigame-research-261003.md) §1, §3 (hàng G1).

## Kết quả

- Đủ 25 trò của hàng G1. Mỗi trò có một thư mục `apps/web/src/ui/minigame/games/<id>/` (`logic.ts` thuần, `draw.ts`, `index.ts`, `<id>.test.ts`) và một file `content/minigames/<id>.json`. Không trò nào lấy trò khác đổi hình, và không phải dùng trò dự phòng.
- Mỗi trò có một cử chỉ chính, nhiều nhất hai. Dòng cách chơi viết tiếng Việt, gọi bé là `{name}`. Hình là Fluent Emoji qua `sprites.ts` cộng hình khối; màu lấy từ `view.theme`; cảnh đổi theo map (thẻ của memory-pairs lấy hình của từng map, tuyết hay cát ở scratch-reveal). Âm thanh đi qua sự kiện của khung; nốt nhạc dùng `note`/`voice` (trống ở múa lân, chuông ở nối sao, chuyển bánh, thả bi, thả diều), không game nào tự viết bộ tổng hợp âm.
- Bot test (`describeMinigame`): bot thắng trên iPad ngang, iPad dọc, điện thoại với 5 seed; không chạm thì thua; cùng seed cho cùng kết quả; `draw` chạy được ở mọi trạng thái. Mỗi trò có thêm 2–4 test luật (tính điểm, điều kiện thua, các ràng buộc riêng). Bảy trò có thêm test chứng minh một cách chơi lười thì thua (thả bi ở mép, lăn bowling thẳng giữa, bắn cung bỏ qua gió, giữ tia nước một chỗ, đi suốt khi bạn nhìn, chạm liên tục khi chờ đèn, vuốt một hướng ở múa lân, xếp bánh giật cục).
- Bot ra quyết định với nhịp của một bé nhanh tay: có nghỉ giữa các lượt lật thẻ, ném hay bắn, không bấm liên hồi.

## Bảng trò chơi

Điểm bot và điểm khi không chạm lấy từ 8 seed, theo thứ tự iPad ngang / iPad dọc / điện thoại. Ảnh nằm trong `minigames-g1-261003/`, chụp từ trang dev `/minigame.html?game=<id>&bot=1&at=<giây>` (nhân vật cáo, bot chơi), mỗi trò hai ảnh: iPad ngang 1180 × 820 và điện thoại dọc 390 × 844.

| id | Tên | Điều khiển | Thời gian / mục tiêu | Bot | Không chạm | Ảnh |
|---|---|---|---|---|---|---|
| `stack-catch` | Hứng bánh xếp chồng | kéo | 60 s / 12 tầng | 23–28 / 29–33 / 29–33 | 0–3 | [ngang](minigames-g1-261003/stack-catch-landscape.png) · [điện thoại](minigames-g1-261003/stack-catch-phone.png) |
| `slingshot-tower` | Ná bắn tháp hộp | kéo, thả | 75 s / 3 tháp (6 viên) | 6 / 6 / 6 | 0 | [ngang](minigames-g1-261003/slingshot-tower-landscape.png) · [điện thoại](minigames-g1-261003/slingshot-tower-phone.png) |
| `ring-toss-duck` | Ném vòng cổ vịt | chạm 2 lần | 60 s / 5 vòng (10 vòng) | 7–10 / 6–10 / 6–10 | 0 | [ngang](minigames-g1-261003/ring-toss-duck-landscape.png) · [điện thoại](minigames-g1-261003/ring-toss-duck-phone.png) |
| `water-pistol` | Súng nước hội chợ | giữ, kéo | 60 s / 25 bia | 79–98 / 76–92 / 77–87 | 0 | [ngang](minigames-g1-261003/water-pistol-landscape.png) · [điện thoại](minigames-g1-261003/water-pistol-phone.png) |
| `red-light` | Một hai ba, đứng im! | giữ | 45 s / 25 bước (một lượt tới vạch) | 50–53 / 50–53 / 50–53 | 0 | [ngang](minigames-g1-261003/red-light-landscape.png) · [điện thoại](minigames-g1-261003/red-light-phone.png) |
| `quick-draw` | Ai nhanh tay hơn | chạm | 50 s / thắng 4 trên 8 hiệp | 8 / 8 / 8 | 0 | [ngang](minigames-g1-261003/quick-draw-landscape.png) · [điện thoại](minigames-g1-261003/quick-draw-phone.png) |
| `lion-dance-arrows` | Múa lân theo trống | vuốt 4 hướng | 58 s / 36 điểm | 80 / 80 / 80 | 0 | [ngang](minigames-g1-261003/lion-dance-arrows-landscape.png) · [điện thoại](minigames-g1-261003/lion-dance-arrows-phone.png) |
| `memory-pairs` | Lật hình tìm cặp | chạm | 90 s / 6 cặp | 39–43 / 39–43 / 39–43 | 0 | [ngang](minigames-g1-261003/memory-pairs-landscape.png) · [điện thoại](minigames-g1-261003/memory-pairs-phone.png) |
| `tangram` | Ghép hình bảy mảnh | kéo, chạm xoay | 90 s / 2 hình | 5–6 / 6 / 6 | 0 | [ngang](minigames-g1-261003/tangram-landscape.png) · [điện thoại](minigames-g1-261003/tangram-phone.png) |
| `hanoi-tower` | Chuyển bánh tầng | chạm | 90 s / 2 chồng | 6 / 6 / 6 | 0 | [ngang](minigames-g1-261003/hanoi-tower-landscape.png) · [điện thoại](minigames-g1-261003/hanoi-tower-phone.png) |
| `ice-slide` | Trượt băng mê cung | vuốt (chạm nút làm lại) | 90 s / 3 bàn | 30–34 / 30–34 / 31–32 | 0 | [ngang](minigames-g1-261003/ice-slide-landscape.png) · [điện thoại](minigames-g1-261003/ice-slide-phone.png) |
| `maze-trace` | Mê cung về nhà | kéo | 60 s / 5 điểm (3 sao + về nhà) | 17–23 / 18–25 / 11–21 | 0 | [ngang](minigames-g1-261003/maze-trace-landscape.png) · [điện thoại](minigames-g1-261003/maze-trace-phone.png) |
| `star-connect` | Nối chòm sao | chạm hoặc kéo | 60 s / 3 hình | 11 / 11 / 11 | 0 | [ngang](minigames-g1-261003/star-connect-landscape.png) · [điện thoại](minigames-g1-261003/star-connect-phone.png) |
| `scratch-reveal` | Cào tuyết đoán hình | xoa, chạm | 90 s / 10 điểm (khoảng 6 thẻ) | 54 / 54 / 54 | 0 | [ngang](minigames-g1-261003/scratch-reveal-landscape.png) · [điện thoại](minigames-g1-261003/scratch-reveal-phone.png) |
| `plinko` | Thả bi qua đinh | chạm | 60 s / 90 điểm (8 bi) | 108–194 / 119–194 / 120–186 | 0 | [ngang](minigames-g1-261003/plinko-landscape.png) · [điện thoại](minigames-g1-261003/plinko-phone.png) |
| `kart-race` | Đua xe mini | giữ, kéo | 45 s / 4 điểm (về trong top 3) | 20 / 20 / 20 | 0 | [ngang](minigames-g1-261003/kart-race-landscape.png) · [điện thoại](minigames-g1-261003/kart-race-phone.png) |
| `bowling` | Ném bowling | kéo, vuốt | 75 s / 40 điểm (5 lượt) | 75 / 75 / 75 | 0 | [ngang](minigames-g1-261003/bowling-landscape.png) · [điện thoại](minigames-g1-261003/bowling-phone.png) |
| `archery-wind` | Bắn cung có gió | kéo, thả | 60 s / 40 điểm (8 mũi tên) | 80 / 80 / 80 | 0 | [ngang](minigames-g1-261003/archery-wind-landscape.png) · [điện thoại](minigames-g1-261003/archery-wind-phone.png) |
| `curling` | Bi đá trên băng | vuốt, xoa | 60 s / 6 điểm (5 viên) | 10 / 10 / 10 | 0 | [ngang](minigames-g1-261003/curling-landscape.png) · [điện thoại](minigames-g1-261003/curling-phone.png) |
| `leaf-blow` | Thổi lá vào đống | giữ, kéo | 60 s / 20 lá | 52–53 / 52 / 37–44 | 0 | [ngang](minigames-g1-261003/leaf-blow-landscape.png) · [điện thoại](minigames-g1-261003/leaf-blow-phone.png) |
| `treasure-dig` | Đào kho báu nóng lạnh | chạm | 90 s / 3 kho báu | 30–32 / 29–31 / 28–31 | 0 | [ngang](minigames-g1-261003/treasure-dig-landscape.png) · [điện thoại](minigames-g1-261003/treasure-dig-phone.png) |
| `snake-dragon` | Rồng rắn lên mây | vuốt | 90 s / đoàn dài 15 | 30–46 / 35–48 / 32–54 | 0–1 | [ngang](minigames-g1-261003/snake-dragon-landscape.png) · [điện thoại](minigames-g1-261003/snake-dragon-phone.png) |
| `kite-fly` | Thả diều | kéo | 60 s / cao 100 m | 160–249 / 160–273 / 160–273 | 12–15 | [ngang](minigames-g1-261003/kite-fly-landscape.png) · [điện thoại](minigames-g1-261003/kite-fly-phone.png) |
| `monkey-bridge` | Đi cầu khỉ | kéo | 60 s / 3 cầu | 7 / 7 / 7 | 0–1 | [ngang](minigames-g1-261003/monkey-bridge-landscape.png) · [điện thoại](minigames-g1-261003/monkey-bridge-phone.png) |
| `duck-catch` | Bắt vịt dưới ao | kéo, chạm để chộp | 60 s / 10 vịt | 26–33 / 27–32 / 16–20 | 0 | [ngang](minigames-g1-261003/duck-catch-landscape.png) · [điện thoại](minigames-g1-261003/duck-catch-phone.png) |

## Lệch so với danh mục

- Mục tiêu đổi sau khi đo bằng bot và người chơi mô phỏng:
  - `water-pistol`: 25 thay vì 20, vì giữ tia nước yên một chỗ đã được 17–21 điểm.
  - `duck-catch`: 10 vịt thay vì 5, vì một bé đuổi con gần nhất rồi chộp vẫn bắt được 15–25 con.
  - `bowling`: 40 điểm, vì lăn thẳng giữa mọi lượt được đúng 35.
  - `plinko`: 90 điểm. Ô điểm là 2/5/15/5/2, ô quà +25, sao +5. Với giá trị gợi ý (5/10/20/10/5, quà +30) thì thả bừa cũng thắng.
  - `scratch-reveal`: 10 điểm; đoán khi mới cào dưới 35% được 2 điểm, nên 10 điểm là khoảng 6 thẻ.
  - `lion-dance-arrows`: trúng chuẩn 2 điểm, hơi lệch 1 điểm, mục tiêu 36. Nếu mỗi mũi tên 1 điểm thì 3 sao cần 51 trên tối đa 40, không thể đạt.
  - `kart-race`: điểm theo hạng 8/6/4/1, sao trên đường chỉ tính khi về trong top 3, chưa về đích được 0.
  - `curling`: 5 viên thay vì 4.
- Mục tiêu khác cách ghi của danh mục để có chỗ cho 2 và 3 sao:
  - `red-light` tính số bước (25 bước là tới vạch, rồi chơi lượt 2 với bạn quay nhanh hơn).
  - `quick-draw` có 8 hiệp thay vì 7, vì 3 sao cần thắng 1,8 lần mục tiêu.
  - Mọi trò đố (tangram, hanoi, ice-slide, maze, star-connect, treasure-dig, memory-pairs) có màn mới sau khi xong một màn.
- Điều khiển:
  - `bowling` không có bóng xoáy, vì cú vuốt chỉ cho hướng thẳng, không đọc được đường cong.
  - `archery-wind`: ngón tay kéo vòng ngắm đi cùng chiều (dễ hiểu hơn kéo ngược với bé 7 tuổi).
  - `slingshot-tower`: hộp đổ theo đường lăn kịch bản (cách 1 của research), không có vật rắn xoay thật.
  - `tangram`: gợi ý một ô sáng lên sau 20 giây không tiến bộ, thay vì 60 giây.
  - `ring-toss-duck`: có dấu trên mặt nước chỉ chỗ vòng sẽ rơi, để hỗ trợ ngắm.
- Họ cơ chế: `lion-dance-arrows` đặt `arrow-dance`, vì `rhythm` đã có ở `drum-beat` (G2), mà hai trò chơi bằng cử chỉ khác nhau.

## Hình mới

Thêm 5 Fluent Emoji (MIT) cho những trò cần hình làm nhân vật chính, qua lock của phiên, bằng một script chạy một bước (`sources.json` + `FETCHED` trong `sprites.ts`, rồi `assets:fetch` và `assets:manifest`):

- `dragon-face` 🐲 (con lân);
- `red-paper-lantern` 🏮 (đèn của quick-draw, múa lân);
- `water-pistol` 🔫;
- `curling-stone` 🥌;
- `bow-and-arrow` 🏹.

Tổng khoảng 170 KB. Các vật khác (bánh xếp, ki bowling, xe kart, cầu tre, quạt, vòng, cờ đích) vẽ bằng hình khối. Không có dependency mới.

## Kiểm tra

- `pnpm vitest run` trên 25 thư mục G1: 25 file, 305 test xanh.
- `pnpm exec eslint --max-warnings=0` trên 25 thư mục: sạch.
- `pnpm --filter @miu/web typecheck`: exit 0. Root `pnpm typecheck`: không có lỗi TS.
- `pnpm content:check`: OK, 1092 file.
- `apps/web/src/ui/minigame/framework.test.ts` có 2 test đỏ, không phải do G1:
  - registry thấy thư mục `dodge-fall` (G4) chưa có đủ file;
  - `toothbrush.png` và `leafy-green.png` (hình của lô khác) chưa có trong manifest.
- Không chạy E2E, `pnpm test` đầy đủ, `assets:check` hay build, theo yêu cầu (phiên chính chạy).
- Ảnh: đã xem cả 50 ảnh. Các lỗi đã sửa rồi chụp lại:
  - thẻ memory-pairs xếp 6 × 2 trên iPad ngang (nay 4 × 3) và bot lật thẻ quá nhanh;
  - cầu khỉ chìm vào màu đồi;
  - múa lân và đèn lồng che làn mũi tên;
  - bánh của stack-catch rơi dưới HUD;
  - lá dồn ở mép khung;
  - hình nối sao có sao quá gần nhau.

## Còn lưu ý

- Mục tiêu mới được cân bằng bot và người chơi mô phỏng, chưa thử với trẻ thật. Kite-fly và leaf-blow là ước lượng; duck-catch, monkey-bridge, stack-catch, plinko đã đo với người chơi kém mô phỏng.
- `plinko`: luôn thả ở giữa được khoảng 100 điểm, nên bé chỉ cần học ra "giữa là tốt nhất" là thắng; thả bừa nằm sát mục tiêu.
- Bot của slingshot, bowling, archery, curling và kart-race chơi gần như hoàn hảo, nên bản demo `&bot=1` trông dễ hơn thực tế.
- Trên điện thoại:
  - water-pistol mỗi kệ chỉ thấy khoảng hai vịt;
  - quick-draw và múa lân còn một dải đất trống ở dưới;
  - slingshot-tower dồn cảnh xuống 1/4 dưới màn hình (trời phía trên dành cho đường bay của đá).
- Lân dùng hình Dragon face, như research §4 đã nêu: chưa giống lân Việt hẳn, người duyệt nên xem.

Status: DONE_WITH_CONCERNS
