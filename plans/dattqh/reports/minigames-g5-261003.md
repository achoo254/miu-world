# Lô G5: 25 minigame

Ngày 03/10/2026 · Plan [`261003-1549-minigames-home-polish`](../261003-1549-minigames-home-polish/plan.md) · Danh mục và luật: [research §1, §3](minigame-research-261003.md) · Khung: [minigame-framework-261003](minigame-framework-261003.md), [`docs/minigames.md`](../../../docs/minigames.md)

## Kết quả

- Đủ 25 game của hàng G5. Mỗi game có một thư mục `apps/web/src/ui/minigame/games/<id>/` (`logic.ts`, `draw.ts`, `index.ts`, `<id>.test.ts`) và một file `content/minigames/<id>.json`. Không game nào phải thay bằng game dự phòng: cả 25 game chơi khác cơ chế với nhau và với ba game mẫu.
- Bot test (`describeMinigame`) chạy trên 3 màn hình × 5 seed và đều xanh: bot thắng, không chạm thì thua, cùng seed cho cùng kết quả, `draw` chạy được mọi trạng thái. Mỗi game có thêm 2–3 test luật riêng. Tổng cộng 25 file test, 281 test, tất cả xanh.
- Có 8 game kiểm thêm "người chơi kém thì thua": chạm bừa (`swim-race`, `candle-cake-spin`), giữ mãi (`slot-cars`), quay quá nhanh (`cotton-candy`), luôn vuốt một phía (`conveyor-sort`), chụp liên tục (`photo-snap`).
- Âm thanh: các game nhạc và nhịp dùng `GameEvent.note`/`voice` (commit 9c41a3e của phiên chính). `piano-tiles` phát đúng nốt của bài, `call-response` dùng tiếng vỗ tay và trống, `candle-cake-spin` và `fruit-merge` dùng chuông lên cao dần, `flow-connect` và `wipe-clean` dùng chuông khi xong một bước.
- Hình: thêm đúng 1 emoji, `mouse-face` 🐭 (con chuột chũi), qua lock. Các game còn lại dùng hình đã có trong kho, và vẽ thêm bằng hình khối những thứ không có emoji: ống tre, hộp thư, nến, kẹo bông, que chuyền, cần câu, đường đua, khăn lau.
- Màu nào cũng đi kèm một hình riêng (tim, sao, lá, giọt nước, hoa), nên trẻ mù màu vẫn chơi được: bóng của `bubble-shooter`, chấm của `flow-connect`, chuồng của `path-guide`.

## Bảng game

Điểm bot là thấp nhất–cao nhất trên 8 seed. Idle là điểm cao nhất khi không chạm gì (3 seed). Dấu "!" nghĩa là lượt kết thúc trước giờ: bài hát đã hết, hết phim, hoặc đã về đích.

