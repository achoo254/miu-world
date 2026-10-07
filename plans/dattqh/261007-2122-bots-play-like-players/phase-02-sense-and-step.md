# Pha 2 — Bạn máy cảm nhận và đi từng ô

**Tier:** L · **Chặn bởi:** 1 · **Trạng thái:** XONG (`ee3dccfb`) · **Theo quyết định:** sensing = `walk_grid_in_content`, players = `perceive_and_choose`

## Mục tiêu

Phần "thân" của bạn máy. Nó chỉ biết những gì nằm trong bán kính nhìn của nó, đi từng ô theo `canStep`, và tự lập kế hoạch đoạn kế bằng A* trong cửa sổ nhìn. Pha này chưa có học: đích do một bộ chọn tạm cung cấp (nơi ngẫu nhiên trong tầm nhìn, hoặc hướng ngẫu nhiên). Pha 3 thay bộ chọn đó bằng bộ học. Đồng thời gỡ `gather()`, `escort`, vết chân và vòng 4 điểm.

## Thiết kế (thư mục mới `apps/server/src/multiplayer/bot-brain/`, thuần TS, nhận `random` và `dt`)

- `bot-profiles.ts` (cạnh `bot-runner.ts`): dữ liệu 112 bạn máy chuyển ra từ `bot-runner.ts:37-179`. Id, tên, loài, trang phục giữ nguyên; `waypoints` thay bằng `home: {x, y, z}` (điểm đầu cũ). `findBot` chuyển theo; sửa import ở `apps/server/src/friend/friend-store.ts:9`.
- `walk-store.ts`: nạp lười `content/world/walk/<map>.{json,bin}` (`inflateRawSync`, `decodeWalkCells`), mỗi map một lần. Có `places(map)` và chỉ mục lưới thô 16 × 16 cho câu hỏi "nơi nào trong bán kính r". Map không có file thì bạn máy đứng nghỉ ở `home`.
- `sight.ts`: bán kính nhìn theo persona, 16–28 khối (thêm trường `sight` vào `bot-persona.ts`, sinh từ id như các trường khác). `seePlaces(at)` trả các nơi trong bán kính; `seePlayers(at, room)` trả người chơi trong bán kính mà `roomSees` cho thấy. Không xét che khuất (chỉ khoảng cách).
- `local-path.ts`: A* trên chỗ đứng trong cửa sổ vuông cạnh `2·sight + 1` quanh bạn máy, theo `canStep`. Chi phí theo nền như `STEP_COST` của client (đường 1, đất 3,5, nước 150), cộng mép và leo. Trần 3.000 bước mở rộng.
  - Đích trong cửa sổ: tới đích.
  - Đích ngoài cửa sổ: tới ô biên có `g + h` nhỏ nhất (h = khoảng cách thẳng tới đích). Đây là bước "dò đường" từng đoạn của người chưa biết đường.
  - Kết quả là chuỗi ô, gộp đoạn thẳng nếu mọi cột trên đoạn đều thỏa `canStep` liên tiếp.
- `stepper.ts`: đi theo chuỗi ô với tốc độ theo persona (2,4–3,6 khối/s, trường `walk`), nội suy `y` theo `feet`, `yaw` theo hướng. Cứ 8 ô hoặc 2 s thì xin lập kế hoạch lại. Ghi lại đường đã đi để pha 3 lưu thành lối.
  - **Kẹt:** sau 3 lần lập kế hoạch liên tiếp mà khoảng cách tới đích không giảm ≥ 1 khối thì báo `stuck`; ô hiện tại bị cấm tạm 60 s.
  - **Đi xe:** tại nơi loại `stop` có `ride`, bạn máy có thể chọn đi xe: `riding: true` 3 s rồi xuất hiện ở điểm đến.
- **Hàng đợi tìm đường** (`local-path.ts`): mọi yêu cầu lập kế hoạch vào hàng đợi FIFO, mỗi tick chạy tới khi hết 4 ms (đo bằng `performance.now()`); bạn máy chờ thì đứng `idle` (trông như đang nhìn quanh).

## Thay đổi trong `bot-runner.ts`

