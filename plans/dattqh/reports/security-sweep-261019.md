# Quét bảo mật toàn hệ thống — 19/10/2026

Pha 5 của `plans/dattqh/261004-1617-mvp-gate-launch-readiness/plan.md`. Phạm vi: `apps/server` (Express + Drizzle) và kết nối WebSocket multiplayer. Giả định: từ 12/10/2026 mọi tài khoản Google đều đăng nhập được, nên coi mỗi endpoint là người lạ gọi tới được. Bản này không chứa secret, IP hay dữ liệu thật.

Chưa làm trong phiên này (phiên chính làm): `pnpm --filter @miu/web build`, `pnpm security:dist`, E2E, toàn bộ bộ test.

## Tóm tắt

| Mức | Phát hiện | Trạng thái |
|---|---|---|
| **Nghiêm trọng** | F1. `GET /api/timetable` trả thời khóa biểu thật của lớp con chủ sở hữu (tên trường, lớp, tên và số điện thoại GVCN) cho mọi người chơi chưa tự lưu thời khóa biểu, kể cả người lạ | **Chưa sửa**: cần chủ sở hữu quyết, và có một thao tác production |
| Trung bình | F2. Nấu ăn không cần nguyên liệu, không chạy trong transaction, không trừ nguyên liệu ở `inventory_items` | Báo cáo, cần quyết định sản phẩm |
| Trung bình | F3. Font HP001 (không có license mở) được tải về bởi mọi phiên đã đăng nhập, tức nay là mọi người có tài khoản Google | Báo cáo, là vấn đề pháp lý |
| Thấp | F4. Bộ nhớ lượt luyện Olympic dùng chung một trần 5.000 lượt cho mọi người chơi: một người có thể đẩy lượt của người khác ra, khiến lượt đó được trả 0 | Báo cáo |
| Thấp | F5. Nhiều endpoint ghi không có rate limit (cooking, home-objects, timetable, player-positions, character, shop, mail…) | Báo cáo |
| Thấp | F6. Olympic practice: xem lớp "Đáp án" không bị trừ gì, sau đó vẫn được trả thưởng khi trả lời đúng | Báo cáo (chủ sở hữu chấp nhận gian lận) |
| Thấp | F7. `POST /api/mail/:id/{read,claim}` với id không phải uuid trả 500 và ghi `unhandled error` | **Đã sửa** kèm test |

Không thấy IDOR. Mọi route game lấy người chơi từ session qua `activePlayerId`/`findActivePlayer` (`auth/auth-context.ts:76-93`), và hàm này kiểm lại `child_profiles.parent_id = session.parent_id` trong mỗi request. Mọi route nhận id người chơi đều qua `ownedPlayer` (`player/owned-player.ts:18-25`) và trả 404. Tài nguyên phụ (thư, lời mời kết bạn, tình bạn, chặn, lời mời link) đều lọc theo cặp `(id, child_id)`. Thưởng, XP, xu đều do server tính từ content; client chỉ gửi câu trả lời hoặc id. Chi tiết ở mục "Đã kiểm, không có lỗi".

`pnpm audit --prod --audit-level=high`: **No known vulnerabilities found**, exit 0. Chạy `pnpm audit --prod` ở mọi mức cũng không ra gì.

## F1 — Nghiêm trọng: thời khóa biểu thật lộ cho người lạ

**Bằng chứng**
- `apps/server/src/timetable/timetable-routes.ts:44`: `const body = row ? Timetable.parse(row.timetable) : (defaultTimetable ?? emptyTimetable());`. Ai chưa lưu thời khóa biểu thì nhận `defaultTimetable`.
- `apps/server/src/config.ts:38-41`: `TIMETABLE_DEFAULT_FILE` được mô tả là "the owner's class".
- `docs/deployment-guide.md:147`: "Thời khóa biểu mặc định (lớp của bé nhà người sở hữu: có tên trường, tên và điện thoại cô giáo) … Mọi hồ sơ chưa tự lưu thời khóa biểu thấy bản này".
- `tools/deploy/production/deploy.sh:173-181`: lệnh `timetable` ghi biến này vào env production.
- `packages/schema/src/timetable.ts:44-55`: header gồm `school`, `className`, `schoolYear`, `teacher` ("GVCN: … – ĐT: …").
- Test `timetable-routes.test.ts:98` ("every child starts from the configured timetable…") khóa đúng hành vi này.

