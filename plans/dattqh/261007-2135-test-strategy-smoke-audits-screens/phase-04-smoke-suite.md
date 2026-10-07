# Pha 4: Bộ smoke 9 luồng, 11 test, luôn xanh, chặn deploy

**Tier:** L · **Phụ thuộc:** pha 1 (bảng phân loại), pha 2 (đã commit `.github/workflows/ci.yml`); agent debug màn boss đã commit `bosses`/`coop`/`pets`/`quest-api.ts`/`play.spec.ts` · **Trạng thái:** completed

## Bối cảnh

114 test trên 26 spec (`apps/web/playwright.config.ts:14` liệt kê 22 project đăng nhập sẵn, cộng `setup`, `account`, `speak`, `voice`, `perf`). CI chạy mọi project trừ `perf` trên 4 shard (`.github/workflows/ci.yml:75-105`, `apps/web/playwright.ci.config.ts:10-20`), shard nào cũng vượt hoặc sát 480 s, shard 4 dừng ở `maxFailures: 10`. `docs/code-standards.md:19` đã nói kiểm tăng theo nội dung phải ở Node và E2E chỉ lấy mẫu; pha này làm cho đúng như vậy.

Luật xóa: một test chỉ bị xóa khi bảng phân loại (pha 1) có dòng cho nó, và khi phần nó kiểm đã có test Node (ghi đường dẫn) hoặc là cảm giác chơi mà người sở hữu kiểm khi chơi. Test Node thay thế viết trước, xóa sau, trong cùng commit.

## Bộ smoke (giữ, không gắn tag; mọi spec còn lại đều là smoke)

| # | Luồng | Test (file:line ở `5e543f4f`) | Thời gian CI gần nhất | Ghi chú |
| --- | --- | --- | --- | --- |
| 1 | Đăng nhập Google → đồng ý → tạo nhân vật → Home → map → chơi → người chơi phụ, PIN → dữ liệu và xóa | `account-flow.spec.ts:35` (+ `parent-session.setup.ts`) | 28,9 s | Giữ nguyên. |
| 2 | Mở map và qua cổng | `maps.spec.ts:36` (lượt push chỉ `trung-tam`, có ngân sách draw-call; lượt hằng đêm `E2E_ALL_MAPS=1` mở mọi map) và `maps.spec.ts:53` (cổng Trung tâm → đảo → về) | 9,3 s; 23,6 s | Trung tâm là nơi các bạn gặp nhau. Lượt hằng đêm giữ làm lưới thêm. |
| 3 | Tương tác với mục tiêu | `play.spec.ts:206` chỉ `parrot-guide` (vòng `TARGETS` còn một mục) | 11,6 s | Audit pha 3 thay cho 8 mục còn lại. |
| 4 | Xong một quest bằng chạm và nhận thưởng | `quest-flow.spec.ts:19`, `quest-flow.spec.ts:100` | 56,0 s; 19,8 s | Thêm kiểm draw-call ở chỗ xuất hiện trong rừng (cảnh sự kiện ở gần; lỗi thật E2E từng bắt). |
| 5 | Các dạng bài SGK bằng chạm, kể cả phiếu viết trong bài | `sgk-mechanics.spec.ts:28` | 21,9 s | Phần học là lõi của game. |
| 6 | Đánh boss tới thưởng | một test của `bosses.spec.ts` (test đánh tới thưởng, chọn từ bản agent debug đã sửa) | khoảng 45 s | Đọc lại file ngay trước khi sửa. |
| 7 | Mua đồ và mặc | `shop.spec.ts` (mới) | — | Hiện chưa có E2E nào cho cửa hàng; gộp ý `creator.spec.ts:113` (đồ mới được giữ và mặc trong game). |
| 8 | In phiếu viết | `worksheets.spec.ts:29` | 4,3 s | Giữ nguyên. |
| 9 | Chơi online cùng đội | `coop.spec.ts:85` (hai người chơi lập đội, chơi thử thách chung, mỗi người được trả một lần) | 54,9 s | Người sở hữu và bé chơi cùng nhau; thưởng tính ở server. |

Tổng: 9 luồng, 11 test (Jev chốt, Validation Log câu 4): bỏ E2E an toàn bản build (`play.spec.ts:8`, `:291`) vì `security:dist` và test Node của CSP đã kiểm, bỏ Home trên điện thoại (`home.spec.ts:69`) vì ảnh màn hình pha 5 đã phủ.

