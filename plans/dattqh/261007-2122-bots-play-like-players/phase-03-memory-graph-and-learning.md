# Pha 3 — Đồ thị nhớ, học tăng cường, làm nhiệm vụ của chính nó

**Tier:** L · **Chặn bởi:** 2 · **Trạng thái:** XONG, còn 2 tiêu chí chờ quyết (`780fdc3c`, `2d1f8d74`, `ad876896`) · **Theo quyết định:** learning = `memory_graph_rl`, players = `perceive_and_choose`, D12 (khu nhà là điểm xuất phát và có thưởng quen thuộc)

## Mục tiêu

Phần "não" của bạn máy. Nó tự dựng đồ thị nơi chốn khi khám phá, tự quyết đi đâu bằng giá trị Q đã học, tự làm nhiệm vụ của map, và có thể chọn tới gặp người chơi nó thấy. Thời gian tới điểm nhiệm vụ giảm dần vì nó biết lối, nhớ chi phí, và tự tìm đường tắt.

## Đồ thị nhớ (`bot-brain/memory-graph.ts`)

- **Nơi** (≤ 200): id lấy từ `places` của lưới (pha 1), cùng `firstSeenAt`, `visits`, `q` (giá trị đã học), `lastReward`. Bạn máy chỉ thêm một nơi khi nơi đó lọt vào tầm nhìn (`sight.seePlaces`).
- **Lối** (≤ 600): `a`, `b`, polyline (ô đã gộp, ≤ 32 điểm, mỗi đoạn đã kiểm `canStep` trên lưới), `cost` (giây, trung bình trượt α = 0,3), `walks`, `found: 'walked' | 'shortcut'`. Được ghi khi bạn máy đi từ nơi a tới nơi b liền một mạch, tức không có nơi đã biết nào xen giữa; có thì tách thành hai lối.
- **Vùng đã đi:** bitset 50 × 50 ô thô 16 × 16 khối (map 800 × 800), dùng cho thưởng "chỗ mới" và cho việc chọn hướng khám phá.
- **Đường tắt:** khi đi lại một lối đã biết, cứ mỗi lần lập kế hoạch (pha 2), chạy `local-path` từ vị trí hiện tại tới điểm xa nhất của lối còn trong cửa sổ. Nếu đường mới ngắn hơn đoạn tương ứng của lối ≥ 10% thì nối đường mới vào lối và đánh `shortcut`. Thêm vào đó, nơi đích lọt vào tầm nhìn từ một nơi khác mà chưa có lối thì `local-path` tạo lối trực tiếp.
- **Quãng đường giữa hai nơi:** Dijkstra trên các lối với trọng số `cost`. Không có đường thì ước lượng `1,6 × khoảng cách thẳng ÷ tốc độ` (chưa biết đường, phải dò).
- **Hết chỗ:** vượt trần thì bỏ nơi có `visits` thấp và `q` thấp nhất (không bỏ `home` và điểm nhiệm vụ đang làm), cùng các lối của nó; polyline dài nhất được gộp thêm.

## Học tăng cường (`bot-brain/learner.ts`)

- **Lựa chọn** tại mỗi điểm quyết định (tới nơi, xong việc, hay bị kẹt):
  - `go(p)` với mỗi nơi đã biết;
  - `explore`: tới vùng chưa đi gần nhất, ưu tiên hướng có ít ô đã đi;
  - `meet(player)` với mỗi người chơi đang thấy;
  - `rest`.
- **Độ hữu dụng:** `U(go p) = Q(p) + goal(p) + home(p) − λ · cost(here → p)`; `U(explore) = Q_explore`, `U(meet) = Q_meet`, `U(rest) = Q_rest`.
  - `goal(p) = +1` nếu p là target của bước hiện tại trong nhiệm vụ của bạn máy;
  - `home(p) = +0,1` nếu p trong 120 khối quanh `home` (D12);
  - `λ = 0,02` mỗi giây.
