# Review vertical slice MVP (77f7b30..2dd979c, bỏ commit SGK)

Ngày: 2026-09-30 · Người review: code-reviewer · Chế độ: chỉ đọc (không sửa code, không chạy E2E/perf)

## Phạm vi

- Commit: 27 commit vertical slice từ `1034869` tới `2dd979c`. Bỏ các commit SGK: `7bd7a6a`, `0b1246e`, `fefde4f`, `a54a25a`, `220bc2a`, `d4e8af5`, `992665e` (chỉ đọc phần `feedbackLine` ở server vì client dựa vào nó).
- Trong lúc review có thêm 5 commit trên `main` (`3fdb0c7..699534f`: docs, review page, sửa typecheck). Các finding dưới đây vẫn đúng ở `699534f`, vì những commit đó không động tới file nào được nêu.
- File đã đọc: toàn bộ danh sách focus (game.ts, entities/*, preview/character-preview.ts, game-store.ts, ui/** theo danh sách, voxel/quest/schema, character-routes, content-catalog, security/*, tools/*, e2e/*, playwright configs, ci.yml).

## Kiểm chứng đã chạy

| Lệnh | Kết quả |
|---|---|
| `pnpm lint` | exit 0 (`eslint . --max-warnings=0`) |
| `pnpm typecheck` ở `2dd979c` | **exit 2**: `apps/server/src/security/child-data.test.ts(9,55): error TS2677` (lỗi type predicate). Đã sửa ở `acf1d8f` trong lúc review; chạy lại `pnpm --filter @miu/server typecheck`: 0 lỗi. |
| `pnpm vitest run apps/web/src packages/quest packages/voxel apps/server/src/character apps/server/src/security tools/security` | 31 file, 180 test pass |
| Test nháp trong scratchpad (ngoài repo) cho `DragDropChallenge` | Xác nhận lỗi H1: `{"afterUp":"true","afterClick":"false","count":"0"}` |

Bằng chứng về quy trình: `cbfc64b` được commit khi typecheck đang đỏ. Nghĩa là gate 5 lệnh trong CLAUDE.md đã không được chạy trước commit đó. Lỗi đã được sửa nên không tính là finding, nhưng nên nhắc lại gate.

Đã kiểm, không có lỗi: runtime không import React. `packages/voxel` không import `three`. CSS và TSX mới không hardcode màu (grep hex/rgb ra 0 kết quả ngoài tokens). Phần thưởng, XP, mở khóa đều lấy từ response server. Web không import `content/quests`. Mỗi lần `set-world-state` và hint đều đến từ progress của server. `PUT /character` kiểm unlock ở server (level/quest, và món đang mặc thì vẫn giữ được).

---

## Critical

Không có.

## High

### H1. Cách "chạm quả táo rồi chạm giỏ" hỏng: chọn xong bị bỏ chọn ngay
- File: `apps/web/src/ui/challenge/drag-drop-challenge.tsx:52` (`onClick` của `.drag-source`), `:62` (`onClick` của `.drag-container`), `:25-28` (`onTap`); `apps/web/src/ui/challenge/use-pointer-drag.ts:42-49`.
- Kịch bản: trên iPad, bé chạm một quả táo ở khu nguồn. `pointerup` gọi `onTap` rồi `setSelected('apple-1')`. React flush update discrete trước khi trình duyệt phát `click`. Sau đó `click` từ nút táo nổi bọt lên `div.drag-source`, và `onClick={() => dropSelected(false)}` (lúc này `selected = 'apple-1'`) gọi `move(id, false)`, tức là `setSelected(null)`. Kết quả: vừa chọn đã mất chọn, chạm giỏ tiếp theo thì không có gì xảy ra. Chạm một quả trong giỏ cũng vậy: click nổi bọt lên `.drag-container` rồi bị bỏ chọn. Test nháp jsdom mô phỏng pointerdown → pointerup → click cho ra `afterUp:"true"`, `afterClick:"false"`, `count:"0"`.
- Bàn phím cũng không làm được bài này. Nút táo không có `onClick`, nên Enter/Space không chọn được táo. Ở `sort-challenge.tsx:43-49`, nút "viên đá" cũng không có `onClick`, bàn phím không chọn được đá.
- Vì sao CI không bắt: `learning-step.test.tsx:105-108` chỉ bắn `pointerDown`/`pointerUp` rồi click thẳng vào giỏ, không bắn `click` lên quả táo như trình duyệt thật. Đây là phantom test. E2E chỉ dùng `touchDrag` cho màn này, không thử đường chạm.
- Tác động: cách dự phòng "cho bé khó kéo" (theo comment đầu file) không dùng được trên thiết bị mục tiêu. Bé vẫn qua được bài nếu kéo.
- Cách sửa: chọn/bỏ chọn trong `onClick` của nút (bỏ `onTap` trong `onPointerUp` hoặc chặn click sau pointerup), và gọi `e.stopPropagation()` trong `onClick` của quả táo. Khu nguồn/giỏ chỉ xử lý click khi `e.target === e.currentTarget` hoặc khi click không đến từ `.drag-piece`. Thêm `onClick` cho nút viên đá để dùng được bàn phím. Sửa unit test để bắn đủ chuỗi `pointerDown → pointerUp → click` lên chính phần tử.

## Medium

### M1. Phím E (và Space) bấm lúc đang có hội thoại/thử thách vẫn được giữ lại và chạy khi game tiếp tục
- File: `apps/web/src/game/player/input.ts:36-44` (listener `keydown` trên `window` luôn đặt `interactQueued`/`jumpQueued`); `apps/web/src/game/game.ts:127-137` (`resume`/`runLoop` không xóa input); `game.ts:302-309, 347-350`.
- Kịch bản: bé bấm E để nói chuyện với Hải ly, rồi bấm E thêm lần nữa (hoặc giữ E lâu, trình duyệt tự lặp keydown) trong lúc hội thoại mở. Khi đó loop đã dừng nên `interactQueued = true` nằm chờ. Bé chạm "Tiếp tục", server trả lời, `setOverlay(null)` chạy và game `resume()`. Ở khung hình đầu, `input.read().interact === true`, bé vẫn đứng trong bán kính Hải ly, nên game phát `interaction`. `stepForTarget` trả về `apples-for-beaver` (cùng target `animal-beaver`), và thử thách táo tự mở dù bé không yêu cầu. Với Vẹt thì thay vào đó hiện ngay toast "Chưa đến lượt tớ…". Space dùng để bấm nút trong modal cũng làm nhân vật nhảy khi game chạy lại.
- Cách sửa: thêm `PlayerInput.clear()` (xóa `keys`, `jumpQueued`, `interactQueued`, `look`, `stick`) và gọi nó trong `Game.stop()` và `runLoop()`. Hoặc bỏ qua keydown khi `e.target` nằm trong `[role="dialog"]`. Nên có unit test: stop → keydown E → resume → khung đầu `interact === false`.

### M2. Creator: chọn món đồ khi preview 3D chưa tải xong thì preview không đổi
- File: `apps/web/src/game/preview/character-preview.ts:118-119, 187-192` (chỉ đăng ký `onCommand` sau khi tải xong GLB; `wear(this.options.outfit)` dùng outfit ban đầu); `apps/web/src/ui/creator/creator-screen.tsx:89-99` (`firstOutfit` cố định), `:137-141` (`store.send` gửi ngay).
- Kịch bản: mạng iPad chậm, bé chọn "Mèo" rồi chạm "Mũ lưỡi trai vàng" ngay khi preview còn đang tải. Lệnh `set-outfit` được gửi khi chưa có handler nào, nên bị mất. Preview tải xong với bộ đồ cũ (không mũ), trong khi ô mũ vẫn hiện đang chọn. Khi lưu thì vẫn lưu đúng `equipped`, chỉ phần xem trước sai. E2E không bắt được vì `mvp-loop.spec.ts:105` chờ `__miuPreview.ready` rồi mới chạm.
- Cách sửa: giữ outfit mới nhất trong một ref của `PreviewStage` và truyền getter vào preview, hoặc để `CharacterPreview` đăng ký `onCommand` ngay trong `boot()` (trước `await`) và lưu `pendingOutfit`, rồi `wear(pending ?? options.outfit)` sau khi tải xong.

### M3. `/play` không có `?quest=`: xong quest thì game treo, không hiện màn thưởng
- File: `apps/web/src/ui/play/play-screen.tsx:166-168` (`quest` rơi về `currentQuest(data.quests)`); `apps/web/src/ui/quest/quest-layer.tsx:32, 56`; `apps/web/src/ui/quest/use-quest-controller.ts:107-110`.
- Kịch bản: mở `/play` không có tham số (route hỗ trợ việc này, comment nói "else the one the child is on"). Ban đầu `currentQuest` là `forest-ch1`. Ở bước cuối, `onResponse` đổi state thành `completed`, và `currentQuest` không còn quest `active` nào (ch2 là `stub`), nên trả về `null`, kéo theo `questId = null`. `QuestLayer` không tìm thấy `summary`, nên `CompletionSequence` không render. Nhưng `setFinished` và `onOverlayChange(true)` đã chạy, nên game vẫn dừng render. Màn hình đứng im, không có modal, HUD mất tracker.
- Cách sửa: chốt `questId` một lần khi vào `/play` (`useState(() => params.get('quest') ?? currentQuest(...)?.quest.id)` sau khi có data), hoặc lưu `quest` ngay trong `FinishedQuest` để `CompletionSequence` không phụ thuộc vào `summary` hiện tại.

## Low

### L1. Lỗi mạng ở bước tìm manh mối: game vẫn chạy dưới banner Offline, và lần gọi chờ retry có thể bị thay
- File: `apps/web/src/ui/play/play-screen.tsx:174` (`paused` không tính `quest.retry`); `apps/web/src/ui/quest/use-quest-controller.ts:121-124`.
- Kịch bản: mất mạng khi chạm `clue-box` thì `OfflineBanner` hiện ra, nhưng game vẫn render và vẫn nhận WASD/E qua `window`. Bé đi tới `clue-letter`, bấm E, lại lỗi mạng, và `setRetry` thay lần gọi cũ. Khi chạm "Thử kết nối lại" thì chỉ gửi `clue-letter`. Không mất dữ liệu (server chưa ghi `clue-box`), nhưng làm trái quy tắc "full-screen screens stop rendering".
- Cách sửa: `onOverlayChange` báo thêm `retry !== null`. Trong `onInteraction`, bỏ qua khi `retry` đang chờ.

### L2. `{name}` không được điền ở vài chỗ hiển thị
- `apps/web/src/ui/play/play-screen.tsx:169`: tên vùng ở LoadingOverlay không qua `say()`.
- `apps/web/src/ui/region/region-screens.tsx:60, 67, 137`: `region.tagline` không qua `say()`, trong khi `checkRegions` (`tools/content/check-content.ts`) cho phép `{name}` trong tagline.
- `apps/web/src/ui/rewards/completion-sequence.tsx:66`: tên vật phẩm thưởng không qua `fill()` (Backpack và Profile thì có).
- Hiện nội dung chưa có chỗ nào dính (tên vùng có `{name}` là "Nhà của {name}", đang `soon` nên không vào `/play`). Chỉ cần viết thêm một tagline hoặc tên item có `{name}` là màn hình sẽ in nguyên "{name}". Sửa: bọc `say()` cho cả ba chỗ.

### L3. Lời thoại trong game gọi người chơi là "bé" thay vì tên nhân vật
- `apps/web/src/ui/challenge/support-panel.tsx:53` ("thì bé làm lại nhé"), `apps/web/src/ui/system/offline-banner.tsx:23` ("Những gì bé đã làm được"), `apps/web/src/ui/home/home-screen.tsx:50` ("Bé đã xong mọi nhiệm vụ").
- Quy tắc chủ sản phẩm là lời trong game gọi người chơi bằng tên nhân vật. Sửa: truyền `character.name` vào (support panel đã có `fill`, dùng `fill('… {name} làm lại nhé …')`).

### L4. Nút "Âm thanh: Tắt" không có tác dụng
- `apps/web/src/ui/system/pause-screen.tsx:25`, `apps/web/src/ui/home/home-screen.tsx:86` ghi `miu.sound`, nhưng không nơi nào đọc giá trị đó để tắt âm. `speak()` (`apps/web/src/ui/dialogue/speech.ts:30`) vẫn đọc khi đã tắt. Logic bật/tắt lại bị chép ở hai chỗ.
- Sửa: `speak()` kiểm `readSoundOn()` (hoặc ẩn "Nghe lại" khi tắt), và gom nút bật/tắt thành một component dùng chung.

### L5. "Chơi lại" một quest đã xong: mọi tương tác đều ra câu "chưa đến lượt"
- `apps/web/src/ui/region/region-screens.tsx:111` hiện "Chơi lại". Trong `/play`, `currentStep` là `null`, nên mỗi lần chạm NPC ra một câu `NOT_NOW_LINES` kiểu "Tớ đang đợi {name} ở bước sau nhé!" (`loop-lines.ts:8`), và cổng đã mở vẫn nói "đóng kín…" (`loop-lines.ts:31`). Cổng sau khi chìm vẫn `available` (`apps/web/src/game/entities/interactables.ts:153-155`), nên vẫn có prompt.
- Sửa: khi quest `completed`, dùng một pool câu "đã xong" riêng (vẫn qua `freshPicker`), hoặc đổi nhãn nút thành "Dạo chơi". Cổng ở trạng thái `open` thì `available = false`.

### L6. Công tắc dev (`spawnAt`, `outfit`, `autopilot`, `shot`, `stats`) có trong bản production
- `apps/web/src/game/game.ts:224-225, 238-244`. `?outfit=hat-flower-crown` cho mặc đồ chưa mở khóa trên màn hình (chỉ phía client, không lưu lại). `?spawnAt=chest` dịch chuyển tới bất kỳ mục tiêu nào. Server vẫn giữ đúng thứ tự bước và phần thưởng, nên đây không phải lỗ hổng về thưởng.
- E2E chạy trên bản build production nên cần các công tắc này. Nếu muốn chặn thì phải dùng một cờ build riêng cho E2E. Xem câu hỏi mở.

### L7. Chữ trên bảng câu đố bị hardcode trong generator, tách khỏi nội dung quest
- `tools/world/generate-forest-map.ts:319` (`board: '8 + 5 = ?'`) và `content/quests/forest-ch1.json:389` (câu hỏi `tree-riddle`). Sửa câu đố trong quest mà quên generator thì bảng trong rừng hiển thị phép tính cũ. `content:check` không so hai chỗ này. Sửa: generator đọc câu hỏi từ quest, hoặc `checkQuestTargets` kiểm `board` có nằm trong `question` hay không.

### L8. Sau khi GameView remount, thế giới không được đồng bộ lại (hiện chưa xảy ra)
- `apps/web/src/ui/play/play-screen.tsx:80-95`: `outfitKey` đổi thì tạo lại `Game`. Nhưng store vẫn ở `status: 'ready'`, nên `onReady` của `use-quest-controller.ts:178-194` không chạy lại (không gửi lại `set-world-state` và hint). Effect `paused` cũng không áp lại cho instance mới. `Game` còn bỏ qua lệnh `set-outfit` dù `GameCommand` mô tả là "swaps outfit without a remount". Hiện `equipped` không đổi được trong `/play` nên chưa lộ ra. Sửa: xử lý `set-outfit` trong `Game` (như `CharacterPreview`) và bỏ `outfitKey` khỏi deps.

### L9. `security:dist` chỉ là heuristic, dễ bỏ sót
- `tools/security/scan-dist.ts:12` (bỏ qua đáp án ngắn hơn 16 ký tự, như "13" hay id lựa chọn) và `:40` (regex chỉ bắt `"support":{"guide"`, đổi thứ tự key là lọt). Lớp bảo vệ thật là `QuestStepPublic` bỏ đi answer/support, nên mức độ thấp. Nên ghi rõ giới hạn này trong comment, hoặc kiểm thêm là không file nào trong `dist` chứa khóa `"answer":` của schema quest.

### L10. Lệnh E2E trong CLAUDE.md đã cũ
- CLAUDE.md vẫn ghi `--project setup --project account --project play`, trong khi `playwright.config.ts` giờ có thêm `creator`, `home`, `quest-flow`, `challenges`, `mvp-loop`, và CI dùng `e2e:ci`. Agent làm theo CLAUDE.md sẽ bỏ sót 5 project. Sửa: đổi thành `pnpm --filter @miu/web e2e:ci`. Ngoài ra `retries: 1` trên CI có thể che test flaky (ví dụ `finishDialogue` dùng `waitForTimeout(150)` × 10 vòng). Nên xem cả số lần retry trong log CI.

---

## Scout: điểm biên đã soát

- Pause/resume trước khi boot xong, khi context-lost lúc đang pause, khi dispose giữa chừng: đúng (`game.ts:121-137, 179-185, 208-231`).
- Lệnh bridge gửi tới trước khi `Game` đăng ký handler: `set-world-state` chỉ được gửi sau `ready`, nên an toàn. Riêng `CharacterPreview` thì có lỗi, xem M2.
- Double-submit do `busy` chỉ cập nhật sau render (`use-quest-controller.ts:157`): chạm đúp trong khoảng 1 khung hình có thể gửi 2 POST cho cùng manh mối. Server trả `repeated` hoặc 409, không cộng thưởng hai lần, nên không tính là finding.
- Modal chồng modal (Dialogue + OfflineBanner), và Esc lúc focus ở trong modal: Modal chặn propagation, nên không mở nhầm Pause.
- Không có dữ liệu trẻ nào gửi ra ngoài: `speechSynthesis` chỉ dùng giọng `localService`. Trace Playwright chỉ chứa dữ liệu test.

## Việc nên làm theo thứ tự

1. Sửa H1 (tap-to-select và bàn phím cho drag-drop/sort) và sửa luôn phantom test.
2. Sửa M1 (xóa input khi stop/resume).
3. Sửa M2 và M3.
4. Gom các mục Low vào một đợt dọn: L2, L3 và L5 nằm cùng nhóm quy tắc `{name}`/lời lặp lại, còn L4 là nút âm thanh.
5. Cập nhật lệnh E2E trong CLAUDE.md (L10), và nhắc gate 5 lệnh trước commit (xem `cbfc64b`).

## Câu hỏi mở

1. Công tắc `?spawnAt`/`?outfit` có được phép có trong bản cho trẻ dùng thật không? Nếu không, cần một biến build riêng cho E2E. Đây là quyết định sản phẩm, vì nó ảnh hưởng tới E2E trên bản production.
2. "Chơi lại" quest đã xong có nằm trong phạm vi MVP không? Nếu có, cần thiết kế chế độ chơi lại (hiện server trả `repeated`). Nếu không, nên đổi nhãn nút.
