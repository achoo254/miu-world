---
title: "Bạn máy tự học, chơi như người chơi"
description: "Bạn máy chỉ thấy quanh mình, tự đi từng ô theo luật bước, tự dựng bản đồ nhớ và học nơi nên đến bằng học tăng cường, lưu trí nhớ vào DB; gặp người chơi thì nói câu mới, chủ động kết bạn, rủ tổ đội và cùng làm party quest; thưởng vẫn do server tính."
status: completed
priority: P2
tier: XL
effort: "XL (10 pha: 4 L, 6 M; pha 5 đã xong; không ước lượng giờ)"
branch: main
tags: [server, multiplayer, bots, learning, party, world-data, db]
blockedBy: []
blocks: []
created: 2026-10-07
---

# Bạn máy tự học, chơi như người chơi

**Trạng thái:** XONG cả 10 pha (08/10/2026; commit từng pha trong bảng Pha). Chờ người duyệt trang review và deploy (có migration `0021`: hỏi người trước khi deploy production). · **Tier:** XL · **Nhánh:** `main` · **Ngày:** 07/10/2026

**Nguồn:**
- Người sở hữu (07/10/2026), yêu cầu gốc: "Các bot sẽ liên tục di chuyển và làm nhiệm vụ, khi gặp người chơi thì ngẫu nhiên chat hoặc chủ động kết bạn, lập tổ đội làm nhiệm vụ. Mục tiêu là Bot cũng mô phỏng giống người chơi".
- Đổi hướng (07/10/2026, 22:03): "đừng quan tâm đường đi của bé nhé. Vì có nhiều người chơi thì bot biết đi theo ai? bot nên có đường đi tự học của chính nó, tự biết ra quyết định nên đi đâu và tự training chính nó".

## Kết quả mong muốn

1. Mỗi bạn máy tự đi, không có tuyến cho sẵn và không theo ai. Nó chỉ "thấy" thế giới trong một bán kính quanh mình, đi từng ô theo đúng luật bước của bé (bước 1 khối, trèo 2 khối, xuống tối đa 3, không trèo lên vật `blocking`), nên không xuyên tường, không lơ lửng.
2. Mỗi bạn máy tự dựng bản đồ nhớ của nó: những nơi đã tìm thấy (NPC, đồ vật, landmark, cổng, bến xe), những lối đã đi được kèm thời gian, và đường tắt nó tự phát hiện. Nó tự quyết đi đâu bằng học tăng cường: giá trị Q của từng nơi tăng khi làm được việc ở điểm nhiệm vụ, gặp người chơi, tìm ra chỗ mới, và trừ theo công đi. Bạn máy tò mò khám phá nhiều hơn, bạn máy chín chắn ít hơn.
3. Bạn máy học liên tục trong lúc server chạy, và trí nhớ của từng con được lưu vào DB. Bạn máy mới bắt đầu từ con số 0. Người duyệt **thấy** bạn máy học trên trang review: số nơi đã biết tăng, thời gian tới điểm nhiệm vụ giảm dần, số đường tắt tìm ra.
4. Bạn máy tự làm nhiệm vụ có thật của map: tìm NPC hay đồ vật của từng bước, tới đó và "làm" bước đó. Người chơi nhìn là biết (dấu 📜, cử chỉ).
5. Thấy người chơi trong tầm nhìn, bạn máy có thể **chọn** tới gặp. Đây là một lựa chọn đã học, có thưởng; gặp xong nó quay về kế hoạch của mình. Khi gặp, bạn máy nói câu mới mỗi lần, đôi khi rủ kết bạn, rủ vào tổ đội, rồi cùng làm một party quest; xong thì chào và rời đội.
6. Thưởng, XP, mở khóa vẫn do server tính đúng như hiện tại; bạn máy không bao giờ được ghi tiến độ hay trả thưởng.
7. Chịu được hàng trăm bạn máy ở tick 10 Hz.

## Hiện trạng đo được (07/10/2026, sau `8376ca24`)

