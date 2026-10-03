# Lô G4: 25 minigame

Ngày 03/10/2026 · Plan `plans/dattqh/261003-1549-minigames-home-polish/` · Tier L

## Kết quả

Đã xong cả 25 game của lô G4 trong bảng §3 của report research. Không game nào phải thay bằng game dự phòng. Mỗi game có một thư mục `apps/web/src/ui/minigame/games/<id>/` (gồm `logic.ts`, `draw.ts`, `index.ts` và file test) và một file `content/minigames/<id>.json`.

Cột "Bot" và "Không chạm" là điểm thấp nhất đến cao nhất qua 3 màn hình mẫu × 5 seed (đo bằng `playRound`, giống bot test). Ảnh chụp từ `/minigame.html?game=<id>&bot=1&seed=3&at=<s>&species=fox` ở iPad ngang (1180 × 820) và điện thoại dọc (390 × 844). Tôi đã xem toàn bộ 50 ảnh.

| id | Tên | Cử chỉ | Mục tiêu / thời gian | Bot | Không chạm | Ảnh |
| --- | --- | --- | --- | --- | --- | --- |
| `jetpack-hold` | Ba lô phản lực | hold | 40 / 60 s | 144–185 | 0–0 | [ngang](minigames-g4-261003/jetpack-hold-landscape.png) · [điện thoại](minigames-g4-261003/jetpack-hold-phone.png) |
| `doodle-climb` | Ếch nhảy lên mây | drag | 80 / 60 s | 290–346 | 0–0 | [ngang](minigames-g4-261003/doodle-climb-landscape.png) · [điện thoại](minigames-g4-261003/doodle-climb-phone.png) |
| `rope-swing` | Khỉ đu dây | hold | 6 / 90 s | 60–62 | 0–0 | [ngang](minigames-g4-261003/rope-swing-landscape.png) · [điện thoại](minigames-g4-261003/rope-swing-phone.png) |
| `trampoline-rescue` | Bạt nhún cứu hộ | drag | 15 / 60 s | 36–37 | 0–0 | [ngang](minigames-g4-261003/trampoline-rescue-landscape.png) · [điện thoại](minigames-g4-261003/trampoline-rescue-phone.png) |
| `dodge-fall` | Né quả rơi | drag | 10 / 45 s | 21–23 | 0–0 | [ngang](minigames-g4-261003/dodge-fall-landscape.png) · [điện thoại](minigames-g4-261003/dodge-fall-phone.png) |
| `dart-wobble` | Phi tiêu tay run | tap | 150 / 45 s | 260–280 | 0–0 | [ngang](minigames-g4-261003/dart-wobble-landscape.png) · [điện thoại](minigames-g4-261003/dart-wobble-phone.png) |
| `snowball-fight` | Ném tuyết sau ụ | tap, hold | 15 / 60 s | 62–63 | 0–0 | [ngang](minigames-g4-261003/snowball-fight-landscape.png) · [điện thoại](minigames-g4-261003/snowball-fight-phone.png) |
| `firefly-torch` | Bắt đom đóm đêm | drag, tap | 20 / 60 s | 129–158 | 0–0 | [ngang](minigames-g4-261003/firefly-torch-landscape.png) · [điện thoại](minigames-g4-261003/firefly-torch-phone.png) |
| `whats-missing` | Cái gì biến mất? | tap | 6 / 100 s | 8–8 | 0–0 | [ngang](minigames-g4-261003/whats-missing-landscape.png) · [điện thoại](minigames-g4-261003/whats-missing-phone.png) |
| `trash-sort` | Phân loại rác | drag, tap | 20 / 60 s | 50–50 | 0–0 | [ngang](minigames-g4-261003/trash-sort-landscape.png) · [điện thoại](minigames-g4-261003/trash-sort-phone.png) |
| `ball-sort-tubes` | Xếp bi vào ống | tap | 6 / 90 s | 95–96 | 0–0 | [ngang](minigames-g4-261003/ball-sort-tubes-landscape.png) · [điện thoại](minigames-g4-261003/ball-sort-tubes-phone.png) |
| `crate-push` | Đẩy thùng vào kho | swipe, tap | 3 / 90 s | 33–33 | 0–0 | [ngang](minigames-g4-261003/crate-push-landscape.png) · [điện thoại](minigames-g4-261003/crate-push-phone.png) |
| `light-mirrors` | Gương dẫn ánh nắng | tap | 3 / 90 s | 57–59 | 0–0 | [ngang](minigames-g4-261003/light-mirrors-landscape.png) · [điện thoại](minigames-g4-261003/light-mirrors-phone.png) |
| `pac-maze` | Ăn hạt né ma | swipe, tap | 50 / 90 s | 87–171 | 0–0 | [ngang](minigames-g4-261003/pac-maze-landscape.png) · [điện thoại](minigames-g4-261003/pac-maze-phone.png) |
| `balance-scale` | Cân thăng bằng | drag, tap | 5 / 90 s | 45–46 | 0–0 | [ngang](minigames-g4-261003/balance-scale-landscape.png) · [điện thoại](minigames-g4-261003/balance-scale-phone.png) |
| `cut-rope` | Cắt dây thả kẹo | swipe | 3 / 90 s | 39–47 | 0–0 | [ngang](minigames-g4-261003/cut-rope-landscape.png) · [điện thoại](minigames-g4-261003/cut-rope-phone.png) |
| `sled-slalom` | Trượt tuyết qua cờ | drag | 15 / 60 s | 49–53 | 0–0 | [ngang](minigames-g4-261003/sled-slalom-landscape.png) · [điện thoại](minigames-g4-261003/sled-slalom-phone.png) |
| `ski-jump` | Nhảy cầu trượt tuyết | hold, tap | 180 / 60 s | 228–228 | 84–84 | [ngang](minigames-g4-261003/ski-jump-landscape.png) · [điện thoại](minigames-g4-261003/ski-jump-phone.png) |
| `tea-slide` | Trà đá vỉa hè | swipe, tap | 20 / 90 s | 48–50 | 0–0 | [ngang](minigames-g4-261003/tea-slide-landscape.png) · [điện thoại](minigames-g4-261003/tea-slide-phone.png) |
| `claw-machine` | Gắp thú bông | hold | 3 / 75 s | 6–6 | 0–0 | [ngang](minigames-g4-261003/claw-machine-landscape.png) · [điện thoại](minigames-g4-261003/claw-machine-phone.png) |
| `garden-cycle` | Vườn rau của bé | tap, drag | 20 / 90 s | 66–66 | 0–0 | [ngang](minigames-g4-261003/garden-cycle-landscape.png) · [điện thoại](minigames-g4-261003/garden-cycle-phone.png) |
| `milk-cow` | Vắt sữa bò | swipe | 40 / 60 s | 120–120 | 0–0 | [ngang](minigames-g4-261003/milk-cow-landscape.png) · [điện thoại](minigames-g4-261003/milk-cow-phone.png) |
| `boat-race` | Đua thuyền | tap | 2 / 60 s | 3–3 | 0–0 | [ngang](minigames-g4-261003/boat-race-landscape.png) · [điện thoại](minigames-g4-261003/boat-race-phone.png) |
| `dap-nieu` | Đập niêu | drag, tap | 4 / 80 s | 6–6 | 0–0 | [ngang](minigames-g4-261003/dap-nieu-landscape.png) · [điện thoại](minigames-g4-261003/dap-nieu-phone.png) |
| `banh-chung-wrap` | Gói bánh chưng | tap, drag, swipe | 3 / 90 s | 37–37 | 0–0 | [ngang](minigames-g4-261003/banh-chung-wrap-landscape.png) · [điện thoại](minigames-g4-261003/banh-chung-wrap-phone.png) |

