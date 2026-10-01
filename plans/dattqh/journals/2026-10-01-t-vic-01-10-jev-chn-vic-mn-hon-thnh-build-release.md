---
title: "Đợt việc 01/10: Jev chọn việc, màn hoàn thành, build release"
date: 2026-10-01
summary: Bốn việc do Jev chọn đã xong và gate xanh; deploy staging bị chặn vì VPN lab rớt
---

# Đợt việc 01/10: Jev chọn việc, màn hoàn thành, build release

## What happened
- Kéo `main` lên `7b402b8`, rồi giao Jev (jev-1.13.0) chọn việc theo từng câu "làm ngay / để sau". Report: `plans/dattqh/reports/jev-261001-0815-next-batch.md`; plan: `plans/dattqh/261001-0815-next-batch/`.
- Đời sống rừng: runtime đạt cả 7 tiêu chí, không phải sửa. E2E `forest-life` thêm ba kiểm tra: lời chào có tên bé, draw call ≤ 150 ở mức low, im khi có lời nhắc quest. Ảnh nằm ở `evidence/` của plan rừng.
- Màn hoàn thành: NPC nói cuối và nhân vật của bé ăn mừng, sao đạt sáng lần lượt kèm tiếng, XP và xu đếm lên, ẩn thưởng bằng 0, hỗ trợ reduced motion. Trình đọc màn hình đọc số cuối.
- Thêm `build:release` (`vite build --mode release`) cho production: bỏ trang review/preview và ảnh review, chỉ giữ chân dung nhân vật mà UI dùng. Bản build còn 8,6 MB thay vì 19 MB; `deploy.sh` production dừng nếu `dist` còn trang review.
- Kiểm sở hữu trang phục: câu hỏi gửi Jev đặt trên mô tả sai ("chỉ kiểm catalog"). Thực tế server đã kiểm `unlock` theo level/quest, nên không viết code; chỉ sửa mục nợ trong roadmap.
- Review độc lập: 0 Critical/High, 3 Medium, 7 Low. Đã sửa M1 (thụt lề `vite.config.ts` hỏng vì script khớp nhầm `return {`), M3 (sao chưa đạt cũng nảy), L1, L2, L5, L6, L7. M2 và L4 sửa một phần.

## Lessons
- Đọc code trước khi mô tả hiện trạng cho Jev: một câu đầu vào sai suýt kéo theo code cho trường hợp chưa tồn tại.
- Sửa file bằng script tìm-thay phải neo vào chuỗi duy nhất, rồi đọc lại diff.

## Verification
Gate 5 lệnh (75 file / 550 test); `e2e:ci` 54/54 (16 project) trên commit cuối; `security:dist` sạch; E2E trên bản release 31/31.

## Next steps
- Bật lại VPN lab, chạy `MIU_RELEASE_REV=$(git rev-parse --short HEAD) tools/deploy/staging/deploy.sh release`, rồi xóa cache Cloudflare cho các asset đổi kể từ `299ce5d`.
- Push `main` sau khi quét secret.
- Sau đó: KTX2 (chờ đo iPad), SGK phase 9 (chờ người sở hữu duyệt quest mẫu).

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
