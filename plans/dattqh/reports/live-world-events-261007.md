# Sự kiện có thời hạn và cổng Olympic Toán: báo cáo 07/10/2026

Plan: `plans/dattqh/261004-1617-live-world-events/plan.md`. Pha 1, 2, 3, 4, 6, 6b xong phần tự động. Pha 5 (bảng xếp hạng nhóm) và pha 7 (đo tải) bỏ qua vì chờ `moderation-safety`. Chưa commit, chưa deploy. Không có migration và không thêm dependency.

Màn luyện đề và thi thử Olympic Toán đang chạy trên production vẫn còn, mở từ nút "Luyện Olympic" trên Home và từ trang sự kiện. API của màn này đổi hình dạng (xem pha 6b), nên server và web phải deploy cùng một lần. Lịch sử thi đã có trên production vẫn đọc được vì nguồn ledger `olympiad:exam:<điểm>:<giải>:<id>` giữ nguyên.

## Đã làm theo từng pha

Phần lớn mã do agent trước viết. Phiên này kiểm từng phần với tiêu chí của plan, sửa chỗ thiếu, thêm test và chạy gate.

### Pha 1: sự kiện là dữ liệu

- Mỗi sự kiện là một file `content/events/<id>.json`, schema ở `packages/schema/src/live-event.ts` (đã commit trong `9bd39a17`). File gồm tên và lời song ngữ, các cửa sổ theo giờ Việt Nam (`live`, sau đó `commemorative`), quest `wonder-*`, phần thưởng giới hạn (mỗi phần thưởng có bản kỷ niệm) và cảnh trên map.
- Quest loại `event` (`packages/schema/src/content.ts`) phải mở bằng hội thoại ở nhân vật sự kiện, có ít nhất hai cơ chế, không dùng minigame, và boss phải có lời phản hồi. Vật phẩm có thêm loại `badge` (`item.ts`).
- `pnpm content:check` kiểm các điểm sau:
  - id không trùng, tên file khớp id;
  - cửa sổ đúng thứ tự, không chồng lên nhau, cửa sổ đầu là `live`;
  - quest có thật và cùng khu vực với sự kiện;
  - mỗi quest sự kiện thuộc đúng một sự kiện;
  - huy hiệu có trong `content/items`, đồ mặc có `"unlock": { "award": true }`;
  - icon có trong `UI_ICONS`;
  - nhân vật trong cảnh không trùng id với target của map và đứng trong lõi map.
- Phiên này gỡ `EXTRA_EVENT_DIR` và tham số `extraEventDir` vì không nơi nào dùng (không có E2E nào nạp event fixture). Server test dùng `eventsDir` của `loadContentCatalog`.

### Pha 2: server

- `apps/server/src/event/` gồm `event-catalog.ts` (kiểm lúc khởi động), `event-rewards.ts` và `event-routes.ts` (`GET /api/events`, `GET /api/events/:id`). Server chỉ trả sự kiện đang mở hoặc sắp mở trong `announceDays`, và trạng thái theo đồng hồ của server.
- `quest-access.ts` có `questOpenAt`. Khi cửa sổ đóng, quest sự kiện biến khỏi `/api/quests`, còn bước và lớp hỗ trợ trả 409 `event-closed`. Chế độ chơi theo đội cũng kiểm như vậy (`party-quest.ts`).
- Thưởng giới hạn được trả trong cùng transaction với bước cuối của quest hoặc với bài thi thử. Nguồn ledger là `event:<sự kiện>:<thưởng>[:commemorative]`, nên mỗi loại cửa sổ chỉ trả một lần. Đồ đã nhận giữ mãi, và Hành trình hiện chúng như vật phẩm.

### Pha 3: giao diện

