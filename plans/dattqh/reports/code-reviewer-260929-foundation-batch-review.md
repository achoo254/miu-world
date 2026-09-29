# Code review toàn đợt Foundation — 2026-09-29

Phạm vi: thay đổi chưa commit trên `main` (`git status`, `git diff HEAD`, file untracked). Trọng tâm: phần chưa có review độc lập (server nhân vật/quest/thưởng, `packages/quest`, `packages/schema/src/game.ts`, runtime + game-bridge + `/play`, plugin Vite phục vụ asset, kitbash chibi, CI + E2E). Phần auth/hồ sơ trẻ chỉ kiểm lại các bản sửa trong bảng "Xử lý" của `code-reviewer-260929-auth-review.md`.

Đã chạy:
- `pnpm vitest run apps/server packages apps/web` → 21 file, 137 test pass (PGlite; nhánh Postgres chưa chạy vì máy không có Docker).
- `pnpm typecheck` → xanh. `pnpm lint` → xanh (0 warning).
- `pnpm --filter @miu/web build` → xanh; `dist/` 8,3 MB, 129 file trong `dist/game-assets/`.
- Không chạy Playwright (không có `perf`; `play`/`account` không chạy vì phiên review không bật server).

## Tổng quan

Không có lỗi Critical/High. Lõi chống gian lận (server tính thưởng từ catalog, ledger unique `(child_id, source)`, khóa dòng `quest_progress` `FOR UPDATE`, IDOR theo phiên) đúng và test tốt. Các vấn đề thật nằm ở ranh giới: preview phục vụ asset từ repo thay vì `dist` (nên E2E không kiểm được bản build), game route không kiểm lại đồng ý khi đổi phiên bản chính sách, và khóa idempotent của thưởng phụ thuộc id bước cuối không đổi.

## Critical
Không có.

## High
Không có.

## Medium

### M1. Preview (E2E + duyệt LAN) phục vụ asset từ `assets/` của repo, không từ `dist/` — "build chỉ copy file runtime" không được E2E kiểm
- `apps/web/vite-repo-assets.ts:126-128` gắn `handle` trực tiếp trong `configurePreviewServer`. Vite 8 cài các middleware này **trước** `sirv(distDir)` (đã đối chiếu `vite/dist/node/chunks/node.js:35428-35446`: hook chạy, rồi mới `app.use(viteAssetMiddleware)`). Vì vậy mọi request `/game-assets/*` ở preview được đọc từ repo `assets/` theo manifest đầy đủ.
- Kịch bản lỗi: map sau thêm model mà `runtimeAssetPaths` không thấy (model nạp ngoài `entities.json`, texture ngoài GLB, file âm thanh, font mới không theo mẫu `packs/font-*.woff2`). `dist/` thiếu file đó, nhưng `play.spec.ts` vẫn xanh vì preview lấy từ repo; lên host tĩnh thật thì trả 404 và game không vào được. Test `the asset server refuses anything outside the manifest` (`e2e/play.spec.ts:124-131`) cũng chỉ kiểm middleware, không kiểm `dist/`.
- Hệ quả phụ: khi phục vụ LAN cho người duyệt, preview đưa ra toàn bộ file trong manifest (các pack ~24 MB), không chỉ tập runtime.
- Đề xuất: ở preview, bỏ middleware (để sirv phục vụ `dist/`, có sẵn `dist/game-assets/`) hoặc giới hạn `handle` preview vào tập `runtimeAssetPaths` đã copy. Thêm một assertion E2E: request `/game-assets/packs/kenney-cube-pets/2.0/animal-bunny.glb` (có trong manifest, không thuộc runtime) phải trả 404 ở preview.

### M2. Game route không kiểm lại đồng ý với phiên bản chính sách hiện hành
- Bản sửa "Câu hỏi 3" chỉ chặn ở `POST /children/:id/select` (`child-profile-routes.ts`, `hasCurrentConsent`). `activeChildId` (`apps/server/src/auth/auth-context.ts:71-80`) không kiểm đồng ý.
- Kịch bản: nâng `content/legal/consent-vi.json` lên `version` mới (khi pháp chế duyệt văn bản). Phiên đang có `activeChildId` (sống tới 30 ngày, trượt 7 ngày) vẫn gọi được `POST /api/quests/.../complete`, `PUT /api/character` → tiếp tục ghi dữ liệu trẻ khi phụ huynh chưa đồng ý bản mới. UI chặn qua `RequireParent` (chuyển `/consent`), nhưng API thì không — server phải là nơi chặn.
- Đề xuất: trong `activeChildId` (hoặc middleware `requireActiveChild` dùng chung), kiểm `hasCurrentConsent` và trả 403 `consent-required`; thêm test "đổi version → game route 403". Chi phí một truy vấn có index (`consents_parent_version`).

