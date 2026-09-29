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
| #1 | Chốt quyết định còn mở (§15) | Đang chờ người sở hữu — 6 mục mở | Master Plan §15 |
| #2 | Sửa plan, `CLAUDE.md`, cấu trúc repo | Có `CLAUDE.md`, `.claude/rules/`, `docs/`; chờ người duyệt | File ở gốc repo |
| #5 | Tìm nguồn asset + license gate | Hoàn thành (Đã qua gate review) | `plans/dattqh/260929-0842-asset-sourcing-and-voxel-poc/` |
| #6 | POC voxel | Hoàn thành (Đã qua gate review, chốt chỉnh visual) | `plans/dattqh/reports/poc-review-260929.md` |

## Gate kế tiếp

- **Gate POC (Đã qua - 2026-09-29):** Đã duyệt với kết quả: giữ kiến trúc kitbash/generator/mesher, chuyển sang tinh chỉnh visual (nhân vật chibi, palette phụ kiện & block); dời chốt số liệu hiệu năng sang đo máy thật trước nghiệm thu MVP (máy chuẩn: iPad Gen 10, chốt 2026-09-29).
- **Gate kế tiếp (Platform & Core Foundation):** Thiết lập Monorepo (Next.js + Express + shared schemas), hệ thống Child Safety/Auth tài khoản phụ huynh (Zero Trust), và tích hợp package voxel.

## Nợ đã biết (trước nghiệm thu MVP)

- Đo trên máy chuẩn iPad Gen 10 ở Low/Mid/High (FPS, nhiệt, pin sau 15 phút).
- Nén atlas KTX2 (task #21).
- Build app thật chỉ copy file runtime thực dùng (POC đang copy toàn bộ manifest vào `dist/`) — task #3.
- Đưa KayKit vào (chế độ tải tay đã hỗ trợ).