- Home có banner cho từng sự kiện (M1.1). Chip trên banner ghi "Còn N ngày", hoặc "Sắp mở · Mở từ ngày …" trước giờ mở. Khi có sự kiện, thanh rail có mục "Sự kiện"; mục "Luyện Olympic" luôn có.
- Trang sự kiện (M1.6) có lời chào kèm tên nhân vật của người chơi, các ngăn đã mở, tiến độ từng phần thưởng, điểm thi thử cao nhất, nút "Tới cổng ngay" và nút "Vào luyện tập".
- Màn Phần thưởng sự kiện hiện trong chuỗi hoàn thành quest và ở kết quả thi thử.
- Bảng quest của khu vực có nhóm "Nhiệm vụ sự kiện". Quest sự kiện không tính là bài học và không được gợi ý thành "bài tiếp theo".

### Pha 4: cảnh sự kiện trên map

- Cảnh là một lớp đặt lên map lúc chạy, không sinh lại map. Code ở `packages/voxel/src/event-layer.ts` và `apps/web/src/game/event/event-layer.ts`.
- Khi đồng hồ server mở hoặc đóng sự kiện, màn chơi gửi lệnh `set-event-open`. Nhân vật và đồ trang trí hiện ra hoặc ẩn đi ngay, các ô va chạm cập nhật theo.
- Audit cảnh vật và audit tầm với đọc map có cả cảnh sự kiện. Build web copy các model của cảnh (`vite-repo-assets.ts`).

### Pha 6: sự kiện đầu "Thử thách Olympic Toán" ở Khu rừng

- File `content/events/olympic-math-2026.json`: cửa sổ live từ 06/10 đến hết 31/10/2026, mở lại bản kỷ niệm từ 01/09 đến hết 30/09/2027.
- Cảnh có năm người giữ ngăn, vòm cổng, bảng đề, cờ, đèn, khinh khí cầu và lều, đặt hai bên đường mòn phía nam bến tàu "bãi rừng 1" (đã dời khỏi chỗ xuất hiện, xem mục "Sửa E2E hỏng do cảnh sự kiện").
- Năm quest `wonder-olympic-{logic,arithmetic,number,shapes,counting}`, mỗi quest 10 câu tự viết. Chúng dùng các cơ chế find-object, sort, drag-drop, logic, classify, multi-select, connect, cùng một bước decision và một boss 6 câu.
- Phần thưởng: mở đủ năm ngăn thì được mũ nhà toán học. Bài thi thử đạt 20/40/60/80 điểm thì được bốn huy hiệu tương ứng. Mỗi phần thưởng có bản kỷ niệm (8 huy hiệu, 2 mũ; ảnh mũ sinh bằng `render-accessory-art.ts`, đã có trong manifest).
- Không có chữ "TIMO" trong nội dung hay giao diện. Test `olympiad-catalog.test.ts` chặn chữ này, và `grep` cũng không tìm thấy trong `content`, `apps`, `packages`, `tools`. Dòng "cổng TIMO" trong `docs/project-roadmap.md` đã đổi thành "cổng Olympic Toán".
- Kiểm chống trùng với tài liệu gốc (chỉ chạy trên máy, không commit gì): tôi trích chữ của `bai-tap-lop-2/content/TIMOK2.pdf` bằng pypdf rồi so với 872 dòng (đề, hướng dẫn, gợi ý, lời giải của 75 câu luyện, cộng mọi chuỗi dài hơn 30 ký tự của 5 quest).
  - Với chuỗi 8 từ liền nhau, chỉ trùng 2 dòng, đều là cụm "có bao nhiêu số có hai chữ số". Đề của mình là bài khác ("tổng hai chữ số bằng 5", "hai chữ số giống nhau"); đề trong tài liệu là "từ 7 đến 23".
  - Với chuỗi 6 từ, có 19 dòng trùng, toàn là cụm toán thông dụng ("có bao nhiêu hình tam giác", "số tiếp theo là số nào").
  - Không có đề nào bị chép.
- Chống lặp: đề trong quest sự kiện không trùng đề luyện hay đề thi thử nào. Trong 178 câu của quest chỉ có một chuỗi lặp, là nhãn lựa chọn "4 chục và 7 đơn vị" xuất hiện lại trong lời giải của chính bước đó.

