# Pha 6 — Gặp người chơi: câu nói mới mỗi lần, chủ động kết bạn

**Tier:** M · **Chặn bởi:** 4, 5 · **Theo quyết định:** D4, D9 `balanced`, players = `perceive_and_choose`

**Trạng thái: XONG** 08/10/2026, commit `3ec88b1e`. Khác thiết kế:
- Không thêm `botSay`/`botDoing` vào hub: runner phát `bot-say` qua `room.broadcast(…, id, to)` (cùng đường với `broadcastChat`, lọc chặn và công tắc bạn máy); `bot-doing` khi spawn và cho người vào sau đã có từ pha 3 (`join()` → `showDoing()`, `welcome()`). `multiplayer-hub.ts` không đổi.
- "Một lần gặp" = cô bé vào tầm 6 khối sau khi đã ra khỏi tầm của bạn máy đó > 60 s (`APART_MS`); trong một lần gặp bạn máy chào một lần, sau ≥ 25 s có thể kể `doing` một lần.
- Không lặp trong 12 câu là tuyệt đối: hết biến thể mới trong giọng của nó thì chỉ vẫy (không lấy "biến thể ít gần nhất").
- D9 "70% sau nhiệm vụ chung" áp cho bạn máy nhớ cô bé qua `BotStore.recall` (đã thắng thử thách cùng nhau), từ lần gặp đầu; mỗi bạn máy mời một người tối đa một lần mỗi lượt server chạy.
- `found` khi xong một bước tại điểm đến (không phải bước cuối), `done` khi xong nhiệm vụ: sự kiện `news` mới của `Brain`; nói với người chơi gần nhất trong tầm nhìn còn được nói.
- Bộ học: `Brain.metPlayer(id)` trả thưởng gặp cho lựa chọn đang làm khi chào người đi ngang; lựa chọn `meet` vẫn được trả một lần khi kết thúc; `Brain.approaching` để bạn máy đang đi tới chỉ chào khi tới nơi.
- Ngoài danh sách file: `bot-persona.ts` (`talkChance`, dùng chung với câu nói trong voice), `bot-brain/brain.ts` (+test), test tích hợp `bot-meet.test.ts`.

**Số đo** (`bot-social.test.ts`, 5 bạn máy 3 giọng, 200 lần vào tầm): 10 phút: 5–14 câu (0,5–1,4 câu/phút); 60 phút: 59–84 câu (1,0–1,4 câu/phút); khoảng cách ngắn nhất giữa hai câu tới cô bé 6,0 s, giữa hai câu của một bạn máy 25,0 s; lặp trong 12 câu gần nhất: 0. Lời mời kết bạn: 0% lần gặp đầu, 35% từ lần thứ 2 và 70% khi nhớ nhau (2.000 lượt mỗi ca, test chấp nhận lệch < 5 điểm), 0 với bạn đã là bạn, ≤ 1 lời / 10 phút / người chơi. Tích hợp (`bot-meet.test.ts`, lâu đài, 4 phút): bạn máy đi tới, dừng cách 3,8 khối rồi chào, các câu cách nhau 6 s.

## Mục tiêu

Khi người chơi ở ≤ 6 khối (`INTERACT_RANGE`, `packages/schema/src/multiplayer.ts:51`), dù do bạn máy chọn `meet` (pha 3) hay chỉ tình cờ đi ngang, bạn máy quay về phía cô bé và chọn một hành động theo tình huống:

- chào lần đầu (`hello`); chào người quen (`again`, khi `BotStore.recall` có dòng);
- kể đang làm gì (`doing`, khi có nhiệm vụ);
- reo khi vừa xong một điểm (`found`) hay một nhiệm vụ (`done`);
- đôi khi rủ kết bạn (`friend` rồi gửi lời mời).

Không câu nào lặp với cô bé trong 12 câu gần nhất. Mỗi lần tương tác là phần thưởng "gặp" cho bộ học. Bạn máy không đi theo cô bé sau đó.

