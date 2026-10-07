# Debug: 6 E2E hỏng trên CI sau màn đấu boss (07/10/2026)

CI run 37627581794 (9aac2fd9) và 37628698618 (2b2478d6), so với mốc 37627177732 (f6a266ca), 37618106717 (9c0f2098), 37612032356 (2143e67f), 37542975177 và 37408448385 (d0cf7d3a), 37396508266, 37391520147, 37384877331.

## Kết luận

Trong 6 test, chỉ có hai test hỏng vì màn boss: `bosses.spec.ts:88` và `coop.spec.ts:160`. Code màn boss không có lỗi, cũng không làm game chậm hơn. Hai test này hỏng vì thiết kế mới cho trận đấu diễn trong thế giới đang vẽ: trước đây màn hình boss làm game dừng vẽ, còn bây giờ mỗi thao tác Playwright phải chờ một khung hình. Trên máy CI vẽ bằng GPU giả lập, một khung hình mất khoảng 0,8 s. Thời gian chờ của test vẫn được đặt theo kiểu cũ, khi game còn dừng. Bốn test còn lại hỏng vì các điều kiện có từ trước màn boss.

| Test | Nguyên nhân | Do màn boss? | Cách sửa |
|---|---|---|---|
| `bosses:88` | Trận đấu diễn trong thế giới đang vẽ (khoảng 3,8 khung/s trên CI), mỗi thao tác tốn 0,8–3,6 s; một lần "nạp chiêu" tốn khoảng 20 s; test 45 s mới chơi xong được nửa câu đầu | Có (thiết kế mới, không phải lỗi code) | Helper rẻ hơn, tách thành 3 test, mỗi test khai `test.setTimeout` 90 s kèm lý do |
| `coop:160` | Như trên, nhưng có 2 trang cùng vẽ: mỗi click 5,3 s, trong khi phần chuẩn bị đã chiếm khoảng 71 s trong tổng 90 s | Có (như trên) | Hưởng phần helper rẻ hơn; timeout nâng lên 150 s kèm lý do |
| `pets:128` | Chưa từng chạy trên CI. Màn chào chạy theo thời gian game (tối đa 4 s + 1,6 s), mỗi khung hình chỉ cộng tối đa 0,1 s; CI chạy 2,4 khung/s nên cần 12–23 s, mà test chỉ chờ 10 s | Không (A/B: f6a266ca hỏng y hệt) | Chờ tối đa 30 s, `setTimeout` 60 s kèm lý do |
| `forest-life:157` rain-rainbow | Số draw call phụ thuộc số bot online trong tầm nhìn lúc đo: 2 bot cho 133, 8 bot cho 181. Test đã hỏng ở 2143e67f (152) | Không (A/B: 170–173 so với 171–175) | Không sửa trong đợt này (xem mục "Còn mở") |
| `hud-layout:112` phone | Thẻ nhiệm vụ tự thu gọn sau 12 s tính từ lúc mount, nên `hud-tracker` biến mất trước khi test đo. Test đã hỏng ở 2143e67f | Không | Đã sửa ở 2b2478d6 (đếm từ lúc map sẵn sàng); test PASS ở run 37628698618 |
| `play:116` | Lần lưu vị trí định kỳ 10 s chạy ngay sau khi bé dừng bước; lúc rời trang, vị trí trùng nên không gửi PUT, và `waitForResponse` chờ mãi | Không (race có sẵn) | Hỏi server xem vị trí đã được lưu chưa, thay vì chờ đúng một PUT |

## Bằng chứng

### `bosses:88` và `pets:128` chưa từng chạy trên CI trước màn boss

`playwright.ci.config.ts` đặt `maxFailures: 10`. Ở cả 9 run mốc (từ 05/10 đến f6a266ca), shard 4 đều có kết quả `10 failed, 8 did not run`: shard dừng ở `pets:94`. Vì vậy `pets:110`, `pets:128` và toàn bộ `bosses.spec` nằm trong nhóm "did not run". Ở run boss, thứ tự chia shard đổi đi, shard 4 chạy xa hơn nên lần đầu tiên chạm tới hai test này. Nói cách khác, "PASS ở f6a266ca" thực ra là "không chạy".

### Màn boss không làm game chậm hơn; cái tốn là số thao tác khi game vẫn đang vẽ

Số khung hình mỗi giây trong trace CI (từ `__miuStats.frames`):

- Trận boss (`duel: staged`, quality=low): 3,7–3,9 khung/s, 45 draw call.
- Chơi bình thường trên các test khác cùng run: `play` 4,3–4,9; `maps` 3,4–6,7; `pets` 2,3–2,8; `interactions` 1,1–3,3; `online` 1,5–1,8 khung/s.

Thời gian của từng thao tác trong trace `bosses:88` trên CI:

