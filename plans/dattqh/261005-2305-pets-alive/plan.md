---
title: "Thú cưng sống động: chăm sóc trong thế giới, phản ứng, trò, phụ kiện"
description: "Làm giàu thú cưng theo góp ý người sở hữu 05/10/2026: cảnh chăm sóc 3D, thú phản ứng với bé, bảng chăm sóc theo mock, cấp và trò, phụ kiện, ổ ở nhà, đánh hơi giúp tìm đồ."
status: completed
priority: P1
tier: L
branch: main
tags: [web, game, server, content]
created: 2026-10-05
---

# Thú cưng sống động

**Trạng thái:** xong phần tự động cả 6 pha (06/10/2026), chờ duyệt và deploy (migration `0020_pet-bonds`); report `plans/dattqh/reports/pets-alive-261006.md` · **Tier:** L
**Nguồn:** người sở hữu (05/10/2026, ảnh bảng chăm sóc): "các tính năng, hoạt cảnh, hấp dẫn liên quan thú cưng còn đơn giản không có thu hút". Lỗi câu "chưa thấy gì lạ" khi chạm thú cưng đã sửa (commit `bc16c8c2`). Quyết định: Jev (`reports/jev-261005-2305-pets-{input,output}.json`).

## Hiện trạng (05/10/2026)

- 50 loài (`content/pets.json`); thú đi theo bé với clip `idle/walk/run/dance` của model (`apps/web/src/game/entities/pet-companion.ts`), nhảy múa khi bé ăn mừng.
- Bảng chăm sóc (`apps/web/src/ui/pet-care/pet-care-panel.tsx`) là hộp trắng, biểu tượng dấu chân chung (không phải hình con thú), 3 thanh (vui, no, sạch), 4 nút chỉ đổi số ở server; trong thế giới không có gì xảy ra.
- Cửa hàng đã bán thức ăn và đồ chơi thú cưng; có trang trí nhà, nấu ăn, thành tích.

## Quyết định (Jev, 05/10/2026)

| Câu | Chọn | Độ tin |
| --- | --- | --- |
| Đợt 1 | Cảnh chăm sóc trong thế giới, phản ứng với bé, bảng theo mock có hình con thú; cấp thú mở trò (ngồi, xoay, nhảy, lăn, đập tay) bé gọi được; phụ kiện thú từ cửa hàng; ổ thú ở nhà | 0.57 |
| Giúp làm nhiệm vụ | Ở bước tìm đồ, thú đánh hơi rồi chạy vài bước về phía món chưa tìm (gợi ý nhẹ, không bao giờ là đáp án câu hỏi) | 0.47 |
| Chỉ số theo thời gian | Giảm chậm khi vắng mặt nhưng không xuống dưới mức vui vẻ; thú không buồn, không ốm, không mất, không bị lấy gì | 0.96 |

## Pha

| Pha | Tier | Nội dung |
| --- | --- | --- |
| 1 | M | Bảng chăm sóc theo mock cảnh (không hộp trắng), hình và tên con thú, hoạt cảnh khi bấm từng nút; đặt tên chọn từ danh sách |
| 2 | L | Cảnh chăm sóc trong thế giới (bát ăn hiện ra và thú ăn có vụn, bong bóng khi tắm, bóng để ném và thú nhặt về, tim khi vuốt ve, ngủ trưa có zzz); thú phản ứng với bé (mừng khi xong quest, chào khi bé quay lại, ngồi khi bé ngồi, chơi quanh bé); động tác thêm bằng code nếu model thiếu clip |
| 3 | M | Cấp thú (server tính từ chăm sóc và đi cùng), mở trò bé gọi được qua menu; chỉ số giảm chậm theo thời gian có sàn vui vẻ |
| 4 | M | Phụ kiện thú trong cửa hàng (mũ, nơ, vòng cổ dùng lại art có sẵn hoặc sinh bằng code), ổ thú trong trang trí nhà; người chơi khác thấy phụ kiện thú (giao thức online sẵn có) |
| 5 | S | Thú đánh hơi ở bước tìm đồ/tìm vật: chạy vài bước về món gần nhất chưa tìm, có thời gian chờ để không lộ hết |
| 6 | S | Kiểm tra: unit test chỉ số/cấp/trò ở server (IDOR, chống gian lận, gọi lặp), test UI, E2E chăm sóc một vòng; tài liệu, trang review |

## Tiêu chí xong

- Mỗi nút chăm sóc có cảnh trong thế giới và hoạt cảnh của thú; không nút nào chỉ đổi số.
- Thú phản ứng ít nhất 4 tình huống của bé; có ít nhất 5 trò mở theo cấp.
- Gate 5 lệnh, build web, `security:dist`, E2E liên quan; deploy production khi người sở hữu cho phép.
