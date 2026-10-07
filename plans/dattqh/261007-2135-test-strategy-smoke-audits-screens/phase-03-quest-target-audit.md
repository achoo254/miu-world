# Pha 3: Audit mục tiêu quest (tới được, không bị chiếm nút, không bị ẩn hay che)

**Tier:** M · **Phụ thuộc:** — (chạy song song pha 1, 2) · **Trạng thái:** completed

## Bối cảnh

Lỗi người sở hữu gặp hôm nay: ở bước bảng đề của năm quest `wonder-olympic-*` (`content/quests/wonder-olympic-arithmetic.json:159` và bốn file cùng loại), bảng `ev-olympic-bang` (`[221.5, 13, 331.5]`, bán kính 2,5) đứng cách vòm `ev-olympic-vom` (`[221.5, 13, 329.5]`, bán kính 3) 2 khối, nên ở nhiều chỗ đứng nút Tương tác hiện "Xem vòm". Không kiểm nào hiện có xét chuyện một mục tiêu bị vật tương tác khác chiếm nút.

Cách game chọn nút (đã đọc theo luồng chạy):

- Mỗi khung hình, `apps/web/src/game/game.ts:1226` gọi `pickNearest(targets, controller.position, hint?.def.id ?? null)`. `hint` là mục tiêu mũi tên chỉ (`game.ts:962`, từ lệnh của React; React lấy bằng `hintTarget` ở `apps/web/src/ui/quest/quest-flow.ts:55`).
- `pickNearest` (`apps/web/src/game/entities/interactables.ts:127-147`) bỏ mục tiêu không `available`, bỏ mục tiêu xa hơn bán kính của chính nó (khoảng cách 3D từ vị trí nhân vật), trả ngay mục tiêu ưu tiên nếu nó trong bán kính (`:139`), còn lại chọn cái gần nhất.
- Mục tiêu quest luôn thắng các lời mời khác: người chơi khác, dân làng, đồ dùng (ghế, đèn), thú cưng chỉ được hỏi khi `nearest` rỗng (`game.ts:1228-1237`). Vậy chỉ các interactable (kể cả nhân vật sự kiện) mới chiếm được nút của một mục tiêu quest.
- `available` = có mặt và không ở trạng thái `hidden` (`interactables.ts:295-297`). Không có mặt khi bị ẩn vì một nhân vật chỉ đứng một chỗ (`castHidden`, `packages/voxel/src/world-entities.ts:221`, gọi ở `game.ts:840-841`); `hidden` khi đồ đã nhặt không bước nào sau cần tới (`worldState`, `quest-flow.ts:77-91`) hoặc khi sự kiện của nhân vật đó đóng (`apps/web/src/game/event/event-layer.ts:66-69`, áp ở `game.ts:774`, `:971`).
- Bước chờ mục tiêu nào: `stepForTarget` (`quest-flow.ts:32-46`); với bước `search`/`find-object`, mọi đồ chưa tìm đều được nhận, nhưng chỉ đồ đầu tiên chưa tìm là mục tiêu ưu tiên (`hintTarget`, `quest-flow.ts:59-60`). Đây là chỗ phần ưu tiên không che chở: đồ thứ hai, thứ ba của một bước tìm vẫn có thể bị vật khác chiếm nút.

Công cụ có sẵn để dùng lại: `tools/world/reach-audit.ts:19-55` dựng lưới đi được từ map đã commit (khối, đồ có va chạm, mọi kiểu đồ trong nhà, cảnh sự kiện) và chạy `reachable` (`tools/world/walkable.ts:35`); `tools/world/event-layers.ts` đọc cảnh sự kiện của một map; `entitiesForChapter` (`packages/voxel/src/world-entities.ts:206`), `withEventLayers`, `eventInteractable` (`packages/voxel/src/event-layer.ts:49`, `:26`); `checkQuestTargets` (`tools/content/check-content.ts:103-170`) đã kiểm mục tiêu có trên map và không bị ẩn theo chương, và cách nó lọc nhân vật sự kiện theo quest (`check-content.ts:132`). `tools/world/interaction-coverage.ts:13-15` đã import code thuần của `apps/web/src/game/**` vào tool Node, nên audit import `pickNearest` và `quest-flow.ts` là theo tiền lệ.

Đo trên máy dev hôm nay: `pnpm exec tsx tools/world/reach-audit.ts forest-ch1` mất 3,8 s (kể cả khởi động tsx), RSS 340 MB; `pnpm content:check` mất 2,2 s.

## Việc

