# Debug: `bot-flow.test.ts` đỏ trên job `integration` (19/10/2026)

## Kết luận

Lỗi không do diff `84e84519..c47a2d4f`, cũng không phụ thuộc giờ trong ngày. Đây là một race có sẵn từ trước. Nó chỉ lộ ra trên Postgres thật vì ở đó mỗi truy vấn tốn vài ms thời gian thật, còn PGlite trong tiến trình thì nhanh tới mức gần như không bao giờ thua race. Có hai cơ chế, và cả hai đều đã tái hiện được trên máy dev bằng cách thêm độ trễ thật vào `catchUp`:

1. **Lỗi thật ở server, làm hỏng lần chạy đầu: 409 ở bước `thuong`.** Route bước quest gọi `partyQuests.recorded(...)` mà không chờ (`void`, `apps/server/src/quest/quest-routes.ts:202`), rồi trả lời ngay. Phần `catchUp` trong `recorded` mới là chỗ cho bạn máy theo qua trùm (`followBot`, `apps/server/src/coop/party-quest.ts`). Bước kế tiếp của bé đi qua `gate()`, mà `gate()` đọc `bot.own.done` trong bộ nhớ. Nếu `catchUp` của bước trước chưa xong thì bạn máy vẫn bị tính là chưa xong `trum` (một bước câu hỏi), nên `gate()` trả `party-waiting` và route trả 409. Ngoài game, lỗi này hiện thành toast "đang chờ cả đội" sai lúc (`apps/web/src/ui/quest/use-quest-controller.ts:263`) khi bé đi tiếp ngay sau trùm.
2. **Ngân sách thời gian giả của test, làm hỏng lần rerun: "not within 5000 ms: the bot follows her talk".** Hàm `until` chỉ đẩy đồng hồ giả 100 ms một lần, xen giữa là một `setImmediate`. Cả 5.000 ms giả chỉ ứng với vài ms thời gian thật, trong khi các truy vấn của `catchUp` trên Postgres chạy theo thời gian thật. Nếu `push` chưa về kịp trong vài ms đó, test báo đỏ, dù không có gì sai.

## Bằng chứng

- **Log CI.** Lần chạy đầu (job 117839939945) đỏ ở `bot-flow.test.ts:223`, 409 Conflict, và không có dòng "catch-up failed" nào. Lần rerun (job 117842819945) đỏ ở `:213`, "not within 5000 ms: the bot follows her talk". Test chạy 1.346 ms và 1.827 ms thật, tức là vài phút giả được nén vào chưa tới 2 s thật.
- **Lỗi có từ trước.** Đúng lỗi này đã xảy ra ở run 38343038164 (commit `d12afdf8`, 2026-10-13T03:44Z, 10:44 giờ Sài Gòn): `bot-flow.test.ts:223`, 409 Conflict. Run 38342593269 lúc 10:37 cùng ngày thì xanh, nên giả thuyết theo giờ trong ngày không đứng được.
- **Dòng `party quest catch-up failed Error`** có ở cả các run xanh (`guardian-fight.test.ts`, các job 117503869043 và 116127087172). Lỗi không có SQLSTATE, rất có thể là truy vấn chạy sau khi pool đã đóng ở teardown. Đây là tiếng ồn có sẵn, không phải nguyên nhân.
- **Diff `84e84519..c47a2d4f` trong server** chỉ đụng config, các route timetable và mail, và `parentWithChild(t, withChild, parent = fakeParent())`. Phần này giữ nguyên hành vi: trước đây `fakeParent()` được tạo bên trong hàm, nay là giá trị mặc định, kết quả như nhau.
- **Tái hiện trên máy dev (PGlite).** Tôi bọc tạm `PartyQuestService.prototype.catchUp` để ngủ thật N ms (dùng `node:timers/promises`, không bị đồng hồ giả chặn) trước khi chạy:

| Độ trễ thật thêm vào `catchUp` | Code gốc | Chỉ sửa test | Sửa cả hai |
|---|---|---|---|
| 0 ms | xanh | — | xanh (5/5) |
| 3 ms | **409 ở bước `thuong`** (giống lần chạy đầu) | 409 | xanh |
| 10 ms | **"not within 5000 ms: the bot follows her talk"** (giống lần rerun) | — | xanh |
| 30 ms | not within 5000 ms | 409 | xanh |
| 100 ms | — | — | xanh |

Chỉ sửa test thì 409 vẫn còn. Như vậy phần sửa ở server là bắt buộc, và lỗi 409 là lỗi của sản phẩm chứ không chỉ của test.

## Phần sửa (đã áp dụng)

1. `apps/server/src/coop/party-quest.ts`: trong `gate()`, chờ `await run.queue;` trước khi đọc trạng thái. Hàng đợi của run chỉ chứa việc với database (catch-up, nước đi của bạn máy), và các `.catch` đã bắt hết lỗi nên nó không bao giờ reject, cũng không chờ route nào, vì vậy không có nguy cơ khóa chết. `recorded()` nối catch-up vào hàng đợi một cách đồng bộ, trước khi route trả lời, nên bước sau của bé luôn thấy kết quả của bước trước.
2. `apps/server/src/multiplayer/bot-flow.test.ts`: khi `until` đã tiêu hết ngân sách giả, nó đợi thêm tối đa 2 s **thời gian thật** (`DB_GRACE_MS`) mà không đẩy đồng hồ giả. Việc chỉ chờ database vẫn kịp về, còn mọi thứ bạn máy làm theo đồng hồ giả vẫn bị giới hạn đúng như cũ. Test xanh thì không tốn thêm thời gian, vì phần chờ thêm chỉ chạy trước khi báo đỏ.

## Kiểm tra

- `pnpm vitest run apps/server/src/multiplayer/bot-flow.test.ts`: chạy 5 lần liên tiếp đều xanh (3,0–4,2 s), cộng thêm bảng độ trễ ở trên. Phần bọc tạm đã gỡ khỏi file.
- `pnpm vitest run apps/server/src/coop`: 5 file, 41 test xanh.
- `tsc --noEmit` cho `@miu/server`: exit 0. `eslint --max-warnings=0` trên 2 file đã sửa: exit 0.
- Chưa chạy được trên Postgres thật vì máy dev không có Postgres hay Docker. Bằng chứng cuối cùng sẽ là job `integration` trên CI.

## Phòng tái diễn

- Trong test có đồng hồ giả, đừng tính ngân sách bằng thời gian giả cho những gì chỉ chờ I/O thật (database). Nên chờ thêm một khoảng thời gian thật như `until` bây giờ.
- Hook kiểu fire-and-forget (`void recorded`) mà để lại trạng thái trong bộ nhớ thì phần đọc trạng thái đó (`gate`) phải chờ cùng hàng đợi đó.

## Câu hỏi còn mở

- Lỗi `party quest catch-up failed Error` không có SQLSTATE hiện ra cả ở các run xanh. Rất có thể đó là truy vấn chạy sau khi pool đã đóng ở teardown, nhưng chưa được chứng minh, vì log chỉ ghi `err.name`.