**Kịch bản khai thác**: một người lạ đăng nhập bằng một tài khoản Google bất kỳ, đồng ý chính sách (người chơi chính được tạo lúc đó), rồi gọi `GET /api/timetable` (hoặc mở Nhà của bé). Response trả về tên trường, tên lớp, năm học của con chủ sở hữu, và tên cùng số điện thoại của cô giáo. Như vậy một trẻ thật bị định vị được (trường, lớp) và dữ liệu của bên thứ ba (cô giáo) bị lộ. Không cần kỹ năng gì, và mọi người chơi mới đều thấy. Hành vi này được thiết kế khi game chỉ có người trong nhà chơi; mở đăng nhập ngày 12/10 đã biến nó thành lộ dữ liệu.

**Vì sao chưa sửa**: đổi cách chia sẻ dữ liệu trẻ em là việc phải hỏi người (CLAUDE.md, "Hỏi người trước khi làm"). Sửa code cũng không chặn được lộ dữ liệu cho tới khi deploy, mà deploy hay đổi env production đều phải hỏi người trước mỗi lần.

**Phương án (khuyến nghị A ngay, rồi B)**
- **A. Chặn ngay ở production (khuyến nghị)**: gỡ dòng `TIMETABLE_DEFAULT_FILE=…` khỏi env production rồi restart. Người chơi mới thấy mẫu trống. Bé nhà chủ sở hữu, nếu đã tự lưu thời khóa biểu, vẫn giữ bản của mình (dòng trong bảng `timetables`). Cần người duyệt thao tác production.
- **B. Sửa code, đóng khi không có cấu hình**: chỉ trả bản mặc định cho các tài khoản trong danh sách cho phép (ví dụ `TIMETABLE_DEFAULT_ACCOUNTS`, danh sách `parents.id` dạng uuid, không phải email); thiếu biến thì không ai nhận. Sửa `timetable-routes.ts`, `config.ts`, `app.ts`, thêm test "người lạ nhận mẫu trống", và cập nhật `docs/deployment-guide.md` §147 cùng `deploy.sh timetable`. Cỡ S.
- C. Bỏ hẳn tính năng thời khóa biểu mặc định. Đơn giản nhất, nhưng gia đình chủ sở hữu mất bản mặc định khi thêm người chơi mới.

**Đã xử lý (19/10/2026)**
- A: người sở hữu duyệt; dòng `TIMETABLE_DEFAULT_FILE` đã gỡ khỏi env production, server restart một lần, health 200 trên máy và qua domain, revision không đổi, không có migration. Env cũ chép lại trên máy chủ, quyền 600, để lùi được.
- B: đã sửa code (chưa release). Bản mặc định chỉ trả cho tài khoản có email đăng nhập trong `TIMETABLE_DEFAULT_ACCOUNTS`. Ở production, không đặt biến thì không ai nhận. Dùng email thay vì `parents.id` vì người sở hữu biết email của mình mà không phải tra database; danh sách nằm trong env ngoài repo và không bị log. Test: `shows the configured timetable only to the listed accounts`, `gives the default timetable to every account only outside production`. `docs/deployment-guide.md` §7 đã cập nhật.

Nên kiểm thêm: những tài khoản ngoài gia đình đã đăng nhập từ 12/10 có thể đã nhận bản này. Đây là một sự cố dữ liệu cần chủ sở hữu đánh giá (có báo cho cô giáo hay không).

## F2 — Trung bình: nấu ăn không cần nguyên liệu, không có transaction

**Bằng chứng**: `apps/server/src/cooking/cooking-routes.ts:68-104`
- Dòng 68-71: chú thích là "Deduct ingredients if child owns them". Thiếu nguyên liệu thì món vẫn được nấu và cộng vào `shop_inventory`.
- Nguyên liệu chỉ bị trừ ở `shop_inventory` (dòng 74-80). Nguyên liệu nhận từ quest nằm ở `inventory_items` và không bao giờ bị trừ.
- Dòng 78 và 93 ghi số tuyệt đối (`qty: inShop.qty - deduct`, `qty: existing.qty + resultQty`) sau khi đã đọc ở ngoài transaction, không khóa hàng. Hai lần nấu đồng thời sẽ mất một lần cập nhật.
- Không có dòng ledger, không có rate limit. Test `cooking-routes.test.ts` "cooks a recipe and adds the dish to inventory" nấu cho một người chơi mới, chưa có nguyên liệu, và mong đợi 200: hành vi này đang được khóa bằng test.