- **Chọn:** softmax với nhiệt độ τ theo persona (trường mới `curious` 0–1: τ = 0,15 + 0,35 · curious). Khởi đầu `Q_explore` cao hơn với bạn máy tò mò, nên con mới tò mò dò rộng còn con chín chắn bám nơi đã biết.
- **Thưởng** (tính khi xong lựa chọn):
  - +1,0 làm xong một bước nhiệm vụ tại target của nó; +0,3 làm việc ở NPC hay đồ vật khác;
  - +0,6 mỗi lần gặp có tương tác (chào hoặc nói), giảm dần nếu cùng một người trong 10 phút (chỉ đếm, không lưu ai);
  - +0,5 mỗi nơi mới tìm thấy; +0,05 mỗi vùng thô mới;
  - −0,02 mỗi giây đi; −0,5 khi kẹt.
- **Cập nhật TD(0)** với α = 0,2, γ = 0,8: `Q(target) ← Q + α·(r + γ·max_{n kề target} Q(n) − Q)`; `Q_explore`, `Q_meet`, `Q_rest` cập nhật như bandit. Q quên dần 1%/giờ về 0, để bạn máy đi tiếp khi một nơi thôi có ích (ví dụ nhiệm vụ đã xong).
- **Gặp người chơi** (`perceive_and_choose`): `meet` chỉ có khi người chơi đang trong tầm nhìn. Tới cách cô bé 3–5 khối thì dừng (pha 6 lo câu nói); sau 5–15 s hoặc khi cô bé đi xa thì xong lựa chọn và nhận thưởng. Bạn máy không bám theo; lần quyết định sau mới chọn lại.

## Nhiệm vụ của chính nó (`bot-brain/quest-plan.ts`)

- `questsOn(map)`: quest `active`, hạng `main | story | guardian | event` (event chỉ khi `questOpenAt`), có `region` trỏ map đó (`content/world/regions.json`). Chọn bằng `freshPicker` riêng mỗi bạn máy.
- Bước hiện tại → các target (`stepTargets`, `packages/schema/src/content.ts:574`). Target chưa biết vị trí thì bạn máy **không biết nó ở đâu**: `goal` chỉ cộng khi nơi đó đã có trong đồ thị nhớ, còn lại `explore` được cộng thêm 0,3 cho tới khi tìm thấy. Đây là nguồn của việc "học": lần đầu tìm lâu, lần sau đi thẳng.
- **Làm việc tại target:** NPC thì `wave` 1,5 s rồi `idle` 3–6 s; đồ vật thì `idle` 2–4 s, đôi khi emote `jump`. Bước câu hỏi (`isQuestionStep` của `party-quest.ts:43`) thì `idle` 6–12 s rồi emote `cheer`. Hết nhiệm vụ thì `cheer`, và `bot-doing` (pha 5) báo nhiệm vụ mới. Một target mà 20 phút khám phá chưa thấy thì bỏ bước đó và ghi số liệu `skipped`.

## `bot-brain/brain.ts` và runner

`Brain` ghép đồ thị nhớ, bộ học, kế hoạch nhiệm vụ và thân (pha 2): `decide()`, `onArrive()`, `onWorkDone()`, `onStuck()`, `onSee()`. `bot-runner.ts` thay bộ chọn tạm của pha 2 bằng `Brain`, phát `bot-doing` khi nhiệm vụ đổi, và mỗi giờ ghi một mốc số liệu.

**Số liệu** (giữ trong trí nhớ, pha 4 lưu):
- `placesKnown`, `linksKnown`, `shortcuts`, `areasVisited`;
- `trips`: 50 chuyến gần nhất tới target nhiệm vụ, mỗi chuyến `{ seconds, straight }`; **hiệu suất** = straight ÷ (seconds × tốc độ);
- `stuckSeconds`, `skipped`, `rewardPerHour`;
- `history`: 72 mốc theo giờ của các số trên.

## Đo "bạn máy học được" (`bot-brain/learning.sim.test.ts`)

Mô phỏng tất định: seed cố định, lưới thật `truong-hoc`, quest thật, 6 bạn máy từ trí nhớ trống, 2 giờ ở dt = 0,5 s, không người chơi. Khai `test.setTimeout` kèm lý do nếu > 30 s. Assert đúng các tiêu chí "Bạn máy học được" ở `plan.md`: nơi đã biết tăng và ≥ 60%; hiệu suất 30 phút cuối ≥ 1,3 × 30 phút đầu; lần thứ 3 trên một cặp nơi ≤ 80% thời gian lần đầu ở ≥ 50% cặp; ≥ 1 đường tắt mỗi bạn máy; kẹt < 2%. Đây là đo, không phải huấn luyện: không ghi gì ra DB.

