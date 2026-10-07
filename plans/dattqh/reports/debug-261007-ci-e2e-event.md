# Debug 07/10/2026: 4 test E2E hỏng trên CI sau sự kiện "Thử thách Olympic Toán"

## Kết luận

Sự kiện Olympic Toán không phải nguyên nhân trực tiếp. Bốn test hỏng vì ba lỗi hẹn giờ có sẵn từ trước. Chúng chỉ lộ ra khi trang chạy chậm, và hai lượt CI sau sự kiện đều rơi vào máy shard 2 chậm hơn khoảng 1,4 lần.

| Test | Nguyên nhân đã chứng minh | Loại |
|---|---|---|
| `quest-flow.spec.ts:79` (câu thoại "lặp lại") | **Lỗi thật của app.** Toast cũ hết giờ đúng lúc toast mới vừa được đặt nhưng React chưa kịp vẽ. Lúc đó `onDone` gọi `setToast(null)` và xóa luôn câu mới. Không phải câu bị lặp, mà câu thứ hai không bao giờ hiện. | Race giữa timer và render |
| `quest-flow.spec.ts:19` (@smoke) | Test vượt timeout mặc định 45 s: trên CI mất 48 s, trước sự kiện 33–36 s. Ngay cả lúc chưa có sự kiện nó đã vượt ngưỡng 30 s của time-budget-reporter mà không khai. | Ngân sách thời gian |
| `challenges.spec.ts:11` | Giống trên: 50,6 s, trước đó 33,7–35,9 s. | Ngân sách thời gian |
| `autowalk.spec.ts:16` | Thẻ nhiệm vụ tự thu gọn sau 12 s không chạm (`TRACKER_FOLD_MS`, có từ 03/10). Trên CI, lần chạm đầu tiên của test rơi đúng quanh mốc 12 s nên thẻ bị tháo khỏi DOM giữa lúc click. Test anh em `autowalk.spec.ts:43` đã hỏng cùng kiểu từ **trước** sự kiện (run 37408448385). | Race giữa test và timer UI |

## Bằng chứng

### 1. Tốc độ: sự kiện không làm game chậm hơn

- **A/B trên máy dev, cùng điều kiện.** Tôi xuất hai cây `d0cf7d3a` (trước sự kiện) và `9c0f2098` (HEAD của CI) vào scratchpad bằng `git archive`, rồi chạy quest-flow, challenges và autowalk với SwiftShader. Mỗi cây chạy hai lần: không throttle và throttle CPU ×4 qua CDP.

  | Test | trước ×1 | HEAD ×1 | trước ×4 | HEAD ×4 |
  |---|---|---|---|---|
  | quest-flow:19 | 28,2 s | 27,8 s | 39,4 s | 38,2 s |
  | quest-flow:79 | 4,8 s | 4,7 s | 7,0 s | 7,0 s |
  | challenges:11 | 23,9 s | 24,4 s | 28,4 s | 28,4 s |
  | challenges:73 | 13,7 s | 13,4 s | 18,0 s | 17,9 s |
  | autowalk:16 | — | — | 17,7 s | 16,8 s |

  Không có chênh lệch đo được. Chạy đúng shard 2 của CI (`-c playwright.ci.config.ts --shard=2/4`, CI=1, SwiftShader) trên HEAD thì 28/28 pass trong 4,8 phút.
- **Trên CI, chỉ shard 2 chậm.** So từng test với run trước sự kiện 37408448385 (trung vị tỉ lệ thời gian theo shard):
  - shard 1: ×1,02 (post1) và ×0,63 (post2). Shard này gồm các test `play` trong Khu rừng, kể cả bản 2143e67f lúc nhân vật sự kiện còn vẽ ở mọi khoảng cách.
  - shard 2: ×1,37 và ×1,45.
  - shard 3: ×1,08 và ×1,12.
  - shard 4: ×1,0.

  Nếu lớp sự kiện làm Khu rừng nặng hơn thì shard 1 cũng phải chậm. Nó không chậm.
- **Trong shard 2, cả các bước không có 3D cũng chậm theo.** Trace `mvp-loop` cùng shard 2, trước và sau sự kiện:
  - Tap trên trang đăng nhập: 1118 → 1632 ms.
  - Navigate: 533 → 1092 ms.
  - Các test `home` (chỉ DOM): 1,1 → 1,6 s.

  Các bước này không đụng tới lớp sự kiện. Vậy độ chậm đến từ máy/môi trường của shard 2, không phải từ code sự kiện. GitHub không ghi loại CPU, nên tôi không chứng minh được loại máy.