### Pha 6b: màn luyện đề theo mock 34–46

- Màn nằm trong `apps/web/src/ui/event/olympiad/`:
  - trang chủ đề (mock 45) có sao theo lượt luyện tốt nhất;
  - mỗi dạng bài có hình vẽ từ dữ liệu: cân, dãy, lịch, phép tính, chẵn lẻ, chia đều, đoạn thẳng, đếm hình, khối 3D, thẻ số, ghép cặp, người, cỗ máy;
  - ba lớp hỗ trợ: Hướng dẫn mở ngay, Gợi ý mở sau 1 lần sai, Đáp án mở sau 2 lần sai;
  - thi thử 25 câu, 4 điểm mỗi câu, không trừ điểm; đồng hồ 60 phút mặc định tắt, hết giờ thì nộp nhẹ nhàng;
  - kết quả (mock 46) và màn xem lại có đủ ba lớp hỗ trợ.
- Server chấm từng câu luyện, phát từng lớp hỗ trợ khi được hỏi, và trả thưởng mỗi lượt theo `runId`, nên gửi lại thì không trả lần hai.
- Phiên này sửa thêm ba chỗ nhỏ:
  - "Bạn chọn" ở màn xem lại hiện song ngữ;
  - lớp Đáp án ở màn luyện ghi cả chữ của lựa chọn, không chỉ chữ cái;
  - điểm mỗi chủ đề dùng hằng `EXAM_POINTS`.
- Gỡ 5 khóa i18n không còn dùng.

## File

Agent trước làm phần lớn các file trong `git status`: 45 file sửa, 3 file xóa (`apps/web/src/ui/event/olympiad-{banner,panel}.tsx`, `olympiad.css`) và các mục mới đã liệt kê trong handoff. Phiên này thêm hoặc sửa:

- Test mới:
  - `apps/server/src/event/event-catalog.test.ts`
  - `packages/voxel/src/event-layer.test.ts`
  - `apps/web/src/ui/event/event-screens.test.tsx`
  - `apps/web/src/ui/event/olympiad/practice-screens.test.tsx`
- Test sửa:
  - `apps/server/src/event/event-routes.test.ts`: thêm gọi bước cuối đồng thời và kiểm phải đăng nhập.
  - `apps/server/src/olympiad/olympiad-routes.test.ts`: thêm nộp đồng thời và kiểm phải đăng nhập.
  - `tools/content/check-content.test.ts`: thêm `checkEventScenes`.
- Mã:
  - `apps/server/src/content/content-catalog.ts`, `apps/server/src/event/event-catalog.ts`: gỡ `extraEventDir`. Vì vậy `apps/server/src/config.ts` và `apps/server/src/server.ts` về lại bản HEAD.
  - `apps/web/src/ui/event/olympiad/{exam-review,exam-result,practice-run}.tsx`
  - `apps/web/src/ui/i18n/locales/{vi,en}.json`
- Tài liệu: `docs/system-architecture.md`, `docs/codebase-summary.md` (mỗi file một dòng mới), `docs/project-roadmap.md`, `plans/dattqh/261004-1617-live-world-events/plan.md`.

## Bằng chứng kiểm tra

Các lệnh chạy lần lượt, không chạy song song. Trước mỗi job nặng, `memory_pressure` báo 52–55% bộ nhớ trống.

| Lệnh | Kết quả |
| --- | --- |
| `pnpm assets:check` | `assets:check OK — 16 packs, 4628 files` |
| `pnpm content:check` | `content:check OK — 2038 files` (một note: `bosses: 12 big bosses and 42 zone guardians on 12 maps`) |
| `pnpm typecheck` | 0 lỗi (root + `apps/server` + `apps/web`) |
| `pnpm lint` | `eslint . --max-warnings=0`: 0 lỗi, 0 warning |
| `pnpm --filter @miu/web build` | `✓ built in 2.79s`. Cảnh báo chunk > 500 kB: `accessories-*.js` 1.253,09 kB (gzip 261,29 kB). Chunk này là danh mục phụ kiện; đợt này chỉ thêm 2 mục mũ. |
| `pnpm security:dist` | `security:dist OK — no quest answer in apps/web/dist` |
| `pnpm exec tsx tools/world/scenery-audit.ts forest-ch1` | `0 trees on a way, 0 solid props in a lane, 0 places off the ways, 0 places on ways cut off from the spawn's` |
| `pnpm exec tsx tools/world/reach-audit.ts forest-ch1` | `every target reached; starts clear` |