1. **Tách phần dựng lưới đi được** của `auditReach` thành một hàm dùng chung trong `tools/world/reach-audit.ts` (ví dụ `loadWalkMap(map)` trả `entities` có cảnh sự kiện, `world`, ô đồ `cells`, tập ô đứng `spots`). `auditReach` gọi lại hàm đó; đầu ra của `auditReach` không đổi (`tools/world/event-scenes.test.ts:20-23` vẫn xanh).
2. **Lõi thuần** `tools/world/quest-target-audit.ts`: nhận lưới, tập ô đứng, danh sách interactable của map (đã gộp nhân vật sự kiện, mọi sự kiện coi như mở), một quest, và một bộ chọn (mặc định `pickNearest` của game). Cho từng quest không phải `stub`, mô phỏng tiến độ theo thứ tự bước; với bước `search`/`find-object`, mô phỏng tìm từng đồ theo thứ tự `hintTarget`. Ở mỗi trạng thái:
   - Tập có mặt: `entitiesForChapter(entities, quest.chapter, quest.id)` + nhân vật sự kiện theo luật của `check-content.ts:132`, trừ `castHidden(…, pointedAt)` với `pointedAt` là các mục tiêu mũi tên đã chỉ theo thứ tự (`hintTarget` của từng trạng thái đã qua, như game ghi ở `game.ts:963-965`), trừ mục tiêu `worldState(...)` đánh `hidden`. Bước dùng `QuestStepPublic` (zod bỏ phần đáp án) để gọi đúng hàm của `quest-flow.ts` [cần kiểm khi làm: `QuestStepPublic.parse(step)` có nhận mọi bước định nghĩa không].
   - Mục tiêu cần kiểm: mọi id mà `stepForTarget` nhận ở trạng thái đó.
   - **Tới được:** có ít nhất một ô đứng (tâm ô, chân nhân vật) trong bán kính của mục tiêu, tính 3D như `pickNearest`.
   - **Không bị chiếm:** ở mọi ô đứng trong bán kính, `picker(available, spot, hintTarget(...))` trả một mục tiêu mà `stepForTarget` nhận. Phát hiện ghi số ô bị chiếm trên tổng và mục tiêu chiếm (id, tên).
   - **Không bị ẩn:** mục tiêu cần kiểm phải `available` ở trạng thái đó (bắt các ca `castHidden` hay đồ đã nhặt mà bước sau vẫn chờ).
   - **Không bị che:** ô chứa mục tiêu và ô ngay trên không phải khối đặc hay đồ `blocking` (đồ `auto-step` như bàn không tính, vì đồ đặt trên bàn là hợp lệ); và từ ít nhất một ô đứng trong bán kính, tia từ mắt (chân + 1,5) tới tâm mục tiêu (+0,5) không đi qua khối đặc.
3. **Lối vào:** `auditQuestTargets(map?)` đọc map đã commit, chạy lõi cho mọi quest của map, trả danh sách phát hiện; CLI `pnpm world:quest-targets [<map>…]` (thêm vào `package.json` cạnh `world:interactions`) in từng phát hiện và mã thoát 1 khi có.
4. **Gate:** `tools/content/check-content.ts` `main()` (`:717`) đổi sang `async`, gọi `auditQuestTargets()` cho mọi map sau các kiểm hiện có, đẩy phát hiện vào `report.issues`. `checkContent()` giữ đồng bộ (test của nó không đổi). Đo thời gian toàn bộ `pnpm content:check` trên máy dev; nếu vượt 30 s, làm theo câu hỏi mở 1 (bước riêng `pnpm world:quest-targets` trong CI và trong gate ở `CLAUDE.md`).
5. **Ngoại lệ:** chỉ khi sửa nội dung không hợp lý, khai trong một bảng `PROMPT_EXCEPTIONS` (khóa `quest/bước/mục tiêu`, giá trị là lý do một câu), theo kiểu `NOT_INTERACTIVE` ở `tools/world/interaction-coverage.ts:27`. Mặc định bảng rỗng.
6. **Sửa nội dung theo phát hiện:** dời vị trí trong `content/events/*.json` (không cần sinh lại map) hoặc trong `content/world/targets.json` rồi `pnpm world:<map>` cho đúng map đó, tuần tự từng map; sau mỗi lần sinh lại chạy ba audit của `.claude/rules/world-scenery.md` (`scenery-audit`, `room-audit`, `reach-audit`) và `pnpm assets:manifest`. Trước khi sửa `content/events/*.json`, nhắn phiên `miu-world-03`.
7. **Test** `tools/world/quest-target-audit.test.ts`:
   - Lưới nhỏ dựng tay: một mục tiêu bị một interactable bán kính lớn hơn đứng cạnh chiếm (có ưu tiên thì qua với mục tiêu ưu tiên, nhưng đồ thứ hai của bước tìm thì báo); mục tiêu trong tường (báo che); mục tiêu ngoài vùng đi được (báo không tới được); đồ đã nhặt mà bước sau vẫn chờ (báo ẩn).
   - Dữ liệu thật, thử đột biến: chạy audit trên map `forest-ch1` (vùng `khu-rung-bi-mat`, `content/world/regions.json`) với bộ chọn bỏ phần ưu tiên (gọi `pickNearest(targets, spot, null)`); phải có phát hiện `ev-olympic-bang` bị `ev-olympic-vom` chiếm ở bước bảng đề của cả năm quest `wonder-olympic-*`. Với `pickNearest` thật thì ca đó không còn.