- **Chỉ số trong game giống hệt nhau.** Trace `maps khu-rung-bi-mat` trước và sau sự kiện cho cùng kết quả: fps 10–11, 100–105 draw call, 8 người chơi máy.

### 2. `quest-flow:79`: toast thứ hai bị xóa trước khi kịp hiện

Trace `quest-flow-a-target-whose…` của run 37618106717:

- 88,43 s: nhấn E lần 1. 89,33: `GET /api/skill-check/chest` 404. Toast A "Mochi thử nhấc nắp Rương…" hiện lúc khoảng 90,97 (ảnh screencast).
- 92,66 s: nhấn E lần 2. 93,50: `skill-check/chest` 404 lần nữa, tức `onInteraction` đã chạy và lẽ ra phải đặt toast B. Console không có lỗi JS nào.
- Phân tích độ sáng vùng toast trên 33 khung screencast: toast hiện từ 90,97 tới 94,65 rồi **mất hẳn**. `textContent` gọi lúc 94,74 đợi phần tử `[data-id="toast"]` tới 98,79 mà không thấy. Câu B không bao giờ hiện, còn toast A biến mất đúng lúc hết 3,2 s của chính nó.
- Run 37612032356 cho đúng chuỗi đó: lần nhấn thứ hai cách lần đầu 4,2 s, tức đúng lúc toast A hết giờ.

Cơ chế: `Toast` đặt `setTimeout(onDone, 3200)`, còn `onDone` của chủ là `setToast(null)` vô điều kiện (`use-quest-controller.ts` và `side-quests.tsx`). Khi chủ gọi `setToast(B)`, timer của A chỉ bị hủy lúc React commit lần render mới. Trên trang bận (khoảng 3 khung/giây trên CI), timer của A chạy trước lần commit đó và `setToast(null)` đè lên B.

Tái hiện chắc chắn bằng vitest (`apps/web/src/ui/kit/toast.test.tsx`): đặt A, tua 3199 ms, rồi trong cùng một `act` đặt B và tua 1 ms.

- Với mẫu cũ `onDone={() => setToast(null)}`: thất bại "Unable to find an accessible element with the role status". Không còn toast nào, giống hệt CI.
- Với bản sửa: B vẫn hiện, rồi tự tắt sau 3,2 s.

### 3. `quest-flow:19` và `challenges:11`: hết thời gian

- Trace `quest-flow:19`: mỗi lần `goto` + `waitReady` mất 4,4–5,0 s. Mỗi click `hud-interact` mất khoảng 4,1 s, vì mỗi bước actionability tốn 0,3–1 s trên trang chạy ở khoảng 3 khung/giây. Lần click thứ 3 (clue-box) bắt đầu ở 73,7 s, test hết giờ ở 77,2 s (45 s), trước khi click kịp xong.
- Trace `challenges:11`: tới `stream-stones` thì riêng "Scroll into view" mất 6,5 s, bounding box 4,2 s, tap 2,5 s, và test hết 45 s.
- Không có request lỗi hay lỗi JS nào. Hai test này chỉ đơn giản là dài (4 và 2 lần tải Khu rừng). Trước sự kiện chúng đã mất 33–36 s, tức đã vượt `SLOW_TEST_MS` = 30 s mà không khai `test.setTimeout`. Như vậy chúng vốn đã vi phạm quy tắc ngân sách thời gian.

### 4. `autowalk:16`: thẻ thu gọn giữa lúc click

- error-context: `locator resolved to <section … data-id="hud-tracker"> … element is visible, enabled and stable … element was detached from the DOM, retrying`. Snapshot chỉ còn nút thu gọn "Mở nhiệm vụ hiện tại".
- Dòng thời gian (mono): HUD gắn vào khoảng 61,8 s (sau khi có `/api/quests` và `/api/events`). 12 s sau, khoảng 73,8 s, thẻ thu gọn. Click bắt đầu lúc 70,04 s và các bước actionability mất khoảng 4 s, nên thẻ thu gọn ngay trước khi click thực hiện. Sau đó test thử lại mãi tới khi hết 90 s.
- Run post1 hỏng cùng gốc theo kiểu khác: click lọt vào đúng lúc 12 s, ngay sau đó thẻ thu gọn, nên `hud-autowalk` không còn.
- `autowalk:43` hỏng đúng kiểu này ở run 37408448385, **trước** sự kiện.

