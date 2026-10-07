# Pha 8 — Bạn máy cùng làm party quest

**Tier:** L · **Chặn bởi:** 7 · **Theo quyết định:** D6 `player_leads`, D7 `random`, D8 own_part (xem câu xác nhận 1 trong `plan.md`), D11

**Trạng thái: XONG** 08/10/2026, commit `5aa16e7d` (server), `78b4e45b` (thẻ party quest trên web). Khác thiết kế:
- **Không sửa `server.ts`:** runner gắn driver vào hub (`hub.setPartyQuestBots`, giống `setHomeRoomHooks`), `PartyQuestHost` có thêm `present(id)` và `bots()`; `PartyQuestService` không nhận `bots` qua options.
- **Chọn nhiệm vụ (D7):** runner chọn bằng `chooseBotPartyQuest(book, map, now, random)` trên `QuestBook` sẵn có của nó (cùng loại main/story/guardian/event đang mở), rồi `hub.botProposeQuest(bot, player, questId)`; service kiểm lại `playable()`. Không thêm bảng region → map vào `ContentCatalog`.
- **Bạn máy cũng chơi run do người chơi mở:** bạn máy của đội đang đứng trong một room vào run ngay khi run mở (bạn máy luôn nhận lời); bạn máy vào đội giữa chừng thì không vào run đang chơi. Nhờ vậy "cô bé bắt đầu nhiệm vụ mới trong lúc chờ 5–10 s thì bạn máy ở lại" có nghĩa. Thẻ web vẫn chỉ hiện nút "Cả đội cùng chơi" khi đội có ≥ 2 người chơi (không đổi).
- **Bước của bạn máy:** bước không phải câu hỏi (chung, phần thưởng, kết) bạn máy chỉ đánh dấu xong khi một người chơi đã làm (kể cả bước người chơi bỏ qua theo nhánh); câu hỏi (trừ trùm) nó tự trả lời khi chỉ số ≤ bước xa nhất của người chơi (`front` = −1 khi chưa ai vào); ở trùm, service đưa sẵn lượt chưa trúng (`blow`) khi tới lượt nó. Bạn máy không rẽ nhánh ở `decision`.
- **Thời gian nghĩ:** `thinkMs` của persona (median 8 s vì party quest không có số liệu ẩn danh) chặn 4–12 s; sai thì thử lại sau 2–5 s (không cộng thêm một lần nghĩ đủ), sai tối đa 2 lần. XP kỹ năng của bạn máy ghi như co-op (`chanceOf`/`learnt` tách từ `coopAnswer`, co-op giữ nguyên thứ tự xúc xắc). Bạn máy tới target chung thì `Brain` trả như một bước (có sẵn từ pha 7), không thêm `brain.reward`.
- **Kết thúc (D11):** khi mọi người chơi trong run đã xong, service báo `finished` một lần và không cho bạn máy chơi run đó nữa; runner `store.remember`, `BotSocial.playedWith` (biết cô bé như sau một thử thách thắng chung, mời kết bạn 70% qua đúng trần của pha 6; kết quả `recall` đến muộn không ghi đè), rồi vẫy và rời đội sau 5–10 s trừ khi lúc đó bạn máy đang chơi co-op hay một run mới. Run kết thúc vì cô bé "Để sau", rời run, hay bạn máy rời đội cũng dẫn tới vẫy và rời đội như vậy.
- **Web:** `party-quest-card.tsx` thêm 🤖 trước tên bạn máy (người rủ, danh sách, đang chờ, lượt trùm). Không đổi schema.

