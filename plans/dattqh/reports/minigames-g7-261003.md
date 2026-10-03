# Lô G7: 30 minigame

Ngày 04/10/2026 · Danh mục và luật: [research 2 §3, §5](minigame-research-2-261003.md) · Quy tắc chạm: [research §2](minigame-research-261003.md) · Khung: [`docs/minigames.md`](../../../docs/minigames.md)

## Kết quả

- Đủ 30 game của hàng G7, không game nào phải thay bằng game dự phòng. Mỗi game có thư mục `apps/web/src/ui/minigame/games/<id>/` (`logic.ts`, `draw.ts`, `index.ts`, `<id>.test.ts`) và file `content/minigames/<id>.json`. Họ cơ chế (`family`) của 30 game đều mới, không trùng với họ nào đã có.
- Bot test (`describeMinigame`, 3 màn hình × 5 seed) và test luật riêng: 30 file, 347 test, tất cả xanh. Có 6 game kiểm thêm "chơi bừa thì thua": `croc-compare` (vuốt ngẫu nhiên), `snow-tracks` (chạm con vật ngẫu nhiên), `bamboo-hundred`, `book-shelf-order`, `sentence-train` (chạm ngẫu nhiên 10 lần/giây), `lunchbox-pack` (bỏ mọi món đi qua vào hộp).
- Hình: thêm 17 emoji qua lock bằng một script. 9 file đã có trong pack, chỉ thêm dòng `REUSED`: `locked`, `unlocked`, `old-key`, `flute`, `green-book`, `blue-book`, `orange-book`, `books`, `railway-car`. 8 file tải mới: `dog`, `crocodile`, `ferry`, `robot`, `umbrella`, `locomotive`, `water-buffalo`, `candle`. Cây tre, lá bài, chum, nhà bài, mặt nạ ổ khóa, phà, bàn khúc côn cầu, quân cờ lật, ngọc, dấu chân, dây đàn... vẽ bằng hình khối.
- Âm thanh: `hold-notes` dùng nốt giữ (`hold: 'start'`/`'release'`, giọng `whistle`): nốt sáo kêu đúng lúc bé giữ ngón tay. `water-puppet` phát giai điệu ngũ cung theo nhịp và ngắt nhạc khi con rối lệch bóng. Các game khác dùng nốt chuông lên dần khi làm đúng.
- Màu nào cũng có dấu hiệu thứ hai cho trẻ mù màu: ngọc của `mastermind` có ký hiệu riêng (chấm, tam giác, vuông, thoi), quân `reversi` có mặt nhân vật / cú, nhóm thức ăn của `lunchbox-pack` có hình và chữ.

## Bảng game

Bot: điểm thấp nhất–cao nhất trên 8 seed ở iPad ngang / iPad dọc / điện thoại. Idle: điểm cao nhất khi không chạm gì (3 seed). Dấu "!" là lượt kết thúc trước giờ vì hết đĩa.

