---
title: Đợt việc 01/10 — kiểm nghiệm đời sống rừng, màn hoàn thành, gọn bản phát hành, kiểm sở hữu trang phục
status: in-progress
created: 2026-10-01
branch: main
---

# Đợt việc 01/10

Quyết định: Jev, `../reports/jev-261001-0815-next-batch.md`. Làm tuần tự trên `main`; mỗi việc chạy gate và commit riêng. Cuối đợt deploy staging.

| # | Việc | Tier | File chính | Trạng thái |
|---|---|---|---|---|
| 1 | Kiểm nghiệm đời sống rừng theo 7 tiêu chí của `../260930-2115-forest-ambient-life/plan.md`; sửa chỗ chưa đạt, tick plan đó, thêm ảnh review | M | `apps/web/src/game/ambient/**`, plan rừng, trang review | Done (không cần sửa runtime; E2E siết thêm 3 kiểm tra, ảnh ở `evidence/` của plan rừng) |
| 2 | Màn hoàn thành theo trình tự (quyết định `sequence` của Jev 30/09): sao hiện lần lượt, XP và xu đếm lên, NPC và nhân vật ăn mừng, ẩn thưởng bằng 0; tôn trọng `prefers-reduced-motion`. Đóng mục 7 của `../260930-1645-scene-ui-richness/plan.md` | S | `apps/web/src/ui/rewards/**` | Pending |
| 3 | Tách `review.html`, `preview.html` và ảnh review khỏi bản build phát hành; vẫn dùng được khi dev và trong bản review | M | `apps/web/vite.config.ts`, script build, `docs/` | Pending |
| 4 | `PUT /api/character` kiểm trẻ đã sở hữu hoặc đã mở khóa từng trang phục được chọn (không chỉ có trong catalog) | S | `apps/server/src/character/**` (+ test) | Pending |
| 5 | Gate đủ 5 lệnh + web build + `e2e:ci` + `security:dist`; deploy `main` lên staging theo `docs/deployment-guide.md` §5; cập nhật roadmap (nợ đã biết) | S | `docs/project-roadmap.md` | Pending |

## Tiêu chí xong
- [ ] Đủ 7 tiêu chí của plan đời sống rừng được kiểm trên game đang chạy, có bằng chứng (số draw call từng mức chất lượng, ảnh review)
- [ ] Màn hoàn thành hiện thưởng theo trình tự, có test đơn vị và E2E vẫn xanh; plan scene-ui-richness đóng
- [ ] `apps/web/dist` của bản phát hành không chứa `review.html`, `preview.html` hay ảnh review; trang review vẫn mở được khi dev
- [ ] Chọn trang phục chưa mở khóa bị server từ chối; có test
- [ ] Gate (`assets:check`, `content:check`, `test`, `typecheck`, `lint`), web build, `e2e:ci`, `security:dist` xanh
- [ ] Staging chạy commit cuối đợt, `/api/health` ok

## Không làm trong đợt này
- Nén atlas KTX2: chờ số đo iPad thật.
- SGK phase 9: chờ người sở hữu nghiệm thu quest mẫu.
