# Pha 9 — Ngân sách hiệu năng

**Tier:** M · **Chặn bởi:** 8 (cùng sửa `multiplayer-hub.ts`, `bot-runner.ts`)

**Trạng thái: XONG** 08/10/2026, commit `64f8da09` (não nhanh hơn, chọn y hệt), `d57c16ac` (lọc `move`, room trống 1 Hz, test tải). Điểm chốt "trong 5–10 s chào tạm biệt, cô bé bắt đầu nhiệm vụ chơi một mình thì bạn máy ở lại" làm trước, commit `7bc90db8`: server chỉ thấy nhiệm vụ chơi một mình qua `POST /quests/:id/steps/:step/complete`, nên `PartyQuestService.gate` báo bạn máy trong đội của cô bé mỗi bước cô thử (không thuộc run nào của đội), `recorded` báo khi cô xong run đó (`finished` mới trong `PartyQuestHooks.recorded`); bạn máy đang chờ chào thì ở lại, cô xong nhiệm vụ đó thì 5–10 s sau mới vẫy và rời đội. Cô bỏ dở nhiệm vụ thì bạn máy ở trong đội tới khi cô rời map hay rời đội.

Số đo (cùng máy dev, cùng seed; trước = `78b4e45b`/`7bc90db8`, sau = `d57c16ac`):

| Đo | Trước | Sau |
| --- | --- | --- |
| Não 500 bạn máy `truong-hoc` (nhà rải ±150, học 30 phút ở 2 Hz, đo 3.000 tick 10 Hz, hàng đợi 4 ms), tsx, 2 lượt | trung bình 2,70 / 2,71 ms, p99 6,08 / 6,20 ms; 20,5 kế hoạch/tick × 0,075 ms | 1,78 / 1,80 ms, p99 4,02 / 4,20 ms; 19,0 × 0,041 ms |
| Như trên, đóng gói esbuild như bản chạy thật | 2,68 / 2,70 ms, p99 6,02 / 6,02 ms, tối đa 8,0 / 11,0 ms | 1,64 / 1,63 ms, p99 3,74 / 3,82 ms, tối đa 6,7 / 6,8 ms |
| Một quyết định (`decide`, trung bình) | 0,063 ms | 0,038 ms |
| Runner, 500 bạn máy một room (thị trấn 800 × 800), 4 người chơi, phút đầu, đóng gói | 9,97 ms, p99 13,9 ms; 17.900 tin/giây tới 4 người chơi | 1,28 ms, p99 4,1 ms; 1.760 tin/giây |
| Như trên, 5 phút, tsx | 10,63 ms, p99 14,3 ms | 1,39 ms, p99 3,6 ms |
| `bot-load.test.ts` (vitest, fake timer, có đo đạc chen vào) | — | trí nhớ trống: 2,11 ms, p99 5,7 ms; trí nhớ đầy: 1,18 ms, p99 4,5 ms; chờ hàng đợi p95 0 ms; 263 lần ghi trong 60 s (≤ 1 mỗi bạn máy); 100 bạn máy, 5,9 ở gần: 111 tin `move`/giây tới cô bé |

Hành vi không đổi: vân tay tất định (vị trí, nơi, lối, Q của từng bạn máy) bằng hệt nhau giữa mã trước và sau ở 500 bạn máy × 11 phút và 100 bạn máy × 2 giờ (trí nhớ chạm trần 200 nơi); `learning.sim.test.ts` in đúng số cũ (biết ≥ 80% nơi, chuyến đi lại thẳng hơn 2,13 lần, kẹt 1,5%, hiệu suất 0,903 chỉ in) và `memory-restart.test.ts` vẫn 1,26 lần bạn máy từ 0.

Khác thiết kế:
- **Phần lớn số giảm nằm ở não, không ở hạn mức:** cùng lời giải nhưng ít việc hơn: A* không tạo closure mỗi lần, khoảng cách tới đích tính một lần mỗi cột, hàng đợi ưu tiên là mảng có sẵn (`Float64Array` chứ không `Float32Array`, để thứ tự lấy ra y hệt); gộp đoạn thẳng tìm từ ô xa nhất về và bỏ cột đã xét; `pickArea` chỉ xét ô cạnh ô đã đi (bitset mới trong `MemoryGraph`, dựng lại khi `restore`) và bỏ ô không thể vào danh sách; `seePlaces` sắp xếp chèn, softmax chọn 8 tốt nhất không sắp xếp cả mảng; `placeAt` tính một lần mỗi quyết định; không tra ô cấm khi bạn máy không có ô cấm.
- **Bạn máy xa:** ngoài 64 khối, một tin mỗi 2 s cho mỗi cặp, nhưng đổi việc (bắt đầu hay dừng đi, lên xe, vẫy) thì gửi ngay, để client không bao giờ thấy một bạn máy xa "đi tại chỗ". Lưu theo người chơi rồi theo bạn máy, xóa khi một bên rời room.
- **Không tin nào tới bạn máy về `move`** (cả của người chơi); room giữ thêm `people` (thành viên là người chơi) để không duyệt 500 bạn máy cho mỗi tin. Đây là phần lớn của 10 → 1,3 ms ở runner.
- **Room trống:** cộng dồn thời gian, đủ 1 s thì cho mỗi bạn máy bước `dt ≤ 1`; `presence` vẫn ghi qua `updatePresence` (không có người chơi nên không phát tin nào).
- **Đồng hồ:** runner đọc `Date.now()` một lần mỗi tick cho thân, não và `BotSocial` (ngoài tick vẫn đọc như cũ).
- **Test hub cũ:** chỉ `multiplayer.test.ts` "đi đúng luật" phải sửa: thêm một người chơi đứng xa để room chạy 10 Hz (ở 1 Hz bạn máy đi hơn một ô giữa hai lần đo). Thêm test đơn vị ở `multiplayer-hub.test.ts` cho luật gần/xa.
- **Ghi DB:** trung bình 4,4 lần/giây với 500 bạn máy (≤ 5); lệch pha theo băm id nên một giây riêng lẻ có thể nhiều hơn 5. Ngân sách RAM trí nhớ và RAM lưới đã có test ở `memory-graph.test.ts` và `walk-store.test.ts`, không lặp lại.
- **`bot-load.test.ts` chạy khoảng 4 s** (3 test); số in ra trong vitest cao hơn bản tsx/đóng gói của cùng kịch bản (2,11 so với 1,40 / 1,28 ms) vì môi trường test; assert rộng (< 10 ms) như kế hoạch.