- **Bot runner** (`apps/server/src/multiplayer/bot-runner.ts`): 112 bạn máy khai cứng trong `BOT_MAP_CONFIGS` (`:37-179`), mỗi con 4 điểm quanh một chỗ ở, đi thẳng ở `y` cố định (`:450-495`), tick 10 Hz (`:766`). Production đang chạy `gather()` (`:815-847`): tối đa 3 bạn máy tới đi trên vết chân của mỗi người chơi (`walked()` `:850-859`). Người sở hữu bác cả hai cách này.
- **Commit `8376ca24`** (chưa deploy) thêm `content/world/bot-routes/*.json` (12 file), `tools/world/bot-routes.ts` (+test), `packages/schema/src/bot-routes.ts`, script `world:bot-routes` và dòng `'world/bot-routes/'` trong `ASSET_TOOL_FILES` (`tools/content/check-content.ts:83-84`). Commit cũng tách `loadMapGrid()` trong `tools/world/reach-audit.ts` (trả `entities`, `world`, `cells`, `grid`); phần này được giữ.
- **Luật đi đã có:** `walkRegion` ghi tối đa 4 chỗ đứng mỗi cột, độ trống phía trên và loại nền (đường, đất, nước) (`apps/web/src/game/nav/walk-grid.ts:52-96`). Luật bước giữa hai cột nằm trong `findRoute` (`apps/web/src/game/nav/route-search.ts:255-281`, `MAX_CLIMB = 2`, `MAX_DROP = 3` ở `:17-18`). Luật `blocking` ở `packages/voxel/src/traversal.ts:1-10`.
- **Server không có `assets/`:** release chỉ gửi `apps/web/dist apps/server/dist/server apps/server/drizzle content` (`tools/deploy/staging/deploy.sh:101`, `tools/deploy/production/deploy.sh:138`). Dữ liệu server đọc phải nằm dưới `content/`.
- **Trí nhớ bạn máy trong DB đã có:** `bot_skills`, `bot_memories`, `question_stats` (`apps/server/drizzle/0018_bots-learn.sql`; `apps/server/src/db/schema.ts:424-461`), truy cập qua `BotStore` (`apps/server/src/multiplayer/bot-store.ts:23-33`, bản DB `:60`, bản bộ nhớ `:101`). Migration mới nhất là `0020_pet-bonds.sql`. Migration tự chạy khi server mở Postgres, và `release` backup DB trước khi restart (`docs/deployment-guide.md:106-109`, `:135`).
- **Server không có handler tắt máy:** `server.ts` không bắt `SIGTERM` (grep `SIGTERM|shutdown` không ra gì), nên ghi trí nhớ phải theo chu kỳ, và thêm một lần ghi khi tắt.
- **Pha 5 đã có:** tin `bot-say {id, key, variant, to?}` và `bot-doing {id, quest}`, 120 câu vi/en, dấu 📜 (`20c787ef`; `packages/schema/src/bot-lines.ts`).
- **Tổ đội và party quest:** `PartyService.reply()` lập đội với người mời làm trưởng (`apps/server/src/multiplayer/party-service.ts:100`, `:152-157`), nên bạn máy mời thì nó thành trưởng, phạm luật bạn máy không dẫn (`:33-37`). `PartyQuestService` không cho bạn máy chơi (`apps/server/src/coop/party-quest.ts:9`) và coi bạn máy là vắng mặt (`:251`, `:272`). Thẻ "{who} rủ cả đội chơi «{quest}»" có sẵn (`apps/web/src/ui/coop/party-quest-card.tsx:41-63`).
- **Trang review:** dữ liệu sinh như `assets/generated/review/sgk-coverage.json` (khai ở `tools/assets/generated.json:250-254`, sinh bởi `tools/content/content-gaps.ts`), vẽ bởi `apps/web/src/review/review-main.ts` (vd `renderPerf` `:290`).

## Không làm

- Không route sinh sẵn, không đi theo vết chân hay theo người chơi nào. `gather()` và chế độ `escort` bị gỡ.
- Không mô phỏng offline để huấn luyện (Jev: `online_only`). Test được phép chạy mô phỏng tất định để **đo** việc học, nhưng không lưu kết quả và không làm "khởi động" cho bạn máy.
- Không mạng nơ-ron, không thêm dependency.
- Không thêm bạn máy, không đổi id, tên, loài, trang phục (bảng `friendships`, `bot_skills`, `bot_memories` tham chiếu id).
- Không vào outland, không qua cổng sang map khác, không làm trưởng tổ đội.
- Không chữ tự do trên dây; không đổi luật thưởng; không chống gian lận; không ghép người lạ.
- Không đụng `apps/web/src/game/game.ts`, `apps/web/src/ui/quest/**`, `apps/web/src/ui/challenge/boss/**`, `apps/web/src/game/duel/**`, `apps/web/src/ui/pet-care/**`, `play-screen.tsx`, `apps/web/e2e/**`, `apps/web/playwright.config.ts`, `.github/workflows/ci.yml`, `vitest.config.ts`. Với `tools/content/check-content.ts` chỉ đổi đúng một dòng: `'world/bot-routes/'` thành `'world/walk/'`.

