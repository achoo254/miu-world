# Báo cáo phase 2: trang SEO (giới thiệu, trang theo bài, sitemap, thẻ xem trước)

Plan: `plans/dattqh/261012-1116-auto-marketing/` (phase 2). Nhánh `main`, chưa commit, chưa push. Không chạy E2E, không chạy `deploy.sh`, không đụng máy chủ.

## Kết quả

Đã làm đủ chín mục của phase 2. Bản build thường và bản `build:release` đều xanh; trong bản release có 72 trang dưới `/bai/` (2 trang môn, 70 trang bài), `404.html`, `robots.txt` cho phép bot, `sitemap.xml` 73 địa chỉ (trang chủ + 72), 71 ảnh thẻ trong `game-assets/generated/share-cards/`. `pnpm security:dist` báo OK trên bản release.

## Những gì đã dựng

1. **Một module chung cho slug**: `packages/schema/src/lesson-pages.ts`. Slug = `<môn>-<tên bài in trong book.json>` bỏ dấu, ví dụ `toan-2-bai-1-on-tap-cac-so-den-100`, `tieng-viet-2-on-tap-giua-hoc-ki-1`. Trùng slug thì ném lỗi. Ba nơi cùng dùng nó: plugin build, bảng route analytics (`packages/schema/src/analytics.ts` bỏ hằng cứng hai trang môn, `analyticsCatalog` của server dựng `lessonSlugs` thật qua `readBookTocs` mới), và app web (màn giới thiệu lấy link trang môn). Slug placeholder bằng id bài của phase 1 đã bỏ; test analytics cập nhật theo.
2. **Hàm chọn trường duy nhất**: `pickQuestPageFields` trong `apps/web/lesson-page-data.ts`. Chỉ đọc `id`, `status` (để lọc), `lesson`, `title`, `summary`, `region`; trả đúng 5 khóa `id, lesson, region, summary, title`. `{name}` thành "Bé" đầu câu và "bé" giữa câu. Test snapshot khóa chạy trên quest thật `toan2-cd1-b01` (có đáp án) và trên quest giả có `steps/review/sevenQuestions/texts/reward`, kèm quét toàn bộ trang bằng `questSecrets` của `scan-dist`.
3. **Thẻ trong shell**: `apps/web/vite-seo-meta.ts` (description, Open Graph, Twitter; ảnh tuyệt đối có `?v=<hash manifest>`; không canonical, không `og:url` ở shell; chỉ gắn cho `index.html`). Chữ lấy từ `vi.json` (`seo.*`). Khối tĩnh trong `#root` của `index.html` (h1, đoạn dẫn, bốn lợi ích, link `/login` và hai trang môn); test `vite-seo-meta.test.ts` giữ nó khớp `landing.*` của `vi.json`.
4. **Trang theo bài**: `apps/web/vite-lesson-pages.ts` ghi `dist/bai/<slug>/index.html`, `dist/bai/toan-2/`, `dist/bai/tieng-viet-2/` và `dist/404.html`. Mỗi trang có meta CSP (nhận `CONTENT_SECURITY_POLICY` từ `vite.config.ts` qua tham số, không import vòng), tag icon dùng chung (`iconLinkTags` tách ra từ `vite-app-icons.ts`), canonical, OG riêng với ảnh theo bài, JSON-LD `LearningResource` (trang môn: `CollectionPage`), tiêu đề "Trò chơi ôn Bài … — Toán 2, Kết nối tri thức", các hoạt động (tên, mô tả, vùng), nút "Chơi bài này", bài trước/sau, link về trang môn. Script là entry Rollup riêng `lesson-page` (`src/seo/lesson-page-entry.ts`): gửi `page_view` và lưu đích sau đăng nhập khi bấm nút. Tên tệp hash, CSS (cả CSS của chunk dùng chung) và chunk preload lấy từ bundle trong `generateBundle`. CSS: `src/seo/lesson-page.css` + `styles.css`/`tokens.css`/`fonts.css` có sẵn.
5. **Ảnh thẻ**: `tools/assets/render-share-cards.ts` (Playwright, font Baloo 2 và ảnh nhúng dạng data URL, màu đọc từ `tokens.css`, chữ từ `shareCard.*`), `pnpm assets:cards`, khai trong `tools/assets/generated.json`, thêm `generated/share-cards/` vào `SHIPPED_PREFIXES`, đã chạy `assets:manifest`. 71 ảnh 1200 × 630 (1 chung + 70 bài), 6,4 MB. Chạy hai lần so sha256 cả 71 tệp: giống hệt.
6. **Màn giới thiệu** `src/ui/landing/landing-screen.tsx` (+ `landing.css`, ghi NEW SCREEN): `/` khi chưa đăng nhập hiện màn này, nút "Chơi ngay" sang `/login`, ảnh các đảo, link hai trang môn bằng thẻ `<a>` thường. Người đã đăng nhập vẫn vào thẳng game (`LandingOrStart` trong `app-shell.tsx`).
7. **Đích sau đăng nhập**: `src/post-login-target.ts`. Lưu `{next, inviteCode, savedAt}` trong `localStorage`, TTL 1 giờ, `next` chỉ nhận `/play?region=<vùng có trong regions.json>&quest=<id đúng dạng>` (dựng lại đúng thứ tự khóa, không tham số thừa) hoặc `/region/<vùng>`; mọi thứ đọc lại từ storage đều kiểm lại. Đọc và xóa trong `ResumePostLoginTarget`, đặt trong `RequireActivePlayer`, chạy khi tới `/home` (tức sau consent và sau khi tạo nhân vật, vì `/create` cũng nằm trong `RequireActivePlayer` nên không thể đọc sớm hơn).
8. **robots.txt và sitemap.xml**: `apps/web/vite-sitemap.ts`. Release: `Allow: /`, `Disallow: /api/`, dòng `Sitemap:`; build khác: chặn hết và không có sitemap. `lastmod` theo sổ `apps/web/seo-lastmod.json` (hash nội dung trang và ngày thấy hash đó lần đầu); trang nào hash không khớp sổ thì bỏ `lastmod`, build không hỏng, chỉ cảnh báo. Lệnh mới `pnpm seo:lastmod` (`tools/seo/update-lastmod.ts`, ngày theo Asia/Saigon) cập nhật sổ.
9. **Triển khai**: `deploy.sh release` kiểm thêm sau bước "review material": có trang dưới `/bai`, `robots.txt` không chặn hết và có dòng `Sitemap:`, số `<loc>` trong sitemap bằng số `dist/bai/*/index.html` cộng 1 (trang chủ). `nginx-prod.conf` có `location /bai/` (`try_files … =404` + trang `404.html` tĩnh), `/bai/` trần trả 404, `location = /404.html { internal; }`. `scan-dist.ts`: thêm `.xml`, `.txt`; thêm `lessonPageIssues`/`scanLessonPages` (mỗi `dist/bai/**/index.html` và `404.html` phải có meta CSP đúng bằng hằng của game, không `<script>` inline ngoài `application/ld+json`, không script ngoài origin).
10. **E2E (không chạy)**: `account-flow.spec.ts` sửa bước `/` → `/login` thành "thấy màn giới thiệu, bấm Chơi ngay, tới Đăng nhập" (kiểm chặt hơn, không nới). `screens.spec.ts` thêm `20-landing` và `21-lesson-page` (ở cả hai khổ, đặt trong phần chưa đăng nhập). Thêm hai tên vào `SCREEN_NAMES` của `apps/web/src/review/review-main.ts` (không thì trang duyệt không hiện ảnh) và sửa dòng "mười chín màn" trong `docs/screen-review.md`.

