---
title: Đợt việc 01/10 — kiểm nghiệm đời sống rừng, màn hoàn thành, gọn bản phát hành, kiểm sở hữu trang phục
status: completed
created: 2026-10-01
branch: main
---

# Đợt việc 01/10

Quyết định: Jev, `../reports/jev-261001-0815-next-batch.md`. Làm tuần tự trên `main`; mỗi việc chạy gate và commit riêng. Cuối đợt deploy staging.

| # | Việc | Tier | File chính | Trạng thái |
|---|---|---|---|---|
| 1 | Kiểm nghiệm đời sống rừng theo 7 tiêu chí của `../260930-2115-forest-ambient-life/plan.md`; sửa chỗ chưa đạt, tick plan đó, thêm ảnh review | M | `apps/web/src/game/ambient/**`, plan rừng, trang review | Done (không cần sửa runtime; E2E siết thêm 3 kiểm tra, ảnh ở `evidence/` của plan rừng) |
| 2 | Màn hoàn thành theo trình tự (quyết định `sequence` của Jev 30/09): sao hiện lần lượt, XP và xu đếm lên, NPC và nhân vật ăn mừng, ẩn thưởng bằng 0; tôn trọng `prefers-reduced-motion`. Đóng mục 7 của `../260930-1645-scene-ui-richness/plan.md` | S | `apps/web/src/ui/rewards/**` | Done (test đơn vị 9/9, E2E `quest-flow` + `challenges` + `mvp-loop` 7/7, ảnh review MVP chụp lại) |
| 3 | Tách `review.html`, `preview.html` và ảnh review khỏi bản build phát hành; vẫn dùng được khi dev và trong bản review | M | `apps/web/vite.config.ts`, script build, `docs/` | Done (`build:release` cho production: 8,6 MB thay vì 19 MB; staging/E2E giữ trang review; E2E 31/31 trên bản release) |
| 4 | `PUT /api/character` kiểm trẻ đã sở hữu hoặc đã mở khóa từng trang phục được chọn (không chỉ có trong catalog) | S | `apps/server/src/character/**` (+ test) | Không cần làm: server đã kiểm `unlock` level/quest (403 `equipment-locked`, test 6/6); chưa có trang phục là vật phẩm túi đồ. Câu hỏi gửi Jev dựa trên mô tả sai ("chỉ kiểm catalog"); đã sửa mục nợ trong roadmap |
| 5 | Gate đủ 5 lệnh + web build + `e2e:ci` + `security:dist`; deploy `main` lên staging theo `docs/deployment-guide.md` §5; cập nhật roadmap (nợ đã biết) | S | `docs/project-roadmap.md` | Gate, web build, `e2e:ci` 54/54, `security:dist` xanh; roadmap đã sửa. Staging chạy `1c52796` (deploy 01/10 09:0x sau khi VPN lab nối lại; lần đầu SSH timeout vì VPN rớt); đã xóa cache Cloudflare 16 asset đổi, sha256 khớp 16/16, `review.html` 200 |

## Tiêu chí xong
- [x] Đủ 7 tiêu chí của plan đời sống rừng được kiểm trên game đang chạy, có bằng chứng (số draw call từng mức chất lượng, ảnh review)
- [x] Màn hoàn thành hiện thưởng theo trình tự, có test đơn vị và E2E vẫn xanh; plan scene-ui-richness đóng
- [x] `apps/web/dist` của bản phát hành không chứa `review.html`, `preview.html` hay ảnh review; trang review vẫn mở được khi dev
- [x] Chọn trang phục chưa mở khóa bị server từ chối; có test (đã có từ trước)
- [x] Gate (`assets:check`, `content:check`, `test`, `typecheck`, `lint`), web build, `e2e:ci`, `security:dist` xanh
- [x] Staging chạy commit cuối đợt, `/api/health` ok

## Không làm trong đợt này
- Nén atlas KTX2: chờ số đo iPad thật.
- SGK phase 9: chờ người sở hữu nghiệm thu quest mẫu.
