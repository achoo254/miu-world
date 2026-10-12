# Báo cáo phase 3: lan truyền trong game (link mời bạn, khoe kết quả, tổng kết tuần)

Plan: `plans/dattqh/261012-1116-auto-marketing/` (phase 3). Nhánh `main`, chưa commit, chưa push. Không chạy E2E, không chạy `deploy.sh`, không đụng máy chủ hay file credential.

## Kết quả

Đã làm đủ ba mục của phase 3. Migration mới là `apps/server/drizzle/0022_player-invites.sql` (sinh bằng `drizzle-kit generate --name player-invites`, không sửa tay migration cũ). Typecheck, eslint, `content:check`, build web và `security:dist` đều xanh; test chạy từng tệp một đều xanh. E2E và chụp màn hình viết xong nhưng chưa chạy theo yêu cầu.

## Những gì đã dựng

### Server

1. **Bảng `player_invites`** (`apps/server/src/db/schema.ts`): `id`, `code_hash` (sha256, duy nhất), `child_id` cascade, `created_at`, `expires_at`, `accepted_at`, `accepted_by` set null, `revoked_at`, chỉ mục theo `child_id`. Không lưu mã gốc.
2. **`packages/schema/src/invites.ts`**: hằng `INVITES_MAX = 5`, `INVITE_TTL_DAYS = 7`, `INVITE_CODE` (22 ký tự base64url = 128 bit), DTO `InviteDto`, `CreatedInviteDto`, `InviteList`, `InviteAcceptedDto`.
3. **`apps/server/src/invite/invite-store.ts`**: `createInvite` (khóa hàng người chơi rồi đếm mã còn hiệu lực, nên tạo đồng thời không vượt 5), `listInvites`, `revokeInvite`, `acceptInvite`. Hàm accept khóa hàng hai người chơi (cùng thứ tự và cùng kiểu khóa với lời mời kết bạn) rồi đọc lại mã `for update`, nên hai lần dùng đồng thời chỉ một lần thấy mã chưa dùng.
4. **`befriendByInvite(tx, a, b)`** trong `apps/server/src/friend/friend-store.ts` (cùng với export `lockPlayers` và `Tx`): `lockPlayers`, `blockedEitherWay`, đã là bạn thì trả `already-friends`, `FRIENDS_MAX` hai phía, rồi `befriend` (xóa lời mời đang chờ giữa hai người).
5. **`apps/server/src/invite/invite-routes.ts`**, gắn ở `app.ts`: `GET /api/invites` (không trả mã), `POST /api/invites` (201, mã chỉ hiện lúc này; quá 5 trả 409 `invite-limit`), `DELETE /api/invites/:id`, `POST /api/invites/:code/accept`. Giới hạn tốc độ theo tài khoản: tạo 20 lần mỗi giờ, thử mã 10 lần mỗi 10 phút. Mã sai dạng, chưa từng tạo, hết hạn, đã dùng (bởi người khác), đã thu hồi, mã của chính mình, đã chặn nhau: đều 404 như nhau.
6. **Sự kiện**: dùng lại `PlayerEvent` `friend-answered` (`accepted: true`, `fromChildId` là người tạo link, `who` là nhân vật của người dùng link) nên hub gửi `friend-news` cho người mời mà không cần sửa hub. `ServerEvents.inviteAccepted(childId)` gửi `invite_accepted` (không tham số, gắn vào phiên GA của người dùng link), chỉ khi thực sự kết bạn mới.

### Web