## Tệp thay đổi / tạo mới

Tạo mới:
- `packages/schema/src/lesson-pages.ts`, `lesson-pages.test.ts`, `share-cards.ts`
- `apps/web/lesson-page-data.ts` (+ test), `vite-asset-url.ts`, `vite-seo-meta.ts` (+ test), `vite-lesson-pages.ts` (+ test), `vite-sitemap.ts` (+ test), `seo-lastmod.json`
- `apps/web/src/post-login-target.ts` (+ test), `apps/web/src/seo/lesson-page-entry.ts`, `apps/web/src/seo/lesson-page.css`, `apps/web/src/ui/landing/landing-screen.tsx`, `landing.css`, `landing-screen.test.tsx`
- `tools/assets/render-share-cards.ts`, `tools/seo/update-lastmod.ts` (+ test)
- `apps/server/src/worksheet/curriculum-books.test.ts`
- `assets/generated/share-cards/*.png` (71 tệp)

Sửa:
- `apps/web/vite.config.ts`, `vite-app-icons.ts`, `vite-repo-assets.ts` (+ test), `index.html`, `tsconfig.json`
- `apps/web/src/ui/app-shell.tsx`, `src/ui/account/account-flow.test.tsx`, `src/ui/i18n/locales/{vi,en}.json`, `src/review/review-main.ts`
- `apps/web/e2e/account-flow.spec.ts`, `e2e/screens.spec.ts`
- `packages/schema/src/analytics.ts`, `analytics.test.ts`
- `apps/server/src/analytics/analytics-routes.ts`, `analytics-routes.test.ts`, `apps/server/src/worksheet/curriculum-books.ts`
- `tools/security/scan-dist.ts`, `scan-dist.test.ts`, `tools/assets/generated.json`, `tools/deploy/production/{deploy.sh,nginx-prod.conf}`
- `package.json` (hai script `assets:cards`, `seo:lastmod`), `tsconfig.json` (gốc), `assets/manifest.json` (chỉ thêm 71 mục), `docs/screen-review.md`