| id | Tên | Điều khiển | Mục tiêu (giây) | Bot iPad ngang / iPad dọc / điện thoại | Idle | Ảnh |
|---|---|---|---|---|---|---|
| `lane-runner` | Chạy ba làn | vuốt trái/phải (hoặc chạm bên đó), vuốt lên để nhảy | 25 sao (60) | 129–158 / 129–158 / 129–158 | 18 | [ngang](minigames-g5-261003/lane-runner-landscape.png) · [đt](minigames-g5-261003/lane-runner-phone.png) |
| `flappy-fly` | Chim bay qua khe tre | chạm để vỗ cánh | 10 khe (60) | 33 / 33 / 33 | 1 | [ngang](minigames-g5-261003/flappy-fly-landscape.png) · [đt](minigames-g5-261003/flappy-fly-phone.png) |
| `paper-route` | Giao báo xe đạp | chạm hộp thư giơ cờ | 10 báo (60) | 22–32 / 22–32 / 22–32 | 0 | [ngang](minigames-g5-261003/paper-route-landscape.png) · [đt](minigames-g5-261003/paper-route-phone.png) |
| `road-cross` | Qua đường qua sông | chạm hoặc vuốt lên để tiến; vuốt ngang, vuốt xuống | 3 lượt (90) | 16–30 / 16–26 / 16–26 | 0 | [ngang](minigames-g5-261003/road-cross-landscape.png) · [đt](minigames-g5-261003/road-cross-phone.png) |
| `bubble-shooter` | Bắn bóng màu | kéo để ngắm, thả để bắn | 30 bóng (90) | 384–555 / 184–307 / 146–241 | 0 | [ngang](minigames-g5-261003/bubble-shooter-landscape.png) · [đt](minigames-g5-261003/bubble-shooter-phone.png) |
| `candle-cake-spin` | Cắm nến bánh xoay | chạm để phóng nến | 20 điểm, khoảng 2 bánh (60) | 32–58 / 32–58 / 32–58 | 0 | [ngang](minigames-g5-261003/candle-cake-spin-landscape.png) · [đt](minigames-g5-261003/candle-cake-spin-phone.png) |
| `piano-tiles` | Phím đàn rơi | chạm phím | 69, tức hết bài với tối đa 5 phím lỡ (50) | 148! (cả 3 màn hình) | 0 | [ngang](minigames-g5-261003/piano-tiles-landscape.png) · [đt](minigames-g5-261003/piano-tiles-phone.png) |
| `call-response` | Nhại nhịp vỗ tay | chạm theo nhịp | 7/10 câu (55) | 10! (cả 3 màn hình) | 0 | [ngang](minigames-g5-261003/call-response-landscape.png) · [đt](minigames-g5-261003/call-response-phone.png) |
| `whack-mole` | Đập chuột chũi | chạm | 25 (60) | 104–118 | 0 | [ngang](minigames-g5-261003/whack-mole-landscape.png) · [đt](minigames-g5-261003/whack-mole-phone.png) |
| `photo-snap` | Chụp ảnh thú | chạm để chụp | 6 ảnh đẹp, cuộn 12 kiểu (60) | 12! | 0 | [ngang](minigames-g5-261003/photo-snap-landscape.png) · [đt](minigames-g5-261003/photo-snap-phone.png) |
| `conveyor-sort` | Băng chuyền phân loại | vuốt trái/phải (hoặc chạm bên đó) | 30 món (60) | 56 / 55 / 54 | 0 | [ngang](minigames-g5-261003/conveyor-sort-landscape.png) · [đt](minigames-g5-261003/conveyor-sort-phone.png) |
| `fruit-merge` | Gộp quả rơi | chạm chỗ thả | 150 điểm (90) | 325–505 / 407–512 / 405–512 | 0 | [ngang](minigames-g5-261003/fruit-merge-landscape.png) · [đt](minigames-g5-261003/fruit-merge-phone.png) |
| `flow-connect` | Nối chấm cùng màu | kéo vẽ ống | 3 bàn 5×5 (90) | 24 | 0 | [ngang](minigames-g5-261003/flow-connect-landscape.png) · [đt](minigames-g5-261003/flow-connect-phone.png) |
| `lawn-mower` | Cắt cỏ một nét | kéo (vuốt, chạm ô kế bên); nút Làm lại | 3 bãi (90) | 23 | 0 | [ngang](minigames-g5-261003/lawn-mower-landscape.png) · [đt](minigames-g5-261003/lawn-mower-phone.png) |
| `dig-tunnel` | Đào đất tìm ngọc | kéo hoặc chạm chỗ muốn đào | 10 ngọc (90) | 99–121 / 110–135 / 106–143 | 0 | [ngang](minigames-g5-261003/dig-tunnel-landscape.png) · [đt](minigames-g5-261003/dig-tunnel-phone.png) |
| `path-guide` | Vẽ đường cho vịt con | kéo từ vịt về chuồng | 12 vịt (90) | 16–29 / 20–28 / 17–28 | 4 | [ngang](minigames-g5-261003/path-guide-landscape.png) · [đt](minigames-g5-261003/path-guide-phone.png) |
| `slot-cars` | Xe đua đường ray | giữ để tăng tốc, nhả để chậm | 3 vòng, về trước xe Cáo (60) | 3! | 0 | [ngang](minigames-g5-261003/slot-cars-landscape.png) · [đt](minigames-g5-261003/slot-cars-phone.png) |
| `swim-race` | Bơi đua | chạm theo vòng nhịp | 3, tức về nhì trở lên (50) | 6! (nhất, không chạm lệch nhịp lần nào) | 0 | [ngang](minigames-g5-261003/swim-race-landscape.png) · [đt](minigames-g5-261003/swim-race-phone.png) |
| `cotton-candy` | Quấn kẹo bông | vẽ vòng quanh que | 6 kẹo (60) | 13 | 0 | [ngang](minigames-g5-261003/cotton-candy-landscape.png) · [đt](minigames-g5-261003/cotton-candy-phone.png) |
| `bobber-fishing` | Câu cá phao | chạm để quăng, chạm để giật | 8 điểm (90) | 24–31 | 0 | [ngang](minigames-g5-261003/bobber-fishing-landscape.png) · [đt](minigames-g5-261003/bobber-fishing-phone.png) |
| `weed-pull` | Nhổ cỏ dại | giữ rồi kéo lên (cỏ dai: lắc trước) | 15 (60) | 146–150 | 0 | [ngang](minigames-g5-261003/weed-pull-landscape.png) · [đt](minigames-g5-261003/weed-pull-phone.png) |
| `sheepdog-herd` | Lùa vịt về chuồng | kéo chú chó | 10 vịt (90) | 11–20 / 17–26 / 10–16 | 2 | [ngang](minigames-g5-261003/sheepdog-herd-landscape.png) · [đt](minigames-g5-261003/sheepdog-herd-phone.png) |
| `wipe-clean` | Lau sạch bóng | xoa (xà phòng → nước → khăn) | 6 món (90) | 21 / 16 / 16 | 0 | [ngang](minigames-g5-261003/wipe-clean-landscape.png) · [đt](minigames-g5-261003/wipe-clean-phone.png) |
| `da-cau` | Đá cầu | chạm quả cầu đang rơi | 30 lần tâng (60) | 100 | 0 | [ngang](minigames-g5-261003/da-cau-landscape.png) · [đt](minigames-g5-261003/da-cau-phone.png) |
| `chuyen` | Chơi chuyền | chạm bóng để tung, chạm que để nhặt, chạm bóng để bắt | qua bàn 5 (90) | 43 / 36–38 / 38 | 0 | [ngang](minigames-g5-261003/chuyen-landscape.png) · [đt](minigames-g5-261003/chuyen-phone.png) |