8. Thêm một dòng vào mục "Kiểm tra" của `.claude/rules/world-scenery.md`: chạy `pnpm world:quest-targets <map>` sau mỗi lần `pnpm world:<map>` hay sửa cảnh sự kiện.

## File

Mới: `tools/world/quest-target-audit.ts`, `tools/world/quest-target-audit.test.ts`. Sửa: `tools/world/reach-audit.ts` (tách hàm, không đổi đầu ra), `tools/content/check-content.ts` (`main`), `package.json` (script), `.claude/rules/world-scenery.md`. Có thể sửa theo phát hiện: `content/events/*.json`, `content/world/targets.json`, `assets/generated/world/<map>/**`, `assets/manifest.json` (chỉ qua generator và `pnpm assets:manifest`).

## Kiểm tra

- `pnpm vitest run tools/world/quest-target-audit.test.ts tools/world/event-scenes.test.ts`.
- `time pnpm world:quest-targets forest-ch1` ≤ 6 s; `time pnpm content:check` (12 map của `content/world/regions.json`; `the-gioi` là ảnh toàn cảnh, không có quest) ≤ 60 s và in 0 phát hiện.
- Thử tay (không commit): đổi `interactables.ts:139` thành không ưu tiên, `pnpm content:check` phải đỏ ở ca bảng đề và vòm; trả lại như cũ.
- Gate 5 lệnh theo `CLAUDE.md`.

## Rủi ro, hoàn tác

- Luật "mọi ô đứng trong bán kính" có thể báo cả những ô sát mép bán kính mà trẻ ít đứng. Nếu số phát hiện kiểu đó lớn và vô hại, đổi luật thành "mọi ô đứng trong bán kính và gần mục tiêu hơn mọi interactable khác không thuộc bước" chỉ sau khi đếm thật; không tự nới trước khi có số liệu.
- Nhân vật sự kiện chỉ có khi sự kiện mở; audit coi mọi sự kiện đang mở nên chặt hơn game, đúng ý (sự kiện kỷ niệm mở lại hằng năm).
- Hoàn tác: revert commit; `check-content.ts` trở về đồng bộ; nội dung đã dời giữ nguyên được vì không phụ thuộc audit.

## Lệch so với plan

- Không cần tách hàm mới: `loadMapGrid` đã có (phiên `miu-world-03` tách ở 8376ca24); audit dùng lại nó, chỉ đổi bên trong (ô prop tra bằng chỉ số số) cho nhanh.
- 12 phát hiện "đồ thứ hai, thứ ba của bước tìm bị nhân vật đứng cạnh chiếm nút" được sửa ở luật game (`pickNearest` ưu tiên mọi đồ bước còn chờ, `game.ts` truyền danh sách đó) thay vì dời 12 món trên 5 map; audit vẫn gọi đúng hàm của game.
- Hai món trong tảng đá ở Thư viện: sửa generator (`keepOut` quanh đá) và sinh lại map Thư viện cùng route bot của map đó (phiên `miu-world-03` đồng ý).

## Todo

- [x] Lõi audit gọi hàm của game (pickNearest, hintTarget, stepForTarget, worldState, castHidden, entitiesForChapter)
- [x] Dùng lại `loadMapGrid`, tăng tốc lưới
- [x] Gọi trong `content:check`, script `world:quest-targets`
- [x] Sửa phát hiện: luật chọn nút ưu tiên đồ bước tìm, sinh lại map Thư viện
- [x] Test lưới dựng tay và thử đột biến trên map rừng
- [x] Thêm dòng kiểm vào `.claude/rules/world-scenery.md`