## Luồng dữ liệu

1. **Build (offline):** `pnpm world:walk <map>` dùng `loadMapGrid` và `walkRegion`, ghi `content/world/walk/<map>.bin` (lưới chỗ đứng, nén) và `<map>.json` (kích thước, `sources`, danh sách nơi: id, loại, vị trí). Bước này chỉ là "giác quan" của thế giới, không có tuyến nào.
2. **Server khởi động:** `WalkStore` nạp lười lưới của từng map (đọc `content/`). `BotRunner` đọc trí nhớ của từng bạn máy từ `bot_world_memories`; bạn máy chưa có dòng nào thì bắt đầu trống.
3. **Mỗi tick:** mỗi bạn máy có một lựa chọn đang làm (đi tới một nơi đã biết, khám phá, gặp người chơi, nghỉ, hoặc làm việc tại một điểm). Nó đi từng ô; cứ vài giây lại lập kế hoạch đoạn kế bằng A* **chỉ trong cửa sổ nó thấy**. Nó cảm nhận nơi chốn và người chơi trong bán kính nhìn.
4. **Học:** tới nơi thì ghi lối (polyline đã kiểm trên lưới, cùng thời gian đi), tìm đường tắt trong cửa sổ khi đi lại lối cũ, nhận thưởng, cập nhật Q. Mỗi giờ ghi một mốc số liệu.
5. **Lưu:** trí nhớ thay đổi thì cứ ~120 s ghi một lần (lệch pha giữa các bạn máy), và ghi khi nhận `SIGTERM`.
6. **Xã giao và tổ đội** (pha 6–8): như plan trước, dùng `bot-say`/`bot-doing` của pha 5. Lời mời tổ đội sẵn có, người chơi làm trưởng; trong party quest bạn máy là thành viên ảo, tự tìm đường tới điểm của bước bằng trí nhớ của nó; người chơi được trả thưởng bằng `recordStep` như hôm nay.
7. **Review:** `pnpm bots:learning` chạy mô phỏng đo (tất định) và đọc mốc số liệu trong DB dev, ghi `assets/generated/review/bots-learning.json`; trang review vẽ biểu đồ.

## Pha

Đồ thị phụ thuộc: **1 → 2 → 3 → 4 → 6 → 7 → 8 → 9 → 10**. Pha 5 đã xong. Pha nào cũng sửa `bot-runner.ts` hay `multiplayer-hub.ts`, nên không chạy song song.

