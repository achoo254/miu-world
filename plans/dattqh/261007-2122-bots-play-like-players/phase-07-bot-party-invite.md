# Pha 7 — Bạn máy rủ vào tổ đội

**Tier:** M · **Chặn bởi:** 6 · **Theo quyết định:** D5 `two_step_reuse`, D6 `player_leads`, D9 `balanced`, D11 `wave_and_leave`, players = `perceive_and_choose`

**Trạng thái: XONG** 08/10/2026, commit `09473868`. Khác thiết kế:
- "Online ≥ 3 phút" đo bằng thời gian cô bé ở quanh bạn máy (`BotSocial` ghi từ lần quét đầu thấy cô bé trong một room có bạn máy, hay lần gặp đầu); hub không giữ giờ kết nối, và mỗi lần qua cổng là một kết nối mới.
- Lời mời chỉ xét khi bạn máy tới lượt nói (nhịp chung 6 s của cô bé), một lần mỗi lần gặp, lúc chào hay sau câu chào ≥ 25 s; lời mời luôn đi kèm câu `invite`. Thẻ chỉ được gửi khi `hub.botMayInvite` đúng: cùng room, ≤ 6 khối, cô bé thấy bạn máy, không đi xe, không ai ở tổ đội, không có lời mời nào đang chờ cô bé.
- Không có timer: `BotSocial` giữ lời mời đang chờ, runner hỏi `lapsed()` mỗi tick (61 s sau khi gửi). Bạn máy mời rồi rời mọi map (nhà đóng) mà cô bé vẫn bấm nhận thì hub trả `invite-expired`, không lập đội.
- `PartyService.reply()`: đội mới lập với người chơi làm trưởng khi người mời là bạn máy; bạn máy vào đội thì các lời mời của chính nó mất hiệu lực (bạn máy không dẫn). Thêm `invitedTo()`.
- `Brain.share(goal)` (mục tiêu chung của đội: quest + targets của bước) có từ pha này nhưng chưa ai gọi; pha 8 đặt nó từ party quest. Tới target chung được trả như một bước, nhiệm vụ riêng giữ nguyên chỗ cũ.
- D11 ở pha này: "run kết thúc" là co-op của đội kết thúc (`coopDriver().forget`); 5–10 s sau bạn máy vẫy, nói `bye`, rời đội, trừ khi lại đang chơi co-op. Pha 8 thêm run party quest. Cô bé sang room khác (map khác hay nhà khác) hoặc tắt bạn máy thì rời ngay (kiểm mỗi giây); cô bé đang tải map (không ở room nào) thì chờ, quá hạn giữ chỗ 30 s thì đội tự tan.
- Chỉ đội do bạn máy rủ mới theo D11; bạn máy được người chơi mời vẫn như cũ.
- Ngoài danh sách file: `bot-persona.ts` (`inviteChance` = 0,25 + 0,5 × chat), `bot-brain/brain.ts` (+test), `multiplayer.test.ts` (test "bạn máy nhận lời mời" dùng người chơi thật thay id giả `p-someone`, vì hub phân biệt người chơi bằng hồ sơ). Không đổi `apps/web`: client đã hiện thẻ mời có nhãn bạn máy.

**Số đo:** `bot-social.test.ts`: tỷ lệ mời 0,25 (chat 0) và 0,75 (chat 1) trên 2.000 lượt mỗi ca, lệch < 0,05; nhịp 5 phút, 3 lần/giờ, chờ 15 phút sau khi từ chối hay hết hạn, báo hết hạn đúng 61 s. Tích hợp (`hub-bot-party.test.ts`, lâu đài, đồng hồ giả): lời mời đầu tiên sau ≥ 3 phút; nhận lời thì cô bé làm trưởng, bạn máy nói `yay`; cô bé sang map khác thì bạn máy rời đội trong ≤ 1,5 s và ở lại map của nó; từ chối thì `later` và 5 phút sau không có lời mời nào nữa; hết hạn thì `later` sau 61 s; co-op kết thúc thì vẫy, `bye`, rời đội sau 5–10 s; tắt bạn máy thì rời trong ≤ 1,5 s.

## Mục tiêu

Bạn máy rảnh đang gặp đúng người chơi thì nói câu `invite` và gửi thẻ mời tổ đội sẵn có.

- **Nhận lời:** đội lập với người chơi làm trưởng; pha 8 rủ cả đội làm một nhiệm vụ. Trong đội, bạn máy vẫn tự đi bằng trí nhớ của nó tới điểm của nhiệm vụ chung, **không bám theo** cô bé.
- **Từ chối hoặc 60 s không trả lời:** bạn máy nói `later`, quay về việc của mình, và không mời lại trong thời gian chờ.

## Điều kiện mời (tất cả phải đúng)