### M3. Khóa idempotent của thưởng gắn với id bước cuối — thêm bước vào quest đã xong sẽ trả thưởng lần hai
- `apps/server/src/quest/quest-routes.ts:69` `source = quest-step:<quest>/<step>`; `completeStep` (`packages/quest/src/quest-progress.ts:21-37`) bỏ qua `progress.completed`.
- Kịch bản: quest `quest-a` có 2 bước, trẻ đã xong (ledger có `quest-step:quest-a/find-letter`). Nội dung sửa thêm bước thứ ba `thank-vet` (rule chỉ cấm đổi id, không cấm thêm bước). Gọi `.../steps/thank-vet/complete` → hợp lệ theo thứ tự, là bước cuối → `grantReward` với source mới → cộng XP/Xu/vật phẩm lần hai.
- Đề xuất: thưởng hoàn thành quest dùng source theo quest (`quest-complete:<questId>`), và/hoặc trả `repeated` sớm khi `row.completedAt != null`. Thêm test cho trường hợp catalog đổi sau khi đã xong.

### M4. CI không chạy E2E; assertion StrictMode không kiểm được gì
- `.github/workflows/ci.yml` không có job Playwright (`play`, `account`). Tiêu chí thành công của plan ("E2E apps/web: đăng ký → … → gặp NPC") chỉ được kiểm trên máy dev.
- `e2e/play.spec.ts:50-51` chú thích "StrictMode mounts twice in dev; production must end with exactly one canvas" — nhưng E2E chạy bản production, nơi StrictMode không mount hai lần. Rủi ro phase 7 ("StrictMode tạo 2 renderer") nên thực tế chưa được test. Đọc code thấy đúng (xem mục "Đã kiểm"), nhưng chưa có test chứng minh.
- Đề xuất: thêm job `e2e` (Chromium, `--project account --project play`) vào CI; một test dev-mode (vitest + jsdom mock `WebGLRenderer`, hoặc Playwright chạy `vite dev` cho một test) kiểm mount → unmount → mount để lại đúng 1 canvas, và `window.__miuStats` thuộc game thứ hai.

## Low

