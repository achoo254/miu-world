---
title: "Sửa nốt và đóng gói nghiệm thu giai đoạn"
description: "Dừng tính năng mới; sửa các lỗi còn tồn, release, rồi gom nghiệm thu giai đoạn 29/09–19/10/2026 để chuyển sang marketing."
status: in-progress
priority: P1
effort: M
branch: main
tags: [fix, ui, ops, acceptance]
blockedBy: []
blocks: []
created: 2026-10-19
---

# Sửa nốt và đóng gói nghiệm thu giai đoạn

## Kết quả mong muốn

Người sở hữu (19/10/2026): người chơi còn quá ít, nên dừng tính năng mới, tập trung marketing; sửa nốt những gì cần sửa rồi đóng gói nghiệm thu. Xong plan này: không còn lỗi đã biết nào trong phạm vi chọn, production chạy bản đã sửa, và có một bộ nghiệm thu giai đoạn để người sở hữu duyệt một lần.

## Không làm

- Không tính năng mới: chuyện NPC đợt 2b, mobile app, giới hạn người chơi, cơ chế mới.
- Không đổi nguyên nhân ở chương 3 của Nai (Jev 0,88: phải đổi vật trên map và sinh lại Khu rừng).

## Quyết định (Jev, 19/10/2026, đều tự quyết)

Sửa `deploy.sh setup` giữ dòng env (0,94); lỗi giao diện chính (0,92); ghi chú nhỏ còn tồn (0,83); thêm màn vào bộ chụp ảnh (0,97).

## Các pha

| # | Pha | Nội dung | Trạng thái |
|---|---|---|---|
| 1 | Vận hành | `tools/deploy/production/deploy.sh setup` giữ các dòng `MODERATOR_ACCOUNTS`, `TIMETABLE_DEFAULT_ACCOUNTS` (và các dòng tùy chọn khác do người đặt) thay vì xóa | pending |
| 2 | Giao diện chính | Hàng tiêu đề gọn ở màn luyện Olympic trên điện thoại (nút quay lại luôn thấy, không che câu hỏi, "1/10" vẫn hiện); tên chương trên thẻ nhiệm vụ điện thoại không bị cắt giữa chừng; phép tính không xuống dòng giữa biểu thức; bong bóng thoại và nhãn ở cảnh tổ đội không chồng; biểu tượng riêng cho "Rêu xanh cổ thụ" | completed |
| 3 | Ghi chú nhỏ | Thú cưng bị bảng che (điện thoại), mũi tên vàng ló ra ở màn chăm sóc, ảnh đại diện chạm dòng tên chương, vệt mờ dưới "Đăng xuất", link "Về trang chủ" nhỏ, chữ màn sau lộ dưới bảng sự kiện, nhãn Vẹt đè đầu nhân vật | completed |
| 4 | Bộ chụp ảnh | Thêm thông báo khi tắt online, màn `/kiem-duyet`, và một bước câu đố có manh mối vào `apps/web/e2e/screens.spec.ts` | completed ([report](../reports/screens-coverage-261019.md)) |
| 5 | Release | CI xanh, chụp và duyệt ảnh, người sở hữu duyệt release | pending |
| 6 | Nghiệm thu giai đoạn | Report tổng giai đoạn 29/09–19/10/2026 và mục "Nghiệm thu giai đoạn" trên trang review: đã giao gì, bằng chứng (CI, ảnh, audit, bảo mật, hiệu năng), việc còn chờ người, đề xuất marketing kế tiếp | pending |

Pha 2 và 3 sửa cùng vùng UI nên một người làm; pha 4 chỉ sửa spec chụp ảnh. Trên máy dev chỉ chạy `assets:check`, `content:check`, `typecheck`, `lint` và đúng file test liên quan; bộ đầy đủ, build web, E2E chạy trên CI.

## Tiêu chí xong

- Lần duyệt ảnh trước release không còn các ghi chú đã chọn sửa (đối chiếu `assets/generated/review/screens/review.json`).
- Chạy `deploy.sh setup` không làm mất dòng env do người đặt (kiểm bằng test hoặc đọc script với tệp env mẫu).
- CI xanh; production chạy bản mới; report nghiệm thu được người sở hữu đọc.
