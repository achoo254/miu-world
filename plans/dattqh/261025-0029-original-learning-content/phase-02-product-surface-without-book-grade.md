# Pha 2: Gỡ sách, lớp, bài, trang khỏi bề mặt sản phẩm

**Tier:** L · **Phụ thuộc:** 1 · **Trạng thái:** pending

## Bối cảnh

D13 của plan tập một bắt mọi nơi nêu tên quest học phải hiện "Tiếng Việt 2, tập một · Bài 1… · Trang 10–12": server lấy tên bài và trang từ kiểm kê vào `QuestView.textbook`, web hiện ở `textbook-ref.tsx`, danh sách quest của khu vực (`region-books.tsx`, `region-detail.tsx`), "Nhiệm vụ hôm nay" (`today-quests.tsx`, `daily-lesson.tsx`), HUD. Trang công khai `/bai/<slug>/` (`vite-lesson-pages.ts`, `lesson-page-data.ts`, `packages/schema/src/lesson-pages.ts`) lấy slug từ tên bài in trong sách; analytics (`analytics-routes.ts`, `packages/schema/src/analytics.ts`), link chia sẻ (`share/lesson-link.ts`, `share-links.ts`), thẻ chia sẻ (`tools/assets/render-share-cards.ts`), sitemap và lịch clip marketing (`tools/marketing/clip-schedule.ts`, `content/marketing/clip-schedule.json` theo tuần học kì) đều đọc `book.json`.

Pha này làm cho người chơi không còn thấy sách, lớp, bài, trang, kể cả với quest chưa viết lại (mọi quest đã có `topic` từ pha 1). Chữ SGK trong quest chưa viết lại vẫn còn tới pha 4, 5.

## Việc

1. **Server**: `QuestView.textbook` thay bằng `QuestView.topic` (`id`, `title`, `subject`) lấy từ khung chủ đề; bỏ `readBookTocs` khỏi đường chạy của server ngoài phiếu viết (phiếu viết đổi ở pha 6).
2. **Web**: `textbook-ref.tsx` đổi thành nhãn chủ đề (môn · chủ đề); danh sách quest khu vực, "Nhiệm vụ hôm nay", HUD, màn hoàn thành, chia sẻ kết quả dùng nhãn đó. Chuỗi i18n `vi.json`, `en.json`: bỏ mọi chữ lớp, sách, bài, trang, SGK.
3. **Trang công khai**: `/bai/<slug>/` thay bằng `/hoc/<mon>/<chu-de>/` (một trang mỗi chủ đề có quest đang chơi, một trang mỗi môn); `lesson-pages.ts` đổi thành `topic-pages.ts`; bảng route analytics, sitemap (`vite-sitemap.ts`, `seo-lastmod.json`), link chia sẻ, thẻ chia sẻ theo trang mới. `index.html` bỏ chữ lớp 2 và SGK trong tiêu đề, mô tả, JSON-LD.
4. **301**: `tools/deploy/production/nginx-prod.conf` thêm map từ mọi slug `/bai/` đang có trên production sang trang chủ đề tương ứng (bảng sinh từ ánh xạ quest → chủ đề của pha 1, commit dạng tệp include); test nginx hiện có thêm trường hợp 301.
5. **Lịch clip marketing**: bỏ ánh xạ tuần học kì → bài; lịch mới xoay vòng theo chủ đề có trang công khai; `captions.ts`, `render-lesson-clip.ts`, `weekly-clip.ts`, `check-marketing-content.ts` đổi theo; `content/marketing/channels.json` bỏ chữ lớp 2 trong mô tả nếu có.
6. **Clip đã đăng**: xem 6 clip bài học đã đăng trên YouTube (ghi ở `content/marketing/posted.json`) và bài Facebook kèm theo, ghi lại clip nào hiện chữ SGK, "lớp 2" hoặc tên bài. Không gỡ hay sửa gì trên kênh; gom kết quả lại hỏi người sở hữu một lần (đăng ra ngoài).
7. **Chặn quay lại**: `content:check` thêm kiểm cụm cấm (`lớp 2`, `lớp Hai`, `SGK`, `sách giáo khoa`, `Grade 2`, `Kết nối tri thức`, mẫu `Bài \d+\.`, `Trang \d+`) trên i18n, `index.html`, trang công khai sinh ra, nội dung marketing; quest chưa viết lại được miễn cho tới pha 7.
8. **Kiểm khác**: `tools/security/scan-dist.ts` bỏ `publicBookTitles` (trang không còn in tên bài của sách); E2E `screens`, `quest-flow`, `maps` và ảnh duyệt màn hình theo `docs/screen-review.md` cập nhật theo nhãn mới.

## File

Sửa: `apps/server/src/quest/quest-routes.ts`, `apps/server/src/content/content-catalog.ts`, `apps/server/src/analytics/analytics-routes.ts`, `apps/server/src/analytics/server-events.ts`, `packages/schema/src/game.ts`, `packages/schema/src/analytics.ts`, `packages/schema/src/lesson-pages.ts` → `topic-pages.ts`, `packages/quest/src/daily-lesson.ts` (chỉ chú thích, logic không đổi), `apps/web/index.html`, `apps/web/lesson-page-data.ts`, `apps/web/vite-lesson-pages.ts`, `apps/web/vite-sitemap.ts`, `apps/web/seo-lastmod.json`, `apps/web/vite.config.ts`, `apps/web/src/ui/player/textbook-ref.tsx`, `apps/web/src/ui/region/{region-books,region-detail,region-board}.ts(x)`, `apps/web/src/ui/home/{today-quests,daily-lesson}.tsx`, `apps/web/src/ui/hud/hud.tsx`, `apps/web/src/ui/rewards/completion-sequence.tsx`, `apps/web/src/ui/quest/{quest-layer,share-result}.tsx`, `apps/web/src/ui/share/{lesson-link,share-actions,share-links}.ts`, `apps/web/src/ui/i18n/locales/{vi,en}.json`, `apps/web/src/ui/player/{player-data,test-fixtures}.ts`, `tools/assets/render-share-cards.ts`, `tools/marketing/{clip-schedule,captions,render-lesson-clip,weekly-clip,check-marketing-content}.ts`, `content/marketing/{clip-schedule,channels}.json`, `tools/deploy/production/nginx-prod.conf` (+ test), `tools/security/scan-dist.ts`, `tools/content/check-content.ts`, E2E `apps/web/e2e/{screens,quest-flow,maps}.spec.ts`.

## Kiểm tra

- Test đơn vị của từng file sửa; `pnpm content:check` (gồm kiểm cụm cấm), `typecheck`, `lint` xanh ở local.
- CI: build web, `security:dist`, E2E `e2e:ci` xanh; ảnh các màn chính chụp lại và duyệt theo `docs/screen-review.md`.
- Test nginx: mỗi slug `/bai/` cũ trả 301 về đúng trang chủ đề.

## Release

Sau CI xanh và ảnh màn hình đã duyệt: hỏi người sở hữu trước khi deploy production (đợt 1 của T5).

## Rủi ro

- Bỏ sót chỗ nhắc lớp, sách: kiểm cụm cấm chạy trên bundle và trang sinh ra, không chỉ trên nguồn.
- Google tạm rớt hạng trang cũ: 301 cố định, sitemap mới, không xóa URL cũ không redirect.

## Rollback

Revert commit; nginx giữ bản cũ của `nginx-prod.conf` theo quy trình ở `docs/deployment-guide.md`.