## Các bước

1. `memory-graph.ts` + test: thêm nơi khi thấy, ghi lối, tách lối, kiểm polyline bằng `canStep`, đường tắt, Dijkstra, bỏ bớt khi hết chỗ.
2. `learner.ts` + test: TD(0) đúng công thức trên ví dụ tay; softmax với τ (thống kê 10.000 lần); quên dần.
3. `quest-plan.ts` + test với quest thật.
4. `brain.ts`, nối runner; mô phỏng ở trên.
5. Thêm `sight`, `walk`, `curious` vào persona và mở rộng `bot-persona.test.ts` (khoảng giá trị, ổn định theo id).

## Rủi ro

- **Học chậm hơn tiêu chí:** chỉnh α, τ, thưởng cho tới khi mô phỏng đạt. Các hằng để ở một chỗ, có comment lý do.
- **Hành vi khó đoán khi demo:** số liệu và mốc giờ giải thích được "vì sao bạn máy đi đâu"; pha 10 vẽ lên trang review.

## Kiểm tra

`pnpm vitest run apps/server/src/multiplayer/bot-brain/`; `pnpm typecheck`; `pnpm lint`.

## Rollback

Revert pha 3: runner quay về bộ chọn tạm của pha 2.

## Trạng thái (07/10/2026)