**Số đo:** `bot-party-quest.test.ts` 7 test (chọn đều 3 nhiệm vụ trên 3.000 lượt, mỗi cái lệch < 100; đi sau ở bước chung; chỉ trả lời khi người chơi đã tới, nghĩ đúng 4 s / 12 s ở hai đầu; sai tối đa 2 lần, thử lại sau 3,5 s; lượt trùm; bỏ câu đã qua; hết run khi đủ bước hay người chơi xong). `party-quest.test.ts` 6 test, PGlite, `recordStep` thật: run do bạn máy rủ (bạn máy dẫn, cô bé được mời), bạn máy theo sau bước chung, `party-waiting` tới khi bạn máy trả lời, nước đi sai lượt bị bỏ qua, trùm bạn máy đánh trước và đòn được catch-up ghi cho cô bé (HP 100), báo `finished` một lần; **thưởng:** `paidRuns` 1, mọi dòng sổ thưởng (nguồn, XP, xu, XP kỹ năng, số đồ rơi) và tiến độ của cô bé bằng đúng người chơi một mình; DB chỉ thêm 1 dòng `quest_progress` và đúng số dòng sổ thưởng của cô bé. "Để sau" kết thúc run; bạn máy rời room thì không giữ ai; bạn máy rời đội thì run kết thúc; run người chơi mở có bạn máy chơi cùng. `hub-bot-party.test.ts` thêm 1 test runner: rủ nhiệm vụ của map 1–2 s sau khi cô bé nhận lời, `bot-doing` hiện nhiệm vụ của đội, nhớ cô bé trong store, ở lại khi cô bé bắt đầu run mới trong lúc chờ, vẫy và rời đội 5–10 s sau khi run đó kết thúc. `bot-social.test.ts` thêm 1 test: mời kết bạn sau khi chơi xong 0,70 trên 2.000 lượt, đúng trần 10 phút, `recall` đến muộn không làm quên.

## Mục tiêu

Sau khi vào đội, bạn máy rủ cả đội làm một nhiệm vụ của map hiện tại qua party quest sẵn có. Cô bé thấy thẻ "{bạn máy} rủ cả đội chơi «…»" (`party-quest-card.tsx:41-63`; chuỗi `vi.json:1142`); bấm Vào thì nhiệm vụ tải như hôm nay. Bạn máy là thành viên của run: hiện trong danh sách, số bước tăng; nó tự tìm đường tới target của bước bằng trí nhớ (pha 3), "nghĩ" rồi trả lời câu hỏi của nó, và đánh trùm khi tới lượt. Thưởng của cô bé y như chơi một mình (trả qua `recordStep`); bạn máy không bao giờ được ghi tiến độ hay trả thưởng.

## Thiết kế trong `PartyQuestService` (`apps/server/src/coop/party-quest.ts`)

- **Chú thích đầu file** (`:9`): sửa thành "bạn máy chơi như thành viên ảo, tiến độ của nó chỉ ở trong bộ nhớ".
- **Thành viên bạn máy:** `Member` thêm `bot: boolean`; thành viên bạn máy có `own: MemberState` trong bộ nhớ, và `state()` (`:226`) trả `own` thay vì đọc DB.
- **`propose(botId, playerId)`** (mới; server gọi, không có tin client): bạn máy và người chơi phải cùng đội, và đội chưa có run.
  - Chọn nhiệm vụ theo D7 `random`: hàm thuần `chooseBotPartyQuest(quests, random)` trong `bot-party-quest.ts` chọn đều trong các nhiệm vụ `playable()` (`:120-126`) có `region` trỏ map hiện tại.
  - Run mới: `leader = botId`, `members = {bot}`, `invited = {player}`, rồi `push`.
- **`present(id)`:** thêm vào `PartyQuestHost` (`:35-37`). Hub trả `players.has(id)` cho người chơi, và "đang đứng trong một room" (`locate`) cho bạn máy. `bossTurn` (`:251`), `gate` (`:272`) và `view` (`:362`) dùng `present` thay `online`.
- **Run phải có người chơi:** sau `drop` (`:166-172`) hay `partyChanged` (`:203-215`), không còn thành viên hay người được mời là người chơi thì `end(run)`. Ví dụ cô bé bấm "Để sau" là run kết thúc.
- **`catchUp`** (`:292-334`): chỉ gọi `recordStep` cho thành viên người chơi. Đòn trúng trùm của bạn máy nằm trong `own.found`; `bossTurn.landed` (`:249`) đọc mọi thành viên, nên đòn đó tính cho đội như đòn của một thành viên người.
- **Báo driver:** sau mỗi `push`, gọi `bots.play(botId, situation, moves)`.

## Driver (`bot-party-quest.ts`, runner cài đặt; cùng kiểu với `CoopBotDriver` ở `coop-service.ts:31-47`)

```ts
interface PartyQuestBotDriver {
  play(botId: string, s: { quest: ActiveQuest; front: number; own: MemberState; turn: string | null }, moves: { done(stepId: string): void; blow(stepId: string, turnId: string): void }): void;
  forget(botIds: readonly string[]): void;
}
```

