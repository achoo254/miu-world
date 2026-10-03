# Jev: thời khóa biểu và lời đồng ý (03/10/2026 13:40)

Mô hình `jev-1.13.0`. Thời khóa biểu theo hồ sơ (môn, đồng phục, tùy chọn trường/lớp/GVCN, chữ tự gõ) trái với lời đồng ý v1 ("không thu thập … trường, tuổi hay lớp") và trang chính sách ("Bé không bao giờ tự gõ chữ"). Người sở hữu đã giao các quyết định loại này cho Jev; lựa chọn của Jev được dùng cả khi escalate.

| Câu | Lựa chọn | Xác suất | Quyết |
| --- | --- | --- | --- |
| Thời khóa biểu và lời đồng ý | **update-policy-reconsent**: giữ tính năng; viết lại lời đồng ý và chính sách (chữ tự gõ chỉ ở thời khóa biểu, mặc định trống, chỉ hồ sơ đó xem, không chia sẻ, xóa theo hồ sơ); nâng phiên bản lên v2 để phụ huynh đồng ý lại | update-policy-reconsent 0,91 · periods-only-server 0,06 · header-on-device 0,03 · keep-texts 0,00 | escalate (0,88) |

Đã làm: `content/legal/consent-vi.json` v2, `content/legal/privacy-vi.json` (cập nhật 03/10/2026, `consentVersion` v2), dòng dữ liệu trẻ trong `.claude/rules/server-and-child-safety.md`.