- **L1. Deadlock tiềm ẩn giữa 2 quest thưởng cùng vật phẩm** — `apps/server/src/reward/reward-ledger.ts:36-47` upsert `inventory_items`/`skill_progress` theo thứ tự khóa JSON. Quest X `{a,b}` và quest Y `{b,a}` hoàn thành đồng thời (2 tab) → Postgres 40P01 → một request 500. Sửa: `Object.entries(...).sort(([x],[y]) => x.localeCompare(y))` để thứ tự khóa cố định.
- **L2. Toàn bộ three.js + runtime nằm trong bundle đầu** — `play-screen.tsx:8` import tĩnh `Game`; `dist/index.html` modulepreload `asset-loader-*.js` + `styles-*.js` (~200 KB gzip) ngay ở màn đăng nhập. Sửa: `React.lazy(() => import('./play/play-screen'))` trong `app-shell.tsx`.
- **L3. Bản build production mang theo trang review/preview và `generated/review/` (~5,3 MB PNG, gồm ảnh luồng UI)** — `vite.config.ts:43-47` + `vite-repo-assets.ts:21`. Chấp nhận cho giai đoạn duyệt; trước khi có người dùng thật nên tách build review.
- **L4. `Game.stop()` không ai dùng và chú thích sai** — `game.ts:114-117` nói "`start` is not needed to resume" nhưng không có hàm resume, và `start()` bị chặn bởi `started`. Xóa hoặc thêm `resume()`.
- **L5. Nhãn NPC chớp ở góc trên-trái một khung** — `.npc-label` `position: fixed; top:0; left:0` (`ui/styles.css:110-118`); khung đầu sau khi mount chưa có `transform` (game chỉ ghi từ khung kế). Sửa: CSS mặc định `visibility: hidden` cho tới khi có `transform`, hoặc để game ghi `data-placed`.
- **L6. CSP** — `vite.config.ts:13-14`: thiếu `base-uri 'self'`, `form-action 'self'`, `object-src 'none'` (không kế thừa từ `default-src` với `base-uri`/`form-action`). `style-src 'unsafe-inline'` có thể không cần (gán `el.style.*` qua CSSOM không bị CSP chặn) — thử bỏ. Meta không đặt được `frame-ancestors`: ghi nợ triển khai header thật (chống clickjacking khu phụ huynh).
- **L7. CI hardening** — thiếu `permissions: contents: read`; `semgrep/semgrep` không ghim phiên bản; action ghim tag chứ không ghim SHA.
- **L8. Dịch keyframe translation giả định LINEAR/float** — `tools/assets/kitbash-character.ts:270-280` cộng delta vào mọi phần tử output. Nếu rig sau này có sampler `CUBICSPLINE` (in-tangent/value/out-tangent) hoặc accessor quantized/normalized thì tangent/giá trị bị cộng sai. Thêm `throw` khi `interpolation === 'CUBICSPLINE'` hoặc `output.getNormalized()`.
- **L9. Item id trong thưởng quest không được đối chiếu catalog** — `content-catalog.ts:295-312` kiểm skill id nhưng không kiểm `reward.items`. Chưa có catalog vật phẩm; ghi nợ khi SLICE ba lô tới.
- **L10. Dev server `/@fs/`** — `vite dev` cho phép đọc mọi file trong workspace root (trừ `.env`, `.git`…), kể cả `.data/pglite`. Chỉ loopback thì không sao; nếu ai chạy `pnpm dev --host` để thử iPad thì lộ qua LAN. Thêm `server.fs.deny: ['.data/**']` hoặc ghi vào `CLAUDE.md` "LAN chỉ dùng preview".
- **L11. `loadMs` đo từ lúc tải trang, không từ lúc vào `/play`** — `game.ts:308` dùng `performance.now()`. Người duyệt đi đăng nhập → chọn hồ sơ → `/play` sẽ thấy "load" bị thổi phồng trên overlay. Ghi mốc lúc `boot()` bắt đầu.

## Kiểm lại bản sửa của review auth

| Mục | Kết luận |
| --- | --- |
| H1 rate limit IP | Đúng. `trust proxy 'loopback'` + proxy `xfwd: true`; http-proxy nối IP thật vào cuối `X-Forwarded-For`, Express lấy phần tử phải nhất không tin cậy → header giả từ client không lừa được. Server nghe `127.0.0.1` (`server.ts:12`). |
| H2 race khóa PIN | Đúng. `UPDATE … WHERE pin_failed_count < 5 RETURNING` giữ chỗ nguyên tử trước `verifySecret`; PIN đúng reset 0. |
| H3 hàng đợi scrypt | Đúng. Trần 2 chạy + 32 chờ, slot chuyển thẳng cho người chờ (`running` không vượt trần), vượt → 503 `server-busy`. |
| M1 cổng mở sau chọn hồ sơ | Đúng (`parentGateUntil: null` trong `select`). |
| M2 index | Đúng: 3 index có trong `0000_initial-schema.sql`; bảng con của `child_id` đều có PK/unique bắt đầu bằng `child_id` nên cascade dùng index. |
| L1, L3, L5, L8 | Đúng như mô tả. |
| Câu hỏi 3 (đổi version đồng ý) | **Chưa đủ** — chỉ chặn `select`; xem M2. |
| H4, M3 (UI) | Không đọc lại chi tiết; có test tương ứng pass. |

## Đã kiểm là đúng