**Kịch bản**: một vòng lặp `POST /api/cooking/cook {recipeId}` tạo số món không giới hạn. Món được dùng ở `POST /character/pet/care` (feed) để nâng no và vui của thú cưng. Bond XP vẫn giới hạn 30 giây một lần, và món không phải phụ kiện nên không mở thành tích (`player-facts.ts:154` chỉ đếm `content.accessories`). Tác động chỉ nằm trong tài khoản của chính người đó, không chạm người khác. Tuy vậy nó trái quy tắc "server là nguồn sự thật cho vật phẩm".

**Vì sao chưa sửa**: nguyên liệu (`bong-lua-vang`, `trung-ga-ta`…) đồng thời là vật sưu tập (`content/collectibles.json`). Trừ chúng khỏi `inventory_items` sẽ làm bộ sưu tập mất món, nên luật trừ là quyết định sản phẩm (giữ lại 1 như quà NPC, `npc-routes.ts` `keep`?). Đề xuất: bắt buộc đủ nguyên liệu và chạy trong `db.transaction` với `lockChild`; cộng trừ bằng `sql\`qty ± n\``; trừ ở `inventory_items` nhưng giữ 1 món cho vật sưu tập như quà NPC; ghi một dòng ledger `cook:<id>` (id do client sinh, giống `purchaseId`) để gửi lại không nấu hai lần. Cỡ S, nhưng làm đổi hành vi người chơi thấy, cần duyệt (Jev).

## F3 — Trung bình (pháp lý): font HP001 phát cho mọi tài khoản

`apps/server/src/worksheet/worksheet-routes.ts:40-46`: `GET /worksheets/fonts/:file` chỉ cần `requireParent`, không qua cổng PIN, và không giới hạn theo gia đình. Chú thích ở dòng 18-21 ghi "HP001 … has no open license, so it is not in git". Trước 12/10 chỉ người trong nhà tải được. Nay bất kỳ ai có tài khoản Google đều tải được hai file woff2 (đường dẫn file theo allow-list, nên không có path traversal). Như vậy là phân phối lại một font không có license cho công chúng. Đề xuất: chủ sở hữu xác nhận license với HP Design, hoặc chỉ phát cho danh sách tài khoản cho phép (dùng chung cơ chế với F1-B). Không sửa vì là quyết định pháp lý.

## F4 — Thấp: lượt luyện Olympic bị người khác đẩy ra

`apps/server/src/olympiad/practice-runs.ts:7,27`: `MAX_RUNS = 5000` dùng chung cho cả server, và lượt cũ nhất bị bỏ trước. `POST /olympiad/practice/:questionId/check` trả lời đúng với một `runId` mới là tạo thêm một lượt. Giới hạn là 120 lần/phút cho mỗi người chơi; một tài khoản có tối đa 3 người chơi, và có thể dùng nhiều tài khoản.

**Kịch bản**: kẻ tấn công dùng vài người chơi gửi `check` với `runId` ngẫu nhiên, đẩy bộ nhớ vượt 5.000 lượt. Người chơi khác đang luyện, khi gọi `finish`, được `runs.finish` trả 0 câu đúng nên không nhận thưởng. Không lộ dữ liệu. Đề xuất: giới hạn số lượt mở trên mỗi người chơi (ví dụ 3, bỏ lượt cũ nhất của chính người đó) trước khi áp trần chung. Cỡ S.

## F5 — Thấp: endpoint ghi không có rate limit