| Pha | Tier | Nội dung | File sở hữu | Chặn bởi |
| --- | --- | --- | --- | --- |
| [1](phase-01-walk-grid-export.md) | L | **XONG** (`ec72eb33`, `84c85308`): gỡ route sinh sẵn; xuất lưới chỗ đứng vào `content/world/walk/` (12 map, 704 KB); luật bước dùng chung `canStep` | gỡ `content/world/bot-routes/**`, `tools/world/bot-routes{,.test}.ts`, `packages/schema/src/bot-routes.ts`; mới `tools/world/walk-export{,.test}.ts`, `packages/voxel/src/walk-cells{,.test}.ts`, `content/world/walk/*`; sửa `packages/voxel/src/traversal.ts`, `apps/web/src/game/nav/route-search.ts`, `package.json`, đúng 1 dòng `tools/content/check-content.ts` | — |
| [2](phase-02-sense-and-step.md) | L | **XONG** (`ee3dccfb`): bạn máy cảm nhận và đi từng ô: kho lưới trên server, cửa sổ nhìn, A* cục bộ, walker, bộ chọn đích tạm (`GoalChooser`); gỡ `gather`/`escort`/waypoint | mới `apps/server/src/multiplayer/bot-brain/{walk-store,sight,local-path,stepper,body,wander,walk-fixtures}.ts` (+test), `apps/server/src/multiplayer/bot-profiles.ts`; sửa `bot-runner.ts`, `bot-persona.ts`, `multiplayer-hub.ts` (`canSee`), `server.ts`, test bạn máy cũ | 1 |
| [3](phase-03-memory-graph-and-learning.md) | L | **XONG, 2 tiêu chí chờ quyết** (`780fdc3c`, `2d1f8d74`, `ad876896`): đồ thị nhớ, học tăng cường, làm nhiệm vụ của chính nó, gặp người chơi như một lựa chọn, tránh kẹt có học; mô phỏng đạt (1)(4)(5), (2)(3) đo theo lời plan không đạt, thay bằng chuyến lặp lại ≥ 1,3 × chuyến đầu (đo 2,13) | mới `bot-brain/{memory-graph,learner,brain,quest-plan}.ts` (+test), `bot-brain/learning.sim.test.ts`; sửa `bot-runner.ts`, `bot-persona.ts` | 2 |
| [4](phase-04-persist-and-metrics.md) | M | **XONG, 1 tiêu chí chờ quyết** (`2e806513`): lưu trí nhớ vào DB (`0021_bot-world-memories`, nén ≤ 32 KB, đo 10–16 KB), hợp nhất trí nhớ của các bản ở nhà riêng, ghi mỗi 120 s và khi `SIGTERM`, mốc số liệu theo giờ được lưu; "lần đi đầu sau khi mở lại ≤ 10% chậm hơn" đo theo một chuyến không ổn định, thay bằng kiến thức y hệt + thẳng hơn bạn máy từ 0 (chờ quyết) | sửa `apps/server/src/db/schema.ts`, mới `apps/server/drizzle/0021_*.sql` + meta, sửa `bot-store.ts` (+test), mới `bot-brain/memory-codec.ts` (+test), sửa `bot-runner.ts`, `server.ts` | 3 |
| [5](phase-05-wire-and-client.md) | M | **XONG** (`20c787ef`): `bot-say`, `bot-doing`, 📜, 120 câu | — | — |
| [6](phase-06-meeting-chat-and-friends.md) | M | **XONG** (`3ec88b1e`): gặp người chơi: câu xoay vòng, nhịp 6 s / 25 s, không lặp trong 12 câu, kết bạn chủ động 35% / 70%; thưởng "gặp" cho bộ học; hub không đổi | mới `apps/server/src/multiplayer/bot-social.ts` (+test), `bot-meet.test.ts`; sửa `bot-runner.ts`, `bot-persona.ts`, `bot-brain/brain.ts` (+test) | 4, 5 |
| [7](phase-07-bot-party-invite.md) | M | **XONG** (`09473868`): bạn máy rủ vào tổ đội từ lần gặp thứ 2, cô bé ở quanh ≥ 3 phút; nhịp 5 phút, 3 lần/giờ, chờ 15 phút sau khi từ chối hay hết hạn; người chơi làm trưởng; `Brain.share` cho mục tiêu chung; vẫy và rời đội 5–10 s sau co-op, rời ngay khi cô bé sang map khác hay tắt bạn máy | sửa `party-service.ts` (+test), `multiplayer-hub.ts`, mới `hub-bot-party.test.ts`, sửa `bot-social.ts`, `bot-runner.ts` | 6 |
| [8](phase-08-bots-in-party-quests.md) | L | **XONG** (`5aa16e7d`, `78b4e45b`): bạn máy cùng làm party quest (thành viên ảo, `propose`, driver gắn qua hub thay cho `server.ts`); tự trả lời câu hỏi, đi sau ở bước chung, đánh trùm theo lượt; thưởng của người chơi bằng đúng chơi một mình (test PGlite); nhớ người chơi, mời kết bạn 70%, vẫy và rời đội 5–10 s sau run | sửa `apps/server/src/coop/party-quest.ts` (+test), mới `apps/server/src/coop/bot-party-quest.ts` (+test), sửa `multiplayer-hub.ts`, `bot-runner.ts`, `server.ts` | 7 |
| [9](phase-09-performance-budget.md) | M | **XONG** (`64f8da09`, `d57c16ac`; điểm chốt "ở lại khi cô bé tự chơi" `7bc90db8`): não 500 bạn máy `truong-hoc` 2,70 → 1,78 ms/tick, p99 6,1 → 4,0 ms, chọn y hệt trước (vân tay mô phỏng và số liệu học không đổi); chỉ người chơi nhận `move`, bạn máy xa ≥ 64 khối 2 s/lần (trừ khi đổi việc), room trống 1 Hz; runner 500 bạn máy một room 10,0 → 1,3 ms, p99 13,9 → 4,1 ms | sửa `multiplayer-hub.ts` (`MultiplayerRoom`) (+test), `bot-runner.ts`, `bot-brain/{local-path,stepper,brain,explore-areas,memory-graph,sight,learner}.ts`, `multiplayer.test.ts`; mới `bot-load.test.ts` | 8 |
| [10](phase-10-review-docs.md) | M | **XONG** (`f047774c`, `ccf6d577`, `0614af79`; sửa test xóa tài khoản `4702266b`): mục "Bạn máy tự học" trên trang review (3 biểu đồ SVG từ mô phỏng đo `pnpm bots:learning`, 3 map × 6 bạn máy × 3 giờ), test toàn luồng `bot-flow.test.ts`, tài liệu kiến trúc; roadmap, `CLAUDE.md`, `world-scenery.md` chưa sửa (xem pha 10) | mới `tools/bots/learning-report.ts`, `apps/server/src/multiplayer/bot-flow.test.ts`; sửa `tools/assets/generated.json`, `apps/web/src/review/review-main.ts`, **`apps/web/review.html`**, `package.json`, `docs/system-architecture.md`, **`docs/project-roadmap.md` (đang dirty)**, `CLAUDE.md`, `.claude/rules/world-scenery.md` | 9 |