- `CompanionBotInstance` có `body` (vị trí, chuỗi ô, trạng thái `walk | work | rest | stuck`) và `chooser` (bộ chọn đích tạm, pha 3 thay).
- Gỡ: `BOT_MAP_CONFIGS.waypoints`, khối đi thẳng (`:450-495`), `escort`/`joinPlayer`/`goHome`/`nextOnTrail` (`:264-369`), `gather()` (`:815-847`), `walked()` và `trails` (`:545`, `:850-859`), cùng các hằng `BOTS_NEAR_PLAYER … GATHER_EVERY_S` (`:215-232`). Hằng nào đang được export và test dùng thì sửa test theo.
- Giữ nguyên khối chào (`:390-423`) tới pha 6; `visitFriend` (`:372-385`) giữ, nhưng đi bằng `local-path`.
- Nhà riêng (`homeBots` `:780-791`): bạn máy hàng xóm và bạn máy khách dùng lưới của `nha-cua-be`, xuất phát ở `home` của hàng xóm.
- `server.ts:69`: `new BotRunner(multiplayer, { store: botStore, walk: new WalkStore(CONTENT_DIR) })`. Lấy `CONTENT_DIR` như cách `content-catalog.ts` đang lấy.

## Các bước

1. `bot-profiles.ts` + test: tập id bằng đúng tập id cũ (danh sách chép trong test).
2. `walk-store.ts` + test trên lưới nhỏ dựng trong test và trên file thật `truong-hoc` (nạp < 500 ms, RAM giải nén ≤ 2,5 MB).
3. `local-path.ts` + test: không đi qua ô không thỏa `canStep` (bậc 3 khối, rào `blocking`, trần thấp); đích ngoài cửa sổ thì đi về ô biên đúng hướng; trần bước mở rộng; hàng đợi giữ hạn mức 4 ms (đồng hồ giả).
4. `stepper.ts` + test: bám chuỗi ô, không đứng ở cột không có chỗ đứng, phát hiện kẹt, đi xe.
5. Nối vào runner; sửa `multiplayer.test.ts`, `hub-homes.test.ts`, `bot-coop.test.ts` cho chỗ đứng mới.
6. Mô phỏng 10 phút (fake timer, lưới thật `truong-hoc`, bộ chọn tạm): mọi bước giữa hai ô thỏa `canStep`; tỷ lệ kẹt < 5% (pha 3 hạ xuống < 2% nhờ học tránh).

## Rủi ro

- **Production mất `gather`:** người chơi ở chỗ xa có thể không thấy bạn máy cho tới khi pha 3 làm bạn máy chọn tới gặp người chơi. Người sở hữu đã yêu cầu như vậy; deploy pha 2 cùng pha 3 (không deploy riêng pha 2).
- **A* cửa sổ tốn CPU:** trần bước mở rộng cộng hạn mức mỗi tick; pha 9 đo.

## Kiểm tra

Các file vitest của pha cùng các test bạn máy đã sửa; `pnpm typecheck`; `pnpm lint`.

## Rollback

Revert pha 2: runner về vòng 4 điểm cũ (dữ liệu nằm ở `bot-profiles.ts` và lịch sử git).

## Trạng thái (07/10/2026)

