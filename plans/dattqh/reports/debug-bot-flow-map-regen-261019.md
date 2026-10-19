# Debug: `bot-flow.test.ts` đỏ sau khi sinh lại map trường học (19/10/2026)

CI run 39202137606 (commit `a2d6a3e0`, chỉ đổi nội dung) đỏ ở cả job `check` và `integration`:
`not within 240000 ms: a bot chooses to walk over to meet her` (`apps/server/src/multiplayer/bot-flow.test.ts:175`).

## Kết luận

Hành vi bot không có lỗi; lỗi nằm ở test. Ngay từ khi viết (`f047774c`, 08/10), cảnh "bot đi tới gặp bé" trong test chỉ là một lượt rút thăm may mắn. Mỗi bot đi làm một quest thật của trường. Khi đang tìm chỗ của mục tiêu quest, lựa chọn `explore` được cộng `SEEK_BONUS = 2` (cùng mức với `GOAL_BONUS`, `bot-brain/learner.ts:26,35`). Lựa chọn `meet` chỉ có giá trị 0,6, và softmax chạy ở nhiệt độ 0,15–0,5. Nhờ vậy bot đang làm quest rất hiếm khi đi tới gặp người chơi, đúng chủ ý thiết kế ("at 2 it mostly keeps to its quest"). Seed 2 tình cờ trúng một lượt chọn `meet`. Commit `a2d6a3e0` dời và thêm các place trong `content/world/walk/truong-hoc.json`, làm lệch chuỗi số ngẫu nhiên, nên lượt trúng đó mất.

## Bằng chứng

| Kiểm tra | Kết quả |
|---|---|
| `git diff 6499bc31 a2d6a3e0 -- content/world/walk/truong-hoc.bin` | Không đổi: lưới chỗ đứng y hệt, chỗ của bé vẫn snap về `[400.5, 13, 328.5]` |
| `truong-hoc.json` | Đổi `places`: các NPC như `co-tong-phu-trach-lan`, `cho-doi-truong`, `huou-dem-co` dời chỗ, thêm và bớt các place `st-*` |
| Quest bot dùng (`schoolQuest()`) ở cả hai commit | Cùng là `toan2-cd1-b01`, cùng các bước. Loại trừ giả thuyết quest mới chen lên đầu |
| Test với lưới mới, seed 2 | Đỏ, chắc chắn mỗi lần (tái hiện local) |
| Test với lưới cũ (`git archive 6499bc31`), seed 2 | Xanh. Như vậy chỉ riêng `places` đã đủ đổi kết quả |
| Quét seed 1–12, lưới mới | 1/12 xanh (seed 11) |
| Quét seed 1–12, lưới cũ | 1/12 xanh (seed 2) |
| Đo trong 4 phút ảo (seed 2, lưới mới) | 4 bot quyết định 85 lần khi đang thấy bé (`explore` 69, `rest` 16), 0 lần `meet`; cả 4 bot đều đang có quest và ở trạng thái tìm mục tiêu |

Ước lượng xác suất mỗi lần quyết định khi bot đang tìm mục tiêu: lựa chọn `explore` ≈ 0,3 + 0,6·curious + 2, lựa chọn `meet` = 0,6. Xác suất chọn `meet` khoảng e^(−(1,7+0,6c)/τ), tức từ 0,0003% đến 1%.

Các giả thuyết đã loại trừ:
1. Lưới chỗ đứng đổi làm chỗ của bé lệch hoặc đường đi khác: loại, vì `.bin` không đổi.
2. Quest mới của trường chen lên đầu `questsOn`: loại, vì quest được chọn giống hệt nhau.
3. Lỗi trong bot (không bao giờ chọn gặp): loại. Khi không có quest riêng, 40/40 seed đều gặp; trị số thưởng đúng như thiết kế đã ghi trong comment của `learner.ts`.

## Cách sửa (chỉ sửa test)

`apps/server/src/multiplayer/bot-flow.test.ts`:
- Bot vẫn có bộ quest chứa party quest (`QUEST.id`) để mời nhóm chơi, nhưng không còn bước nào của riêng nó phải đuổi theo (`steps: []`). Test bỏ `contentQuestBook()` và quest thật của trường. Bot vẫn đi trên lưới thật và giữa các place thật của trường; chuyện gặp bé là lựa chọn của chính "trí" bot, không bị bộ quest lấn át.
- Chỗ đứng của bé lấy từ chỗ đứng gần tâm nhà của 4 bot nhất (từ profile cộng snap trên lưới), thay cho số cứng `(400, 328)`.
- Không đổi assertion nào; các bước sau (nói chuyện, vẫy tay, mời nhóm, chơi quest, trả thưởng như chơi một mình, rời nhóm) giữ nguyên.

Những gì test không còn chạy: bot tự đi làm quest thật của trường trước khi gặp bé. Phần này chưa từng được assert. Hành vi bot làm quest riêng đã có test riêng: `bot-brain/quest-plan.test.ts` và `learning.sim.test.ts`.

## Các lần chạy

- Test đã sửa, 20 seed × 2 lưới (mới và cũ), trên một bản sao tạm cho phép đặt seed: 40/40 xanh. Bot đi tới gặp bé sau 9,2–49,7 s trên đồng hồ của test (giới hạn 240 s, dư khoảng 5 lần).
- `pnpm vitest run apps/server/src/multiplayer/bot-flow.test.ts`: 5/5 xanh, mỗi lần khoảng 2,5–2,8 s.
- `pnpm --filter @miu/server typecheck`: 0 lỗi. `eslint --max-warnings=0` cho file test: 0 lỗi, 0 cảnh báo.
- Chưa chạy bộ đầy đủ hay E2E ở local (theo CLAUDE.md); cần CI xác nhận sau khi push.

## Phòng tái diễn

- Test tích hợp có bước ngẫu nhiên không được dựa vào một seed "chọn tay" cho một sự kiện hiếm. Cảnh trong test phải xảy ra với hầu hết seed (ở đây là 40/40).

## Câu hỏi còn mở

- Khi đang làm quest, bot gần như không bao giờ chủ động đi tới người chơi nó thấy (dưới 1% mỗi lần quyết định). Đó là chủ ý thiết kế; tôi không đổi. Nếu muốn bot "sống" hơn với người chơi, có thể xem lại cách `meet` cạnh tranh với `GOAL_BONUS`/`SEEK_BONUS`. Đây là quyết định sản phẩm.