Ngoài bot test chung (bot thắng, người không chạm thua, cùng seed cho cùng kết quả, lượt kết thúc đúng giờ, `draw` chạy được), mỗi game có thêm 2–4 test luật riêng. Có 7 game kiểm thêm rằng chơi ẩu thì thua:

- `dart-wobble`: ném ở thời điểm ngẫu nhiên.
- `whats-missing`: đoán bừa.
- `cut-rope`: cắt dây ngay từ đầu.
- `milk-cow`: vuốt liên tục.
- `boat-race`: chạm loạn.
- `ski-jump`: giữ tay suốt, không thả.
- `dap-nieu`: chỉ đập mà không đi.

Các game đố (`ball-sort-tubes`, `crate-push`, `light-mirrors`, `balance-scale`, `cut-rope`) có test chứng minh mọi bàn được tạo ra đều giải được.

## Mục tiêu khác catalogue

Mục tiêu nào lệch so với catalogue đều đã được bot test chứng minh. Khi bot thắng quá dễ, tôi nâng mục tiêu:

| Game | Catalogue | Mới |
| --- | --- | --- |
| `jetpack-hold` | 30 | 40 |
| `snowball-fight` | 10 | 15 |
| `firefly-torch` | 15 | 20 |
| `garden-cycle` | 15 | 20 |
| `milk-cow` | 3 xô | 40 lần vắt (10 lần một xô) |
| `crate-push` | 2 kho | 3 kho |
| `rope-swing` | 5 chặng | 6 chặng |