1. **Link mời** (`apps/web/src/ui/friends/`): tab "Mời bạn" trong màn Bạn bè và trong hộp Bạn bè trong game (`invite-panel.tsx`, chỉ cho danh sách của chính người chơi, không cho khu phụ huynh): tạo link, hiện link một lần trong ô chọn được, "Chia sẻ" (Web Share trên điện thoại) hoặc "Sao chép link" (máy tính), danh sách link còn hiệu lực với nút "Thu hồi", cảnh báo đủ 5 link. Mã vừa tạo được giữ trong state của danh sách đang mở để gửi lại, mở lại màn thì chỉ còn dòng ghi chú "link chỉ hiện lúc vừa tạo".
2. **Trang `/moi/:code`** (`invite-screen.tsx`): nút "Chơi cùng bạn" lưu `{inviteCode}` bằng `savePostLoginTarget` của phase 2 rồi sang `/login`; mã sai dạng thì báo và không lưu gì. Trang tự thêm `<meta robots noindex>`.
3. **Dùng mã sau đăng nhập** (`accept-invite.tsx`, `app-shell.tsx`): `ResumePostLoginTarget` (chạy khi tới `/home`, tức sau `RequireActivePlayer`, consent và tạo nhân vật) giữ mã trong một kho nhỏ ngoài màn hình rồi hiện hộp kết quả ("Bạn và X đã là bạn bè", mã không dùng được nữa, danh sách bạn đầy, lỗi mạng). Quest lưu cùng mã (`next`) chỉ mở khi bấm "Tiếp tục".
4. **Khoe kết quả** (`quest/share-result.tsx`, đặt trong màn thưởng của `completion-sequence.tsx`): nút phụ dưới phần sao, màn "Chép vào vở" vẫn đứng trước và nút chính ("Con chép xong rồi", "Về bản đồ") giữ nguyên. Link = trang bài (phase 2) kèm `utm_source=share&utm_medium=share&utm_campaign=result`; ô "Kèm lời mời kết bạn" tạo một mã mời mới và thêm `moi=<mã>`; hủy chia sẻ thì mã vừa tạo bị thu hồi. Phát `share` (`method`, `content_type: result`, `lesson_id`).
5. **Tổng kết tuần** (`parent/weekly-card.ts`, `weekly-share.tsx`): trong khu phụ huynh, tab Tiến bộ học của từng người chơi có nút "Chia sẻ tuần này". Hộp thoại vẽ ảnh canvas 1080 × 1080 (phút chơi tuần này = tuần cuối của `ProgressWeek.minutes`, số bài đã xong / tổng từ `counts`; không tên, không id; chữ luôn tiếng Việt; màu đọc từ token CSS; font Baloo 2 và Nunito của game, nạp bằng `document.fonts.load`). Điện thoại: Web Share với `files`; chỗ khác: tải ảnh và sao chép link trang chủ `?utm_source=share&utm_medium=share&utm_campaign=weekly`. Không có trang công khai nào chứa dữ liệu người chơi.
6. **Chữ mới** vào `vi.json` và `en.json` (61 khóa mỗi bên, kiểm bằng `i18n.test.tsx`).
7. **E2E (không chạy)**: `apps/web/e2e/invite-flow.spec.ts` (project `invite` thêm vào `playwright.config.ts`, nên nằm trong smoke): người mời tạo link qua API, khách mở `/moi/<mã>`, bấm "Chơi cùng bạn", đăng nhập bằng route mật khẩu của E2E, consent, tạo nhân vật, tới Home thấy hộp "đã là bạn bè", kiểm danh sách bạn hai phía bằng API và link đã dùng. `apps/web/e2e/screens.spec.ts` thêm `22-friends-invite`, `23-invite-page`, `24-weekly-share` (cả hai khổ) và một khẳng định nút "Khoe kết quả" hiện ở `11-reward`; `SCREEN_NAMES` ở `apps/web/src/review/review-main.ts` và dòng "hai mươi bốn màn" ở `docs/screen-review.md` đã sửa theo.

## Tệp thay đổi / tạo mới

Tạo mới:
- `apps/server/drizzle/0022_player-invites.sql`, `apps/server/drizzle/meta/0022_snapshot.json`
- `apps/server/src/invite/{invite-store,invite-routes}.ts`, `invite-routes.test.ts`
- `packages/schema/src/invites.ts`
- `apps/web/src/ui/friends/{invite-api,invite-panel,invite-screen,accept-invite}.ts(x)`, `invite-screen.css`, `invite-panel.test.tsx`
- `apps/web/src/ui/share/{share-links,lesson-link,share-actions}.ts`, `share-links.test.ts`
- `apps/web/src/ui/quest/share-result.tsx`, `share-result.test.tsx`
- `apps/web/src/ui/parent/{weekly-card.ts,weekly-share.tsx,weekly-share.css}`, `weekly-card.test.ts`, `weekly-share.test.tsx`
- `apps/web/src/seo/lesson-page-entry.test.ts`
- `apps/web/e2e/invite-flow.spec.ts`

