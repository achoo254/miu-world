---
phase: 6
title: "Final Review + Go/No-Go Gate"
status: in-progress
priority: P1
effort: "S"
dependencies: [5]
---

# Phase 6: Final Review + Go/No-Go Gate
<!-- Updated: Validation Session 1 - đo giả lập + 1 máy thật lúc duyệt cuối; đo đủ 3 máy dời tới trước nghiệm thu MVP -->

## Overview
Điểm chạm duy nhất của người duyệt trong plan này: xem gallery `review.html`, chơi thử POC trên desktop và 1 máy Android tầm trung, rồi chốt gate đi tiếp hay điều chỉnh hướng asset. AI chuẩn bị mọi thứ và cập nhật Master Plan v3.

## Requirements
- Functional:
  - AI build + serve bản review trên LAN ở port cố định (HTTPS nếu trình duyệt đòi), gửi URL; tắt server sau khi duyệt.
  - AI tổng hợp `perf.json` (giả lập CPU 4×/6×) so với ngân sách §12 thành report.
  - Người duyệt: xem gallery, mở POC trên 1 máy Android tầm trung đọc overlay FPS, chốt: giữ / chỉnh / fallback cho nhân vật, phụ kiện, bản đồ.
- Non-functional: số liệu ghi thực; ghi rõ giới hạn — giả lập không đo nhiệt/pin, GPU mobile thật chỉ có 1 điểm dữ liệu.

## Related Code Files
- Create: `plans/dattqh/reports/poc-review-<date>.md`
- Modify: `Miu World — Master Development Plan v3 (3D theo mockup + Multiplayer).md` (mục 10, 12, 15 theo kết quả)

## Implementation Steps
1. AI build bản review, sinh report từ `perf.json`, gửi URL + checklist duyệt.
2. Người duyệt xem và quyết định (1 lần).
3. AI ghi quyết định vào report + Master Plan v3 §15; tắt server.
4. Ghi việc còn nợ: đo đủ 2 Android + 1 iPhone (FPS, nhiệt, pin 15 phút) trước nghiệm thu MVP (Master Plan §12, §16).

## Success Criteria
- [ ] Report có số liệu giả lập 2 mức throttle × 3 mức chất lượng (✅ xong) + 1 máy thật (chờ người duyệt)
- [ ] Quyết định gate ghi trong Master Plan v3 §15
- [ ] Process dev server đã tắt

## Risk Assessment
- Giả lập đạt nhưng máy thật dưới 30 FPS. Tín hiệu: overlay trên máy Android lúc duyệt. Xử lý đã định: giảm tầm nhìn/pixel ratio, gộp props; vẫn không đạt → replan phạm vi hình ảnh trước task #9+.
- Giả lập đánh giá sai GPU/nhiệt. Xử lý: đo đủ 3 máy là điều kiện nghiệm thu MVP, không bỏ.