## Lệnh đã chạy và kết quả

Mỗi lần trước bước nặng đều kiểm `ps` không có job vitest/playwright/vite/tsc nào khác; một phiên khác có chạy `vitest run --maxWorkers=2` trong lúc tôi chạy từng tệp test nhỏ (tôi không chạy song song gì của mình, bước nặng chờ phiên kia xong).

- `pnpm assets:cards` hai lần, so `shasum -a 256` 71 tệp: **giống hệt**. Sau đó `pnpm assets:manifest` OK.
- `pnpm typecheck`: sạch (gốc, `apps/server`, `apps/web`).
- `pnpm exec eslint --max-warnings=0 <mọi .ts/.tsx đổi hoặc mới>`: 0 lỗi, 0 cảnh báo.
- `pnpm assets:check`: `OK — 16 packs, 4776 files`.
- `pnpm content:check`: `OK — 2068 files`.
- Từng tệp test, tuần tự (`pnpm vitest run <tệp>`), tất cả xanh: `packages/schema/src/{lesson-pages,analytics}.test.ts` (26), `apps/web/src/post-login-target.test.ts` (7), `ui/landing/landing-screen.test.tsx` (3), `ui/account/account-flow.test.tsx` (20, gồm 2 ca mới: mở đúng quest đã lưu sau khi tới Home, và bỏ đích ngoài danh sách), `apps/web/lesson-page-data.test.ts` (7), `vite-lesson-pages.test.ts` (17), `vite-seo-meta.test.ts`, `vite-sitemap.test.ts` (tổng 18), `vite-repo-assets.test.ts` (9), `src/content-security-policy.test.ts` (4), `src/ui/i18n/i18n.test.tsx` (14), `tools/security/scan-dist.test.ts` (8), `tools/seo/update-lastmod.test.ts` (1), `apps/server/src/analytics` + `curriculum-books.test.ts` + `apps/web/src/analytics` (53).
- `pnpm --filter @miu/web build`: xong; `dist/robots.txt` = `Disallow: /`, không có `sitemap.xml`, có `bai/` và `404.html`.
- `pnpm --filter @miu/web build:release`: xong; `robots.txt` cho phép bot + `Disallow: /api/` + `Sitemap:`; `sitemap.xml` 73 `<loc>`, 73 `<lastmod>`; 72 `bai/*/index.html`; 71 ảnh thẻ; không `review.html`/`preview.html`; không trang nào thiếu CSP hay có `<script>` inline.
- `pnpm security:dist` trên bản release: `OK — no quest answer in apps/web/dist, every lesson page keeps the CSP and runs no inline script`.
- `pnpm --filter @miu/server bundle`: xong. Tách riêng đoạn kiểm trong `deploy.sh release` chạy thử trên `dist` release: qua (72 trang). `bash -n` và `shellcheck` trên `deploy.sh`: chỉ còn các ghi chú `info` có sẵn từ trước.
- Chụp thử bản build bằng Playwright qua `vite preview` (tắt ngay sau đó, cổng 4173 đã trống) ở 360, 820 và 1280: màn giới thiệu, một trang bài, trang môn hiển thị đúng; lỗi console duy nhất là 401 của `/api/auth/me` (cố ý giả lập chưa đăng nhập). Bấm "Chơi bài này" lưu `{"next":"/play?region=truong-hoc&quest=toan2-cd1-b01",…}` rồi sang `/login`, trang gửi đúng một `page_view` với `path` `/bai/<slug>/` và `source` `zalo`; không có lỗi CSP. Các tệp chụp nằm ở scratchpad, đã xóa tệp script tạm trong repo.

## Khác với chỉ dẫn (cần biết)