**Luồng 7, mua đồ** (`apps/web/e2e/shop.spec.ts`): mở cửa hàng từ Home (`apps/web/src/ui/home/home-screen.tsx:191`), chọn một món đủ tiền, bấm `shop-buy` (`apps/web/src/ui/shop/shop-panel.tsx:218`), số xu giảm đúng giá theo server, bấm `shop-wear` (`:223`), vào `/play` thấy đồ đang mặc (cách kiểm của `creator.spec.ts:113`). Nếu người chơi mới không đủ xu [cần kiểm khi làm: số xu khởi đầu], lấy xu qua đường có sẵn trong `apps/web/e2e/quest-api.ts` (làm xong một quest bằng API), không thêm route chỉ dành cho test.

## Các spec còn lại: chuyển hay xóa

| Spec (số test) | Quyết định | Kiểm thay thế (Node) hoặc lý do |
| --- | --- | --- |
| `autowalk` (2) | Xóa | `apps/web/src/game/nav/route-walker.test.ts`, `walk-goal.test.ts`. |
| `bosses` (9) | Giữ 1 (luồng 6); xóa phần còn lại | Bản đồ có đủ trùm: `checkBossCoverage` (`tools/content/check-content.ts:439`); trận cả đội: `apps/server/src/coop/guardian-fight.test.ts`; draw-call khi đánh: đo bằng `perf` khi cần; ảnh câu hỏi dài ở 360 × 740 và 820 × 1180 (`bosses.spec.ts:292`, chỉ `REVIEW_SHOTS`): chuyển sang `screens.spec.ts` (pha 5). |
| `challenges` (2) | Xóa | Chạm kéo thả nằm trong luồng 5; 90 XP sau Đáp án: kiểm ở server [cần kiểm khi làm trong `apps/server/src/quest/quest-routes.test.ts`; chưa có thì thêm]. |
| `coop` (4) | Giữ `:85` (luồng 9); xóa `:117`, `:138`, `:160` | `apps/server/src/multiplayer/bot-coop.test.ts`, `apps/server/src/coop/party-quest.test.ts`, `apps/server/src/coop/guardian-fight.test.ts`. |
| `creator` (2) | Xóa | Tạo nhân vật nằm trong luồng 1; mặc đồ trong luồng 7; `apps/web/src/ui/creator/creator-screen.test.tsx`. Động tác vẫy, nhảy: cảm giác chơi. |
| `forest-life` (9) | Xóa | Số người và thú trên map: `expectLively` trong `tools/world/zone-maps.test.ts:61` và test map rừng; draw-call ở rừng: luồng 5; video review: lịch sử git. |
| `home` (11) | Xóa | Chồng lấn thẻ vùng và ghim ở các khổ, ghim chạm được trên điện thoại: dữ kiện DOM và ảnh ở `screens.spec.ts` (pha 5); `apps/web/src/ui/home/home-screens.test.tsx`. |
| `hud-layout` (4) | Xóa sau khi phân loại | Chồng lấn HUD: dữ kiện DOM và ảnh ở pha 5 (đúng kiểu "nhãn tương tác bị thẻ nhiệm vụ đè"); hàm `overlap` chuyển sang `apps/web/e2e/layout.ts` (pha 5). Nếu pha 1 kết luận iPad đang chồng lấn thật thì sửa ở pha này vì nó nằm trên màn chơi của mọi luồng. |
| `interactions` (4) | Xóa | `apps/web/src/game/interact/*.test.ts`, `apps/server/src/home/home-object-routes.test.ts` (đồ bật còn bật); danh mục đồ dùng: `world:interactions` và `interaction-catalogue.test.ts`. |
| `maps` (13) | Giữ 2 (luồng 2; test mở map giữ `E2E_ALL_MAPS` cho lượt hằng đêm); xóa phần còn lại | Mọi map mở được và đúng ngân sách: `perf` khi cần; bến xe tới được, chỗ xuống trống: `auditReach` (`tools/world/reach-audit.ts:48-53`) và audit pha 3; đường xe: `apps/web/src/game/ride/ride-path.test.ts`, `ride-route.test.ts`; bản đồ thế giới ghi sách và trang (`:196`): test React của màn bản đồ [cần kiểm khi làm; chưa có thì thêm cạnh `home-screens.test.tsx`]. Lỗi chuyến xe không tới nơi (`:147`) theo kết luận pha 1. |
| `mvp-loop` (1) | Xóa | Trùng luồng 1 và 4. Phần "không response API nào chứa đáp án" (`mvp-loop.spec.ts:91-95`): chuyển thành test server quét body các route quest với mọi đáp án trong `content/quests` [cần kiểm khi làm: `quest-routes.test.ts` đã có chưa]. |
| `npc-stories` (1) | Xóa | Chương truyện: test server của story quest [cần kiểm khi làm; nêu file]. |
| `online` (1) | Xóa | `apps/server/src/multiplayer/party-service.test.ts`, `hub-friends.test.ts`, `apps/server/src/friend/friend-routes.test.ts`, `apps/web/src/ui/online/online.test.tsx`; chơi cùng nhau ở luồng 9. |
| `pets` (5) | Xóa (sau khi agent debug commit) | `apps/server/src/pet-care/pet-care-routes.test.ts`, `apps/web/src/ui/pet-care/*.test.tsx`; cảnh chăm trong thế giới: cảm giác chơi. |
| `play` (22) | Giữ 1 (luồng 3); xóa phần còn lại | An toàn bản build (`:8`, `:291`): `pnpm security:dist` và test Node của CSP [cần kiểm khi làm; chưa có thì thêm]; đi, chạy, đứng trên đất: `player-controller.test.ts`; camera: `camera-rig.test.ts`; xe: `vehicle-ride.test.ts`; mắc kẹt: `rescue.test.ts`; tạm dừng, mất WebGL, rời `/play`: cảm giác chơi và người sở hữu thấy ngay. |
| `quest-flow` (3) | Giữ `:19`, `:100`; xóa `:81` | Lời "chưa tới lượt" không lặp: `freshPicker` có test [cần kiểm khi làm]. |
| `rescue` (2) | Xóa | `apps/web/src/game/player/rescue.test.ts`. |
| `school` (1) | Xóa | Đường từ cổng tới cột cờ: `scenery-audit`, `reach-audit` và audit pha 3. |
| `sgk-content` (6) | Xóa | "70 bài đều mở" (`:36`, không mở trình duyệt): chuyển vào `tools/content/check-content.test.ts`; đi hết bài: `apps/server/src/quest/tv2-quests.test.ts`, `toan2-quests.test.ts`; nơi của bài có trên map, nhân vật một chỗ: audit pha 3. |
| `sgk-mechanics` (3) | Giữ `:28`; xóa `:129` × 2 | Bài đọc dài cuộn bằng vuốt: ảnh pha 5 cho bố cục; lỗi cuộn theo kết luận pha 1 (thuộc màn câu hỏi của mọi bài, nếu là lỗi thật thì sửa ở pha này). |
| `speak` (1) | Xóa | `apps/web/src/ui/challenge/mechanics/voice-recorder.test.tsx`; ghi âm trên máy thật: người sở hữu. |
| `voice` (2) | Xóa | `apps/server/src/multiplayer/voice-service.test.ts`, `apps/web/src/ui/voice/voice-controls.test.tsx`; nghe thật: người sở hữu. |
| `wayfinding` (3) | Xóa | Danh sách bài ghi trang sách (`:64`): test React [cần kiểm khi làm]; mũi tên, thẻ nhiệm vụ: `apps/web/src/ui/hud/quest-tracker.test.tsx`; dòng bài trên điện thoại: ảnh pha 5. |
| `worksheets` (1) | Giữ (luồng 8) | — |
| `account-flow` (1) | Giữ (luồng 1) | — |
| `perf` (1) | Giữ, chạy tay | Không đổi; CI không chạy. |

