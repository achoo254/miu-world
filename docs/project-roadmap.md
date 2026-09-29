# Lộ trình

**Đây là ý định, không phải hành vi đã giao.** Nguồn: Master Plan v3 §13 (vertical slice, phase, gate), §14 (backlog P0 24 việc), §16 (tiêu chí nghiệm thu MVP). Phase sau chỉ bắt đầu khi gate của phase trước đạt; chưa có ngày cụ thể.

## Giai đoạn

| Giai đoạn | Phạm vi |
| --- | --- |
| POC | Chứng minh hướng asset không tự vẽ và hiệu năng voxel trên mobile |
| MVP | Vertical slice: Home Base + Khu rừng bí mật chương 1, Mèo, một quest trọn vòng, server tính thưởng, tài khoản phụ huynh |
| V1 | Trường học, Thư viện, Lâu đài; Thỏ, Cáo, Gấu; skill check, boss; cửa hàng |
| Live World | Sự kiện có thời hạn (cổng TIMO) |
| MP | Multiplayer theo 3 bậc; bậc 1 (thấy nhau) chỉ mở khi có báo cáo/chặn và phụ huynh bật được |

## Trạng thái backlog P0

Chỉ ghi task đã bắt đầu; các task còn lại đang ở trạng thái chưa làm theo thứ tự Master Plan §14. Cập nhật bảng này khi một task đổi trạng thái.

| Task | Nội dung | Trạng thái | Bằng chứng |
| --- | --- | --- | --- |
| #1 | Chốt quyết định còn mở (§15) | Hoàn thành (2026-09-29) | Master Plan §15 #3–#8, #16–#18 |
| #2 | Sửa plan, `CLAUDE.md`, cấu trúc repo | Đang làm — docs/rules đồng bộ Master Plan; cấu trúc `apps/web`, `apps/server` đang dựng | `plans/dattqh/260929-1911-foundation-after-poc-gate/` |
| #3, #7, #8, #9, #12 | Monorepo, tài khoản phụ huynh, API nhân vật, Miu chibi, palette | Đang làm | như trên |
| #5 | Tìm nguồn asset + license gate | Hoàn thành (Đã qua gate review) | `plans/dattqh/260929-0842-asset-sourcing-and-voxel-poc/` |
| #6 | POC voxel | Hoàn thành (Đã qua gate review, chốt chỉnh visual) | `plans/dattqh/reports/poc-review-260929.md` |

## Mã ổn định ↔ task Master Plan

Mã chỉ dùng trong plan và roadmap, không dùng trong code, tên test, commit.

| Mã | Nội dung | Task §14 |
| --- | --- | --- |
| DOCS-01 | Đồng bộ Master Plan, `docs/`, `.claude/rules/`, `CLAUDE.md`, README | #1, #2 |
| FOUNDATION-01 | Monorepo: `apps/web` Vite + React, `apps/server` Express, `packages/schema`, CI thêm `pnpm audit` + SAST | #3 |
| FOUNDATION-02 | Tài khoản phụ huynh, hồ sơ trẻ, cổng phụ huynh, đồng ý | #7 |
| FOUNDATION-03 | Schema dùng chung (Zod) + database | #3, #8, #15 |
| FOUNDATION-04 | Data model + API nhân vật, tiến độ, thưởng tối thiểu | #8, #19 (phần server) |
| ENGINE-01 | Runtime POC vào `apps/web/src/game`, game-bridge, chuyển trang review, xóa `apps/poc-voxel` | #11, #13 (phần nền) |
| VISUAL-01..03 | Miu chibi, phụ kiện, palette block | #9, #12 |
| SLICE-01..11 | Creator, Home + HUD, map rừng, di chuyển, NPC, quest runtime, khám phá, 3 thử thách Toán, hỗ trợ học, thưởng/Level Up, ba lô | #10–#20 |
| DEVICE-01 | Đo trên máy chuẩn iPad Gen 10 ở Low/Mid/High (FPS, nhiệt, pin 15 phút) | §12, §16 |

## Gate kế tiếp

- **Gate POC (Đã qua - 2026-09-29):** Đã duyệt với kết quả: giữ kiến trúc kitbash/generator/mesher, chuyển sang tinh chỉnh visual (nhân vật chibi, palette phụ kiện & block); dời chốt số liệu hiệu năng sang đo máy thật trước nghiệm thu MVP (máy chuẩn: iPad Gen 10, chốt 2026-09-29).
- **Gate kế tiếp (Foundation):** plan `plans/dattqh/260929-1911-foundation-after-poc-gate/` — monorepo Vite + React / Express / Drizzle, tài khoản phụ huynh + hồ sơ trẻ, API nhân vật-tiến độ-thưởng, Miu chibi + palette, runtime vào `apps/web`; kết thúc bằng một trang review.

## Nợ đã biết (trước nghiệm thu MVP)

- Đo trên máy chuẩn iPad Gen 10 ở Low/Mid/High (FPS, nhiệt, pin sau 15 phút).
- Nén atlas KTX2 (task #21).
- Triển khai server: bước bundle production (hiện `start` chạy bằng `tsx`); cấu hình `trust proxy` đúng với reverse proxy thật, nếu không rate limit gộp mọi người vào một khóa IP.
- Đăng ký trả `email-taken` nên lộ email đã có tài khoản; cân nhắc lại khi có xác minh email.
- Khi phụ kiện trở thành phần thưởng: `PUT /api/character` phải kiểm sở hữu qua túi đồ (hiện chỉ kiểm catalog).
- Tách trang review/preview và ảnh review khỏi bản build phát hành (hiện build gồm cả ~5 MB ảnh review).
- Xác minh email phụ huynh (cần nhà cung cấp email, DNS) và pháp chế duyệt văn bản đồng ý — trước khi có người dùng thật.
- Đưa KayKit vào (chế độ tải tay đã hỗ trợ).