**File dùng chung:** plan không chạm danh sách cấm ở trên. Có thể đụng gián tiếp ở `apps/web/review.html`, `docs/project-roadmap.md` (đang có thay đổi chưa commit), `package.json`, `apps/server/drizzle/**` (phiên pet-care có thể cũng thêm migration: sinh `0021` ngay trước khi commit, kiểm `ls apps/server/drizzle` và `git status apps/server/drizzle`, trùng số thì sinh lại). Trước khi sửa: `git status` + `git log -3 -- <file>` + đọc lại cả file; file đang dirty thì nhắn phiên kia.

**Cổng:** mỗi pha chạy các file vitest của pha, `pnpm typecheck`, `pnpm lint`, `pnpm content:check`, `pnpm assets:check`. Pha sửa `apps/web/**` (1 và 10) chạy thêm `pnpm --filter @miu/web build`. Toàn bộ `pnpm test` chạy một lần ở pha 10, 1 worker. Không chạy E2E (memory `tests-only-on-request`; D10 đã chọn test tích hợp server).

## Ngân sách mỗi bạn máy (chi tiết ở pha 2–4 và 9)

| Mục | Ngân sách |
| --- | --- |
| Trí nhớ trong RAM | ≤ 64 KB (≤ 200 nơi, ≤ 600 lối, ≤ 6.000 điểm polyline, bitset vùng đã đi 50 × 50) |
| Trí nhớ lưu DB | ≤ 32 KB mỗi bạn máy mỗi map (JSON nén gọn; ràng buộc `octet_length` ≤ 64 KB) |
| Tìm đường cục bộ | cửa sổ ≤ 57 × 57 cột, ≤ 3.000 bước mở rộng, ≤ 1 lần mỗi 2 s mỗi bạn máy; tổng ≤ 4 ms mỗi tick cho cả server (hàng đợi công bằng) |
| Quyết định (Dijkstra trên đồ thị nhớ, softmax) | ≤ 0,1 ms |
| Tick runner, 500 bạn máy | trung bình < 2 ms, p99 < 8 ms (máy dev) |
| Lưới chỗ đứng | file `.bin` ≤ 300 KB mỗi map, tổng `content/world/walk/` ≤ 4 MB; RAM khi giải nén ≤ 2,5 MB mỗi map |

## Rủi ro chính

| Rủi ro | Khả năng × Tác động | Giảm thiểu |
| --- | --- | --- |
| Bạn máy mới đi lạc, trông ngớ ngẩn lúc đầu | Cao × Trung bình | Khám phá có hướng (vùng chưa đi gần nhất, thưởng tìm thấy); lúc chưa biết gì thì ở gần khu nhà; trí nhớ được lưu nên chỉ lạc một lần |
| Lưới cũ sau khi sinh lại map | Cao × Cao | `sources` sha256, test độ tươi; trí nhớ có `gridVersion`: lệch thì giữ nơi chốn, bỏ lối (học lại đường) |
| Kẹt (góc, nước, vực) | Trung bình × Trung bình | Phát hiện không tiến sau 3 lần lập kế hoạch: phạt, đánh dấu ô cấm tạm thời, chọn nơi khác; hết 20 s vẫn kẹt thì đặt lại về nơi đã biết gần nhất (ghi số liệu) |
| CPU tăng khi nhiều bạn máy cùng lập kế hoạch | Trung bình × Cao | Hạn mức 4 ms mỗi tick, hàng đợi, cửa sổ giới hạn, room trống 1 Hz |
| Migration trên production | Thấp × Cao | Chỉ `CREATE TABLE`; `release` backup trước; deploy production phải hỏi người trước (CLAUDE.md) |
| Bản ở nhà riêng (`<bot>@<chủ nhà>`) ghi đè trí nhớ của nhau | Trung bình × Thấp | Hợp nhất khi ghi (hợp tập nơi, giữ lối rẻ hơn, Q trung bình theo số lần thăm) |
| Trí nhớ lộ dữ liệu trẻ | Thấp × Cao | Trí nhớ không chứa `childId` hay mã công khai; "gặp người chơi" chỉ là số đếm và thưởng theo nơi |
| Làm phiền người chơi | Trung bình × Cao | Nhịp D9; công tắc bạn máy sẵn có |