`security:dist` chỉ quét đáp án của `content/quests`. Tôi kiểm thêm bằng tay: 0/75 dòng lời giải hoặc gợi ý của `content/olympiad` nằm trong `apps/web/dist/assets/*.js`. Model của cảnh sự kiện (5 con thú, 5 đồ vật) đã có trong `dist/game-assets`.

Vitest chạy từng file một (`pnpm vitest run <file>`): 28 file, 272 test, tất cả pass.

| File | Test |
| --- | --- |
| `apps/server/src/event/event-routes.test.ts` | 8 |
| `apps/server/src/event/event-catalog.test.ts` | 5 |
| `apps/server/src/olympiad/olympiad-catalog.test.ts` | 9 |
| `apps/server/src/olympiad/olympiad-routes.test.ts` | 12 |
| `apps/server/src/quest/quest-routes.test.ts` | 54 |
| `apps/server/src/config.test.ts` | 8 |
| `apps/server/src/content/content-catalog.test.ts` | 5 |
| `apps/server/src/npc/npc-catalog.test.ts` | 4 |
| `apps/server/src/coop/party-quest.test.ts` | 3 |
| `apps/server/src/progression/journey-routes.test.ts` | 6 |
| `apps/server/src/progression/player-facts.test.ts` | 2 |
| `packages/schema/src/olympiad.test.ts` | 5 |
| `packages/schema/src/live-event.test.ts` | 6 |
| `packages/quest/src/live-event.test.ts` | 6 |
| `packages/voxel/src/event-layer.test.ts` | 3 |
| `packages/voxel/src/world-entities.test.ts` | 14 |
| `tools/content/check-content.test.ts` | 22 |
| `tools/world/event-scenes.test.ts` (audit cảnh vật và tầm với của Khu rừng có cảnh sự kiện) | 1 |
| `apps/web/src/ui/event/event-screens.test.tsx` | 12 |
| `apps/web/src/ui/event/olympiad/practice-screens.test.tsx` | 5 |
| `apps/web/src/ui/home/home-screens.test.tsx` | 17 |
| `apps/web/src/ui/region/region-board.test.ts` | 7 |
| `apps/web/src/ui/region/region-rewards.test.tsx` | 9 |
| `apps/web/src/ui/rewards/rewards.test.tsx` | 14 |
| `apps/web/src/ui/quest/quest-layer.test.tsx` | 11 |
| `apps/web/src/ui/quest/party-play.test.tsx` | 2 |
| `apps/web/src/ui/i18n/i18n.test.tsx` | 14 |
| `apps/web/vite-repo-assets.test.ts` | 8 |

`practice-screens.test.tsx` in dòng "Not implemented: HTMLMediaElement's play()" của jsdom khi phát âm thanh. Đây chỉ là thông báo, không phải lỗi.

Test server cho các tiêu chí của plan, tất cả trong `event-routes.test.ts`:

- Trước giờ mở: sự kiện ở trạng thái "sắp mở" (`state: 'upcoming'`, `daysUntilStart: 4`), quest không có trong danh sách. Client gửi header `Date` nằm trong cửa sổ, nhưng bước quest vẫn trả 409 `{ error: 'event-closed' }`, hỗ trợ cũng 409.
- Hết hạn: sự kiện biến khỏi `/api/events`, quest đóng (409), đồ đã nhận vẫn còn trong ba lô.
- Mở lại bản kỷ niệm: trả bản kỷ niệm.
- Thưởng giới hạn trả một lần, kể cả khi gọi đồng thời. Phần thưởng của mỗi người chơi là của riêng người đó.

