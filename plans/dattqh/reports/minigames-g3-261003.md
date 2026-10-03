# Lô G3: 25 minigame

Ngày 03/10/2026 · Lô G3 của plan `261003-1549-minigames-home-polish` · Tier L

## Kết quả

- Đủ 25 game của hàng G3 (research §3). Mỗi game gồm `apps/web/src/ui/minigame/games/<id>/{logic,draw,index}.ts`, `<id>.test.ts` và `content/minigames/<id>.json`. Không sửa file khung nào.
- Mỗi game có một cử chỉ chính, nhiều nhất là hai. Trò nào dùng kéo thì cũng nhận chạm thay. `howTo` trò nào cũng có `{name}`.
- Bot test `describeMinigame` chạy trên 3 màn hình × 5 seed và đều đạt: bot thắng, không chạm thì thua, cùng seed cho cùng kết quả, lượt dừng đúng giờ, `draw` không lỗi. Mỗi game có thêm 1–3 test luật riêng. Một số game có thêm test "người chơi ẩu thì thua": `balloon-rule-pop`, `tennis-rally`, `chicken-feed`, `hide-and-seek`, `blind-goat`, `lantern-parade`.
- Âm thanh: `simon-says` phát nốt bằng `note`/`voice: 'bell'` của khung (commit 9c41a3e). Tiếng dê kêu trong `blind-goat` dùng `voice: 'whistle'`. Các game còn lại dùng sự kiện `score`/`hit`/`miss`/`action` như mọi game khác.
- Hình mới: 11 Fluent Emoji (`baguette-bread`, `cucumber`, `hot-pepper`, `cut-of-meat`, `goat`, `red-paper-lantern`, `moon-cake`, `full-moon`, `farmer`, `sheaf-of-rice`, `desert-island`). Tôi thêm chúng vào `tools/assets/sources.json` và `FETCHED` trong `sprites.ts`, chạy `assets:fetch` và `assets:manifest` trong lock. Script bỏ qua những hình mà agent khác đã thêm trước.

## Bảng game

Điểm bot và điểm idle tính trên 3 màn hình × seed 1–5. Ảnh nằm trong `plans/dattqh/reports/minigames-g3-261003/<id>-{ipad-landscape,phone}.png`, chụp từ `/minigame.html?game=<id>&bot=1&seed=3&at=<s>&species=fox`. Tôi đã xem từng ảnh.

| id | Tên | Điều khiển | Mục tiêu (thời gian) | Bot | Idle |
|---|---|---|---|---|---|
| `wave-surf` | Lướt sóng | giữ / thả | 5 đảo (60 s) | 7–8 | 3 |
| `fruit-slice` | Chém trái cây | vuốt (lưỡi dao theo ngón tay) | 40 quả (60 s) | 83–100 | 0 |
| `inflate-balloon` | Thổi bóng bay | giữ rồi thả | 8 bóng (60 s) | 27–29 | 0 |
| `balloon-rule-pop` | Bóng theo lệnh | chạm | 30 bóng (60 s) | 49–80 | 0 |
| `simon-says` | Con vật hát theo thứ tự | chạm | chuỗi dài 6 (75 s) | 13 | 0 |
| `pair-link` | Nối hình giống nhau | chạm | 12 cặp (90 s) | 33 | 0 |
| `sliding-tiles` | Trượt ghép tranh | chạm | 1 tranh (90 s) | 12–13 | 0 |
| `match-3` | Đổi chỗ ba quả | vuốt, chạm | 40 quả nổ (60 s) | 162–234 | 0 |
| `co-caro` | Cờ caro bốn ô | chạm | thắng 1 ván (90 s) | 10–12 | 0 |
| `dot-copy` | Vẽ theo mẫu lưới chấm | kéo, chạm | 4 hình (90 s) | 16 | 0 |
| `pick-sticks` | Rút que | chạm | 15 que (60 s) | 70 | 0 |
| `stack-slide` | Xếp tầng trượt | chạm | 20 tầng (60 s) | 52–93 | 0 |
| `crane-drop` | Cần cẩu xây nhà | chạm | 12 tầng (90 s) | 43–80 | 0 |
| `train-switch` | Bẻ ghi tàu | chạm | 15 tàu (90 s) | 24 | 0–1 |
| `goalkeeper` | Làm thủ môn | chạm, vuốt | 6/10 quả (45 s) | 10 | 1–3 |
| `tennis-rally` | Đánh bóng bàn | chạm (chỗ chạm = hướng), vuốt | 5 điểm (60 s) | 14–15 | 0 |
| `recipe-assembly` | Làm bánh mì theo đơn | kéo, chạm | 8 đơn (90 s) | 29 | 0 |
| `goldfish-scoop` | Vớt cá vàng | giữ (nhúng) / thả (vớt), kéo | 6 cá, 2 vợt (60 s) | 8–13 | 0 |
| `chicken-feed` | Cho gà ăn đều | chạm | 15 gà con no (60 s) | 30–32 | 0 |
| `farmer-defense` | Giữ ruộng lúa | kéo, chạm | đuổi 25 chim (90 s) | 48–58 | 0 |
| `hide-and-seek` | Trốn tìm | chạm | 12 bạn (60 s) | 37–40 | 0 |
| `nem-con` | Ném còn | kéo ngược rồi thả | 5/10 lượt (60 s) | 10 | 0 |
| `hopscotch` | Nhảy lò cò | chạm | 8 lượt (90 s) | 15 | 0 |
| `blind-goat` | Bịt mắt bắt dê | kéo, chạm | 8 dê (60 s) | 17–27 | 0–1 |
| `lantern-parade` | Rước đèn Trung thu | giữ / thả | 10 bánh (60 s) | 19–20 | 0 |