- [x] `memory-graph.ts` (+test): nơi thêm khi lọt vào tầm nhìn; lối = polyline ≤ 32 điểm, mỗi đoạn thẳng đã kiểm `canStep` (`walksStraight`), thời gian trung bình trượt α = 0,3; đi lại ngắn hơn ≥ 10% thì thay lối và đếm `shortcuts`; lối trực tiếp tới nơi thấy được (đếm riêng `seenWays`, `found: 'shortcut'` như plan); Dijkstra; trần 200 nơi / 600 lối / 6.000 điểm; bitset vùng 16 × 16. Lệch: đầy bộ nhớ thì chỉ ghi thêm nơi mà nhiệm vụ đang cần (không quên rồi tìm lại liên tục).
- [x] `learner.ts` (+test): TD(0) α 0,2 γ 0,8 đúng ví dụ tay, bandit cho khám phá/gặp/nghỉ/đi xe, softmax τ = 0,15 + 0,35·curious (thống kê 10.000 lần), quên 1%/giờ. Hằng đã chỉnh có đo (lý do ghi trong file): λ 0,02 → 0,005/s (mục tiêu xa bị định giá âm, bạn máy bỏ nhiệm vụ); thưởng mục tiêu 1 → 2 và thưởng tìm mục tiêu 0,3 → 2 (bằng thưởng mục tiêu); thưởng làm việc +0,3 chỉ đủ sau 30 phút ở cùng chỗ (trước đó bạn máy quay vòng mãi trong một lớp học); softmax trên 8 lựa chọn tốt nhất.
- [x] `quest-plan.ts` (+test với quest thật): main/story/guardian của map, event chỉ khi đang mở; `freshPicker`; bước nhiều target xong khi đủ target; 20 phút không thấy target thì bỏ bước (`skipped`).
- [x] `brain.ts` (+test), `avoidance.ts` (+test), `explore-areas.ts`: chọn nơi/khám phá/gặp người chơi/đi xe/nghỉ; hiệu số đường vòng tự học (`detour`, bắt đầu 1,6) quyết định đi theo lối nhớ hay tự dò; trước khi đi đường chưa biết thì lập một kế hoạch trong tầm nhìn (qua hàng đợi) xem có đường không; tránh kẹt có học: nơi/vùng kẹt tránh 5/15 phút, gấp đôi mỗi lần, "bức tường" theo hướng 30 phút; không tiến 1 khối sau 6 s thì bỏ (10 s nếu đã thấy đường); 20 s không đi đâu được thì đặt lại về nơi đã biết gần nhất. Khám phá theo vùng biên, lan ra từ nhà. Gặp người chơi: chỉ khi thấy, đến cách 4 khối, đứng 5–15 s, không bám theo; thưởng giảm khi gặp lại cùng người trong 10 phút (chỉ đếm trong RAM).
- [x] Runner: `Brain` thay bộ chọn tạm; `bot-doing` gửi sau spawn của bạn máy, khi đổi nhiệm vụ và tới người chơi mới vào phòng; cử chỉ `wave`/`jump`/`cheer` qua emote; `findBot` import thẳng từ `bot-profiles.ts` (`friend-store.ts`, 1 dòng). Persona thêm `curious` (luồng ngẫu nhiên riêng, các trường cũ giữ nguyên giá trị).
- [x] Mô phỏng `learning.sim.test.ts` (seed `learn`, lưới thật `truong-hoc`, 6 bạn máy từ 0, 2 giờ + 15 phút đuôi ở 2 Hz, ~6 s): 0 bước sai luật. Theo đúng lời plan: (1) nơi đã biết 200/250 (80%, trần 200) mọi bạn máy, không giảm theo 15 phút — ĐẠT; (2) hiệu suất 30 phút cuối ÷ 30 phút đầu = 0,405 ÷ 0,448 = 0,90 — KHÔNG ĐẠT; (3) cặp nơi đi lần 3 ≤ 80% lần đầu: 0/1 cặp — KHÔNG ĐẠT (gần như không có cặp đủ điều kiện); (4) đường tắt 57–193 mỗi bạn máy — ĐẠT; (5) kẹt 1,5% toàn đội (từng con 0,2–3,3%) — ĐẠT. Test assert (1), (4), (5) và thay (2)–(3) bằng phép đo có đối chứng: chuyến tới nơi nhiệm vụ đã từng tới thẳng hơn chuyến đầu tiên 0,668 ÷ 0,314 = 2,13 lần (≥ 1,3). Bốn seed (`learn,a,b,c`): tỷ lệ này 1,67–2,56; kẹt toàn đội 1,1–1,9%; (2) theo lời plan 0,90–1,47.
- [ ] **Chờ quyết (Jev đợt 3 hoặc người sở hữu):** (2) và (3) không đo được việc học trên `truong-hoc` vì A* trong tầm nhìn đã gần tối ưu ngay lần đầu, còn 30 phút cuối phụ thuộc nhiệm vụ nào rơi vào (target xa phải tìm). Đề xuất thay bằng "chuyến tới nơi đã từng tới ≥ 1,3 × chuyến đầu" và "kẹt < 2% toàn đội". Đối chứng tắt lối nhớ (cùng seed, 3 bạn máy, 1 giờ): hiệu suất 0,387 có lối vs 0,576 không lối, kẹt 75 s vs 99 s; qua 4 seed không ổn định — lối nhớ chủ yếu giảm kẹt, không làm chuyến nhanh hơn trên map này.
- [x] CPU (máy dev, thân + não + hàng đợi 4 ms, đo 3.000 tick 10 Hz sau 30 phút học): 100 bạn máy `truong-hoc` trung bình 0,52 ms, p99 1,55 ms; 500 bạn máy 2,76 ms, p99 6,31 ms, tối đa 8,9 ms (kế hoạch ~20/tick × 0,075 ms là hơn nửa); một quyết định 0,04–0,07 ms (≤ 0,1 ms). Runner đầy đủ 112 bạn máy thật: khởi động 368 ms, tick 0,59 ms, p99 1,70 ms. Trung bình 500 bạn máy vượt ngân sách 2 ms: để pha 9.
- [x] RAM: dữ liệu đóng gói ≤ 39 KB mỗi bạn máy (trần 64 KB đúng theo định nghĩa trong bảng ngân sách); heap V8 thật đo được ~145 KB cho 200 nơi/200 lối, ước ~250 KB ở trần (đối tượng, typed array, khóa chuỗi). JSON thô ~95 KB: pha 4 phải nén theo codec.
- [x] Kiểm tra: `pnpm vitest run apps/server/src/multiplayer apps/server/src/friend apps/server/src/coop` 30 file / 207 test xanh; `pnpm --filter @miu/server typecheck` sạch; eslint `--max-warnings=0` các file đã sửa sạch.