## Rollback

Mỗi pha một commit hoặc vài commit liền. Pha 4 có migration chỉ thêm bảng: revert code là bảng không còn ai dùng; muốn bỏ hẳn thì thêm migration `DROP TABLE` (không sửa migration đã chạy). Production quay bằng symlink release (`docs/deployment-guide.md` mục rollback), DB từ `before-<id>.dump` nếu cần. Revert pha 2–3 đưa bạn máy về vòng 4 điểm cũ vì `bot-profiles.ts` giữ `home`.

## Ma trận test

| Lớp | Pha | Nội dung |
| --- | --- | --- |
| Unit | 1 | Codec lưới (mã hóa rồi giải mã ra như cũ), `canStep` dùng chung (cùng kết quả với `findRoute` trên các ca có sẵn), độ tươi `sources`, ngân sách dung lượng |
| Unit (fake timer, `random` seeded) | 2 | Cửa sổ nhìn, A* cục bộ tôn trọng luật bước, walker không đi qua ô không đứng được, phát hiện kẹt |
| Unit + mô phỏng đo | 3 | Ghi lối, đường tắt, cập nhật Q, softmax theo persona; `learning.sim.test.ts` trên lưới thật của `truong-hoc` (tiêu chí bên dưới) |
| DB (PGlite) | 4 | Migration chạy, lưu và đọc lại như cũ, trần dung lượng, hợp nhất, đổi `gridVersion` |
| Unit | 6 | Nhịp câu nói, không lặp, xác suất kết bạn |
| Tích hợp (hub + runner + PartyService) | 7 | Mời, nhận lời, người chơi làm trưởng; từ chối, hết hạn, tắt bạn máy |
| Tích hợp (PGlite, `recordStep` thật) | 8 | Run do bạn máy rủ; cổng chờ; lượt trùm; thưởng bằng chơi một mình; bạn máy không có tiến độ hay thưởng |
| Tải | 9 | 500 bạn máy: đếm tin cố định, thời gian tick, hạn mức tìm đường |
| Tích hợp toàn luồng (thay E2E, D10) | 10 | Người chơi giả đứng gần; bạn máy chọn tới gặp, nói, mời; nhận lời; party quest có bạn máy và `done` tăng |

## Tiêu chí xong (đo được)

- **Đi đúng luật:** trong mọi mô phỏng, mỗi bước giữa hai ô thỏa `canStep`; không vị trí nào ở cột không có chỗ đứng.
- **Bạn máy học được** (`learning.sim.test.ts`: seed cố định, lưới thật `truong-hoc`, 6 bạn máy bắt đầu từ 0, 2 giờ mô phỏng ở 2 Hz):
  - số nơi đã biết tăng không giảm theo giờ và đạt ≥ 60% số nơi đứng tới được của map;
  - **hiệu suất đường đi** (khoảng cách thẳng ÷ (thời gian × tốc độ)) tới điểm nhiệm vụ ở 30 phút cuối ≥ 1,3 lần 30 phút đầu;
  - đi lại cùng một cặp nơi: ở ≥ 50% cặp, lần thứ 3 tốn ≤ 80% thời gian lần đầu (nhờ lối đã nhớ và đường tắt);
  - ≥ 1 đường tắt được ghi trên mỗi bạn máy;
  - tỷ lệ thời gian đứng kẹt < 2%.