Spec nào sinh ảnh review (`tools/assets/generated.json:98`, `:112`, `:126`, `:142`, `:158`) mà bị xóa: ảnh đã commit giữ nguyên làm hồ sơ duyệt; trường `generator` ghi rõ spec đã gỡ ở commit nào; chạy `pnpm assets:manifest`.

## Việc

1. Đọc bảng phân loại pha 1. Lỗi thật trên luồng giữ lại: sửa (đọc lại file sản phẩm và `git status` trước, phối hợp với phiên đang sửa UI).
2. Viết các test Node thay thế còn thiếu (các ô `[cần kiểm khi làm]`), chạy từng file một.
3. Xóa và cắt spec theo bảng trên; viết `shop.spec.ts`; bỏ mọi tag `@smoke`.
4. `apps/web/playwright.config.ts`: danh sách `SIGNED_IN` chỉ còn project của các spec giữ lại; bỏ project `speak`, `voice` và import `writeFakeVoice` (`apps/web/playwright.config.ts:4`); giữ `setup`, `account`, `perf`.
5. `apps/web/playwright.ci.config.ts`: bỏ `maxFailures` (để mọi test smoke đều chạy và báo); `E2E_SUITE_BUDGET_SECONDS` hạ còn 240; giữ `retries: 0`, `fullyParallel: true`.
6. `apps/web/package.json`: `e2e:smoke` chạy mọi project trừ `perf` (và `screens` sau pha 5) với 1 worker; `e2e:ci` giữ tên.
7. `.github/workflows/ci.yml` job `e2e`: 2 shard thay vì 4 (`total: [2]`); giữ biến `E2E_ALL_MAPS` cho lượt hằng đêm (Validation Log câu 7): trên push test mở map chỉ mở `trung-tam`, hằng đêm mở mọi map; giữ bước giữ trace khi hỏng.
8. `docs/code-standards.md:17-22`: viết lại mục "Ngân sách thời gian test" cho bộ smoke (danh sách 9 luồng, lượt hằng đêm mở mọi map, 2 shard, 240 s mỗi shard, không `maxFailures`, test mới vào smoke chỉ khi là một luồng chính; kiểm còn lại ở Node; audit pha 3; ảnh pha 5). `CLAUDE.md` dòng 17 và 19: lệnh `e2e:smoke` là toàn bộ bộ E2E, bỏ nhắc `@smoke`, 4 máy; giữ câu lượt hằng đêm mở mọi map.