| id | Tên | Điều khiển | Mục tiêu (giây) | Bot ngang / dọc / điện thoại | Idle | Ảnh |
|---|---|---|---|---|---|---|
| `dig-channel` | Đào mương dẫn nước | kéo để đào | 4 màn (90) | 43–45 / 40–41 / 34–36 | 0 | [ngang](minigames-g7-261003/dig-channel-landscape.png) · [đt](minigames-g7-261003/dig-channel-phone.png) |
| `card-house` | Dựng nhà bài | kéo chậm | 3 tầng (90) | 21 / 27 / 27 | 0 | [ngang](minigames-g7-261003/card-house-landscape.png) · [đt](minigames-g7-261003/card-house-phone.png) |
| `rain-barrel` | Hứng mưa vào chum | kéo để nghiêng lá | 6 chum (60) | 12–18 / 17–22 / 12–16 | 0 | [ngang](minigames-g7-261003/rain-barrel-landscape.png) · [đt](minigames-g7-261003/rain-barrel-phone.png) |
| `word-search` | Tìm từ ẩn | kéo theo từ, hoặc chạm chữ đầu rồi chữ cuối | 6 từ (90) | 94 | 0 | [ngang](minigames-g7-261003/word-search-landscape.png) · [đt](minigames-g7-261003/word-search-phone.png) |
| `balloon-guard` | Hộ tống bóng bay | kéo ô | 100 m (60) | 192 | 27 / 50 / 40 | [ngang](minigames-g7-261003/balloon-guard-landscape.png) · [đt](minigames-g7-261003/balloon-guard-phone.png) |
| `mastermind` | Đoán mã ngọc | chạm ngọc | 2 rương (90) | 13–15 | 0 | [ngang](minigames-g7-261003/mastermind-landscape.png) · [đt](minigames-g7-261003/mastermind-phone.png) |
| `reversi` | Cờ lật | chạm ô | thắng 1 ván (90) | 3–4 | 0 | [ngang](minigames-g7-261003/reversi-landscape.png) · [đt](minigames-g7-261003/reversi-phone.png) |
| `robot-path` | Rô-bốt hút bụi | chạm lệnh, chạm Chạy | 4 phòng (90) | 11 | 0 | [ngang](minigames-g7-261003/robot-path-landscape.png) · [đt](minigames-g7-261003/robot-path-phone.png) |
| `tile-triple` | Xếp ba ô giống | chạm ô | 16 bộ ba = 2 bàn (90) | 69–70 | 0 | [ngang](minigames-g7-261003/tile-triple-landscape.png) · [đt](minigames-g7-261003/tile-triple-phone.png) |
| `helix-drop` | Bóng xuống tháp xoắn | kéo ngang để xoay tháp | 20 tầng (60) | 174–192 / 169–195 / 169–195 | 0 | [ngang](minigames-g7-261003/helix-drop-landscape.png) · [đt](minigames-g7-261003/helix-drop-phone.png) |
| `air-hockey` | Khúc côn cầu bàn hơi | kéo vợt | 5 bàn (90) | 7–14 / 14–25 / 7–10 | 0 | [ngang](minigames-g7-261003/air-hockey-landscape.png) · [đt](minigames-g7-261003/air-hockey-phone.png) |
| `frisbee-dog` | Ném đĩa cho cún | vuốt lên | 8 điểm / 12 đĩa (70) | 24! | 0 | [ngang](minigames-g7-261003/frisbee-dog-landscape.png) · [đt](minigames-g7-261003/frisbee-dog-phone.png) |
| `sentence-train` | Đoàn tàu câu | chạm toa | 8 câu (90) | 36 | 0 | [ngang](minigames-g7-261003/sentence-train-landscape.png) · [đt](minigames-g7-261003/sentence-train-phone.png) |
| `hole-grow` | Hố hút dọn sân | kéo hố | 32 món = 80% sân đầu (60) | 246–266 / 229–252 / 190–204 | 0 | [ngang](minigames-g7-261003/hole-grow-landscape.png) · [đt](minigames-g7-261003/hole-grow-phone.png) |
| `one-stroke-house` | Vẽ nhà một nét | kéo vẽ | 6 hình (90) | 50 | 0 | [ngang](minigames-g7-261003/one-stroke-house-landscape.png) · [đt](minigames-g7-261003/one-stroke-house-phone.png) |
| `water-puppet` | Múa rối nước | kéo con rối | 62 điểm ≈ 70% nhịp (48) | 188 | 14 / 15 / 12 | [ngang](minigames-g7-261003/water-puppet-landscape.png) · [đt](minigames-g7-261003/water-puppet-phone.png) |
| `bo-khan` | Bỏ khăn | giữ để chạy, chạm để thả khăn | 6 lần thoát (60) | 10–11 | 0 | [ngang](minigames-g7-261003/bo-khan-landscape.png) · [đt](minigames-g7-261003/bo-khan-phone.png) |
| `hold-notes` | Tiếng sáo diều | giữ, thả | 17 ≈ 70% nốt (50) | 48 | 0 | [ngang](minigames-g7-261003/hold-notes-landscape.png) · [đt](minigames-g7-261003/hold-notes-phone.png) |
| `bamboo-hundred` | Cây tre trăm đốt | chạm đốt theo thứ tự đếm | 21 đốt = 3 cây (90) | 168 | 0 | [ngang](minigames-g7-261003/bamboo-hundred-landscape.png) · [đt](minigames-g7-261003/bamboo-hundred-phone.png) |
| `book-shelf-order` | Xếp sách theo số | kéo sách hoặc chạm khe | 22 sách (90) | 150 | 0 | [ngang](minigames-g7-261003/book-shelf-order-landscape.png) · [đt](minigames-g7-261003/book-shelf-order-phone.png) |
| `cake-decorate` | Trang trí bánh theo đơn | chạm hộp (hoặc kéo), chạm món để bỏ | 8 bánh (90) | 27–31 | 0 | [ngang](minigames-g7-261003/cake-decorate-landscape.png) · [đt](minigames-g7-261003/cake-decorate-phone.png) |
| `croc-compare` | Cá sấu tham ăn | vuốt trái/phải/xuống (hoặc chạm) | 20 (60) | 55 | 0 | [ngang](minigames-g7-261003/croc-compare-landscape.png) · [đt](minigames-g7-261003/croc-compare-phone.png) |
| `penguin-share` | Chia cá cho cánh cụt | chạm cánh cụt | 8 lượt (90) | 43–45 | 0 | [ngang](minigames-g7-261003/penguin-share-landscape.png) · [đt](minigames-g7-261003/penguin-share-phone.png) |
| `ice-bridge` | Đóng băng làm cầu | chạm ô nước | 4 hồ (90) | 38–39 / 41–44 / 38–40 | 0 | [ngang](minigames-g7-261003/ice-bridge-landscape.png) · [đt](minigames-g7-261003/ice-bridge-phone.png) |
| `river-crossing` | Qua sông chở đồ | chạm đồ, chạm Chèo | 2 bài (90) | 8 | 0 | [ngang](minigames-g7-261003/river-crossing-landscape.png) · [đt](minigames-g7-261003/river-crossing-phone.png) |
| `ferry-dock` | Cập bến phà | giữ ngón tay trên nước (kéo) | 6 lần (90) | 21–23 / 18–19 / 13 | 0 | [ngang](minigames-g7-261003/ferry-dock-landscape.png) · [đt](minigames-g7-261003/ferry-dock-phone.png) |
| `shadow-shade` | Bóng râm cho mèo | kéo mặt trời | 10 lần (60) | 17–20 / 21–24 / 21–24 | 0 | [ngang](minigames-g7-261003/shadow-shade-landscape.png) · [đt](minigames-g7-261003/shadow-shade-phone.png) |
| `snow-tracks` | Ai đi qua đây? | chạm con vật | 10 (60) | 23 | 0 | [ngang](minigames-g7-261003/snow-tracks-landscape.png) · [đt](minigames-g7-261003/snow-tracks-phone.png) |
| `lunchbox-pack` | Hộp cơm đủ chất | chạm món (hoặc kéo) | 8 hộp (90) | 21–25 / 20–26 / 20–26 | 0 | [ngang](minigames-g7-261003/lunchbox-pack-landscape.png) · [đt](minigames-g7-261003/lunchbox-pack-phone.png) |
| `pop-lock` | Mở khóa rương | chạm | 4 khóa (60) | 5–8 | 0 | [ngang](minigames-g7-261003/pop-lock-landscape.png) · [đt](minigames-g7-261003/pop-lock-phone.png) |

