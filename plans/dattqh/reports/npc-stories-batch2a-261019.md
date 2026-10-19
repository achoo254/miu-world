# Chuyện riêng của nhân vật, đợt 2a (19/10/2026)

Plan: `plans/dattqh/261019-1057-npc-stories-batch-2a/plan.md`. Quyết định qua Jev: làm chuyện NPC trước (0,70), thêm 2 mạch mỗi map (0,57), làm cả 12 map trong một đợt, mỗi lần một map (0,99).

## Kết quả

Mỗi map trong mười hai map có 4 mạch chuyện riêng (trước đợt: 10 map có 2 mạch, Trung tâm và Nông trại có 3). Tổng hiện có 48 mạch, 170 chương.

| Nhóm | Map | Mạch mới | Chương | Bước | Vật mới trên map | Report |
| --- | --- | --- | --- | --- | --- | --- |
| A | Nhà của bé, Trung tâm, Khu rừng bí mật, Trường học | 7 | 25 | 185 | 154 | `npc-stories-batch2a-group-a-261019.md` |
| B | Làng ven sông, Xóm mái ấm, Chợ phiên, Nông trại | 7 | 26 | 208 | 159 | `npc-stories-batch2a-group-b-261019.md` |
| C | Thư viện, Lâu đài, Núi tuyết, Đảo bí ẩn | 8 | 29 | 232 | 164 | `npc-stories-batch2a-group-c-261019.md` |
| **Tổng** | 12 map | **22** | **80** | **625** | **477** | |

Mỗi chương có ít nhất 4 nơi, 3–4 cơ chế ngoài trắc nghiệm, 7 câu hỏi có ba lớp Hướng dẫn · Gợi ý · Đáp án và phản hồi, thư sau chương (mạch nào cũng có thư từ nhân vật map khác), tiếng Anh, `{name}`, đánh dấu `teacher-pending`. Nỗi sợ chỉ kể từ chương 3 trái tim, bí mật chỉ ở chương 4 trái tim. Vật mới dùng lại model có sẵn, không thêm hình.

## Thay đổi so với plan

- Bà Gấu Nâu (Xóm mái ấm), Gấu Trúc Tròn (Thư viện) và Hươu Cao (Lâu đài) là người dẫn đường: họ chỉ có mặt ở một số chương bài học, mà luật nội dung đòi người kể chuyện luôn có trong thế giới. Thay bằng nhân vật khác chưa có mạch.
- Sửa test `bot-flow` (`f95e9ea2`): test chỉ xanh nhờ seed 2 trúng một lượt chọn hiếm; vị trí mới trên map Trường học làm mất lượt đó (`plans/dattqh/reports/debug-bot-flow-map-regen-261019.md`).

## Review

Đọc chọn mẫu cả 80 chương (`review-npc-stories-batch2a-261019.md`): không có đáp án sai hay nội dung không hợp trẻ em. Một câu đố không giải được (manh mối nằm ở chỗ màn chơi không hiện) và các mục nên sửa (5 mê cung dùng chung một lưới, lời dẫn mê cung không khớp hình, một lời giải thích sai, lỗi liền mạch truyện, lặp số và lặp ý) đã sửa ở `d44d8bd6` và `18136d0d` (`fix-npc-stories-batch2a-review-261019.md`). Theo Jev: màn chơi giờ hiện manh mối ở mọi dạng câu đố (sửa luôn 9 quest cũ) kèm luật `content:check` mới (0,90); 5 lá thư viết lại trung tính, không đổi server (0,96).

## Kiểm tra

- Trên máy (theo `CLAUDE.md`, không chạy bộ đầy đủ, build web, E2E): `assets:check`, `content:check` (2.151 file), `typecheck`, `lint` xanh; các file test liên quan của từng nhóm xanh; mỗi map sinh lại có 4 audit sạch và lưới đi bộ mới.
- CI: `a2d6a3e0` đỏ ở `bot-flow` (đã sửa ở `f95e9ea2`); `f95e9ea2`, `13361bf4`, `a31d1baf` xanh mọi job (gồm E2E và Postgres).

## Chưa làm

- Chưa lên production: cần chụp, duyệt ảnh màn hình và người sở hữu duyệt release.
- Đợt 2b (lên ít nhất 6 mạch mỗi map): nên đổi khuôn mở chương "tìm 3 món" và quyết định luôn 3 phương án (review gợi ý); người dẫn đường muốn có mạch thì cần cho họ một minigame hoặc nới luật "người kể luôn có mặt".
- Chương 3 của Nai: nỗi sợ đã gỡ nhưng nguyên nhân vẫn là đèn lều sáng, vì vật trên map là chụp đèn; đổi sang mưa/sương cần đổi vật và sinh lại Khu rừng.
