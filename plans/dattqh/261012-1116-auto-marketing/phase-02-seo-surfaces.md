---
phase: 2
title: "Trang SEO: giới thiệu, trang theo bài, sitemap, thẻ xem trước"
status: completed
tier: L
dependsOn: [1]
---

# Phase 2 — Trang SEO

## Mục tiêu

Google lập chỉ mục được Miu World qua từng bài SGK; link dán vào Zalo/Facebook hiện ảnh và mô tả; người chưa đăng nhập thấy trang giới thiệu.

## Yêu cầu

1. **Thẻ trong `index.html`** (plugin Vite, cạnh `apps/web/vite-app-icons.ts`): `description`, Open Graph (`og:title`, `og:description`, `og:image` URL tuyệt đối `https://miu.hoandat.com/game-assets/…?v=<hash manifest>` theo cách `versioned()`, `og:image:width`/`height` 1200 × 630, `og:locale` `vi_VN`), Twitter card. **Không** đặt canonical ở shell SPA (mọi route SPA dùng chung `index.html`); canonical chỉ có ở trang bài và trang môn.
2. **Khối tĩnh trong `index.html`**: trong `#root` có sẵn h1, đoạn lợi ích, link sang hai trang môn (cho bot không chạy JS như Cốc Cốc, Zalo); React thay khi khởi động.
3. **Ảnh thẻ xem trước** sinh bằng code (luật asset): generator `tools/assets/render-share-cards.ts` dựng HTML với logo Miu, ảnh toàn cảnh có sẵn và font pack Baloo 2 (woff2 tải từ đường dẫn local), chụp bằng Playwright/Chromium như `render-preview.ts`; một ảnh chung và một ảnh mỗi bài (tên bài, môn). Kiểm xác định: chạy lại hai lần so hash (cùng máy). Không thêm dependency. Thư mục ảnh thẻ thêm vào `SHIPPED_PREFIXES` của `vite-repo-assets.ts` để có trong bản build. Khai báo `tools/assets/generated.json`, `pnpm assets:manifest`.
4. **Trang giới thiệu cho người chưa đăng nhập**: route `/` khi chưa đăng nhập hiện màn giới thiệu (ôn đúng bài Toán 2 và Tiếng Việt 2 bộ Kết nối tri thức đang học, chơi cùng bạn, chép vào vở, miễn phí, không quảng cáo; ảnh game; nút "Chơi ngay" sang `/login`). Người đã đăng nhập vẫn vào thẳng game. Token màu, font của UI; ghi NEW SCREEN ở đầu tệp (`web-ui.md`).
5. **Giữ đích sau đăng nhập** (dùng chung với phase 3): trước khi rời trang (`/bai/...` nút "Chơi bài này", `/moi/:code`), lưu `{next, inviteCode, savedAt}` vào `localStorage` (TTL 1 giờ). `next` chỉ nhận đường dẫn tương đối khớp bảng cho phép (ví dụ `/play?region=<id>&quest=<id>` với id có trong danh mục), chống open redirect. Đọc và xóa sau `RequireActivePlayer` (sau consent và tạo nhân vật). Callback OAuth không đổi (vẫn về `/`).
6. **Trang theo bài, HTML tĩnh lúc build** `dist/bai/<lesson-slug>/index.html` từ `content/curriculum/*/book.json` (tên bài, trang SGK) và quest `active` có `lesson` đó:
   - Chỉ đọc qua **một hàm chọn trường theo danh sách khóa cho phép** (`title`, `summary` với `{name}` → "bé", `region`); test snapshot đúng tập khóa trả ra, chạy trên quest có đáp án. Không `steps`, `review`, `sevenQuestions`, `texts`, `reward`.
   - Nội dung: tiêu đề "Trò chơi ôn <Bài …> — <Toán 2 | Tiếng Việt 2>, Kết nối tri thức", mô tả, các hoạt động trong game, nút "Chơi bài này", link bài trước/sau và trang môn. Trang môn `dist/bai/toan-2/`, `dist/bai/tieng-viet-2/`.
   - Mỗi trang tự chèn hằng `CONTENT_SECURITY_POLICY`, tag icon dùng chung với `vite-app-icons.ts`, meta và OG riêng (ảnh theo bài), canonical, JSON-LD `LearningResource`. Script cùng origin là một entry Rollup riêng (gửi `page_view`, lưu đích sau đăng nhập); tên tệp lấy từ bundle trong `generateBundle`. Test trên bản build: mọi `dist/bai/**/index.html` có CSP meta, không có `<script>` inline ngoài `application/ld+json`.
7. **`robots.txt`, `sitemap.xml`**: bản `release` cho phép bot, chặn `/api/`; sitemap gồm `/`, hai trang môn, mọi trang bài; `lastmod` là ngày của hash nội dung trang (không cần git; thiếu thì bỏ, không làm hỏng build). Bản review build: `robots.txt` chặn hết. `deploy.sh release` kiểm thêm, cạnh bước kiểm "review material": `robots.txt` không chặn toàn bộ và `sitemap.xml` đủ số trang bài + 2 trang môn.
8. **nginx** (`tools/deploy/production/nginx-prod.conf`): `location /bai/ { try_files $uri $uri/ =404; }` kèm trang 404 tĩnh (tránh soft 404); `types { application/manifest+json webmanifest; }`. Áp lên máy chủ bằng `setup` là thao tác ghi production: chỉ khi người cho phép; `setup` phải giữ env GA4 (phase 1).
9. `tools/security/scan-dist.ts`: thêm `.xml`, `.txt` vào `SCANNED`. Đây là lưới phụ; lớp bảo vệ chính là hàm chọn trường.

## Tệp

- Tạo: `apps/web/vite-seo-meta.ts`, `apps/web/vite-lesson-pages.ts`, `apps/web/vite-sitemap.ts` (tách theo trách nhiệm) cùng test; `apps/web/src/seo/lesson-page-entry.ts`; `apps/web/src/ui/landing/landing-screen.tsx`; `apps/web/src/post-login-target.ts`; `tools/assets/render-share-cards.ts`.
- Sửa: `apps/web/vite.config.ts`, `apps/web/vite-repo-assets.ts`, `apps/web/index.html`, `apps/web/src/ui/app-shell.tsx`, i18n `vi.json`/`en.json`, `tools/assets/generated.json`, `package.json`, `tools/security/scan-dist.ts`, `tools/deploy/production/{nginx-prod.conf,deploy.sh}`, `apps/web/e2e/screens.spec.ts` (màn giới thiệu).

## Kiểm

- Unit: hàm chọn trường (snapshot khóa), slug ổn định, sitemap hợp lệ, bản review chặn bot, `next` lạ bị bỏ, CSP trên trang bài.
- `pnpm security:dist` trên bản build có trang bài.
- Ảnh màn hình trang giới thiệu và một trang bài ở hai khổ, duyệt như mọi màn.
- Gate + build web + build release + E2E smoke (sửa spec giả định `/` → `/login`, không nới kiểm).
