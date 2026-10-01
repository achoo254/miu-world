---
title: Màn Khu vực theo mock và luồng tài khoản trên trang review
status: completed
created: 2026-10-01
branch: main
---

# Màn Khu vực theo mock + cập nhật luồng tài khoản trên trang review

Yêu cầu người sở hữu (01/10/2026): (1) ảnh "Luồng tài khoản phụ huynh → hồ sơ trẻ → chơi" trên trang review đã cũ, cập nhật lại; (2) màn Khu vực (`/region/:id`) giống mock màn 5 "Khu vực chi tiết – Khu rừng bí mật" (`designs/design-reference-miu-game-world-mockup.png`); thiết kế để thêm map/khu mới không phải viết nhiều code.

## Mock màn 5
Nền là cảnh 3D của chính khu đó, tràn màn hình. Trái: biển gỗ (tên khu, môn), bong bóng lời giới thiệu, thẻ "Hoàn thành: 4/12" có thanh tiến độ và rương, nút hồng "Khám phá ngay →". Phải: bảng giấy da viền gỗ "Các nhiệm vụ trong khu vực", mỗi dòng có tên, sao, mũi tên (chơi được) hoặc ổ khóa.

## Thiết kế dùng lại
- **Dữ liệu khu** (`content/world/regions.json`, schema `packages/schema/src/region.ts`): thêm `description` (lời trong bong bóng) và `backdrop` (góc máy `eye`, `target`, `fov` trên map của khu). Khu mới = thêm dữ liệu.
- **Shot `view:`** (`apps/web/src/game/debug/review-shots.ts`): góc máy bất kỳ qua URL, dùng cho mọi map; ẩn người chơi, giữ trời.
- **Generator `pnpm assets:regions`** (`tools/assets/render-region-art.ts`): render nền cho mọi khu có `backdrop` ra `generated/regions/<id>.png`, và icon rương từ `chest.glb` (Kenney Survival Kit) ra `generated/regions/chest.png`. Chạy lại khi map hay góc máy đổi.
- **UI** (`apps/web/src/ui/region/`): ghép từ phần tách riêng — `RegionBackdrop` (ảnh nền, không có thì trời), `RegionIntro` (biển gỗ `.ribbon`, bong bóng, thẻ tiến độ dùng `ProgressBar`, nút), `QuestBoard` (giấy da `.parchment`, nhóm theo chương, dòng nhiệm vụ). Kit thêm `StarRating`. Logic thuần (`regionProgress`, `recommendedQuest`) có test.
- Giữ hợp đồng: `region-quest-<id>` + `data-state`, `region-play-<id>`, `region-quest-textbook-<id>` (D13), tiêu đề "Chương N" (D6: liệt kê chương và mọi quest).

## Việc
| # | Việc | Tier | Trạng thái |
|---|---|---|---|
| 1 | Schema + dữ liệu khu (`description`, `backdrop`) | S | Done |
| 2 | Shot `view:` + generator `assets:regions` + ảnh sinh ra + `ui-art` | M | Done |
| 3 | Màn Khu vực theo mock (ngang: hai cột; dọc/điện thoại: xếp chồng) + test | M | Done (E2E `home`: 3 khổ màn, không tràn ngang) |
| 4 | E2E chụp luồng tài khoản mới (qua Home, Bản đồ, Khu vực), chú thích trang review, ảnh `review/ui` và `review/mvp` | S | Done (12 ảnh `review/ui`, 12 ảnh `review/mvp`) |
| 5 | Gate + web build + `e2e:ci`; docs cách thêm khu | S | Done (gate 77 file/556 test, `e2e:ci` 57/57, `security:dist` sạch; `docs/codebase-summary.md`) |

## Tiêu chí xong
- [x] Màn Khu vực có đủ các phần của mock trên nền cảnh 3D của khu; iPad ngang hai cột, iPad dọc và điện thoại xếp chồng, không tràn ngang
- [x] Thêm một khu mới chỉ cần dữ liệu trong `regions.json` + `pnpm assets:regions` (không sửa component)
- [x] Trang review: luồng tài khoản chụp lại đủ bước hiện tại, chú thích đúng
- [x] Gate, web build, `e2e:ci` xanh