Ảnh chụp từ trang dev `minigame.html?game=<id>&bot=1&seed=3&at=<giây>&species=fox` ở iPad ngang (1180 × 820) và điện thoại dọc (390 × 844), theme mặc định. Vite chạy ở cổng 5173 trong lock và tắt ngay sau khi chụp.

## Chỗ lệch so với danh mục, và lý do

- Sao: thẻ kết quả cho 2★ ở 1,4× và 3★ ở 1,8× mục tiêu, nên điểm phải vượt được mục tiêu xa. Vì thế vài game tính điểm khác chữ của danh mục:
  - `hold-notes`: nốt giữ đúng là 1 điểm, chạm và nhấc khớp cả hai đầu là 2 điểm; mục tiêu 17 tương ứng khoảng 70% số nốt (24 nốt).
  - `water-puppet`: mỗi nhịp (0,5 s) trùng bóng 2 điểm, gần bóng 1 điểm; mục tiêu 62 ≈ 70% số nhịp.
  - `frisbee-dog`: cún bắt được là 1 điểm, ném trúng ngay chỗ cún đang chạy tới (không phải lao theo) là 2 điểm.
  - `hole-grow`: điểm là số món hút được; sân sạch thì có sân mới, hố nhỏ lại. Mục tiêu 32 là 80% sân đầu.
  - `bamboo-hundred`, `tile-triple`: điểm theo từng đốt / từng bộ ba; mục tiêu bằng 3 cây tre / 2 bàn của danh mục.
  - `balloon-guard`: bóng bay 3,2 m/giây, mục tiêu vẫn 100 m.