## Thiết kế

- `bot-social.ts` (thuần, nhận `now` và `random`), `class BotSocial`:
  - Bộ nhớ theo người chơi (mã công khai, chỉ trong RAM, xóa khi cô bé rời mọi room): `lastLineAt`, `recent` (12 `key:variant`), `lastFriendAskAt`, `meetings: Map<bot, count>`, `onlineSince`. Bộ nhớ theo cặp: `lastSaidAt`. Tổng số cặp có trần như `MAX_GREET_PAIRS` (`bot-runner.ts:200`). Không phần nào vào trí nhớ DB của pha 4.
  - `onMeet(bot, player, ctx)` trả `{ say?: BotLine, emote?, friendAsk?: boolean } | null`:
    - nhịp chung ≥ 6 s mỗi người chơi; nhịp cặp ≥ 25 s;
    - key theo tình huống;
    - biến thể bằng `freshPicker` theo giọng (cách ở `bot-runner.ts:982-994`), bỏ biến thể có trong `recent` (thử tối đa 4 lần, rồi lấy biến thể ít gần nhất);
    - `persona.chat` thấp thì có thể chỉ vẫy.
  - Mời kết bạn (thay `greeted` ở `bot-runner.ts:997-1010`, D9): 35% mỗi lần gặp từ lần thứ 2; ≤ 1 lời mỗi 10 phút cho mỗi người chơi (tính chung mọi bạn máy); bỏ qua bạn máy đã là bạn. Database chặn lời trùng (`friend_requests_child_bot`, `apps/server/src/db/schema.ts:416`).
- `bot-runner.ts`:
  - Thay khối chào (`:390-423`). Danh sách người chơi của room tính một lần mỗi tick; với bạn máy có người chơi ≤ 6 khối thì gọi `social.onMeet`, thực hiện kết quả qua hub, và báo `brain.reward('meet')` khi có tương tác.
  - `found`/`done` chỉ nói khi có người chơi trong tầm nhìn của bạn máy.
- `multiplayer-hub.ts`:
  - `botSay(botId, line, to?)`: phát `bot-say` (pha 5) cho những ai `roomSees` (cùng đường với `broadcastChat` `:103-108`).
  - `botDoing(botId, quest)`: phát `bot-doing`. Người vào room thì sau `welcome` (`:77-82`) nhận thêm `bot-doing` của mọi bạn máy đang bận mà cô bé thấy.

## Các bước

- [x] 1. `bot-social.ts` + test (đồng hồ giả):
   - nhịp 6 s và 25 s;
   - không lặp trong 12 câu khi 5 bạn máy cùng nói với một người trong 10 phút (seed cố định, 200 lần gặp);
   - xác suất và trần của lời mời kết bạn;
   - `again` chỉ khi có trí nhớ.
- [x] 2. Nối runner và hub; sửa `bot-voice.test.ts`, `hub-friends.test.ts` nếu dựa vào câu chào cũ (không test nào dựa vào câu chào cũ).
- [x] 3. Test hub: người vào room sau vẫn nhận `bot-doing`; người tắt bạn máy không nhận `bot-say` (`bot-meet.test.ts`, thêm: người bị chặn không nhận câu nói với cô bé).
- [x] 4. Test runner: bạn máy chọn `meet` thì dừng cách 3–5 khối, nói, rồi quay về kế hoạch (không bám theo khi cô bé đi tiếp).

## Rủi ro

- **Dồn câu khi nhiều bạn máy cùng thấy một người:** nhịp chung theo người chơi; bộ học còn trừ điểm `meet` khi cùng một người vừa được gặp.

## Kiểm tra

`pnpm vitest run apps/server/src/multiplayer/bot-social.test.ts` cùng các test hub và runner đã sửa; `pnpm typecheck`; `pnpm lint`.

## Rollback

Revert pha 6: quay về khối chào cũ; `bot-say`/`bot-doing` không còn được gửi.