Sửa:
- `apps/server/drizzle/meta/_journal.json`, `apps/server/src/{db/schema,app}.ts`, `friend/friend-store.ts`, `player/player-events.ts` (chỉ chú thích), `analytics/server-events.ts`, `auth/account-routes.test.ts`
- `apps/web/src/ui/{app-shell,api-client}.ts(x)`, `friends/{friends-panel,friends-screens}.tsx`, `friends/friends.css`, `profile/progress-panel.tsx`, `rewards/completion-sequence.tsx`, `rewards/rewards.css`, `i18n/locales/{vi,en}.json`
- `apps/web/src/analytics/use-page-views.ts` (+ test), `apps/web/src/seo/lesson-page-entry.ts`, `apps/web/src/review/review-main.ts`
- `apps/web/vite-sitemap.ts` (+ test), `apps/web/playwright.config.ts`, `apps/web/e2e/screens.spec.ts`
- Test có sửa thêm: `account-flow.test.tsx` (4 ca mới), `rewards.test.tsx` (2 ca mới)
- `docs/screen-review.md` (một dòng)

## Lệnh đã chạy và kết quả

Trước mỗi bước nặng đều kiểm `pgrep`: chỉ có một vòng chờ vitest của dự án khác (`localman-next`), không có job nặng nào đang chạy.

- `pnpm --filter @miu/server exec drizzle-kit generate --name player-invites`: sinh `0022_player-invites.sql`. `pnpm --filter @miu/server db:check`: "Everything's fine".
- Từng tệp (`pnpm vitest run <tệp>`), tuần tự, tất cả xanh:
  - Server: `invite/invite-routes.test.ts` 15 ca, `friend/friend-routes.test.ts` 14, `multiplayer/hub-friends.test.ts` 11, `analytics/server-events.test.ts` 9, `auth/account-routes.test.ts` 7 (đã thêm một dòng `player_invites` vào ca xóa tài khoản, vì ca này đòi mọi bảng đều có dữ liệu), `db/schema.test.ts` 7, `app.test.ts` 5, `test/test-app.test.ts` 2, `player/player-routes.test.ts` 21.
  - Web: `account-flow.test.tsx` 24, `quest/share-result.test.tsx` 5, `friends/` (hai tệp) 13, `parent/` (hai tệp) 9, `share/share-links.test.ts`, `seo/lesson-page-entry.test.ts` 3, `analytics/use-page-views.test.tsx`, `analytics/analytics.test.ts` 12, `rewards/rewards.test.tsx` 16, `quest/quest-layer.test.tsx` 15, `play/play-screen.test.tsx` 11, `quest/party-play.test.tsx` 2, `i18n/i18n.test.tsx` 14, `profile/progress-panel.test.tsx` 3, `account/account-players-panel.test.tsx` 2, `landing/landing-screen.test.tsx` 3, `vite-lesson-pages.test.ts` 17, `vite-sitemap.test.ts` 9.
- `pnpm typecheck`: sạch (gốc, `apps/server`, `apps/web`).
- `pnpm exec eslint --max-warnings=0 <mọi .ts/.tsx đổi hoặc mới>` (42 tệp): 0 lỗi, 0 cảnh báo (một lỗi `react-hooks/set-state-in-effect` đã sửa bằng kho giữ lời mời).
- `pnpm content:check`: `OK — 2068 files`.
- `pnpm --filter @miu/web build`: xong; chỉ có hai cảnh báo có từ trước (native config loader của Vite, chunk `accessories` > 500 kB).
- `pnpm security:dist`: `OK — no quest answer in apps/web/dist, every lesson page keeps the CSP and runs no inline script`.

## Khác với chỉ dẫn hay điều cần biết

