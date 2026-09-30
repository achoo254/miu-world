# Kiến trúc hệ thống

Kiến trúc đích: Master Plan v3 §7 (ứng dụng), §8 (multiplayer), §9 (an toàn), §10 (asset), §11 (data model). File này ghi ranh giới **hiện có** trong repo và sổ quyết định kỹ thuật đã chốt.

## Ranh giới hiện tại

Repo đã qua vertical slice MVP (`plans/dattqh/260929-2141-vertical-slice-mvp/`): một vòng chơi trọn vẹn ở Khu rừng bí mật chương 1, trên nền Foundation (pipeline asset, thư viện voxel, app web React + runtime Three.js, server API, cơ sở dữ liệu). Bảng dưới chỉ ghi phần đã có trong repo.

```
tools/assets/sources.json ─fetch─▶ assets/packs/<pack>/<ver>/ ─┐
content/*.json + seed ─generators─▶ assets/generated/ ─────────┼─manifest─▶ assets/manifest.json + LICENSES.md
                                                               │                 │
                                            pnpm assets:check ◀┘                 ▼
                                            (CI chặn)             apps/web (chỉ tải file có trong manifest)
                                                                        ▲
                                              packages/voxel (TS thuần: chunk, mesher, va chạm, phụ kiện)
```

| Ranh giới | Chủ sở hữu | Bất biến |
| --- | --- | --- |
| Nhập asset + license gate | `tools/assets/` | Mọi file dưới `assets/` có trong manifest, hash khớp, license trong allowlist, loại file trong allowlist, không symlink, trong ngân sách |
| Dữ liệu nội dung | `content/` | JSON validate bằng Zod; đổi dữ liệu để tạo biến thể, không sửa code |
| Sinh thế giới | `tools/world/` | Xác định theo seed; output chunk RLE + `entities.json` |
| Thư viện voxel | `packages/voxel/` | Không phụ thuộc `three` hay DOM; test được bằng Vitest thuần |
| Server API | `apps/server/` | Nghe loopback, sau proxy; mọi POST kiểm Origin; mọi route game lấy hồ sơ từ session và kiểm lại thuộc phụ huynh; thưởng chỉ lấy từ catalog quest, ghi ledger append-only (unique theo nguồn) + bảng tổng hợp trong một transaction. Server chấm đáp án; sai không ghi tiến độ, chỉ tăng bộ đếm theo bước (`step_attempts`: số lần sai, xem Hướng dẫn/Gợi ý/Đáp án; không nội dung trả lời, không dấu thời gian từng lần). Ba lớp hỗ trợ chỉ trả qua `POST …/support` để đếm. Sao và XP thực nhận (giảm 10% nếu đã xem Đáp án) tính một lần khi xong quest và lưu ở `quest_progress`. Rate limit theo hồ sơ + bước |
| Logic quest | `packages/quest/` | TS thuần; `completeStep`/`checkAnswer` chạy ở server (cần định nghĩa đủ, có đáp án); client chỉ dùng `nextStep`/level trên `QuestView` đã bỏ đáp án. Đáp án chỉ nằm trong `content/quests` phía server (ESLint cấm web import) |
| Runtime game | `apps/web/src/game/` | Loader và server dev/preview từ chối file ngoài manifest; build chỉ copy file runtime dùng; CSP không `unsafe-eval`; không import React |
| Bridge game → React | `apps/web/src/game-bridge/` | Chỉ event rời rạc; dữ liệu theo khung hình game ghi thẳng vào DOM neo. Mọi kiểu event/lệnh khai báo một chỗ (`game-store.ts`): `interaction-prompt`/`interaction` theo target, `loading-progress`, `error` (`context-lost`); lệnh `set-outfit`, `set-world-state`, `set-target-hint` |
| Controller quest phía web | `apps/web/src/ui/quest/` | Không trong runtime game: nhận `interaction {targetId}`, tìm bước hiện tại (`quest-flow.ts`, hàm thuần), mở màn (hội thoại, thử thách) hoặc gửi thẳng lên server; bước `auto` tự chạy; đẩy trạng thái thế giới và mũi tên chỉ hướng về game từ response server. Mất mạng: chặn + thử lại đúng lệnh đang chờ, không xếp hàng |
| Gate nội dung | `tools/content/check-content.ts` | Ngoài schema: target của quest `active` có trên map (`entities.json` v2), chữ quest/khu vực/vật phẩm gọi người chơi bằng `{name}` (không cứng "Miu"), quest active nằm trong khu vực mở (`content/world/regions.json`), vật phẩm được thưởng có mô tả (`content/items/`) |
| Chống lộ đáp án | `tools/security/scan-dist.ts` (`pnpm security:dist`, CI sau build) | Bundle web không chứa văn bản lớp Đáp án của quest; E2E `mvp-loop` kiểm mọi response API trừ `…/support` |