## File

Sửa: `apps/web/e2e/{play,maps,quest-flow,sgk-mechanics,bosses,coop}.spec.ts` (cắt; `account-flow`, `worksheets` giữ nguyên), `apps/web/playwright.config.ts`, `apps/web/playwright.ci.config.ts`, `apps/web/package.json`, `.github/workflows/ci.yml` (job `e2e`), `tools/assets/generated.json` (trường `generator`), `assets/manifest.json` (qua `pnpm assets:manifest`), `docs/code-standards.md`, `CLAUDE.md`. Xóa: `apps/web/e2e/{autowalk,challenges,creator,forest-life,home,hud-layout,interactions,mvp-loop,npc-stories,online,pets,rescue,school,sgk-content,speak,voice,wayfinding}.spec.ts` và helper chỉ chúng dùng (`fake-voice.ts` nếu không còn ai import). Mới: `apps/web/e2e/shop.spec.ts`, các test Node thay thế. Không chạm: `apps/web/playwright.slow.config.ts` (file chưa track của phiên khác).

## Kiểm tra

- Trên máy dev, sau khi kiểm tải máy và cổng 4173/8787: `pnpm --filter @miu/web e2e --project setup --project shop` cho spec mới; rồi `pnpm --filter @miu/web e2e:smoke` một lần (1 worker), ghi thời gian reporter in.
- Gate 5 lệnh, `pnpm --filter @miu/web build`, `pnpm security:dist`.
- CI: job `e2e` 2 shard xanh, mỗi shard ≤ 240 s theo reporter, job ≤ 10 phút, 11 test chạy hết.

## Rủi ro, hoàn tác

- Xóa nhầm phần kiểm còn giá trị: luật "Node viết trước, xóa sau, cùng commit" và bảng phân loại; test lấy lại bằng `git show`.
- Test smoke giữ lại vẫn chập chờn trên CI: sửa nguyên nhân (chờ tín hiệu sẵn sàng của game thay vì `waitForTimeout`); nếu sau hai lần sửa vẫn chập chờn, chuyển phần kiểm sang Node và bỏ test khỏi smoke, ghi vào bảng. Không bật `retries`.
- Va chạm với agent debug: chỉ bắt đầu các file `bosses`, `coop`, `pets`, `quest-api.ts`, `play.spec.ts` khi `git status` sạch cho chúng.
- Hoàn tác: revert các commit của pha; CI về 4 shard như cũ.

## Lệch so với plan

Theo Validation Log: 9 luồng, 11 test (bỏ E2E an toàn bản build và Home trên điện thoại); giữ lượt hằng đêm mở mọi map nên test mở map còn logic `E2E_ALL_MAPS` (push chỉ mở Trung tâm).

## Todo

- [x] Viết `shop.spec.ts`
- [x] Cắt và xóa spec theo bảng, bỏ tag `@smoke`
- [x] Cấu hình Playwright: 2 shard, ngân sách 240 s, bỏ `maxFailures`
- [x] CI job e2e 2 shard, giữ lượt hằng đêm mở mọi map
- [x] Cập nhật `docs/code-standards.md`, `CLAUDE.md`
- [x] Bộ smoke xanh trên máy dev và trên CI