Không có limiter: `/cooking/cook`, `/home-objects` PUT, `/home-decor` PUT, `/timetable` PUT, `/player-positions` PUT, `/character` PUT, `/character/pet/*`, `/shop/buy`, `/shop/use`, `/mail/:id/*`, `/collection/claim`, `/regions/:id/rewards/claim`, `/achievements/:id/claim`, `/play-time`, `/friends/*`, `/players/*`. Mỗi request phải có session và body tối đa 32 KB. Một người chơi có thể bắn liên tục để tạo tải lên DB (vài claim còn tính lại `progressSummary`, khá nặng). Đề xuất: một limiter chung cho mọi phương thức ghi của `/api`, theo người chơi đang chọn (ví dụ 120/phút), đặt sau `loadSession` trong `app.ts`. Cỡ S.

## F6 — Thấp: lớp "Đáp án" của luyện Olympic không bị trừ gì

`apps/server/src/olympiad/olympiad-routes.ts:132-139` trả `question.answer` khi `layer = 'answer'`. Sau đó `check` ghi câu đúng và `finish` trả 5 XP + 1 xu mỗi câu. Quest có đếm `answerViews`; Olympic thì không. Một script có thể nhận khoảng 600 XP/phút trong giới hạn rate limit. Chủ sở hữu đã chấp nhận gian lận và "mỗi lần chơi lại đều trả thưởng", nên chỉ ghi lại để xét nếu sau này có bảng xếp hạng công khai.

## F7 — Thấp: đã sửa — id thư sai định dạng gây lỗi 500

`apps/server/src/mail/mail-routes.ts` cũ dùng `String(req.params.id)` để so với cột `uuid`. Postgres báo lỗi sai cú pháp, và người gọi nhận 500 `internal` (log `unhandled error Error`). Tôi đã xác nhận bằng test trước khi sửa: "expected 404, got 500". Không lộ dữ liệu, nhưng là đường để bơm log lỗi.

- Sửa: thêm `mailIdParam` (kiểm `Id` từ `@miu/schema/account`, trả 404 `mail-not-found`), dùng ở `mail-routes.ts:128` và `:152`.
- Test mới: `mail routes › answers 404, not a server error, for a mail id that is not an id` (`apps/server/src/mail/mail-routes.test.ts`).
- Kiểm tra: `pnpm vitest run apps/server/src/mail/mail-routes.test.ts`: 6/6 qua. `apps/server/src/security/endpoint-table.test.ts`: 3/3 qua. `eslint --max-warnings=0` trên 2 file: exit 0. `pnpm --filter @miu/server typecheck`: exit 0.

## Bảng endpoint HTTP

Ký hiệu cột:
- **Auth**: `—` là mở (public); `S` cần session; `S+G` cần session và cổng PIN (cổng luôn mở khi chưa đặt PIN).
- **Sở hữu**: `active` là người chơi lấy từ session, đã kiểm lại theo tài khoản; `own(:id)` là `ownedPlayer` trả 404; `row` là lọc theo cặp `(id, child_id)`; `account` là theo `parent_id`; `—` là không có dữ liệu người chơi.
- **Kiểm input**: zod hoặc kiểm danh mục content.

Toàn cục cho mọi route `/api`: Origin phải nằm trong allow-list khi gọi phương thức ghi (`origin-check.ts`); cookie `__Host-` HttpOnly SameSite=Lax (production); body tối đa 32 KB (analytics 4 KB); `helmet`; lỗi trả client không có stack (`app.ts` errorHandler). Test `endpoint-table.test.ts` duyệt mọi route: route không nằm trong danh sách public phải trả 401 khi không có session; mọi route có `:id` phải trả 404 khi id là người chơi của tài khoản khác.