Ảnh chụp từ trang dev `minigame.html?game=<id>&bot=1&seed=3&at=<giây>&species=fox` ở iPad ngang (1180 × 820) và điện thoại dọc (390 × 844). Vite chạy ở cổng 5173 trong lock và được tắt ngay sau khi chụp. Ảnh lưu đã thu nhỏ về cạnh dài 1180 px.

## Chỗ lệch so với danh mục, và lý do

- `paper-route`: dùng emoji `newspaper` (đã có trong kho), nên vẫn là "giao báo". Hộp thư vẽ bằng hình khối. Chỉ hộp thư giơ cờ đỏ mới đang chờ báo; ném vào hộp cờ hạ thì báo bật ra, không trừ điểm.
- `candle-cake-spin`: catalogue ghi "3 bánh". Bot chỉ chắc chắn được khoảng 3 bánh, nên mục tiêu hạ xuống còn khoảng 2 bánh (20 điểm). Mỗi bánh xong được tính số nến cộng 3 điểm. Nến cắm dở không được điểm, vì nếu được thì chạm bừa liên tục cũng thắng. Bánh xoay lúc nhanh lúc chậm, có lúc dừng rồi quay ngược, nên chạm đều theo nhịp không cắm được nến cách đều nhau. Test có kiểm chạm bừa thì thua.
- `piano-tiles`: dùng hai giai điệu dân gian không còn bản quyền, Twinkle Twinkle và Frère Jacques (tức "Kìa con bướm vàng"). Chạm phím đúng lúc phím chạm vạch được 2 điểm, nên có thứ để lấy 2★ và 3★. Mục tiêu 69 tương ứng hết bài với 5 phím lỡ.
- `swim-race`: điểm tính theo hạng về đích: nhất 5, nhì 3, ba 2, chót 1, cộng thêm 1 nếu không chạm lệch nhịp lần nào. Mục tiêu 3 tức là về nhì trở lên.
- `slot-cars`: điểm là số vòng đã chạy xong. Cuộc đua dừng khi một xe đủ 3 vòng, nên đạt mục tiêu 3 nghĩa là về trước xe Cáo.
- `fruit-merge`: điểm là tổng điểm các lần gộp (quả càng to càng nhiều điểm). Thả quả ngẫu nhiên vẫn được điểm gần bằng bot, giống Suika: game thư giãn, thử thách chính là không để quả tràn miệng thùng. Mục tiêu 150 nằm xa dưới điểm của bot.
- `path-guide` và `sheepdog-herd`: mục tiêu hạ từ 15 và 12 xuống 12 và 10, để bot vẫn thắng dư trên cả 3 màn hình. Ở `sheepdog-herd`, vịt tới gần chỗ hở thì tự đi vào chuồng. Đây là chỗ nới tay cho bé 7 tuổi, vì lùa đàn khó.
- `chuyen`: bàn n cần nhặt n que, tối đa 5 que. Bàn 5 trở đi luôn là 5 que, nên còn có thứ để lấy 2★ và 3★.
- `weed-pull`: dùng cà rốt, hoa hướng dương, hoa tulip làm cây không được nhổ. Lúc làm game, emoji `leafy-green` mà agent khác thêm vào `sprites.ts` chưa có file, nên không dùng.