- [x] `bot-profiles.ts` (+test): 112 bạn máy chuyển nguyên id, tên, loài, trang phục; `waypoints` thành `home` (điểm đầu cũ); test so tập id với danh sách cũ chép trong test. Lệch spec: `friend-store.ts` không sửa (ngoài phạm vi file được giao lần này); `bot-runner.ts` re-export `findBot` nên import cũ vẫn đúng.
- [x] `walk-store.ts` (+test): nạp lười `content/world/walk/<map>.{json,bin}` qua `CONTENT_DIR` (`content/content-dir.ts`, đúng cả ở repo lẫn `/opt/miu/current` vì bundle nằm ở `apps/server/dist/server/`); tầng 0 dày đặc, tầng 1–2 thưa (mảng cột tăng dần + bitset); chỉ mục nơi chốn ô 16 × 16; `snap` tìm chỗ đứng gần nhất. Map thiếu/hỏng file hoặc id sai thì `null` (log một lần), bạn máy đứng ở `home`. Đo: `truong-hoc` nạp 37 ms, 1,6 MB; lớn nhất `thu-vien` 1,95 MB (≤ 2,5 MB). Test: mọi map có bạn máy đều có lưới và mọi `home` có chỗ đứng trong 8 cột.
- [x] `sight.ts` (+test): `sight` 16–28 và `walk` 2,4–3,6 khối/s thêm vào persona từ một dòng ngẫu nhiên riêng (các trường cũ không đổi); `seePlaces`, `seePlayers` (dùng `MultiplayerRoom.canSee` mới: không thấy người chơi đã chặn hay tắt bạn máy). Lời chào giờ dùng `seePlayers`.
- [x] `local-path.ts` (+test): A* trong cửa sổ `2·sight + 1` (≤ 57), `canStep`, chi phí như client (đường 1, đất 3,5, nước 150, mép 0,6, leo 0,6, xuống 0,2), trần 3.000 bước mở rộng; đích ngoài cửa sổ thì tới ô biên có `g + h` nhỏ nhất; không tới được thì tới chỗ gần nhất nếu gần hơn ≥ 1 khối. Gộp đoạn thẳng cùng tầng khi mọi cột thân đi qua (duyệt cột chính xác, cả hai bên góc) đều đứng được. `PathQueue` FIFO, mỗi bạn máy tối đa một yêu cầu, hạn mức 4 ms mỗi tick (luôn chạy ít nhất một).
- [x] `stepper.ts` (+test): đi theo chặng với tốc độ persona, `y` luôn là `feet` của cột dưới chân; lập kế hoạch từ cuối chặng đang đi (không lập lại từ cùng một điểm), cứ 8 ô hoặc 2 s khi kế hoạch chỉ tới biên, không quá 1 lần mỗi 2 s; kẹt sau 3 lần không tiến ≥ 1 khối, cấm cột 60 s; đi xe 3 s; ghi vết từng cột (≤ 600) cho pha 3.
- [x] Chỗ nối cho pha 3: `wander.ts` định nghĩa `GoalChooser.next(view, outcome)` (outcome: `start`, `arrived`, `rested`, `stuck`, `rode`) và bộ chọn tạm: 60% một nơi đang thấy, còn lại một chỗ đứng được trong tầm nhìn theo hướng ngẫu nhiên, quay về khi xa `home` > 160 khối; tới NPC/đồ vật thì `work` 3–7 s, nơi khác `rest`; ở bến xe 30% đi xe. `body.ts` nối stepper + chooser + hàng đợi; runner nhận `chooser` qua option.
- [x] Runner: gỡ `gather`, `escort`, `joinPlayer`/`goHome`/`nextOnTrail`, `walked`/`trails`, vòng 4 điểm và các hằng `BOTS_NEAR_PLAYER…GATHER_EVERY_S`; `visitFriend` đi bằng `local-path`; nhà riêng dùng lưới `nha-cua-be`, khách xuất phát ở `home` của hàng xóm; `server.ts` truyền `walk: new WalkStore()`. Test thay có chủ đích trong `multiplayer.test.ts`: bạn máy tự đi trên `lau-dai` 60 s, mọi bước thỏa `canStep`; người chơi ở xa không bị ai đi theo; map không có lưới thì đứng ở `home`.
- [x] Mô phỏng 10 phút (`body.sim.test.ts`, lưới thật `truong-hoc`, 10 bạn máy, seed cố định): mọi vị trí ở chỗ đứng, mọi bước thỏa `canStep`; thời gian kẹt 2,9% (< 5%).
- [x] Kiểm tra: `pnpm vitest run apps/server/src/friend apps/server/src/multiplayer apps/server/src/coop` 24 file / 181 test xanh; `pnpm --filter @miu/server typecheck` sạch; eslint `--max-warnings=0` các file đã sửa sạch.
- [x] Đo CPU (máy dev, chỉ phần thân + hàng đợi, 3.000 tick sau 600 tick khởi động): 100 bạn máy `truong-hoc` trung bình 0,20 ms/tick, p99 1,0 ms; 500 bạn máy `truong-hoc` 1,05 ms, p99 2,7 ms, tối đa 8,1 ms; 500 bạn máy `nui-tuyet` 1,23 ms, p99 3,1 ms; mỗi kế hoạch ~0,155 ms, hàng đợi không tồn. Runner đầy đủ với 112 bạn máy thật (11 map, không người chơi): đọc lưới 284 ms lúc `start`, tick trung bình 0,62 ms, p99 2,2 ms. Với nhà ở rải ngẫu nhiên ±150 khối, tỷ lệ kẹt 5,8% (`truong-hoc`) và 9,7% (`nui-tuyet`): pha 3 cần học tránh và đặt lại sau 20 s.