- Trước khi vào trận (lúc thoại che game): `toContainText` 7 ms, click 86–269 ms.
- Từ lúc trận được dựng trong thế giới: mỗi `Evaluate` hoặc `expect` khoảng 770 ms, mỗi click khoảng 3,6 s, `scrollIntoViewIfNeeded` 3,1–3,5 s, `boundingBox` 2,0 s, `tap` 1,5 s.
- `answerBoss` cũ gọi `tap()` riêng cho từng lần chạm. Một lần "nạp chiêu" chạm 3 lần nên tốn khoảng 3 × (3,3 + 2,0 + 1,5) ≈ 20 s. Ở giây thứ 45, test vẫn đang ở lần trả lời sai đầu tiên của câu 1.

Các test có game đang vẽ khác cũng chịu chi phí tương tự (`online` click 5,3 s, `pets` click 4,2–9,6 s, `interactions` evaluate 1,0–1,75 s). Đây là đặc điểm của máy chạy CI, không phải của trận boss.

`game.ts` khi không có trận: `DuelStage.update` thoát ngay (`if (!this.active || !this.boss) return`). `CameraRig` dùng nhánh `blend <= 0`, giống hệt `lookAt` cũ. Màn boss không thêm mesh nào: hạt dùng chung lớp particle của map. Vì vậy ngoài lúc đánh boss, code mới không làm thay đổi draw call hay khung hình.

### `pets:128`

- Trace CI: frames tăng từ 4 lên 24 trong khoảng 8 s, `petScene` vẫn là `greet` suốt thời gian đó, 104 draw call.
- `dt = Math.min(timer.getDelta(), 0.1)` (`game.ts:1009`). Màn chào dài tối đa `REACH_TIMEOUT` 4 s + `MOTION_SECONDS.greet` 1,6 s (`pet-life.ts`), tính theo thời gian game.
- A/B trên máy dev, SwiftShader + `taskpolicy -b` (cùng điều kiện), mỗi bên chạy 2 lần: HEAD hỏng 2/2, f6a266ca hỏng 2/2, cùng lỗi `Received: "greet"`.

### `forest-life:157` rain-rainbow (draw call)

- Trace CI: mẫu đầu 133 call với 2 bot (`remotePlayers`), mẫu lúc đo 181 call với 8 bot. Riêng 6 bot đã thêm 48 call.
- Run 2143e67f (trước màn boss) đã hỏng với 152; fireflies cũng hỏng với 162.
- A/B trên máy dev bằng SwiftShader, mỗi bên 3 lượt, 8 bot: **HEAD 170 / 172 / 173**, **f6a266ca 171 / 172 / 175**. Không có thay đổi do màn boss.

### `play:116`

Trace mạng trên CI: lệnh PUT `/api/player-positions` trả 204 lúc 105,36 s, tức là trong lúc test đang `waitForTimeout(500)`, 11,4 s sau khi mở trang (timer `SAVE_SPOT_MS = 10_000`). `waitForResponse` bắt đầu lúc 106,72 s. Khi rời trang, `createPositionSaver` thấy vị trí không đổi (`sameSpot`) nên không gửi PUT nữa. Ảnh chụp lúc hỏng cho thấy trang đã về Home.

### `hud-layout:112`

Ảnh chụp lúc hỏng chỉ có nút thu gọn "Mở nhiệm vụ hiện tại", không còn `hud-tracker`. Trong trace, test đo tracker ở 13,5 s, sau khi map sẵn sàng ở 5,1 s. Bản 9aac2fd9 đếm 12 s từ lúc mount nên thẻ đã thu gọn trước khi test đo. Bản 2b2478d6 đếm từ lúc map sẵn sàng.

## Thay đổi (chỉ có test E2E, không đổi code sản phẩm)

- `apps/web/e2e/quest-api.ts`
  - `answerBoss`: chỉ đọc field một lần (lấy move và kiểu chạm). Mỗi câu trả lời chỉ đợi đáp án đứng yên và đọc vị trí một lần, kể cả rune 3 chạm. Riêng orbs: quả cầu trôi giữa lúc đọc vị trí và lúc chạm, nên chạm lại tối đa 3 lần cho đến khi đáp án ở trạng thái "aimed" (khi chạy local, một lần chạm orb đã trượt). Trên CI, chi phí một lần nạp chiêu giảm từ khoảng 20 s xuống khoảng 9 s.
  - `skipBossBeat`: gộp 3 lượt hỏi trang thành 1 `evaluateAll`.
  - `copied`: tìm thẻ bằng `exact: true`. Khi chạy chậm, thẻ cuối quest "Chép vào vở nhé!" đã hiện kịp và khớp chuỗi con, làm `toHaveCount(0)` hỏng (tái hiện được ở throttle 30×).
- `apps/web/e2e/bosses.spec.ts`: tách test 88 thành 3 test theo `docs/code-standards.md` (vượt ngân sách thì tách nhỏ). Cả 3 dùng chung `FIGHT_TIMEOUT_MS = 90_000`, có ghi lý do:
  1. Mở trận từ hội thoại, trận diễn trong thế giới, HUD và joystick ẩn, phím không làm bé di chuyển, một đòn đúng, thẻ vở, HP giảm, boss nói câu thoại.
  2. Ba lớp hỗ trợ và hai đòn trượt (vào trận bằng helper `fightUnderWay`: đi qua `gap` bằng API).
  3. Các câu 2–4 tới phần thưởng (câu 1 làm qua API). Mỗi câu kiểm move đúng theo content, có một lần kéo thật. Còn việc "không lặp move" thì Node đã kiểm cho mọi content (`guardian-content.test.ts`), nên E2E không kiểm lại.
  Ảnh review vẫn giữ đủ tên (2, 3, 3b, 4, 5).