## Kiểm tra

- `pnpm vitest run` trên 25 file test của lô: 25 file / 281 test xanh.
- `pnpm --filter @miu/web exec tsc --noEmit -p .`: exit 0. Lỗi `findLast` ở `call-response/draw.ts` mà phiên chính báo đã được thay bằng vòng lặp ngược.
- `pnpm exec eslint --max-warnings=0` trên 25 thư mục game: exit 0.
- `pnpm content:check`: OK (1194 file).
- Theo yêu cầu, tôi không chạy E2E, không chạy full `pnpm test`, không chạy `pnpm --filter @miu/web build`.

## File

- Mới: `apps/web/src/ui/minigame/games/<25 id>/**` và `content/minigames/<25 id>.json`.
- `lawn-mower` import `randomFullPath` từ `games/flow-connect/logic.ts`. Hai game dùng chung cách sinh màn chơi (một đường đi qua mọi ô), và cả hai đều thuộc lô này.
- Dùng chung, sửa qua lock bằng một script: `tools/assets/sources.json` thêm mục `minigame/mouse-face.png`, `apps/web/src/ui/minigame/sprites.ts` thêm dòng `'mouse-face'`, `assets/manifest.json` được sinh lại bằng `pnpm assets:manifest`.
- Ảnh: `plans/dattqh/reports/minigames-g5-261003/*.png` (50 ảnh).
- Không thêm dependency, không commit.

## Câu hỏi còn mở

1. Bot thắng dư rất xa ở nhiều game (`weed-pull`, `whack-mole`, `da-cau`, `lane-runner`), vì bot ra quyết định 10 lần mỗi giây và không trượt. Mục tiêu đang giữ theo catalogue. Cần lượt chơi thử của người duyệt hoặc của bé để chốt lại.
2. `fruit-merge` cho điểm gần như như nhau dù thả khéo hay thả bừa (xem mục lệch ở trên). Có cần thêm thử thách không, ví dụ mục tiêu là "tạo được dưa hấu"? Câu này cho người duyệt.