Hai game đổi cách tính điểm hoặc hạ mục tiêu:

- `pac-maze` hạ còn 50 hạt, vì trên một vài seed bot bị ma bắt và chỉ đạt khoảng 87.
- `ski-jump` tính tổng số mét của 3 lượt, mục tiêu 180 m. Ba lượt giữ tay suốt chỉ được khoảng 165 m nên thua; thả tay đúng vùng xanh thì thắng.

Các game tính điểm theo:

- **Số bàn hoặc màn đã xong**: `crate-push`, `light-mirrors`, `balance-scale`, `cut-rope`, `banh-chung-wrap`.
- **Số ống đã đầy một màu**: `ball-sort-tubes`.
- **Thứ hạng khi về đích**: `boat-race` (nhất 3, nhì 2, ba 1, bét 0; mục tiêu 2 tức là về nhất hoặc nhì).

## Hình và âm thanh

- **Hình mới**: thêm 28 hình Fluent Emoji vào `tools/assets/sources.json` và `FETCHED` trong `sprites.ts`, làm một bước trong lock rồi chạy `assets:fetch` và `assets:manifest`. Danh sách: monkey, palm-tree, fire-engine, firefighter, chestnut, coconut, snowman, flashlight, jar, wastebasket, newspaper, recycling-symbol, canned-food, beverage-box, roll-of-paper, ghost, sled, unicorn, tomato, ear-of-corn, cow, bucket, glass-of-milk, canoe, cooked-rice, beans, cut-of-meat, cloud-with-lightning.
- **Dùng lại file prop**: `toothbrush` và `leafy-green` trỏ tới file prop đã có trong pack (`props/…`), vì pack đã có sẵn URL đó. Ở lần thêm đầu, hai dòng này nằm trong `FETCHED` với đường dẫn `minigame/` không tồn tại, làm `framework.test.ts` đỏ. Tôi đã sửa trong lock và test xanh lại.
- **Âm thanh**: dùng sự kiện của framework. Một số sự kiện có thêm nốt nhạc qua `note`/`voice`:
  - `boat-race`: trống mỗi nhịp chèo;
  - `milk-cow`: tiếng chuông cao dần khi xô đầy;
  - `pac-maze`: tiếng ăn hạt;
  - `garden-cycle`: tiếng tưới;
  - `crate-push`: tiếng thùng vào ô;
  - `ski-jump`: tiếng còi khi bật.
- **Màu**: chỉ dùng token của theme.
- **Vùng chạm**: vật cần chạm có bán kính ≥ 40 đơn vị arena, và các vùng chạm đều rộng hơn hình vẽ.

## Kiểm tra

- `pnpm vitest run` trên 25 thư mục game cộng `framework.test.ts`: 26 file, 309 test, tất cả xanh.
- `tsc --noEmit` cho `apps/web`: sạch. Trước đó có lỗi ở `call-response` và `train-switch` của lô khác, nay đã hết.
- `eslint --max-warnings=0` trên 25 thư mục game: exit 0.
- `pnpm content:check`: OK, 1182 file.
- Theo yêu cầu, chưa chạy E2E, full `pnpm test` và build.

## Còn lại

- Không còn game nào dùng sprite `canoe`: `boat-race` giờ tự vẽ thân thuyền vì emoji xoay dọc trông xấu. Dòng `canoe` vẫn nằm trong `sprites.ts` (file dùng chung). Phiên chính có thể xóa dòng đó cùng mục trong `sources.json`, rồi chạy lại `assets:manifest`.
- Chưa có nhiệm vụ phụ (`content/quests/side-*.json`) hay NPC nào cho các game này, vì không nằm trong phạm vi giao. Map gợi ý của từng game có ở cột Map, §1 report research.
- Chưa có trẻ thật chơi thử. Các mục tiêu dựa trên bot và ước lượng. `pac-maze`, `rope-swing` và `ski-jump` cần người duyệt xem độ khó.