Server nhân vật/quest/thưởng:
- Thưởng lấy từ catalog (`structuredClone(def.reward)`), body bị bỏ qua; test gửi `xp: 999999` xác nhận.
- Transaction: `INSERT … ON CONFLICT DO NOTHING` rồi `SELECT … FOR UPDATE` trên `(child_id, quest_id)`. Trên Postgres READ COMMITTED, request thứ hai chờ ở insert/khóa, sau khi request đầu commit thì đọc lại dòng mới → `already-completed` → `repeated: true`. Lỗi `out-of-order`/`unknown-step` ném trong transaction → rollback dòng vừa tạo. Ledger unique `(child_id, source)` là lớp chặn thứ hai.
- Kiểm mở khóa ngoài transaction là an toàn vì trạng thái hoàn thành chỉ tăng. Ngữ nghĩa "BẤT KỲ quest nào mở" khớp `assertAllReachable` và rule `quest-content.md`.
- XP/Xu tổng hợp trực tiếp từ ledger; skill/vật phẩm từ bảng tổng hợp cập nhật cùng transaction; test seed ngẫu nhiên đối chiếu tổng khớp.
- IDOR: `childId` chỉ lấy từ phiên và đối chiếu `parent_id`; con trỏ phiên bị giả → 401; test chứng minh dữ liệu của gia đình khác không đổi.
- Không có Kim cương trong DTO `packages/schema/src/game.ts`; grep `diamond|gem|kim-cuong` trong server/packages/content: chỉ còn test phủ định.
- `PUT /character`: tên theo danh sách (cả hai phía chuẩn hóa NFC), trang bị theo catalog phụ kiện, một món mỗi slot, `species` bị bỏ qua; mặt nằm ở `content/faces/` nên không "mặc" được.
- `packages/quest`, `packages/schema`, `packages/voxel` bị lint cấm import `three`/`react`; `apps/web/src/game/**` bị cấm import React/router — lint xanh, grep xác nhận.

Runtime + bridge:
- StrictMode: phần đồng bộ của `boot()` (DOM, `WebGLRenderer`, overlay) chạy trước `await` đầu; cleanup của effect gọi `dispose()` → gỡ DOM, `setAnimationLoop(null)`, `dispose` + `forceContextLoss`; `boot()` tiếp tục thì dừng ở các chốt `if (this.disposed) return`; lỗi sau khi dispose bị nuốt có chủ đích. `StatsOverlay.detach()` chỉ xóa handle của chính nó.
- Listener: `PlayerInput` dùng `AbortController` cho `window`; `resize`, `Timer.connect`, `onCommand` đều có cleanup; worker mesher `terminate()` trong `finally`.
- GPU: duyệt `Mesh` (gồm `SkinnedMesh`, `InstancedMesh`) để dispose geometry/material/texture, rồi `forceContextLoss` giải phóng phần còn lại (shadow map, bone texture).
- React chỉ nhận event rời rạc: `interaction-prompt` chỉ phát khi NPC gần nhất đổi, `reduce` trả cùng tham chiếu khi không đổi → không render; transform nhãn ghi thẳng vào phần tử neo qua ref.

Plugin asset + CSP:
- Path traversal: `rel` sau decode phải khớp đúng chuỗi trong manifest **và** `path.resolve` phải nằm trong `assetsDir`; percent-encoding hỏng → 400; không liệt kê thư mục; `nosniff`.
- Build chỉ copy tập runtime (manifest, `generated/{atlas,world,characters,review}`, font, model đặt trong `entities.json` + texture ngoài của GLB), báo lỗi nếu file runtime thiếu trong manifest. Phụ kiện là voxel JSON nên không cần GLB.
- CSP: `script-src 'self'`, không `unsafe-eval`, không host ngoài; meta được chèn `head-prepend` ở mọi trang build.

Kitbash chibi:
- Mặc định byte-giống: `reshaped = false` → `partMatrix = worldMatrix`, không có delta, thứ tự accessor giữ nguyên (input trước output), palette không thêm màu mặt. Test so byte với `miu-cat.glb` đã commit; `git status` không báo `miu-cat.glb` đổi.
- Delta translation: áp vào node đích rồi mới tính inverse bind matrix (`worldMatrix(outNode)`) → skin khớp; clip rig được dịch cùng delta; clip bổ sung (`jump`, `cheer`) cộng offset trên translation đã dịch (`sampleClip` dùng `joint.getTranslation()` của node đích) → không nổi/chìm khi phát.
- Khối mặt nhân theo `headScale`, gắn joint `head`, vẫn 1 draw call; test ngân sách tam giác, chân chạm đất, đầu trên vai, tỉ lệ chibi tăng dần.
- `render-preview.ts`: `APP_DIR` trỏ `apps/web`, ảnh map đi qua `preview.html`, ảnh biến thể có tham số `accScale`.