## Sửa E2E hỏng do cảnh sự kiện (07/10/2026, sau CI 37612032356 trên 2143e67f)

### Kết luận

Cảnh sự kiện cũ đặt đè lên trại ngay chỗ xuất hiện của Khu rừng. Nhân vật `ev-olympic-can-dong` ở (11.5, 13, 19.5) cách bà bếp `bac-nau-an` (12.5, 13, 19.5) đúng 1 khối, và con cáo cách chỗ xuất hiện (16.5, 13, 16.5) khoảng 4 khối. Như vậy mọi trang `/play` mở ở chỗ xuất hiện hay ở trại đều vẽ thêm cả cảnh.

Không có nhân vật nào lấy mất lượt Tương tác: nhân vật sự kiện gần nhất ở rất xa mục tiêu của các test hỏng (bảng dưới), trong khi bán kính tương tác chỉ từ 2 đến 3 khối.

### Đã chứng minh

Phép thử A/B dùng cùng mã, chỉ đổi dữ liệu sự kiện. Để giấu sự kiện, tôi tạm dời ngày mở sang 30/10 (ngoài `announceDays`), đo xong thì trả lại 06/10. Số đo trên máy dev, CI không chặn cứng ở đây:

| Chỗ đo (quality high) | GPU máy dev: cảnh cũ / không có sự kiện / sau khi sửa | SwiftShader trên máy dev: cảnh cũ / sau khi sửa |
| --- | --- | --- |
| `play.spec.ts:8`, chỗ xuất hiện | 202 / 182 / 181 draw call. Tam giác: 158.187 với cảnh cũ (vượt 150.000) | 196 / 180. Tam giác: 154.767 với cảnh cũ (vượt) |
| `forest-life.spec.ts` rain-rainbow (trại) | (CI: 152) / 184 / 184 | 197 / 182 |
| `forest-life.spec.ts` fireflies (vườn) | (CI: 162) / 193 / 194 | 202 / 181 |
| `forest-life.spec.ts` 10 nhân vật | (CI: hỏng do hết giờ) / 179 / 178 | 192 / 175 |

Cảnh cũ cộng thêm 15–21 draw call ở chỗ xuất hiện và ở trại, vừa đủ đẩy CI qua ngưỡng 150 (154, 152, 162). Ở chỗ xuất hiện, nó còn làm số tam giác vượt 150.000. Lỗi tam giác này trước đây bị che vì CI dừng ngay ở lỗi draw call. Sau khi sửa, các số về bằng mức không có sự kiện (chênh ±1).

Số tuyệt đối trên máy dev cao hơn CI chừng 25–45, kể cả khi chạy SwiftShader (luật đo ở `e2e/stats.ts`). Vì vậy tôi so chênh lệch giữa các trạng thái, không so với ngưỡng 150.

**Các test hỏng vì quá thời gian trên CI** (`quest-flow.spec.ts:19`, `:79`; `challenges.spec.ts:11`; `autowalk.spec.ts:16`; `hud-layout.spec.ts:112` phone):

- **Không do lấy lượt Tương tác.** Khoảng cách tới nhân vật sự kiện gần nhất trong cảnh cũ:
  - Rương `chest` ở (69.5, 83.5): 71,6 khối.
  - Đá qua suối `stream-stones` ở (64.5, 38.5): 39,2 khối.
  - `clue-box`, `clue-letter`, `clue-mushroom`: 8,5 / 9,5 / 14,9 khối. Hai nhân vật gần nhất là đồ vật của quest, chỉ hiện khi quest sự kiện đang chơi.