## Kiến trúc đích (đã chốt, đang hiện thực)

Nguồn: Master Plan v3 §7, §15 #16–#18.

- Client `apps/web`: Vite + React SPA (React Router) cho giao diện; runtime Three.js (WebGL2 chính, WebGPU tùy chọn) ở `apps/web/src/game`; `src/game-bridge` là store nối game → React (`useSyncExternalStore`). Game phát event rời rạc; React không điều khiển game loop và không nhận dữ liệu theo khung hình.
- Server `apps/server`: Node.js + Express 5 + TypeScript, API theo miền (auth, hồ sơ trẻ, nhân vật, quest, thưởng); là nguồn sự thật cho tiến độ, thưởng, mở khóa. Drizzle ORM trên PostgreSQL; PGlite cho dev và test; migration SQL sinh bằng drizzle-kit.
- `packages/quest`: TS thuần, tiến trình bước quest + chấm đáp án + tính thưởng + level; server dùng để chấm và ghi, web chỉ dùng phần không cần đáp án (bước tiếp theo, level) để hiển thị.
- `packages/schema`: Zod cho DTO API và schema nội dung, dùng chung web + server.
- Luồng: game phát event → React gửi hành động (đáp án hoặc target tìm được) → API server chấm, ghi DB, trả kết quả chuẩn → store → React.
- Realtime (chỉ giai đoạn MP): Colyseus hoặc `ws`, WebSocket qua server, mỗi khu vực một room; tách khỏi API nghiệp vụ.
- Triển khai: client qua static hosting + CDN; server tự host gần người dùng Việt Nam. Asset qua CDN với signed URL, CSP chặt, SRI.
- Quest/nội dung mô tả bằng dữ liệu có schema, không phụ thuộc cảnh Three.js.

## Sổ quyết định