### Giả thuyết đã loại

| Giả thuyết | Kết quả |
|---|---|
| Quest sự kiện chen vào quest đang theo dõi, mũi tên hay autowalk | Loại. `currentQuest`, `questForRegion` và `recommendedQuest` đều bỏ qua `category: 'event'`. Trace cho thấy `hintTarget` và tracker đúng (clue-box, 0/11, 1/3, 2/3). Quest sự kiện có mục tiêu đầu là `ev-olympic-*`, không trùng mục tiêu chương 1. |
| `questOpenAt` hay đổi thứ tự `/api/quests` | Loại. Chỉ lọc quest `event` khi sự kiện đóng. Các bước `complete` của forest-ch1 trả 200 đúng thứ tự. |
| Xoay câu thoại bị đổi | Loại. `pick-fresh.ts` và `loop-lines.ts` không đổi giữa d0cf7d3a và 9c0f2098. Câu thứ hai không hề được hiện, nên vấn đề không nằm ở việc chọn câu. |
| Lỗi JS từ lớp sự kiện (`setDrawn`, `set-event-open`) | Loại. Cả 4 trace không có `pageerror` hay console error, ngoài các 404 `skill-check` vốn là bình thường. |
| Nhân vật/trang trí sự kiện làm nặng khung hình | Loại. Sự kiện cách các mục tiêu chương 1 280–355 khối, xa hơn tầm nhìn 40 của chất lượng thấp. Shard 1 với 2143e67f (nhân vật sự kiện còn vẽ ở mọi khoảng cách) không chậm. A/B local không chênh lệch. |
| Hồ sơ dùng chung giữa các spec | Loại. Cả 4 test dùng `storageState` rỗng và `freshChild` riêng. |

## Cách sửa

1. **App: toast chỉ xóa đúng câu đã hết giờ** (sửa lỗi thật, áp cho mọi máy chậm, không riêng CI).
   - `apps/web/src/ui/kit/toast.tsx`: thêm `clearShown(shown)`, một updater chỉ trả `null` khi câu hiện tại vẫn đúng là `shown`. `Toast` gọi `onDone(message)`, tức truyền câu đã hết giờ.
   - `apps/web/src/ui/quest/use-quest-controller.ts`: `clearToast(shown)` dùng `clearShown`. `quest-layer.tsx` vẫn truyền `onDone={quest.clearToast}` nên không phải sửa.
   - `apps/web/src/ui/quest/side-quests.tsx`: cùng lỗi, cùng cách sửa.
   - `social-layer.tsx` đã tự kiểm `seq` từ trước, không đổi.
2. **Test autowalk: chạm thẻ an toàn với việc tự thu gọn.** Thêm helper `tapCard`: nếu thẻ đã thu gọn thì mở lại, rồi `pointerdown` lên thẻ để đặt lại bộ đếm 12 s (chỉ nhấn, không phải chạm nên không khởi động autowalk), sau đó mới click. Thay cho cả 4 lần click thẻ trong `autowalk.spec.ts`, nên sửa luôn `autowalk:43`.
3. **Test dài khai thời gian.** `quest-flow:19`, `challenges:11` và `challenges:73` khai `test.setTimeout(90_000)` kèm lý do, theo đúng quy ước của `mvp-loop` và `sgk-content`. `challenges:73` mất 37 s trên CI sau sự kiện, và reporter sẽ đánh đỏ nó vì vượt 30 s mà không khai.

Tôi không đổi hành vi thu gọn thẻ (12 s tính từ lúc gắn HUD). Quyết định UX đó thuộc người sở hữu (03/10). Xem câu hỏi mở bên dưới.

## File và hunk (để người điều phối commit tách)

File chỉ của tôi:

- `apps/web/src/ui/kit/toast.tsx`: thêm `clearShown`. Chữ ký `Toast` đổi thành generic, `onDone: (shown: T) => void`. Timer gọi `() => onDone(message)`.
- `apps/web/src/ui/kit/toast.test.tsx` (mới): 2 test.
- `apps/web/src/ui/quest/side-quests.tsx`: `import { Toast, clearShown }`, `onDone={(shown) => setToast(clearShown(shown))}`.
- `apps/web/e2e/autowalk.spec.ts`: import `type Page`, helper `tapCard` sau `walkLine`, 4 dòng `await page.locator(card).click()` đổi thành `await tapCard(page)`.
- `apps/web/e2e/quest-flow.spec.ts`: 2 dòng (comment và `test.setTimeout(90_000)`) đầu test `meet the parrot…`.
- `apps/web/e2e/challenges.spec.ts`: 2 dòng đầu test `drag ten apples…`, 2 dòng đầu test `the riddle with the Answer layer…`.