## Ngân sách

| Mục | Ngân sách | Đo bằng |
| --- | --- | --- |
| Tick runner, 500 bạn máy (não đầy đủ), 4 người chơi | trung bình < 2 ms, p99 < 8 ms (máy dev) | `bot-load.test.ts` in số; assert rộng (trung bình < 10 ms) cho CI |
| Tìm đường cục bộ | ≤ 3.000 bước mở rộng mỗi lần, ≤ 1 lần mỗi 2 s mỗi bạn máy, tổng ≤ 4 ms mỗi tick | đếm trong test; hàng đợi pha 2 |
| Quyết định (Dijkstra ≤ 200 nơi, ≤ 600 lối, softmax) | < 0,1 ms | cùng test |
| RAM trí nhớ | ≤ 64 KB mỗi bạn máy; 500 bạn máy ≤ 32 MB | đo kích thước codec × hệ số |
| RAM lưới | ≤ 2,5 MB mỗi map, ≤ 30 MB cho 12 map | `process.memoryUsage` trước và sau khi nạp |
| Ghi DB | ≤ 1 lần mỗi 120 s mỗi bạn máy, lệch pha; ≤ 5 lần ghi mỗi giây cho cả server với 500 bạn máy | đếm trong test với `memoryBotStore` |
| Tin `move` tới một người chơi (100 bạn máy đang đi, ≤ 6 trong 64 khối) | ≤ 120 tin/giây | đếm cố định |
| Tin tới bạn máy (`move` của người khác) | 0 | đếm |
| Room không có người chơi | não chạy 1 Hz, không phát tin; **vẫn học** (online_only) | đếm |

## Thay đổi

- `MultiplayerRoom` (`multiplayer-hub.ts:62-122`):
  - `updatePresence` (`:84-96`): không gửi `move` tới thành viên là bạn máy.
  - Người gửi là bạn máy, người nhận là người chơi: cách ≤ `NEAR_MOVE_RANGE = 64` khối thì gửi mỗi lần; xa hơn thì tối đa một lần mỗi `FAR_MOVE_MS = 2000` cho mỗi cặp. Thời điểm gửi lưu trong `Map` của room theo `recipient|bot`, xóa khi một bên rời room. `presence` luôn cập nhật.
- `bot-runner.ts` `tick()` (`:794-808`):
  - Danh sách người chơi mỗi room tính một lần mỗi tick.
  - Room không có người chơi: cộng dồn `dt`, cho não bước mỗi giây (`stepper` nhận `dt ≤ 1`; phần chặn 0,2 ở `:796` chỉ áp cho room có người), ghi `presence` trực tiếp, không phát.
  - Không gửi `move` khi vị trí, hướng, tư thế không đổi.
- `bot-brain/local-path.ts`: dùng lại các mảng (`Float32Array`, `Int32Array`) theo kích thước cửa sổ lớn nhất để không cấp phát mỗi lần.

## Các bước

1. `bot-load.test.ts`: lưới tổng hợp 800 × 800 có nhà và đường (dựng trong test), 500 bạn máy từ trí nhớ trống và 500 bạn máy với trí nhớ đầy (200 nơi), 4 người chơi giả (transport đếm tin), 60 s fake timer. Assert theo bảng; in thời gian.
2. Cài đặt thay đổi; sửa test hub nào giả định mọi `move` tới mọi thành viên (`multiplayer-hub.test.ts`, `multiplayer.test.ts`).
3. Ghi số đo cho trang review (pha 10).

## Rủi ro

- **Bạn máy xa bị giật trên client:** ngoài vùng vẽ; tới gần thì đủ 10 Hz.
- **Hạn mức 4 ms làm bạn máy chờ lâu khi đông:** hàng đợi FIFO; test kiểm thời gian chờ p95 ≤ 2 s với 500 bạn máy.

## Kiểm tra

`pnpm vitest run apps/server/src/multiplayer/bot-load.test.ts` cùng test hub; `pnpm typecheck`; `pnpm lint`.

## Rollback

Revert pha 9: hành vi vẫn đúng, chỉ tốn tin và CPU hơn.