Luật theo D8 own_part. Bạn máy không bao giờ đi trước người chơi xa nhất (`front`).

- **Bước làm chung** (`isSharedStep` `:41`): bạn máy đặt target của bước làm mục tiêu cho `Brain` (pha 7) và đánh dấu xong khi một người chơi đã làm (đi sau, không làm trước).
- **Câu hỏi** (`isQuestionStep` `:43`, trừ `boss`), chỉ số ≤ `front`:
  - sau `thinkMs` của persona (chặn trong 4–12 s), với xác suất `rightChance` thì `done`;
  - sai thì thêm 2–5 s rồi nghĩ lại; đã sai 2 lần thì lần sau đúng.
- **Trùm:** `turn === botId` thì nghĩ rồi tính `rightChance`.
  - Đúng: `blow(step, turnId)` với lượt kế tiếp chưa trúng (`step.turns`; server biết đáp án như `catchUp` `:306-307`).
  - Sai: nghĩ lại; lượt vẫn là của nó, như người chơi.
- **Ghi nhận:**
  - Câu trả lời của bạn máy **không** vào `BotStore.recordAnswer` (số liệu ẩn danh chỉ của người chơi).
  - `addSkillXp` cho bạn máy như ở co-op (`bot-runner.ts:704-710`).
  - Xong một bước tại target thì `brain.reward('quest-step')`. Nhờ vậy học tăng cường của pha 3 cũng học từ việc làm cùng đội.

## Runner và hub

- `bot-runner.ts`:
  - Thấy `party-state` có cô bé (pha 7) thì sau 1–2 s gọi `hub.botProposeQuest(bot, player)`, và hub chuyển tới `partyQuests.propose`.
  - Cài `PartyQuestBotDriver` với timer giữ như `coop` (`:555`), dọn trong `stop()`.
- **Run kết thúc** khi cô bé đã xong:
  - `store.remember(bot, childId, questId, now)` (`bot-store.ts:32`; bảng `bot_memories` có sẵn, không phải trí nhớ thế giới của pha 4);
  - mời kết bạn 70% (D9, qua trần của pha 6);
  - rời đội theo D11 (pha 7).
- `server.ts:85`: `new PartyQuestService({ ..., bots: botRunner.partyQuestDriver() })`.

## Các bước

1. `bot-party-quest.ts` + test: `chooseBotPartyQuest` chỉ chọn trong map và phân bố đều (seed cố định); luật driver với fake timer (đi sau ở bước chung, trần thời gian nghĩ, sai tối đa 2 lần, lượt trùm).
2. `party-quest.test.ts` (PGlite, `recordStep` thật):
   - `propose` lập run với bạn máy dẫn và cô bé ở danh sách mời; cô bé `join` rồi làm bước chung thì bạn máy theo sau.
   - Cô bé bị `party-waiting` cho tới khi bạn máy trả lời câu trước; bạn máy rời room thì không giữ ai.
   - Trùm 4 lượt: lượt theo thứ tự vào run (`bossTurn` `:251`; bạn máy là người rủ nên đi trước); đòn của bạn máy được catch-up ghi cho cô bé.
   - **Thưởng:** `paidRuns` của cô bé là 1, sổ thưởng bằng đúng một run chơi một mình; không có dòng `quest_progress` hay sổ thưởng nào của id bạn máy.
   - Bấm "Để sau" thì run kết thúc; run của người với người vẫn như trước (mọi test cũ xanh).
3. Nối runner và server; test runner: kết thúc run thì `remember`, có thể mời kết bạn, rời đội sau 5–10 s.

## Rủi ro

- **D8 đổi sang `watch_only`:** bỏ `done` của câu hỏi và `blow`; bạn máy chỉ đi theo `Brain` và không bao giờ giữ đội chờ (`gate` bỏ qua thành viên `bot`).
- **Khóa đội:** `present` sai khi bạn máy không còn trong room; driver có trần 12 s; `stop()` dọn timer.

## Kiểm tra

`pnpm vitest run apps/server/src/coop/party-quest.test.ts apps/server/src/coop/bot-party-quest.test.ts` cùng test runner; `pnpm typecheck`; `pnpm lint`.

## Rollback

Revert pha 8: `propose` không còn ai gọi; bạn máy đã vào đội chỉ đi theo mục tiêu riêng rồi rời đội.