| Phương thức | Đường dẫn | Auth | Sở hữu | Kiểm input | Rate limit |
|---|---|---|---|---|---|
| GET | /health | — | — | — | — |
| POST | /analytics/events | — | — | `WebEventBody` + `sanitizeWebEvent` | 600/phút/IP, 60/phút/client id |
| POST | /auth/register | — (chỉ khi `PASSWORD_LOGIN`) | — | `RegisterRequest` | 10/giờ/IP |
| POST | /auth/login | — (chỉ khi `PASSWORD_LOGIN`) | — | `LoginRequest`, băm giả cho email lạ | 50/15 phút/IP, 10/15 phút/IP+email |
| POST | /auth/logout | — | session của chính mình | — | — |
| GET | /auth/me | S | account | — | — |
| GET | /consents/policy | — | — | — | — |
| POST | /consents | S+G | account | `ConsentRequest` (đúng phiên bản) | — |
| POST | /auth/pin | S+G | account | `SetPinRequest` | 10/15 phút/session |
| DELETE | /auth/pin | S+G | account | — | — |
| POST | /parent-gate/unlock | S | account | `ParentGateUnlockRequest`, khóa sau 5 lần sai (đặt chỗ nguyên tử) | 10/15 phút/session |
| POST | /parent-gate/lock | S | session | — | — |
| GET | /auth/google/start | — | — | `intent` | 30/15 phút/IP |
| GET | /auth/google/callback | — | — | state + PKCE + nonce, iss/aud/azp/exp/email_verified | 30/15 phút/IP |
| GET | /account/export | S+G | account | — | — |
| DELETE | /account | S+G | account (cascade) | — | — |
| GET | /players | S | account | — | — |
| POST | /players | S+G | account, khóa tài khoản, tối đa 3 | `PlayerInput` + danh sách tên | — |
| PATCH | /players/:id | S+G | own(:id) | `PlayerPatchInput` + danh sách tên | — |
| PATCH | /players/:id/language | S | own(:id) | `PlayerLanguageUpdate` | — |
| DELETE | /players/:id | S+G | own(:id), không xóa người chơi chính | uuid | — |
| POST | /players/:id/select | S | own(:id) + consent | uuid | — |
| GET | /player-settings | S | active | — | — |
| PUT | /player-settings | S | active | `PlayerSettingsPatch` (chỉ `botsEnabled`) | — |
| PATCH | /players/:id/settings | S+G | own(:id) | `PlayerSettingsPatch` | — |
| GET | /learning-progress | S | active | — | — |
| GET | /players/:id/learning-progress | S+G | own(:id) | uuid | — |
| POST | /play-time | S | active | `PlayTimeBeat` | — |
| GET | /friends | S | active | — | — |
| POST | /friends/requests/:id | S | row (lời mời gửi tới mình), khóa hàng | uuid + `FriendAnswer` | — |
| DELETE | /friends/requests/:id | S | row (lời mời của mình) | uuid | — |
| DELETE | /friends/:id | S | row | uuid | — |
| DELETE | /blocks/:id | S | row | uuid | — |
| GET | /players/:id/friends | S+G | own(:id) | uuid | — |
| DELETE | /players/:id/friends/:friendId | S+G | own(:id) + row | uuid | — |
| DELETE | /players/:id/blocks/:blockId | S+G | own(:id) + row | uuid | — |
| GET | /invites | S | active | — | — |
| POST | /invites | S | active, tối đa `INVITES_MAX` (khóa hàng) | — | 20/giờ/tài khoản |
| DELETE | /invites/:id | S | row | uuid | — |
| POST | /invites/:code/accept | S | code 128 bit, chỉ lưu hash; mã của chính mình hay bị chặn đều trả 404 | `INVITE_CODE` | 10/10 phút/tài khoản |
| GET | /character | S | active | — | — |
| PUT | /character | S | active | `CharacterUpdate` + danh mục + kiểm mở khóa/sở hữu | — |
| GET/PUT | /player-positions | S | active | `PlayerPosition` + map có thật | — |
| GET | /progress, /inventory | S | active | — | — |
| GET | /quests, /quests/:questId | S | active | `ContentId`, `QuestCategory` | — |
| GET | /skill-check/:targetId | S | active | `ContentId` | — |
| POST | /quests/:questId/steps/:stepId/complete | S | active, khóa hàng tiến độ | `StepCompleteRequest` (thưởng lấy từ content) | 30/phút/người chơi+bước |
| POST | /quests/:questId/steps/:stepId/support | S | active, khóa hàng | `SupportRequest`, chặn bước tương lai | 20/phút/người chơi+bước |
| GET/PUT | /timetable | S | active | `Timetable` (giới hạn độ dài) | — (**F1**) |
| GET/PUT | /home-decor | S | active | `HomeDecor` + danh mục + kiểm sở hữu | — |
| GET/PUT | /home-objects | S | active | `HomeObjects` (tối đa 96 khóa, regex) | — |
| GET | /shop | S | active | — | — |
| POST | /shop/buy | S | active, `lockChild`, ledger theo `purchaseId` | `ShopBuyRequest`, giá, cấp, số lượng do server quyết | — |
| POST | /shop/use | S | active, `lockChild`, ledger theo `useId` | `BoosterUseRequest` | — |
| GET | /region-rewards, /regions/:regionId/rewards | S | active | `ContentId` | — |
| POST | /regions/:regionId/rewards/claim | S | active, `lockChild`, unique (child, source) | `RegionRewardClaimRequest` | — |
| GET | /collection | S | active | — | — |
| POST | /collection/claim | S | active, `lockChild`, unique | `CollectionClaimRequest` | — |
| GET | /character/pet/care | S | active | — | — |
| POST | /character/pet/care | S | active, khóa hàng bond, trừ món có điều kiện | `PetCareRequest` + món có thật | — |
| POST | /character/pet/walk, /character/pet/trick | S | active, khóa hàng | `PetTrickRequest`, thời gian đi do server đếm | — |
| PUT | /character/pet/name, /character/pet/gear | S | active | danh sách tên / `gearIssues` + sở hữu | — |
| GET | /cooking/recipes | S | active | — | — |
| POST | /cooking/cook | S | active, **không transaction** | `CookRequest` | — (**F2**) |
| GET | /olympiad/status | S | active | — | — |
| GET | /olympiad/practice/:topicId, /olympiad/exam | S | — (không trả đáp án) | `OlympiadTopicId` | — |
| POST | /olympiad/practice/:questionId/check, /support | S | active (lượt trong bộ nhớ) | `ContentId` + zod | 120/phút/người chơi (**F4**, **F6**) |
| POST | /olympiad/practice/:topicId/finish, /olympiad/submit | S | active, `lockChild`, ledger theo `runId` | zod, chấm điểm ở server | 20/phút/người chơi |
| GET | /events, /events/:eventId | S | active | `ContentId`; sự kiện chưa mở/đã hết trả 404 | — |
| GET | /mail | S | active | — | — |
| POST | /mail/:id/read, /mail/:id/claim | S | row; claim theo unique (child, source) | uuid (**F7 đã sửa**) | — |
| GET | /npcs | S | active | `ContentId` | — |
| POST | /npcs/:npcId/talk, /npcs/:npcId/gift | S | active; quà có ledger unique theo ngày | `NpcGiftRequest` + `likes` | 30/phút/người chơi+NPC |
| GET | /skill-tree, /journey, /achievements, /trophies | S | active | `JourneyTab` | — |
| POST | /achievements/:achievementId/claim | S | active, `lockChild`, unique | `ContentId` | — |
| GET | /worksheets, /worksheets/:lessonId | S+G | — (nội dung chung) | `BookId`/`ContentId` | — |
| GET | /worksheets/fonts/:file | S | — | tên file theo allow-list | — (**F3**) |
| GET | /voice/ice-servers | S | active | — | 30/10 phút/người chơi (bộ nhớ, tối đa 10k khóa) |