- Chống đoán bừa (để chạm bừa thật nhanh không thắng): `croc-compare` cá sấu ngáp lâu dần khi sai liên tiếp; `bamboo-hundred` sai thì cây tre nghỉ 1,5 s; `book-shelf-order` sách đổ 1,5 s; `sentence-train` tàu lùi một toa và nghỉ lâu dần; `snow-tracks` chỉ đoán đúng ngay lần đầu mới có điểm; `lunchbox-pack` hộp trùng nhóm thì đổ, không có điểm (danh mục ghi "hộp thiếu tính nửa"). Với cách đó, `book-shelf-order` tăng mục tiêu từ 20 lên 22 và `rain-barrel` từ 4 lên 6 chum (bot dư nhiều).
- `card-house`: nhà 3 tầng gồm 10 lá; mỗi tầng xong là 1 điểm. Tay run tính theo tốc độ kéo trung bình 0,25 s; thanh đo ở bên trái.
- `air-hockey`: không đấu "ai tới 5 trước" mà đếm bàn của bé trong 90 s; cánh cụt ghi bàn thì chậm đi. Bot thắng 7–25 bàn, dao động nhiều vì va chạm liên tục.
- `ice-bridge`: hai hồ đầu cho dư 1 bông tuyết, từ hồ thứ ba chỉ đủ cho cây cầu ngắn nhất. Màn hình dọc thì qua hồ từ dưới lên trên.
- `river-crossing`: ba bộ đồ có cùng luật: chó–gà–thóc, cáo–vịt–ngô, mèo–chuột–bánh quy; bảng gỗ vẽ hai đôi không được để riêng.
- `sentence-train`: 22 câu ngắn tự viết (3–4 toa), không lấy từ SGK nên không phải kiểm nguyên văn. Từ đầu câu viết hoa, từ cuối có dấu chấm.
- `penguin-share`: bộ sinh đề chỉ chia đều tới 12 con cá, 2–4 bạn (theo quyết định giữ mức dễ của nội dung tập 2).
- `word-search`: từ chỉ nằm ngang trái sang phải hoặc dọc trên xuống, chữ to, mỗi từ có hình và chữ bên cạnh bảng.
- `robot-path`: khi đang xếp lệnh, đường chấm mờ cho thấy rô-bốt sẽ đi đâu (dấu ✕ nếu sẽ đụng) để bé 7 tuổi tự sửa lệnh.
- `bo-khan`: chạy vòng ngoài khi giữ ngón tay; bạn bị thả khăn nhận ra sau 0,8–1,2 s rồi đuổi nhanh hơn 1,6 lần, nên thả gần chỗ mình mới kịp về.

## Kiểm tra

- `pnpm vitest run` trên 30 thư mục game của lô: 30 file / 347 test xanh.
- `pnpm --filter @miu/web exec tsc --noEmit -p .`: không lỗi nào trong file của G7. Lệnh vẫn đỏ vì lỗi ở file của lô khác đang làm dở (`high-dive`, `merge-2048`, `shopping-memory`, `sink-float`, `thoi-com-thi`, `water-jugs`), tôi không sửa.
- `pnpm exec eslint --max-warnings=0` trên 30 thư mục game: sạch.
- `pnpm content:check`: OK.
- Theo yêu cầu, không chạy E2E, không chạy full `pnpm test`, không build.

## File

- Mới: `apps/web/src/ui/minigame/games/<30 id>/**`, `content/minigames/<30 id>.json`.
- Dùng chung, sửa qua lock bằng một script: `tools/assets/sources.json` (8 mục `minigame/*.png`), `apps/web/src/ui/minigame/sprites.ts` (9 dòng `REUSED`, 8 dòng `FETCHED`), `assets/manifest.json` sinh lại bằng `pnpm assets:manifest`.
- Ảnh: `plans/dattqh/reports/minigames-g7-261003/*.png` (60 ảnh).
- Không thêm dependency, không commit.

## Câu hỏi còn mở

1. Bot thắng dư xa ở nhiều game (bot quyết định 10 lần/giây, không nhầm). Mục tiêu đang theo danh mục; cần người duyệt hoặc bé chơi thử để chốt.
2. `air-hockey` có điểm bot dao động lớn. Nếu bé thấy khó, có thể hạ mục tiêu xuống 4 hoặc làm cánh cụt chậm hơn.