- **Không tái hiện được trên máy dev.** Cả các test này lẫn 12 test của 4 project đó đều pass trên máy dev, với cảnh cũ lẫn sau khi sửa, cả GPU lẫn SwiftShader.
- **Trên CI, các test hỏng ở bước bấm hoặc chờ.** Lượt click `hud-interact` hết 45 giây sau "element is visible, enabled and stable". `challenges` báo "session closed". Thời gian của các shard là 486 s, 531 s, 675 s và 832 s, đều vượt ngân sách 480 s. Đây là dấu hiệu trình duyệt trên CI bị nghẽn khi vẽ thêm cảnh bằng SwiftShader trên CPU, không phải sai luồng.
- **`autowalk.spec.ts` chạy ở Trường học,** map không có cảnh sự kiện. Test `autowalk.spec.ts:43` đã hỏng sẵn ở lượt 37408448385, trước khi có sự kiện. Thay đổi duy nhất ở trang đó là thêm một lời gọi `GET /api/events`.

Kết luận: phần draw call và tam giác đã chứng minh được. Phần quá thời gian là suy luận từ log CI. Cần một lượt CI để xác nhận.

### Cách sửa

Giữ nguyên cảnh, không nâng ngân sách, không sửa test cho xanh.

1. **Dời cảnh** (`content/events/olympic-math-2026.json`) tới bên đường mòn chạy về phía nam bến tàu "bãi rừng 1", tức chỗ bắt đầu chương 2. Hai bến tàu ở chỗ xuất hiện (`ben-tau-rung-1`) và ở bãi rừng (`ben-tau-rung-5`) nối với nhau.
   - Các mốc khoảng cách:
     - Cổng ở khoảng (221–234, 320–337), cách chỗ xuất hiện khoảng 380 khối.
     - Cách các mục tiêu và nhân vật khác của map ít nhất 19 khối, và cách mục tiêu quest gần nhất (`tv2-t10-b18-tho-suong`) 59 khối.
     - Ô prop của cảnh không nằm chung ô 128 × 128 với chỗ xuất hiện. Nó chỉ được dựng khi bé tới gần trong tầm nhìn: 110 khối ở quality high.
   - Bố cục:
     - Phía tây đường mòn: vòm cổng hoa, cờ phía bắc và phía nam cổng, cáo, thỏ, nhím, bảng đề.
     - Phía đông: cột đèn, hươu, khỉ, khinh khí cầu, lều.
     - Đồ vật của từng quest đặt cạnh mốc được nhắc trong lời quest.
2. **Chỉ vẽ nhân vật sự kiện trong tầm nhìn.** `apps/web/src/game/game.ts` và `event/event-layer.ts` (`owns`) gọi `setDrawn` mới của `entities/interactables.ts`. Ngoài tầm nhìn, nhân vật không được vẽ nhưng vẫn `available`, nên mũi tên chỉ đường và tự đi vẫn tìm được, giống các ô đồ trang trí. Trước đây, khi bản đồ có vùng ngoài, camera nhìn rất xa, nên nhân vật ở xa vẫn được vẽ.
3. **Sửa lời chỉ đường cho khớp chỗ mới.**
   - Lời chào của sự kiện: "đi tàu rừng tới bãi rừng 1, rồi theo đường mòn về phía nam".
   - `wonder-olympic-logic`: cái cân đồng ở "trước lều cắm trại", thay cho "đá xám cạnh lửa trại".
   - `wonder-olympic-shapes`: thước tam giác ở "bãi cỏ phía nam cổng hoa", thay cho "dốc đường mòn xuống suối".
   - Bản tiếng Anh sửa theo. Các mốc còn lại (cổng hoa, cột cờ bắc/nam, cột đèn, khinh khí cầu, đông/tây đường mòn) đều khớp chỗ mới.
4. **Test mới:** `apps/web/src/game/entities/interactables.test.ts` thêm "drawing a target only near the child": thôi vẽ nhưng vẫn `available`; mục tiêu đang ẩn thì vẫn ẩn khi được vẽ lại.

Tôi không thêm "ưu tiên mục tiêu của quest đang theo dõi" khi chọn đối tượng tương tác, vì đã chứng minh không có tranh chấp lượt Tương tác, và chỗ mới cách mọi mục tiêu khác ít nhất 19 khối.