- **Trang bài chưa chuyển `moi` như báo cáo phase 2 nói**: `lesson-page-entry.ts` của phase 2 chỉ lưu `next`. Tôi đã thêm: khi bấm "Chơi bài này", script lưu cả `inviteCode` đọc từ `?moi=` (kiểm bằng `INVITE_CODE` chặt 22 ký tự). Có test.
- **Trang bài của một quest**: bản xem quest công khai không có id bài (chỉ có `textbook: { book, lesson }` theo tên in trong sách), nên web tra trang bài bằng tên sách và tên bài trong `book.json` (đã import vào bundle, chỉ có mục lục) qua `lessonPages` của phase 2, cùng một hàm tạo slug với bản build.
- **Quest không có bài SGK** (truyện, minigame, thử thách) vẫn có nút "Khoe kết quả": link về trang chủ, hoặc về `/moi/<mã>` khi kèm lời mời, cùng `utm_campaign=result`. Lý do: màn `11-reward` trong bộ ảnh dùng quest rừng không có bài, và nút có ở mọi màn hoàn thành đúng với yêu cầu "màn hoàn thành quest có nút phụ". Nếu muốn chỉ có nút ở quest SGK thì chỉ cần cho `ShareResult` trả `null` khi không có trang bài.
- **Dùng lại mã bởi cùng một người** trả 200 `already: true` (không phát sự kiện, không đếm `invite_accepted` lần hai) thay vì 404, để bấm đúp hay React StrictMode không báo lỗi giả; người khác dùng mã đã dùng vẫn 404. Danh sách bạn đầy (một trong hai phía) trả 409 `friends-full` và để mã chưa dùng, giống API lời mời thường; chặn nhau thì 404 và cũng để mã chưa dùng.
- **Mã không đi đến máy chủ phân tích**: `usePageViews` báo mọi `/moi/<mã>` là `/moi`. `robots.txt` bản release thêm `Disallow: /moi/` (đã sửa `vite-sitemap.ts` và test của nó, tệp của phase 2).
- **Thẻ tuần** dùng đúng số liệu có sẵn: phút tuần này, bài đã xong / tổng bài (`counts.lessonsDone`, `lessonsTotal`); không thêm số liệu nào khác.
- **Xuất dữ liệu tài khoản** (`AccountExport`) không có link mời (chỉ giờ tạo/hạn và dạng băm); chưa thêm vì không có gì người dùng đọc được. Nếu cần thì thêm một danh sách `invites` không có mã.

## Chưa kiểm

- **E2E** `invite-flow` và `screens` (24 màn, hai khổ) chưa chạy; chưa có ảnh duyệt cho `22`, `23`, `24` và nút khoe ở `11`. Chỉ qua typecheck và eslint.
- **Concurrency trên PostgreSQL thật**: test "hai lần dùng đồng thời" chạy trên PGlite (một kết nối); độ đúng trên Postgres dựa vào khóa hàng người chơi `for update` và đọc lại mã, giống kiểu của lời mời kết bạn; CI chạy cùng bộ test trên Postgres thật.
- **Web Share và vẽ canvas trên trình duyệt thật** (điện thoại, font Baloo/Nunito, `roundRect`): test chỉ dùng giả lập (jsdom, bộ vẽ ghi lại lệnh).
- Chưa chạy `pnpm test` toàn bộ, `pnpm lint` toàn repo, `pnpm assets:check`, `build:release`, `nginx -t`. Chưa xem tận mắt ảnh thẻ tuần.
- Chưa sửa tài liệu: `docs/system-architecture.md` (API `/api/invites`, bảng `player_invites`), `docs/code-standards.md` và `CLAUDE.md` (bộ smoke có thêm luồng `invite-flow`, nay là mười luồng) nên để phase 4 cập nhật. Chưa đánh dấu trạng thái phase trong plan.

## Câu hỏi còn mở

1. Có muốn nút "Khoe kết quả" chỉ có ở quest SGK (như phase 2 tập trung vào bài học) hay giữ ở mọi quest như hiện tại?
2. Hạn mức tạo link (20 mỗi giờ mỗi tài khoản) và thử mã (10 mỗi 10 phút) là tôi tự chọn; chỉnh ở `invite-routes.ts` nếu muốn khác.

Status: DONE_WITH_CONCERNS
Summary: Đủ ba mục phase 3 (link mời một lần thu hồi được, khoe kết quả, thẻ tuần cho phụ huynh) đã dựng và qua typecheck, eslint, `content:check`, build web, `security:dist`, test từng tệp (server 15 ca invite cùng các tệp liên quan, web các tệp liên quan). E2E, chụp màn hình, Postgres thật, Web Share thật và các tài liệu (để phase 4) chưa làm hoặc chưa kiểm.