## Lệch so với danh mục

- Mục tiêu bị nâng vì bản theo danh mục quá dễ (có số đo):
  - `chicken-feed`: 6 → 15. Người tung thóc vào giữa sân cũng được 11–12.
  - `hide-and-seek`: 6 → 12. Người chạm bừa 10 lần mỗi giây được 3–9.
  - `blind-goat`: 4 → 8. Người đi vòng tròn bừa vẫn thua mục tiêu 8.
- Mục tiêu bị hạ: `pair-link` 16 → 12 cặp. Trò này cỡ Vừa, và trẻ 7 tuổi khó dọn được 16 cặp trong 90 s. Ngoài ra gợi ý hiện sau 6 s chứ không phải 10 s.
- `farmer-defense`: điểm là số chim đuổi đi, mục tiêu 25. Lúa còn lại (10 bó) hiện thành số tim, và mất hết lúa thì lượt dừng. Cách chấm "giữ ≥ 7/10" không hợp với điểm tăng dần và cách tính sao.
- `tennis-rally`: điểm là tổng số điểm bé ghi được, mục tiêu 5. Ván đấu tới 5 điểm vẫn có; Khỉ thắng một ván thì Khỉ chậm đi.
- `simon-says` dùng bò, gà, vịt, chó. Bò là `cow` có sẵn; không thêm `cow-face`/`pig-face`.
- `goldfish-scoop`: cá tò mò bơi lại gần khi vợt nằm yên. Không có điều này thì bot (và trẻ) phụ thuộc may rủi quá nhiều.
- `stack-slide` và `crane-drop` cùng là chạm để thả, nhưng giữ cả hai vì cơ chế khác nhau. `stack-slide` cắt phần thừa nên tầng hẹp dần, trượt hẳn ra ngoài là hết lượt. `crane-drop` có con lắc, rơi thẳng xuống, tháp lắc theo độ lệch và có 3 tim. Không dùng game nào trong danh sách dự phòng.

## Kiểm tra

- `pnpm vitest run` 25 thư mục game: 25 file, 277 test, xanh. `framework.test.ts` (registry khớp JSON ↔ thư mục): 12/12.
- `pnpm --filter @miu/web exec tsc --noEmit`: 0 lỗi. Lỗi `train-switch/draw.ts` mà phiên chính báo đã sửa.
- `eslint --max-warnings=0` trên 25 thư mục: exit 0.
- `pnpm content:check`: OK, 1191 file.
- Theo yêu cầu, không chạy E2E, `pnpm test` đầy đủ hay web build. Vite 5173 chỉ bật trong lock để chụp ảnh và đã tắt.

## File

- Mới: `apps/web/src/ui/minigame/games/<25 id>/**`, `content/minigames/<25 id>.json`, thư mục ảnh `plans/dattqh/reports/minigames-g3-261003/` (50 ảnh) và report này.
- Sửa trong lock: `tools/assets/sources.json`, `apps/web/src/ui/minigame/sprites.ts` (`FETCHED`), `assets/manifest.json` (sinh lại, không sửa tay) và 11 PNG trong `assets/packs/fluent-emoji/1ffb34c752ec/minigame/`.

Status: DONE_WITH_CONCERNS
Summary: Đủ 25 game G3 chơi được, bot thắng và idle thua trên cả 3 màn hình, typecheck, eslint và content:check sạch, có ảnh iPad ngang và điện thoại cho từng game.
Concerns:
- Chưa ai chơi thử bằng tay trên thiết bị thật. Độ khó cho trẻ 7–8 tuổi mới được ước lượng bằng bot và các người chơi giả.
- Bot của `match-3`, `fruit-slice` và `pick-sticks` vượt mục tiêu rất xa. Mục tiêu giữ theo danh mục; người duyệt có thể nâng.
- Phiên chính cần chạy E2E và `pnpm --filter @miu/web build`.