| Quyết định | Lý do | Phương án bị loại |
| --- | --- | --- |
| Voxel 3D, bản đồ thiết kế sẵn | Asset dễ tạo bằng code/pack CC0; dễ gắn quest | Thế giới sinh ngẫu nhiên (khó gắn quest, khó kiểm soát nội dung) |
| Server-authoritative từ MVP | Chống gian lận; thêm multiplayer chỉ là thêm lớp realtime | Tính thưởng ở client |
| Asset lưu bằng git thường, có ngân sách dung lượng | Repo private còn nhỏ; git-lfs chưa cài | Git LFS ngay từ đầu (giữ làm phương án khi vượt ngân sách) |
| Hash pack theo trust-on-first-use | Pack không công bố hash; hash + license hiện trên trang review để người duyệt | Tin URL tải (hash động, đổi khi pack cập nhật) |
| Thư mục `assets/packs/`, `assets/generated/` | Hook của môi trường AI chặn đường dẫn chứa `vendor`/`build` | `assets/vendor/`, `assets/build/` |
| Allowlist loại file dưới `assets/` | Chặn mọi nội dung chủ động mà không phải liệt kê từng đuôi | Blocklist đuôi thực thi |
| Nhân vật ghép: rig + 27 anim Blocky Characters, đầu mèo nguyên khối Cube Pets, 4 anim xem thử keyframe bằng code | Không pack CC0 nào có mèo đứng 2 chân; Cube Pets không có mesh đầu riêng | Cube Pets nguyên bản (thú 4 chân, không vẫy tay được); nhân vật khối bằng code (giữ làm fallback) |
| Nhân vật gộp 1 skinned mesh | Cùng node/anim, rẻ hơn ngân sách ≤ 3 draw call | Tách nhiều mesh |
| Phụ kiện là lưới khối từ JSON, 1 draw call mỗi món | Đổi trang phục không cần artist; biến thể = đổi palette | Pack phụ kiện (không có cho thú khối) |
| Texture block: Kenney Voxel Pack tint theo palette, 1 atlas, padding 4 px extrude | Một material; không lem tile tới mip 3 | Texture sinh bằng noise (giữ làm fallback); padding 2 px |
| POC là app Vite độc lập + package `@miu/voxel` | Không chờ monorepo (task #3) | Dựng POC trong app thật |
| App web: Vite + React SPA, React Router | Game chạy hoàn toàn ở client; static hosting + CDN; CSP chặt không cần nonce; dùng lại hạ tầng POC (worker, E2E) | Next.js App Router, Next.js static export (SSR/SEO không cần cho phần game) |
| Nối React–Three.js bằng bridge tự viết (event → store → `useSyncExternalStore`) | Runtime không phụ thuộc React; React không render theo khung hình | React Three Fiber |
| Drizzle + PostgreSQL; PGlite cho dev/test, PostgreSQL thật trong CI | Máy dev không có Docker/psql; CI bắt khác biệt PGlite/Postgres | Prisma; SQLite cho dev |
| Logic quest/thưởng trong `packages/quest` (TS thuần) | Server tính lại bằng cùng logic client dùng để dự đoán; quest không phụ thuộc Three.js | Logic quest trong runtime game |
| Phụ huynh đăng nhập bằng Google OAuth (code + PKCE phía server, scope `openid email`); lần đầu đặt PIN; PIN khóa thì mở bằng đăng nhập Google lại | Không phải lưu mật khẩu, email đã xác minh; không script bên thứ ba (người sở hữu yêu cầu, chi tiết do Jev quyết 2026-09-29: `plans/dattqh/reports/jev-260929-google-oauth-decisions.md`) | Email + mật khẩu (giữ cho dev/test); Google Identity Services JS (script bên thứ ba) |
| Session phía server, cookie httpOnly; mật khẩu và PIN băm bằng `node:crypto` scrypt | Không thêm dependency băm; thu hồi session được | JWT không trạng thái; bcrypt/argon2 (thêm native dependency) |
| POC chỉ dùng pack Kenney; KayKit sau POC | KayKit cần tải tay từ itch.io | Đưa KayKit vào POC |
| Va chạm AABB theo lưới tự viết | Không cần WASM, CSP không phải mở `wasm-unsafe-eval` | Rapier (chỉ khi có vật thể động) |
| Greedy meshing trong Web Worker, fallback main thread lúc tải | Voxel sinh nhiều bề mặt — rủi ro hiệu năng số một | Mesh trên main thread trong vòng lặp |
| Đo hiệu năng: giả lập CPU 4×/6× khi phát triển; máy chuẩn iPad Gen 10 (Low/Mid/High) để chốt gate trước nghiệm thu MVP | Người sở hữu chốt (2026-09-29); giả lập không đo GPU mobile, nhiệt, pin; số đo PC không đại diện mobile | Bộ 2 Android tầm trung + 1 iPhone đời cũ (thay bằng máy chuẩn); đo đủ máy ngay ở POC |

Bằng chứng và số đo: `plans/dattqh/reports/poc-review-260929.md`, `plans/dattqh/reports/code-reviewer-260929-1601-asset-poc-review.md`.

## Bảo mật và an toàn trẻ em

Bảng rủi ro và yêu cầu theo giai đoạn: Master Plan v3 §9. Những gì đã áp dụng trong repo: license gate trong CI, runtime chỉ tải file có trong manifest, không request ngoài origin (kiểm bằng E2E), CSP không `unsafe-eval`, `X-Content-Type-Options: nosniff` khi phục vụ asset.