Draw call tại chính cổng mới (SwiftShader trên máy dev, quality high): 142 khi có sự kiện, 123 khi không, tức thêm 19. Ở bến tàu bãi rừng 1 là 143 so với 132. Riêng vùng này, số tam giác đã vượt 150.000 ngay cả khi không có sự kiện (163.165 ở cổng, 174.261 ở bến). Đây là chuyện sẵn có của map, không có test đo ở đó.

### Bằng chứng sau khi sửa

- **E2E** (máy dev, 1 worker, chạy lần lượt; cổng 8787 và 4173 trống trước và sau mỗi lượt):
  - GPU:
    - `--project setup --project play`: 23 passed.
    - `forest-life`: 9 passed, 1 skipped (chỉ dành cho ảnh review).
    - `quest-flow` + `challenges` + `autowalk` + `hud-layout`: 12 passed.
  - SwiftShader (cấu hình tạm, đã xóa): `play` + `forest-life` + `quest-flow` + `challenges`: 36 passed.
- **Audit map:**
  - `scenery-audit.ts forest-ch1`: `0 trees on a way, 0 solid props in a lane, 0 places off the ways, 0 places on ways cut off from the spawn's`.
  - `reach-audit.ts forest-ch1`: `every target reached; starts clear`.
  - `room-audit.ts forest-ch1`: `8 roofed spaces, 0 short`.
- **Gate:**
  - `pnpm assets:check`: OK, 16 packs, 4628 files.
  - `pnpm content:check`: OK, 2038 files.
  - `pnpm typecheck`: exit 0.
  - `pnpm lint`: exit 0, 0 warning.
  - `pnpm --filter @miu/web build`: `✓ built in 2.60s`. Vẫn còn cảnh báo chunk `accessories` 1.253,09 kB như trước.
  - `pnpm security:dist`: OK.
- **Vitest:**

  | File | Kết quả |
  | --- | --- |
  | `tools/world/event-scenes.test.ts` | 1 |
  | `tools/content/check-content.test.ts` | 22 |
  | `packages/voxel/src/event-layer.test.ts` | 3 |
  | `apps/web/src/game/entities/interactables.test.ts` | 8 (1 mới) |
  | `apps/web/src/ui/event/event-screens.test.tsx` | 12 |
  | `apps/server/src/event/event-routes.test.ts` | 8 |
  | `apps/server/src/event/event-catalog.test.ts` | 5 |

  Tất cả pass.
- **File sửa trong lượt này:** `content/events/olympic-math-2026.json`, `content/quests/wonder-olympic-{logic,shapes}.json`, `apps/web/src/game/game.ts`, `apps/web/src/game/event/event-layer.ts`, `apps/web/src/game/entities/interactables.ts`, `apps/web/src/game/entities/interactables.test.ts`, và report này.
- **Commit đề xuất:** `fix(events): move the Olympic Math gate off the forest spawn and draw event characters only within view`.

## Không chạy, và lý do

- E2E: lượt đầu không chạy, vì người sở hữu chỉ cho chạy khi được yêu cầu. Lượt sửa lỗi sau CI 37612032356 chỉ chạy các project được cho phép (xem mục trên). `e2e:ci` đầy đủ chưa chạy lại.
- Toàn bộ `pnpm test`: cùng lý do. Gate CI ghi 5 lệnh, ở đây lệnh test được thay bằng 28 file liên quan ở trên.
- Project `perf`: không được yêu cầu đo hiệu năng.
- Semgrep và `pnpm audit`: chạy trên CI.

## Dependency mới

Không có.

## Câu hỏi còn mở