- **nginx `types`**: không đặt `types { application/manifest+json webmanifest; }` trong khối server vì khối `types` ở cấp thấp **thay** chứ không **bổ sung** bảng mime kế thừa (mọi `.js`/`.css`/`.png` sẽ mất kiểu). Thay bằng `location = /manifest.webmanifest { default_type application/manifest+json; }`. Không có nginx trên máy dev nên chưa chạy `nginx -t`; `setup` đã có bước "chỉ bật khi `nginx -t` sạch".
- **Số `<loc>` ở `deploy.sh`**: sitemap có cả `/`, nên kiểm là (số `bai/*/index.html`) + 1, tức bài + 2 trang môn + 1 trang chủ = 73 hiện nay, không phải "bài + 2".
- **`scan-dist` loại trừ tiêu đề sách**: hai đáp án quest ("Ngày hôm qua đâu rồi?", "Em có xinh không?") trùng tên bài in trong sách, mà trang bài phải in tên bài, nên lưới phụ báo oan. `scanDist` giờ bỏ khỏi danh sách bí mật những chuỗi là một phần tên bài/chủ đề trong `book.json` (hàm `publicBookTitles`, có test). Các đáp án khác vẫn bị quét.
- **Hàm chọn trường trả thêm `id` và `lesson`** ngoài `title/summary/region` (cần để gom theo bài và dựng link chơi); không phải chữ của quest. `{name}` đầu câu thành "Bé" thay vì "bé".
- **tsconfig gốc** thêm `allowImportingTsExtensions` (đã `noEmit`): vì `tools/*` giờ nhập `apps/web/*.ts` (vốn dùng đuôi `.ts`). `apps/web/tsconfig.json` thêm `vite-*.ts` và `lesson-page-data*.ts` để test và plugin được typecheck.
- **Cảnh báo native config loader** của Vite 8 ("import … without a file extension") có thêm vài dòng do các tệp schema mới nhập; cảnh báo này đã có từ trước (ví dụ `ui-art.ts`), build không lỗi.
- **Sổ lastmod**: ngày trong `seo-lastmod.json` hôm nay là 2026-10-12 cho cả 73 trang. Hash gồm cả phiên bản (hash manifest) của icon và ảnh thẻ, nên ảnh thẻ sinh trên máy khác (byte khác) sẽ làm lệch hash và bản build bỏ `lastmod` đến khi chạy `pnpm seo:lastmod`.

## Chưa kiểm

- **E2E** (`account-flow`, `screens`) chưa chạy theo yêu cầu; các sửa chỉ qua typecheck và eslint. Chưa chụp 21 màn bằng project `screens`, nên chưa có ảnh duyệt cho `20-landing` và `21-lesson-page` ở hai khổ (đã có ảnh thử ngoài repo, xem trên).
- `nginx -t` với `nginx-prod.conf`; hành vi thật của `/bai/`, `/bai/<không có>`, `404.html` trên máy chủ.
- `deploy.sh release` nguyên bản (chỉ chạy tách đoạn kiểm mới).
- Toàn bộ bộ test (`pnpm test`) chưa chạy; chỉ các tệp liệt kê trên.
- Ảnh thẻ chưa được người duyệt bằng mắt từng tấm (đã xem tấm chung, hai tấm bài dài và một tấm ôn tập).
- Đọc lại ảnh thẻ trên Zalo/Facebook (trình kiểm tra thẻ) cần có URL công khai: thuộc phase 4.

## Việc cho phase sau

- Phase 4 / docs: ghi vào `CLAUDE.md` hoặc `docs/` rằng khi thêm bài SGK mới (quest có `lesson` mới) phải chạy `pnpm assets:cards`, `pnpm assets:manifest`, `pnpm seo:lastmod` rồi commit; không có thẻ thì `vite build` và `vite-lesson-pages.test.ts` báo lỗi rõ. Áp `nginx-prod.conf` lên máy chủ bằng `setup` chỉ khi người cho phép.
- Phase 3 dùng được `savePostLoginTarget({ next, inviteCode })` / `takePostLoginTarget()`; muốn thêm đường dẫn đích mới (ví dụ qua `/moi/:code`) thì mở rộng `isAllowedNext`.

## Câu hỏi còn mở

1. Có muốn thêm `Disallow` cho `/game-assets/` trong `robots.txt` không? Tôi để mở vì chặn có thể làm Googlebot không tải được font/CSS khi dựng trang và không lập chỉ mục được ảnh thẻ.
2. Sổ `seo-lastmod.json` cần người nhớ chạy `pnpm seo:lastmod` sau khi nội dung đổi; nếu muốn tự động hơn thì thêm vào bước release (ghi tệp trong lúc cây phải sạch nên tôi không tự làm).

Status: DONE_WITH_CONCERNS
Summary: Đủ chín mục phase 2 đã dựng và qua typecheck, eslint, assets/content check, test từng tệp, build thường và release, `security:dist`. Chưa chạy E2E, chưa chụp màn `screens`, chưa kiểm nginx trên máy thật; có vài điểm lệch chỉ dẫn (nginx `types`, loại trừ tiêu đề sách ở `scan-dist`, sitemap +1 trang chủ) đã nêu trên.