CI/E2E:
- Job `integration` chạy cùng file test server trên Postgres 17 qua `createTestDb` (mỗi file một DB tạm, dọn sau). `check` có build web + `pnpm audit --prod`; `sast` có Semgrep CE.
- Playwright: cổng cố định 4173/8787, `reuseExistingServer: false`, PGlite in-memory, phiên cookie lưu ở `apps/web/playwright/.auth/` (đã gitignore), dữ liệu giả.

## Việc nên làm (theo ưu tiên)
1. M2: kiểm đồng ý hiện hành trong `activeChildId` + test.
2. M3: đổi source thưởng hoàn thành quest sang theo quest (hoặc chặn khi `completedAt` đã có) + test catalog đổi.
3. M1: preview phục vụ từ `dist/` (hoặc giới hạn theo tập runtime) + assertion 404 cho file ngoài runtime.
4. M4: job E2E trong CI; test dev-mode cho StrictMode.
5. L1 (sắp xếp khóa), L4, L5, L6, L7 — việc nhỏ, làm luôn được.

## Chỉ số
- Test: 137/137 pass (PGlite). Postgres: chưa chạy (chờ CI).
- Typecheck: 0 lỗi. Lint: 0 lỗi, 0 warning.
- Build web: xanh, `dist/` 8,3 MB.

## Câu hỏi mở
1. Trang bị phụ kiện hiện không cần sở hữu (chỉ kiểm catalog). Đúng ý MVP, hay phụ kiện phải lấy từ kho/thưởng? Nếu phải sở hữu thì `PUT /character` cần kiểm `inventory_items`.
2. Bản build production có cần tách `review.html`/`preview.html` và ảnh review ra khỏi `dist/` ngay đợt này, hay để tới trước khi có người dùng thật?
3. Khi đổi phiên bản chính sách đồng ý: chặn ngay mọi phiên đang chơi (M2), hay cho chơi hết phiên? Đề xuất: chặn ngay (dữ liệu trẻ, NĐ 13/2023).

## Xử lý (implementer, 2026-09-29)

| Phát hiện | Xử lý | Bằng chứng |
| --- | --- | --- |
| M1 preview đọc asset từ repo | Preview chỉ phục vụ file có trong `dist/game-assets/`, còn lại 404 (dev server vẫn đọc repo qua manifest) | E2E `play.spec.ts`: `animal-bunny.glb` (có trong manifest, không thuộc runtime) trả 404 |
| M2 route game không kiểm lại đồng ý | `activeChildId()` kiểm đồng ý bản hiện hành → 403 `consent-required`; UI gặp mã này thì đọc lại tài khoản và chuyển sang màn đồng ý | test "stops play (403) as soon as the consent version…" |
| M3 thưởng trả hai lần khi quest thêm bước | Khóa ledger theo quest (`quest:<id>`); quest đã xong trả `repeated` cho mọi bước | test "never pays a finished quest twice…" |
| M4 CI không chạy E2E | Thêm job `e2e` (Chromium, project setup/account/play); test đơn vị StrictMode: còn đúng 1 game sống, 0 sau unmount | `.github/workflows/ci.yml`, `play-screen.test.tsx` |
| Low: deadlock thứ tự khóa | Sắp xếp khóa vật phẩm/kỹ năng trước khi ghi | `reward-ledger.ts` |
| Low: three.js nạp ở màn đăng nhập | `/play` lazy-load | `app-shell.tsx` |
| Low: nhãn NPC chớp ở góc | Nhãn ẩn tới khi game ghi vị trí lần đầu | `play-screen.tsx`, `game.ts` |
| Low: CSP thiếu directive | Thêm `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` + test | `vite.config.ts` |
| Low: CI `permissions`, ghim Semgrep | `permissions: contents: read`; `semgrep/semgrep:1.178.0` | `ci.yml` |
| Low: chú thích `Game.stop()` | Sửa chú thích (resume thêm khi có menu toàn màn hình ở SLICE) | `game.ts` |
| Low: review/preview + ảnh review trong bản build production | Chưa làm: ghi nợ trước khi triển khai (tách build review khỏi build phát hành) | `docs/project-roadmap.md` |
| Low: dịch keyframe giả định nội suy LINEAR | Chấp nhận: rig Kenney chỉ dùng LINEAR; ghi chú ở report | — |