### WebSocket `/api/ws` (`multiplayer/multiplayer-hub.ts`)

- Upgrade (`:611-632`): bắt buộc Origin trong allow-list và cookie session còn sống. Người chơi lấy từ `findActivePlayer`, kiểm lại định kỳ (`stillValid`). Payload tối đa 4 KB (signal voice 16 KB). Token bucket 40, nạp lại 20/giây; signal có bucket riêng 80. Message được parse bằng `ClientWsMessage` (strict).
- Định danh: người khác chỉ thấy `publicId` ngẫu nhiên (`p-…`), không bao giờ thấy id hồ sơ. Tên, loài, trang phục đọc từ DB.
- `chat`/`party-chat`: chỉ `CannedChat` (câu soạn sẵn), không có chữ tự do. `emote`/`chat` có đích thì kiểm `reachable`.
- `block`/`report`: id đích phải là người chơi đang online, không phải chính mình; report có cooldown và lưu vào `player_reports`.
- `friend-request`: `FriendRequestLimiter` + transaction khóa hai hàng, chặn khi có block, giới hạn `FRIEND_PENDING_MAX`/`FRIENDS_MAX`.
- Party: phải nhận lời mời (`party-reply`); kick/promote chỉ trưởng nhóm làm được (`party-service`); vào nhà người khác chỉ khi là bạn bè hoặc cùng party và không chặn nhau, kiểm lại khi quan hệ đổi (`recheckHomes`).
- Voice (`voice-service.ts`): gọi riêng chỉ cho bạn bè đang online (đọc DB `areFriends`), cần người nhận chấp nhận, 10 cuộc gọi/10 phút; mỗi `voice-signal` kiểm hai đầu cùng kênh, đều là người chơi, không chặn nhau (`:285-300`). Server không chuyển âm thanh, không ghi lại.
- Coop và party-quest: thưởng do server trả (`reward/coop-reward.ts`, mỗi lượt một dòng ledger, khóa hàng tiến độ).