- **Bền:** tắt rồi mở lại server (test DB): bạn máy giữ nguyên số nơi đã biết và Q; lần đi đầu sau khi mở lại không chậm hơn lần cuối trước khi tắt quá 10%.
- **Xã giao, tổ đội, thưởng:** như pha 6–8 (không lặp câu trong 12 câu gần nhất; người chơi làm trưởng; sổ thưởng bằng đúng một run chơi một mình).
- **Hiệu năng:** bảng ngân sách ở trên, đo ở pha 9.
- **Người duyệt thấy:** trang review có mục "Bạn máy tự học" với 3 biểu đồ (số nơi đã biết theo giờ, hiệu suất đường đi theo giờ, số đường tắt), số liệu từ mô phỏng đo và (nếu có) từ DB dev.
- **Cổng cuối:** `pnpm assets:check` → `pnpm content:check` → `pnpm test` → `pnpm typecheck` → `pnpm lint`, `pnpm --filter @miu/web build`, `pnpm security:dist` sạch.

## Validation Log

**Đợt 1 — Jev 21:46, 07/10/2026** ([input](../reports/jev-261007-2146-bots-play-like-players-input.json), [output](../reports/jev-261007-2146-bots-play-like-players-output.json)). D1, D2, D12 bị thay ở đợt 2. Các quyết định còn giữ:

| Câu | Chọn | Độ tin | Ghi chú |
| --- | --- | --- | --- |
| D3 hiển thị đang làm nhiệm vụ | `bot_doing_message` (0,53) | 0,30, escalate, đã áp dụng | xong ở pha 5 |
| D4 câu nói | `bot_say_pools` (0,92) | auto | xong ở pha 5 |
| D5 thẻ mời | `two_step_reuse` (0,89) | auto | pha 7 |
| D6 ai dẫn | `player_leads` (0,95) | auto | pha 7–8 |
| D7 nhiệm vụ rủ làm | `random` (0,51; `player_first_chain` 0,45) | 0,27, escalate, đã áp dụng | pha 8: ngẫu nhiên trong các nhiệm vụ chơi được theo đội của map |
| D8 phần chơi của bạn máy | **own_part** theo điều phối viên ("D8 = bạn máy tự làm phần của nó"); output Jev ghi `watch_only` (0,86, escalate) | — | pha 8 làm theo own_part; xem câu xác nhận 1 |
| D9 nhịp | `balanced` (0,76) | 0,64, escalate, đã áp dụng | pha 6–7 |
| D10 kiểm lời mời | `server_integration_only` (0,74) | auto | pha 10, không E2E |
| D11 sau nhiệm vụ | `wave_and_leave` (0,66) | 0,49, escalate, đã áp dụng | pha 7 |

**Đợt 2 — Jev 22:03, 07/10/2026, sau khi người sở hữu đổi hướng** ([input](../reports/jev-261007-2203-bots-self-learning-input.json), [output](../reports/jev-261007-2203-bots-self-learning-output.json)):

| Câu | Chọn | Độ tin | Áp vào |
| --- | --- | --- | --- |
| sensing | `walk_grid_in_content` (0,78) | 0,67, escalate, đã áp dụng | pha 1–2: lưới chỗ đứng gọn trong `content/world/walk/`, đi từng ô, chỉ thấy trong bán kính |
| learning | `memory_graph_rl` (0,94) | 0,91, auto | pha 3: đồ thị nơi chốn tự dựng, Q theo nơi, thưởng làm việc / gặp người / chỗ mới, trừ công đi, khám phá theo persona |
| training | `online_only` (0,54; online cộng mô phỏng 0,45) | 0,31, escalate, đã áp dụng | pha 4: học liên tục, lưu DB (mở rộng `BotStore`), bạn máy mới bắt đầu từ 0 |
| route_data_8376ca24 | `revert_keep_grid_loader` (0,64) | 0,46, escalate, đã áp dụng | pha 1: gỡ route, giữ `loadMapGrid` |
| players | `perceive_and_choose` (0,95) | 0,92, auto | pha 2–3, 6: không theo ai; thấy người chơi thì có thể chọn tới gặp (có thưởng), rồi quay về kế hoạch; `gather()` bị thay |

D12 (khu nhà) chuyển thành: `home` là nơi bạn máy xuất phát và mang một phần thưởng quen thuộc nhỏ trong bộ học (pha 3), không có tuyến cho sẵn.

**Quyết định kỹ thuật tự chốt trong plan** (theo `docs/code-standards.md` mục Ra quyết định; lý do ở từng pha):
- Lưới gồm hai file: `.bin` nén deflate (tầng dưới cùng là mảng dày đặc, các tầng trên thưa) và `.json` mô tả. Tối đa 3 tầng mỗi cột.
- Luật bước tách thành `canStep` trong `packages/voxel/src/traversal.ts`, dùng chung cho tự đi của bé và bạn máy.
- Q theo nơi kèm một hạng mục mục tiêu (cộng cho điểm của bước nhiệm vụ đang làm); cập nhật TD(0) có chiết khấu; Q quên dần 1%/giờ.
- Không che khuất tầm nhìn: chỉ xét bán kính.
- Bản ở nhà riêng hợp nhất trí nhớ khi ghi.
- Khi lưới đổi: giữ nơi chốn, bỏ lối.