**File dùng chung với agent màn boss: `apps/web/src/ui/quest/use-quest-controller.ts`**, đúng 3 hunk của tôi (phần còn lại của diff là WIP của agent kia):

```diff
+import { clearShown } from '../kit/toast';
 import { TIMETABLE_TARGETS } from '../timetable/timetable-targets';
@@ interface QuestController
-  clearToast: () => void;
+  /** Clears the line whose time ran out (`Toast`'s `onDone`), never one set since. */
+  clearToast: (shown: Bilingual) => void;
@@ return
-    clearToast: useCallback(() => setToast(null), []),
+    clearToast: useCallback((shown: Bilingual) => setToast(clearShown(shown)), []),
```

## Kết quả kiểm

- `pnpm vitest run apps/web/src/ui/kit/toast.test.tsx apps/web/src/ui/quest`: 7 file, 37 test pass. Trước khi sửa, `toast.test.tsx` đỏ 2/2. Mẫu cũ cho lỗi "no role status" ở test race.
- `pnpm typecheck`: sạch (root, server, web).
- `pnpm lint` (`eslint . --max-warnings=0`): exit 0.
- `pnpm content:check`: OK, 2038 file.
- `pnpm --filter @miu/web build`: exit 0, 0 lỗi. Còn 2 cảnh báo có sẵn: configLoader native và chunk > 500 kB.
- `pnpm security:dist`: OK.
- `pnpm assets:check`: **đỏ, không do tôi**: `hash mismatch: generated/review/bosses/5-chep-vao-vo.png` và manifest lệch. Đây là ảnh review boss của agent màn boss.
- E2E trên cây chính (`pnpm --filter @miu/web e2e --project setup --project quest-flow --project challenges --project autowalk`, GPU máy dev, 1 worker): **8/8 pass trong 1,0 phút**. Reporter không báo test nào vượt 30 s mà không khai. Bản chạy có lẫn WIP của agent màn boss trên cùng cây làm việc.
- Chưa kiểm được: chạy trên CI. Máy dev nhanh hơn CI khoảng 3 lần nên không tái hiện được lỗi hết giờ; bằng chứng cho các bản sửa là trace CI và test vitest race ở trên.

## Phòng tái diễn

- Mẫu "timer hết giờ thì set null" là lỗi tiềm ẩn ở mọi overlay tự tắt. Từ nay `onDone` của `Toast` trả về câu đã hiện, và chủ phải dùng `clearShown`. Comment trong `toast.tsx` ghi rõ quy tắc này.
- Time-budget-reporter đã đánh dấu `quest-flow:19` và `challenges:11` vượt 30 s từ trước sự kiện. Lỗi bị che vì CI vốn đã đỏ ở các test khác (`mvp-loop`, `hud-layout`, `maps`…). Nên đưa CI về xanh để những tín hiệu này không bị chìm.
- Tốc độ máy GitHub giữa các shard dao động ±40% (shard 1 của run 37618106717 nhanh hơn 37%). Test nào phụ thuộc timer UI (toast 3,2 s, thẻ 12 s) phải tự đặt lại hoặc chờ trạng thái, không được giả định thời gian.

## Câu hỏi mở

- Thẻ nhiệm vụ đang tính 12 s từ lúc HUD gắn, kể cả lúc bản đồ còn đang tải. Trên máy chậm, bé chỉ thấy thẻ khoảng 7 s. Có nên tính 12 s từ lúc game sẵn sàng (`status === 'ready'`) không? Đây là thay đổi UX nhỏ, tôi không tự làm.
- Vì sao shard 2 chậm ở cả hai lượt sau sự kiện thì không chứng minh được (GitHub không ghi CPU). Bằng chứng nghiêng về máy: các bước chỉ có DOM cũng chậm theo, các shard khác không chậm, A/B local không chênh. Cần thêm một lượt CI để xác nhận.
- Các test hỏng sẵn từ trước sự kiện (`mvp-loop`, `hud-layout fits`, `sgk-mechanics 129`, `maps` longest ride, `forest-life:37`, `sgk-content:67`, `play`, `creator`, `home:10`, `pets`, `online`, `interactions`) nằm ngoài phạm vi lần này.