## Đã kiểm, không có lỗi

- **IDOR**: toàn bộ các nhóm shop, home/decor, home-objects, pets, kitchen, friends, invites, coop/party, events, trophies, timetable (về sở hữu), voice, mail, account/players đều lọc theo người chơi đang chọn hoặc qua `ownedPlayer`. Bots không có endpoint HTTP. Marketing không có route ở server.
- **Thưởng ở server**: quest (`StepCompleteRequest` không có trường thưởng; thưởng lấy từ content, có `paidRuns`), mail (template), shop (giá từ catalog), collection/region/achievement (tự tính "đạt chưa" từ ledger), Olympic (chấm ở server), coop (catalog). Ledger có unique `(child_id, source)` (`db/schema.ts:158`) nên mọi claim là idempotent. Mail có unique `(child_id, template_id)` nên không có thư trùng khi gọi đồng thời.
- **Đăng nhập**: OAuth đủ PKCE S256, state, nonce, `prompt=login` + `auth_time` để mở cổng PIN; khi liên kết email cũ thì xóa password/PIN và đăng xuất mọi phiên. Token session lưu dạng sha256. PIN đặt chỗ lần thử nguyên tử, khóa sau 5 lần. Đăng nhập mật khẩu trả 404 khi không bật `PASSWORD_LOGIN`.
- **Lộ dữ liệu**: DTO bạn bè chỉ gồm tên nhân vật và loài; người bị chặn (theo cả hai chiều) không bao giờ hiện online; export chỉ theo tài khoản và qua cổng PIN; lỗi 500 không kèm thông báo (`app.ts` errorHandler).

## Rủi ro còn lại

- **Kiểm duyệt chưa có (chủ sở hữu hoãn)**: báo cáo được lưu vào `player_reports` nhưng không ai xử lý, không có ngưỡng tự động (ví dụ tự ẩn sau N báo cáo). Người lạ có thể mời party, rồi nói chuyện voice trong party với trẻ nếu trẻ nhận lời mời. Chặn có tác dụng ngay. Đây là thiết kế chủ sở hữu chọn (05/10, 12/10).
- **Voice**: không ghi âm, nên không có bằng chứng khi có báo cáo về voice.
- Vị trí và di chuyển trong phòng không được kiểm ở server (chủ sở hữu chấp nhận, không chống gian lận).
- Rate limit và các map đếm voice, report, lượt Olympic nằm trong bộ nhớ một tiến trình: restart là mất, và không dùng chung được nếu sau này chạy nhiều tiến trình.
- `pnpm security:dist` (đáp án trong bundle), build web và Semgrep CE chưa chạy trong phiên này: phiên chính và CI làm.
- F1: dữ liệu có thể đã bị lộ từ 12/10. Chủ sở hữu cần đánh giá sự cố.

## Việc đề xuất theo thứ tự

1. **F1-A ngay** (cần người duyệt production): gỡ `TIMETABLE_DEFAULT_FILE` khỏi env production, restart. Sau đó làm F1-B nếu vẫn muốn gia đình có bản mặc định.
2. F3: chủ sở hữu quyết license HP001, hoặc chỉ phát font cho tài khoản trong danh sách cho phép.
3. F2: Jev chốt luật trừ nguyên liệu, rồi sửa cooking theo hướng transaction + ledger.
4. F5 + F4: limiter ghi chung theo người chơi; trần lượt Olympic theo từng người chơi.