1. **E2E và draw call của cảnh sự kiện.** Đã xử lý ở mục "Sửa E2E hỏng do cảnh sự kiện" bên dưới. Lượt CI đầy đủ chưa chạy lại; các E2E đã chạy trên máy dev đều pass.
2. **Trang review.** Trang `apps/web/review.html` chưa ghi số draw call của cảnh, vì trang này nằm ngoài danh sách file được sửa. Số đo nằm trong report này.
3. **Quét đáp án trong bản build.** Nên mở rộng `tools/security/scan-dist.ts` để quét cả `content/olympiad` (lời giải, gợi ý). File này nằm ngoài danh sách được sửa nên tôi chưa đụng.
4. **Ngày của sự kiện** (06/10–31/10/2026, kỷ niệm 09/2027) do agent trước chọn. Đổi ngày chỉ cần sửa dữ liệu.
5. **Thưởng thi thử khi 0 điểm.** Mỗi lượt thi thử trả ít nhất 100 XP và 20 xu, kể cả khi được 0 điểm. Điều này theo luật "mỗi lượt chơi đều có thưởng", nhưng gửi bài trống liên tục thì được XP nhanh (giới hạn 20 lượt mỗi phút).
6. **Roadmap pha 0.** Dòng pha 0 trong `docs/project-roadmap.md` vẫn ghi "chờ deploy", trong khi màn này đã lên production. Tôi để nguyên.
7. **Deploy.** Deploy cần người sở hữu cho phép. Không có migration.

## Đề xuất chia commit

Code của pha 1–3 và 6b phụ thuộc lẫn nhau: `olympiad.ts` dùng `EventRewardGrant`, Home dùng cả sự kiện lẫn màn luyện. Muốn mỗi commit build được thì nên gộp code vào một commit:

1. `feat(events): limited-time events with server-clock windows, map scene layer and Olympic Math practice screens`
   - schema: `packages/schema/src/{content,game,item,olympiad,olympiad.test}.ts`
   - voxel: `packages/voxel/src/event-layer{,.test}.ts`
   - server: `apps/server/src/{app.ts,content/content-catalog.ts,coop/party-quest.ts,npc/npc-catalog.ts,progression/journey-routes.ts}`, `apps/server/src/quest/{quest-access,quest-completion,quest-routes,quest-routes.test}.ts`, `apps/server/src/event/**`, `apps/server/src/olympiad/**`, `apps/server/test/test-app.ts`, `apps/server/test/fixtures/{events,event-quests}/**`
   - web: `apps/web/src/game/event/**`, `apps/web/src/game/game.ts`, `apps/web/src/game-bridge/game-store.ts`, `apps/web/src/ui/event/**` (gồm 3 file xóa), `apps/web/src/ui/{api-client.ts,home/*,kit/ui-art.ts,play/play-screen.tsx,player/player-data.ts,quest/quest-layer.tsx,region/*,rewards/completion-sequence.tsx}`, `apps/web/src/ui/i18n/locales/{vi,en}.json`, `apps/web/vite-repo-assets.ts`
   - tools: `tools/content/check-content{,.test}.ts`, `tools/world/{event-layers.ts,event-scenes.test.ts,reach-audit.ts,scenery-audit.ts}`
2. `feat(content): Olympic Math gate event in the Secret Forest with five rooms and keepsake rewards`: `content/events/**`, `content/olympiad/olympic-math.json`, `content/quests/wonder-olympic-*.json`, `content/items/huy-hieu-olympic-*.json`, `content/accessories/hat-olympic-toan*.json`, `assets/generated/accessories/hat-olympic-toan*.png`, `assets/manifest.json`

   Lưu ý: server khởi động phải đọc được `content/olympiad` bản mới (`version: 2`), nên commit 2 phải đi liền sau commit 1. Nếu cần mỗi commit tự khởi động được, chuyển `content/olympiad/olympic-math.json` sang commit 1.
3. `docs: live events in the architecture map and roadmap`: `docs/{system-architecture,codebase-summary,project-roadmap}.md`, `plans/dattqh/261004-1617-live-world-events/plan.md`, `plans/dattqh/reports/live-world-events-261007.md`

Không commit `.claude/skills/` và `.data/wip/`.