- `apps/web/e2e/coop.spec.ts`: timeout 90 s lên 150 s, có ghi lý do (70 s chuẩn bị đo trên CI, cộng khoảng 25 bước 1–5 s khi hai game cùng vẽ).
- `apps/web/e2e/pets.spec.ts`: chờ màn chào kết thúc tối đa 30 s (trước là 10 s), `setTimeout` 60 s, có ghi phép tính thời gian game.
- `apps/web/e2e/play.spec.ts`: thay `waitForResponse(PUT)` bằng poll `GET /api/player-positions` cho tới khi server có vị trí cách chỗ bé dừng dưới 1,5 khối.

Không đổi ngân sách draw call, ngân sách shard 480 s, hay code trong `apps/web/src`.

## Kết quả

E2E chạy local, 1 worker, lần lượt:

- Cấu hình dev chuẩn: `bosses` 7 PASS (2 skip REVIEW_SHOTS), `coop` 4 PASS (`coop:160` 7,4 s), `play:116` PASS 7,6 s, `pets:128` PASS 7,4 s.
- SwiftShader (như CI): 3 test boss mới × 3 lượt và "less motion" × 3 lượt đều PASS. `coop:160` × 2 PASS (42–46 s). `pets:128` PASS (101 call khi rảnh, 94 call lúc tắm). `play:116` PASS. rain-rainbow PASS × 3 trên cả hai cây.
- SwiftShader + throttle CPU 30× (lúc này `evaluate` 200–350 ms, vẫn nhanh hơn CI): 3 test boss PASS trong 45–66 s. Hai test `bosses:65` và `:246` hết 45 s vì throttle làm lần tải map đầu lên 28 s (trên CI chỉ 4–8 s), đó là sai số của cách giả lập.
- Trước khi sửa, SwiftShader: T3 hỏng 3/3 ở câu gem (đọc vị trí lúc boss còn lảo đảo) và một lần ở câu orbs. Đó là lý do giữ lại bước chờ đứng yên và thêm chạm lại cho orbs.

Gate: `assets:check` OK (16 packs, 4632 files); `content:check` OK (2038 files); `typecheck` OK (web gồm cả `e2e/**`, server); `lint` OK (`--max-warnings=0`, 0 warning); `pnpm --filter @miu/web build` OK (vẫn còn các cảnh báo cũ: chunk > 500 kB và JSON import của `configLoader native`); `security:dist` OK. Không chạy vitest vì không đổi file nào thuộc vitest (chỉ đổi spec Playwright, đã được typecheck và lint kiểm).

## Còn mở

1. **CI E2E hỏng có hệ thống vì máy chạy CI vẽ bằng GPU giả lập ở 1–5 khung/s.** Ở mọi run từ 05/10 có 20–28 test hỏng, và shard 4 luôn chạm `maxFailures` nên 8 test không bao giờ chạy. Các test hỏng trong danh sách mốc (pets 56/83/94, interactions, maps rides, online…) cùng một loại. Bản sửa này không đụng tới chúng. Cần một quyết định riêng: tăng số shard, dùng runner có GPU, hay hạ độ phân giải khi chạy E2E.
2. **rain-rainbow với 8 bot là 170–181 call, vượt 150** (có từ trước màn boss). Có hai hướng: tối ưu draw call của nhân vật bot (khoảng 8 call mỗi bot), hoặc đo trước khi bot tới. Đây là quyết định sản phẩm và hiệu năng, không thuộc phạm vi đợt này.
3. **`hud-layout:112` vẫn còn biên mỏng.** Sau 2b2478d6, test đo ở khoảng giây thứ 9 sau khi map sẵn sàng, trong khi thẻ thu gọn ở giây thứ 12. Runner chậm hơn khoảng 30% là sẽ hỏng lại. iPad portrait/landscape vốn đã hỏng từ trước.
4. Chưa đo được thời gian thật của các test đã sửa trên CI (không push). Ước tính trên CI từ trace: T1 khoảng 46 s, T2 khoảng 58 s, T3 khoảng 76 s, `coop:160` khoảng 125 s.

## Ghi chú quy trình

- Trong lúc làm, tôi lỡ gõ `git checkout -p` (với stdin rỗng). Git dừng ở câu hỏi đầu tiên và không bỏ thay đổi nào: `git status` và `git diff --stat` sau đó vẫn còn nguyên hunk của file memory code-reviewer. Các file UI của phiên `miu-world-03` biến khỏi `git status` là vì phiên đó đã commit `eed65398`.
- File cấu hình tạm `apps/web/playwright.slow.config.ts` và hook throttle tạm trong `bosses.spec.ts` đã xóa. Cây export `release-f6a266ca` trong scratchpad có thêm một file config tạm.