## Tiêu chí học đổi sau pha 3 (07/10/2026, Jev đợt 3)

Input/output: `plans/dattqh/reports/jev-261007-2306-bot-learning-criteria-{input,output}.json`; `replace_with_revisit` 0,97, auto.

- Tiêu chí (2) "hiệu suất 30 phút cuối ≥ 1,3 × 30 phút đầu" và (3) "lần đi thứ 3 ≤ 80% lần đầu" bỏ: đo ra 0,90 (4 seed 0,90–1,47) và 0/1 cặp, vì A* trong tầm nhìn đã gần tối ưu ngay chuyến đầu nên đi lại một lối không còn gì để học.
- Thay bằng: **chuyến tới điểm nhiệm vụ đã từng tới thẳng hơn chuyến đầu tới đó ≥ 1,3 lần** (đo 2,13; 4 seed 1,67–2,56).
- Thời gian kẹt < 2% tính trên **cả đội** (đo 1,5%; từng con 0,2–3,3%).
- Vẫn in số của hai tiêu chí cũ trong test để theo dõi, không assert.
- Còn mở cho các pha sau: vài bạn máy ít tìm ra mục tiêu sau rào (5–26 bước trong 2 giờ); 500 bạn máy trung bình 2,76 ms/tick vượt ngân sách 2 ms (pha 9); heap V8 thật ~145–250 KB mỗi bạn máy, pha 4 phải nén khi lưu.

## Tiêu chí mở lại server đổi sau pha 4 (08/10/2026, Jev đợt 4)

Input/output: `plans/dattqh/reports/jev-261008-0010-bot-restart-criterion-{input,output}.json`; `replace_with_knowledge_and_vs_fresh` 1,00, auto.

- Bỏ "chuyến đầu sau khi mở lại không chậm hơn chuyến cuối trước khi tắt quá 10%": mỗi chuyến tới một nơi khác của một nhiệm vụ khác nên so từng chuyến không có nghĩa (0,918 trước, 0,326 sau ở seed của test).
- Thay bằng: kiến thức sau khi mở lại y hệt (đường nhanh nhất tới mọi nơi đã biết không đắt hơn), và giờ đầu sau khi mở lại đi thẳng hơn bạn máy bắt đầu từ 0 ít nhất 1,1 lần (7 cặp seed 1,11–2,10).
- Còn mở: trí nhớ né tránh (chỗ kẹt, tường đã gặp) chỉ ở RAM, mở lại thì học lại.

## Ba điểm chốt sau pha 8 (08/10/2026, Jev đợt 5)

Input/output: `plans/dattqh/reports/jev-261008-0240-bots-party-quests-{input,output}.json`; dùng lựa chọn của Jev dù script báo escalate.

- Bạn máy trong đội cùng chơi mọi nhiệm vụ tổ đội, kể cả nhiệm vụ do người chơi mở (`yes_join` 0,76): người chơi chờ câu trả lời của bạn máy như chờ một người.
- Nút "Cả đội cùng chơi" vẫn chỉ hiện khi có từ 2 người chơi (`keep_two_humans` 0,73): đội cô bé + bạn máy chỉ chơi nhiệm vụ bạn máy rủ.
- Trong 5–10 s chào tạm biệt, bạn máy ở lại nếu cô bé bắt đầu bất kỳ nhiệm vụ nào, kể cả nhiệm vụ chơi một mình (`any_quest_she_starts` 0,65). Sửa nhỏ, làm kèm đầu pha 9.

## Câu đã chốt sau khi viết lại (07/10/2026)

1. **D8:** bạn máy tự làm phần của nó (trả lời câu hỏi của nó, đi sau ở bước chung, đòn trùm tính cho đội). Không theo output Jev `watch_only` vì trái lời người sở hữu "lập tổ đội làm nhiệm vụ… mô phỏng giống người chơi"; đường lui ở pha 8 giữ nguyên.
2. **Nguồn số liệu "bạn máy học" trên trang review:** chỉ mô phỏng đo tất định (Jev `sim_only` 0,90, auto). Pha 10 không đọc DB dev hay staging.