- **Bạn máy:** không ở tổ đội, không đang chơi co-op, đang ở lựa chọn `meet` hay đứng cạnh cô bé; `random() < 0.25 + 0.5 * persona.chat`.
- **Người chơi:**
  - online ≥ 3 phút; gặp bạn máy này ≥ 2 lần (`meetings`, pha 6);
  - không ở tổ đội; bật bạn máy (`player.bots`); không ẩn nhau (`roomSees`); ≤ 6 khối; không đi xe;
  - không có lời mời nào đang chờ cô bé trả lời.
- **Nhịp (D9):** ≤ 1 lời mời mỗi 5 phút cho mỗi người chơi, tối đa 3 lần/giờ, chờ 15 phút sau khi bị từ chối hay hết hạn.
- **Map:** có lưới (pha 1) và có ≥ 1 nhiệm vụ chơi được theo đội (`party-quest.ts:120-126`).

## Thiết kế

- `party-service.ts`:
  - `reply()` (`:91-106`): đội mới lập với người chơi làm trưởng (`this.create(this.isPlayer(from) ? from : to)`), rồi thêm thành viên kia. Bất biến "bạn máy không dẫn" (`:33-37`) giữ được cả khi bạn máy mời.
  - `invite()` không đổi; giới hạn của người mời áp cho bạn máy (`:78-80`).
- `multiplayer-hub.ts`:
  - `botPartyInvite(botId, publicId): boolean`: các kiểm tra như `invite()` của người chơi (`:893-902`) nhưng phía người mời là bạn máy; sau đó `parties.invite(botId, publicId)` và gửi `party-invite` với `from.isBot = true` (schema sẵn có `:186-190`; client đã hiện được, `multiplayer-session.ts:217-221`).
  - `botLeaveParty(botId)`: tách các bước của nhánh `party-leave` (`:669-673`: `leftParty`, `parties.leave`, `pushParty`, `recheckHomes`) thành một hàm riêng, dùng chung cho người chơi và bạn máy.
- Trả lời đi đường cũ (`answerPartyInvite` `:493-513`). Từ chối thì `invite-declined` tới bạn máy qua `deliver`, và `heard()` (`bot-runner.ts:886`) nhận được. Hết hạn thì `PartyService` chỉ bỏ lời mời đi, không báo ai; vì vậy `bot-social.ts` giữ một timer ở `PARTY_INVITE_TTL_MS + 1 s`.
- `bot-runner.ts`:
  - `heard()` thêm `party-state` (vào đội: hủy timer, nói `yay`) và `notice` `invite-declined` (nói `later`, đặt thời gian chờ).
  - **Trong đội:** `Brain` nhận mục tiêu chung, là target của bước hiện tại trong party quest (pha 8). Mục tiêu này thay cho nhiệm vụ riêng, và bạn máy tìm đường bằng trí nhớ của nó. Bạn máy vẫn có thể chọn `meet` với bạn cùng đội khi thấy cô bé (thưởng như pha 3).
  - **Rời đội (D11 `wave_and_leave`):** run kết thúc hoặc cô bé rời party quest thì 5–10 s sau bạn máy vẫy, nói `bye`, gọi `hub.botLeaveParty`, trừ khi trong lúc đó cô bé bắt đầu nhiệm vụ hay co-op mới. Cô bé sang map khác thì bạn máy rời đội ngay (kiểm mỗi giây trong tick).

## Các bước

- [x] 1. `party-service.test.ts`: bạn máy mời, người chơi nhận lời, thì `leader` là người chơi; các test cũ xanh nguyên.
- [x] 2. `hub-bot-party.test.ts` (mới, dựng hub như `hub-friends.test.ts`): người chơi nhận được tin mời; không mời khi tắt bạn máy, đã ở tổ đội, đứng xa hay bị ẩn; nhận lời thì `party-state` tới cả hai với leader là người chơi; `botLeaveParty` kết thúc đội hai người.
- [x] 3. `bot-social.test.ts` thêm các ca: điều kiện và nhịp ở trên; hết hạn thì nói `later` và chờ 15 phút.
- [x] 4. Test runner (fake timer): sau khi vào đội, mục tiêu của `Brain` là target chung; cô bé đổi map thì bạn máy rời đội trong ≤ 1,5 s.

## Rủi ro

- **Đổi `reply()`:** chỉ nhánh lập đội mới đổi, và người mời là người chơi thì kết quả y như cũ.
- **Thẻ mời chen vào lúc đang làm bài:** điều kiện ≥ 3 phút, ≥ 2 lần gặp cộng nhịp D9 giữ thẻ hiếm; thẻ nhỏ, hết hạn sau 60 s.

## Kiểm tra

Các test ở trên; `pnpm typecheck`; `pnpm lint`.

## Rollback

Revert pha 7; thay đổi ở `reply()` là một dòng, revert riêng được.
